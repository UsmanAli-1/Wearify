import { API_URL } from "@/constants/config";
import { useStripe } from "@stripe/stripe-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import { useGlassAlert } from "../components/GlassAlert";
import Starfield from "../components/Starfield";

// ─── Plan Data ──────────────────────────────────────────────────────────────

type PlanKey = "basic" | "pro" | "premium";

interface Plan {
  key: PlanKey;
  name: string;
  price: string;
  points: number;
  diamonds: number;
  tagline: string;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    key: "basic",
    name: "Basic",
    price: "Rs. 1,200",
    points: 400,
    diamonds: 400,
    tagline: "Perfect for casual try-ons",
  },
  {
    key: "pro",
    name: "Pro",
    price: "Rs. 3,000",
    points: 1000,
    diamonds: 1000,
    tagline: "Best value for regular users",
    popular: true,
  },
  {
    key: "premium",
    name: "Premium",
    price: "Rs. 6,000",
    points: 2000,
    diamonds: 2000,
    tagline: "For power users & stylists",
  },
];

async function getAuthToken(): Promise<string> {
  const token = await AsyncStorage.getItem("authToken");
  return token ?? "";
}

async function getCurrentPoints(token: string): Promise<number | null> {
  try {
    const { data } = await axios.get(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.points ?? null;
  } catch {
    return null;
  }
}

// ─── Step Indicator ─────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
          <Text
            style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}
          >
            1
          </Text>
        </View>
        <Text style={[styles.stepLabel, step >= 1 && styles.stepLabelActive]}>
          Plan
        </Text>
      </View>

      <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />

      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
          <Text
            style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}
          >
            2
          </Text>
        </View>
        <Text style={[styles.stepLabel, step >= 2 && styles.stepLabelActive]}>
          Payment
        </Text>
      </View>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentScreen() {
  const router = useRouter();
  const { presentPaymentSheet, initPaymentSheet } = useStripe();
  const { show: showAlert, element: alertElement } = useGlassAlert();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Step 1 → Step 2 ──────────────────────────────────────────────────────────
  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep(2);
  };

  const handleBackToPlans = () => {
    setStep(1);
    setSelectedPlan(null);
  };

  // ── Initiate Stripe payment sheet ────────────────────────────────────────────
  const handleProceedToPay = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);

    try {
      const token = await getAuthToken();
      const { data } = await axios.post(
        `${API_URL}/payment/create-payment-intent`,
        { plan: selectedPlan.key },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const paymentIntentId: string | undefined =
        data.paymentIntentId ?? data.clientSecret?.split("_secret_")[0];

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        merchantDisplayName: "Wearify",
        appearance: {
          colors: {
            primary: "#8b5cf6",
            background: "#0A0F1C",
            componentBackground: "#141929",
            componentBorder: "#1f2937",
            componentDivider: "#1f2937",
            primaryText: "#FFFFFF",
            secondaryText: "#A0AEC0",
            componentText: "#FFFFFF",
            placeholderText: "#64748b",
            icon: "#8b5cf6",
            error: "#ef4444",
          },
          shapes: { borderRadius: 12, borderWidth: 0.5 },
          primaryButton: {
            colors: { background: "#8b5cf6", text: "#FFFFFF" },
            shapes: { borderRadius: 12 },
          },
        },
      });

      if (initError) {
        showAlert("Payment Error", initError.message);
        setIsProcessing(false);
        return;
      }

      const { error: payError } = await presentPaymentSheet();

      if (payError) {
        if (payError.code !== "Canceled") {
          showAlert("Payment Failed", payError.message);
        }
        setIsProcessing(false);
        return;
      }

      // Payment succeeded on Stripe's side. Confirm it directly with the
      // backend (server-to-server, doesn't rely on the Stripe webhook) so
      // points are credited immediately and reliably.
      let updatedPoints: number | null = null;

      if (paymentIntentId) {
        try {
          const { data: confirmData } = await axios.post(
            `${API_URL}/payment/confirm-payment-intent`,
            { paymentIntentId },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (typeof confirmData.points === "number") {
            updatedPoints = confirmData.points;
          }
        } catch (confirmErr) {
          console.warn(
            "confirm-payment-intent failed, falling back to polling",
            confirmErr,
          );
        }
      }

      // Fallback: if direct confirmation didn't return a balance (e.g. older
      // backend without this endpoint, or it failed), fall back to polling
      // /users/me in case the webhook credits it shortly.
      if (updatedPoints === null) {
        const startingPoints = await getCurrentPoints(token);

        for (let attempt = 0; attempt < 15; attempt++) {
          await new Promise((r) => setTimeout(r, 2000));
          const latest = await getCurrentPoints(token);
          if (
            latest !== null &&
            startingPoints !== null &&
            latest > startingPoints
          ) {
            updatedPoints = latest;
            break;
          }
          if (latest !== null) updatedPoints = latest;
        }
      }

      setIsProcessing(false);

      if (updatedPoints !== null) {
        showAlert(
          "💎 Purchase Successful!",
          `${selectedPlan.diamonds} diamonds added. Your new balance is ${updatedPoints} 💎.`,
          [
            {
              text: "Back to Dashboard",
              onPress: () => router.replace("/dashboard"),
            },
          ],
        );
      } else {
        showAlert(
          "Payment Received ✅",
          "Your payment was successful! It may take a moment for your diamond balance to update — pull to refresh on the dashboard if it doesn't appear right away.",
          [
            {
              text: "Back to Dashboard",
              onPress: () => router.replace("/dashboard"),
            },
          ],
        );
      }
    } catch (err: any) {
      setIsProcessing(false);
      showAlert(
        "Payment Error",
        err?.response?.data?.message ?? "Something went wrong.",
      );
    }
  };

  return (
    <LinearGradient
      colors={["#1c103f", "#080d1a", "#080d1a", "#2d1445"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.backgroundGradient}
    >
      <Starfield />
      <SafeAreaView style={styles.container}>
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.headerCard}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (step === 2 ? handleBackToPlans() : router.back())}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {step === 1 ? "Choose Your Plan" : "Payment Details"}
          </Text>

          <StepIndicator step={step} />
        </Animated.View>

        {/* ── STEP 1: PLAN SELECTION ── */}
        {step === 1 && (
          <Animated.View
            key="step1"
            entering={SlideInRight.duration(300)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.plansList}
          >
            {PLANS.map((plan, i) => (
              <Animated.View
                key={plan.key}
                entering={FadeInUp.delay(100 + i * 80).duration(350)}
              >
                <TouchableOpacity
                  style={[styles.planCard, plan.popular && styles.planCardPro]}
                  onPress={() => handleSelectPlan(plan)}
                  activeOpacity={0.85}
                >
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>Most Popular</Text>
                    </View>
                  )}

                  <View style={styles.planCardTop}>
                    <View>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planTagline}>{plan.tagline}</Text>
                    </View>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                  </View>

                  <View style={styles.planDivider} />

                  <View style={styles.planBottomRow}>
                    <Text style={styles.planPoints}>
                      💎 {plan.points} Diamonds
                    </Text>
                    <View
                      style={[
                        styles.selectPill,
                        plan.popular && styles.selectPillPro,
                      ]}
                    >
                      <Text style={styles.selectPillText}>Select</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}

            <Text style={styles.stripeBadge}>
              🔒 Payments secured by Stripe
            </Text>
          </Animated.View>
        )}

        {/* ── STEP 2: CARD / CONFIRM PAYMENT ── */}
        {step === 2 && selectedPlan && (
          <Animated.View
            key="step2"
            entering={SlideInRight.duration(300)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.confirmWrapper}
          >
            <Animated.View
              entering={FadeIn.delay(100).duration(350)}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryLabel}>Selected Plan</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryPlanName}>{selectedPlan.name}</Text>
                <Text style={styles.summaryPrice}>{selectedPlan.price}</Text>
              </View>

              <View style={styles.planDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryDetailLabel}>Diamonds</Text>
                <Text style={styles.summaryDetailValue}>
                  💎 {selectedPlan.diamonds}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryDetailLabel}>Total</Text>
                <Text style={styles.summaryTotal}>{selectedPlan.price}</Text>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeIn.delay(200).duration(350)}
              style={styles.infoCard}
            >
              <Text style={styles.infoText}>
                You&apos;ll be securely redirected to enter your card details
                via Stripe&apos;s payment sheet. Your card information is never
                stored on our servers.
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(300).duration(350)}
              style={styles.footer}
            >
              <TouchableOpacity
                style={[
                  styles.payButton,
                  isProcessing && styles.payButtonDisabled,
                ]}
                onPress={handleProceedToPay}
                disabled={isProcessing}
              >
                <LinearGradient
                  colors={["#8b5cf6", "#3b82f6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradient}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.payButtonText}>
                      Pay {selectedPlan.price}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )}
      </SafeAreaView>

      {alertElement}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backgroundGradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },

  // Header
  headerCard: { marginTop: 50, marginBottom: 24 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(139,92,246,0.2)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  backIcon: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
  },

  // Step indicator
  stepRow: { flexDirection: "row", alignItems: "center" },
  stepItem: { alignItems: "center", gap: 6 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleActive: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  stepNumber: { color: "#64748b", fontWeight: "700", fontSize: 14 },
  stepNumberActive: { color: "#FFFFFF" },
  stepLabel: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  stepLabelActive: { color: "#E2E8F0" },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 12,
    marginBottom: 22,
  },
  stepLineActive: { backgroundColor: "#8b5cf6" },

  // Plans list (step 1)
  plansList: { flex: 1, gap: 16 },
  planCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  planCardPro: {
    borderColor: "#8b5cf6",
    backgroundColor: "rgba(139,92,246,0.08)",
  },
  popularBadge: {
    position: "absolute",
    top: -12,
    right: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#8b5cf6",
  },
  popularText: { color: "#d8b4fe", fontSize: 10, fontWeight: "bold" },
  planCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  planTagline: { color: "#94A3B8", fontSize: 12 },
  planPrice: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  planDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 16,
  },
  planBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planPoints: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  selectPill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
  },
  selectPillPro: { backgroundColor: "#8b5cf6" },
  selectPillText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },

  stripeBadge: {
    color: "#4B5563",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },

  // Step 2 — confirm/pay
  confirmWrapper: { flex: 1 },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
  },
  summaryLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryPlanName: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  summaryPrice: { color: "#8b5cf6", fontSize: 20, fontWeight: "800" },
  summaryDetailLabel: { color: "#94A3B8", fontSize: 14 },
  summaryDetailValue: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  summaryTotal: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

  infoCard: {
    backgroundColor: "rgba(139,92,246,0.08)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
    marginBottom: 16,
  },
  infoText: { color: "#CBD5E1", fontSize: 13, lineHeight: 20 },

  footer: { marginTop: "auto", marginBottom: 12 },
  payButton: { borderRadius: 50, overflow: "hidden" },
  payButtonDisabled: { opacity: 0.7 },
  gradient: {
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  payButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
});

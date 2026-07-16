import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL1 } from '@/constants/config';
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import GlassAlert, { GlassAlertButton } from "../../components/GlassAlert";
import Starfield from "../../components/Starfield";

// ─── Auth Screen ──────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Glass alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertButtons, setAlertButtons] = useState<GlassAlertButton[]>([]);

  // Submission loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Item 13: Privacy consent modal for new registrations
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const showAlert = (title: string, message: string, buttons?: GlassAlertButton[]) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertButtons(buttons ?? [{ text: 'OK' }]);
    setAlertVisible(true);
  };

  // Item 10: Store last-active timestamp on login for session management
  const recordLoginTime = async () => {
    await AsyncStorage.setItem('lastActiveTime', Date.now().toString());
  };

  const handleAuth = async () => {
    setIsSubmitting(true);
    try {
      if (isLogin) {
        const response = await axios.post(
          `${API_URL1}/login`,
          { email: email.toLowerCase(), password },
          { headers: { "Bypass-Tunnel-Reminder": "true" } },
        );

        await AsyncStorage.setItem('authToken', response.data.token);
        await AsyncStorage.setItem('userId', response.data.user?.id ?? response.data.user?._id ?? '');
        await recordLoginTime();

        showAlert("Welcome back! 👋", "You've successfully signed in.", [{
          text: "Let's Go",
          onPress: () => router.replace("/dashboard"),
        }]);

      } else {
        // Item 13: After sign-up, show privacy consent before proceeding
        await axios.post(
          `${API_URL1}/`,
          { name, email: email.toLowerCase(), phone, password },
          { headers: { "Bypass-Tunnel-Reminder": "true" } },
        );

        // Auto-login after register to get the token
        const loginRes = await axios.post(
          `${API_URL1}/login`,
          { email: email.toLowerCase(), password },
          { headers: { "Bypass-Tunnel-Reminder": "true" } },
        );

        const token = loginRes.data.token;
        const userId = loginRes.data.user?.id ?? loginRes.data.user?._id ?? '';

        // Store temporarily, show privacy modal before navigating
        setPendingToken(token);
        setPendingUserId(userId);
        setPrivacyVisible(true);
      }
    } catch (error) {
      let errorMessage = "Cannot connect to server.";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      showAlert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrivacyAgree = async () => {
    if (pendingToken && pendingUserId) {
      await AsyncStorage.setItem('authToken', pendingToken);
      await AsyncStorage.setItem('userId', pendingUserId);
      await AsyncStorage.setItem('privacyAccepted', 'true');
      await recordLoginTime();
    }
    setPrivacyVisible(false);
    router.replace("/dashboard");
  };

  const handlePrivacyDecline = async () => {
    setPrivacyVisible(false);
    setPendingToken(null);
    setPendingUserId(null);
    showAlert(
      "Account Declined",
      "You must accept the privacy policy to use Wearify. Your account has not been activated.",
    );
  };

  return (
    <LinearGradient
      colors={["#1c103f", "#080d1a", "#080d1a", "#2d1445"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.backgroundGradient}
    >
      <Starfield />
      {/* Item 4: Center form vertically */}
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <Image
              source={require("../../assets/images/logo1.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.headerContainer}>
              <Text style={styles.title}>
                {isLogin ? "Sign In" : "Sign Up"}
              </Text>
            </View>

            <View style={styles.card}>
              {!isLogin && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="John Doe"
                      placeholderTextColor="#4A5568"
                      value={name}
                      onChangeText={setName}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0300 1234567"
                      placeholderTextColor="#4A5568"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>
                </>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#4A5568"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#4A5568"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <TouchableOpacity
                style={[styles.buttonContainer, isSubmitting && styles.buttonDisabled]}
                onPress={handleAuth}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={["#8b5cf6", "#3b82f6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradient}
                >
                  {isSubmitting ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.buttonText}>
                        {isLogin ? "Signing in..." : "Signing up..."}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>
                      {isLogin ? "Sign In" : "Sign Up"}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleContainer}
                onPress={() => setIsLogin(!isLogin)}
              >
                <Text style={styles.toggleText}>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <Text style={styles.toggleHighlight}>
                    {isLogin ? "Sign Up" : "Sign In"}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Item 13: Privacy Consent Modal */}
      <Modal visible={privacyVisible} transparent animationType="fade">
        <View style={styles.privacyOverlay}>
          <View style={styles.privacyCard}>
            <Text style={styles.privacyTitle}>Your Privacy Matters 🛡️</Text>
            <Text style={styles.privacySubtitle}>
              Before using our Virtual Try-On feature, please read and agree to the following:
            </Text>

            {[
              "Your photos are used only for try-on generation",
              "We never share your photos with third parties",
              "Your data is stored securely on our servers",
              "Only you can see your generated results",
            ].map((point, i) => (
              <View key={i} style={styles.privacyPoint}>
                <Text style={styles.privacyCheck}>✓</Text>
                <Text style={styles.privacyPointText}>{point}</Text>
              </View>
            ))}

            <Text style={styles.privacyNote}>
              By clicking <Text style={{ fontWeight: '700' }}>&quot;I Agree&quot;</Text>, you give Wearify
              permission to process your uploaded photos for virtual try-on purposes only.
            </Text>

            <View style={styles.privacyButtons}>
              <TouchableOpacity style={styles.declineBtn} onPress={handlePrivacyDecline}>
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePrivacyAgree}>
                <LinearGradient
                  colors={["#8b5cf6", "#3b82f6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.agreeBtn}
                >
                  <Text style={styles.agreeBtnText}>I Agree</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <Text style={styles.privacyWarning}>Declining will sign you out of your account</Text>
          </View>
        </View>
      </Modal>

      {/* Glassmorphism Alert */}
      <GlassAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onClose={() => setAlertVisible(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  backgroundGradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },
  keyboardView: { flex: 1 },
  // Item 4: Center vertically
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingVertical: 40,
  },
  logo: { width: 64, height: 64, resizeMode: 'contain', marginBottom: 8, alignSelf: 'flex-start' },
  headerContainer: { marginBottom: 16 },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#8b5cf6",
    marginBottom: 4,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  inputContainer: { marginBottom: 20 },
  label: { color: "#E2E8F0", fontSize: 14, fontWeight: "500", marginBottom: 8 },
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    color: "#FFFFFF",
    fontSize: 16,
  },
  buttonContainer: {
    width: "100%",
    marginTop: 12,
    borderRadius: 50,
    overflow: "hidden",
  },
  buttonDisabled: { opacity: 0.7 },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gradient: {
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  toggleContainer: { marginTop: 24, alignItems: "center" },
  toggleText: { color: "#A0AEC0", fontSize: 14 },
  toggleHighlight: { color: "#8b5cf6", fontWeight: "600" },

  // Privacy modal
  privacyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  privacyCard: {
    backgroundColor: '#0f1629',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  privacyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  privacySubtitle: {
    color: '#CBD5E1',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 20,
  },
  privacyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  privacyCheck: { color: '#10b981', fontSize: 16, fontWeight: '700' },
  privacyPointText: { color: '#E2E8F0', fontSize: 13, flex: 1, lineHeight: 20 },
  privacyNote: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    lineHeight: 18,
  },
  privacyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  declineBtnText: { color: '#CBD5E1', fontWeight: '600' },
  agreeBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 120,
  },
  agreeBtnText: { color: '#FFFFFF', fontWeight: '700' },
  privacyWarning: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});

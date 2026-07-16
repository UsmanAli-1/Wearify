import { API_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useGlassAlert } from "../components/GlassAlert";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Suggestion {
  _id: string;
  name: string;
  imagePath: string;
  color: string;
}

type Gender = "male" | "female";
type Step = "upload" | "loading" | "results";

const { width } = Dimensions.get("window");
const CARD_SIZE = (width - 60) / 2; // two columns with padding

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const token = await AsyncStorage.getItem("authToken");
  return token ?? "";
}

// ─── Shimmer skeleton card (#13) ───────────────────────────────────────────────

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 700 }),
        withTiming(0.3, { duration: 700 }),
      ),
      -1,
      false,
    );
    // Reanimated shared value is a stable ref — safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View entering={FadeIn.delay(delay).duration(300)} style={styles.skeletonCard}>
      <Animated.View style={[styles.skeletonShimmer, animatedStyle]} />
      <Text style={styles.skeletonText}>Finding...</Text>
    </Animated.View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AISuggestionScreen() {
  const router = useRouter();
  const { show: showAlert, element: alertElement } = useGlassAlert();

  const [step, setStep] = useState<Step>("upload");
  const [points, setPoints] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [gender, setGender] = useState<Gender>("male");
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // ── Fetch points on focus ───────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const token = await getAuthToken();
          if (!token) return;
          const { data } = await axios.get(`${API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setPoints(data.points ?? 0);
        } catch { /* non-fatal */ }
      })();
    }, [])
  );

  // ── Image picker ────────────────────────────────────────────────────────────

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert("Permission Required", "We need access to your photos!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPersonImage(result.assets[0].uri);
    }
  };

  const handleRemoveImage = () => {
    setPersonImage(null);
    setStep("upload");
    setSuggestions([]);
  };

  // ── Suggest ─────────────────────────────────────────────────────────────────

  const handleSuggest = async () => {
    if (!personImage) {
      showAlert("No Image", "Please select a photo first.");
      return;
    }

    setStep("loading");

    try {
      const token = await getAuthToken();

      const formData = new FormData();
      formData.append("image", {
        uri: personImage,
        name: "person.jpg",
        type: "image/jpeg",
      } as any);
      formData.append("gender", gender);

      const { data } = await axios.post(
        `${API_URL}/suggestions/suggest`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: 90000,
        }
      );

      setSuggestions(data.suggestions ?? []);
      setStep("results");
      setModalVisible(true);
    } catch (err: any) {
      setStep("upload");

      const msg =
        err?.response?.data?.message ?? "Something went wrong. Please try again.";

      if (msg.includes("full-body") || msg.includes("full body")) {
        showAlert(
          "Full Body Required 📸",
          "Please upload a clear head-to-toe photo so we can analyze your skin tone accurately.\n\nTips:\n• Stand in good lighting\n• Make sure your full body is visible\n• Avoid cropped or close-up shots",
          [{ text: "Try Again" }]
        );
      } else if (msg.includes("points") || msg.includes("Points")) {
        showAlert(
          "Not Enough Diamonds 💎",
          "You need 40 diamonds to use AI Suggestions. Top up from your dashboard.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Top Up", onPress: () => router.back() },
          ]
        );
      } else {
        showAlert("Error", msg);
      }
    }
  };

  const handleReset = () => {
    setStep("upload");
    setPersonImage(null);
    setSuggestions([]);
    setModalVisible(false);
  };

  // ── Tap a suggestion → go to dashboard try-on with this garment + photo (#12) ──

  const handleSelectSuggestion = (item: Suggestion) => {
    setModalVisible(false);
    router.push({
      pathname: "/dashboard",
      params: {
        garmentId: item._id,
        garmentName: item.name,
        garmentImagePath: item.imagePath,
        personImage: personImage ?? "",
      },
    } as any);
  };

  // ── Render helpers ───────────────────────────────────────────────────────────

  const renderUploadStep = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      {/* Person image area — increased size (#10) */}
      <Animated.View entering={FadeIn.duration(350)} style={styles.uploadBoxWrapper}>
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={handlePickImage}
          activeOpacity={personImage ? 1 : 0.7}
        >
          {personImage ? (
            <View style={{ flex: 1, width: "100%" }}>
              <Image source={{ uri: personImage }} style={styles.personPreview} />
              <TouchableOpacity style={styles.removeBtn} onPress={handleRemoveImage}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Text style={styles.uploadTitle}>Upload Image</Text>
              <View style={styles.uploadHint}>
                <Text style={styles.uploadHintText}>Tap to select from gallery</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Gender selector */}
      <Animated.View entering={FadeInUp.delay(100).duration(350)} style={styles.genderContainer}>
        <Text style={styles.sectionLabel}>Select Gender</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            style={[styles.genderBtn, gender === "male" && styles.genderBtnActive]}
            onPress={() => setGender("male")}
          >
            <Text style={styles.genderIcon}>♂</Text>
            <Text
              style={[
                styles.genderText,
                gender === "male" && styles.genderTextActive,
              ]}
            >
              Male
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.genderBtn,
              gender === "female" && styles.genderBtnActive,
            ]}
            onPress={() => setGender("female")}
          >
            <Text style={styles.genderIcon}>♀</Text>
            <Text
              style={[
                styles.genderText,
                gender === "female" && styles.genderTextActive,
              ]}
            >
              Female
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Suggest button — no extra space below (#10) */}
      <Animated.View entering={FadeInUp.delay(150).duration(350)}>
        <TouchableOpacity
          style={[styles.suggestBtn, !personImage && styles.suggestBtnDisabled]}
          onPress={handleSuggest}
          disabled={!personImage}
        >
          <LinearGradient
            colors={personImage ? ["#8b5cf6", "#3b82f6"] : ["#1f2937", "#1f2937"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.suggestBtnGradient}
          >
            <Text style={styles.suggestBtnText}>✨ Suggest Me (40 💎)</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );

  // ── Loading step — skeleton grid instead of "Analyzing..." card (#13) ──────────

  const renderLoadingStep = () => (
    <Animated.View entering={FadeIn.duration(250)} style={{ flex: 1 }}>
      {personImage && (
        <View style={styles.loadingPersonRow}>
          <View style={styles.loadingPersonCard}>
            <Image source={{ uri: personImage }} style={styles.loadingPersonImage} />
            <View style={styles.loadingPersonOverlay}>
              <Text style={styles.loadingPersonOverlayIcon}>⬆</Text>
            </View>
          </View>
          <View style={styles.skeletonGrid}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} delay={i * 100} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.analyzingBar}>
        <Text style={styles.analyzingText}>✨ Analyzing...</Text>
      </View>
    </Animated.View>
  );

  // ── Results step — just outfit grid (#12) ──────────────────────────────────────

  const renderResultsStep = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Animated.Text entering={FadeIn.duration(300)} style={styles.suggestionsTitle}>
        {suggestions.length > 0
          ? `${suggestions.length} Outfits Matched For You`
          : "No outfits found for your profile"}
      </Animated.Text>

      {suggestions.length > 0 ? (
        <View style={styles.grid}>
          {suggestions.map((item, i) => (
            <Animated.View key={item._id} entering={FadeInUp.delay(i * 60).duration(300)}>
              <TouchableOpacity
                style={styles.garmentCard}
                onPress={() => handleSelectSuggestion(item)}
                activeOpacity={0.85}
              >
                <Image
                  source={{
                    uri: item.imagePath.startsWith("http")
                      ? item.imagePath
                      : `${API_URL.replace("/api", "")}/${item.imagePath.replace(
                          /\\/g,
                          "/"
                        )}`,
                  }}
                  style={styles.garmentImage}
                  resizeMode="cover"
                />
                <View style={styles.garmentInfo}>
                  <Text style={styles.garmentColor}>{item.color}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyResults}>
          <Text style={styles.emptyResultsIcon}>👗</Text>
          <Text style={styles.emptyResultsText}>
            No outfits available for your color profile right now.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.tryAgainBtn} onPress={handleReset}>
        <Text style={styles.tryAgainText}>🔄 Try Another Photo</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <LinearGradient
      colors={["#1c103f", "#080d1a", "#080d1a", "#2d1445"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <SafeAreaView style={styles.container}>
        {/* Header — heading removed (#10), just back button */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsBadgeText}>
              💎 {points === null ? '...' : points}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.content}>
          {renderUploadStep()}
        </View>
      </SafeAreaView>

      {/* Bottom sheet modal for loading + results */}
      <Modal
        visible={step === "loading" || modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { if (step === "results") { setModalVisible(false); setStep("upload"); } }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            {step === "loading" && (
              <View style={styles.modalLoadingSection}>
                <Text style={styles.modalTitle}>Finding Your Outfits...</Text>
                <View style={styles.skeletonGridModal}>
                  {[0, 1, 2, 3].map((i) => (
                    <SkeletonCard key={i} delay={i * 100} />
                  ))}
                </View>
                <Text style={styles.analyzingText}>✨ Analyzing your photo...</Text>
              </View>
            )}

            {step === "results" && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                <View style={styles.modalResultsHeader}>
                  <Text style={styles.modalTitle}>
                    {suggestions.length > 0
                      ? `${suggestions.length} Outfits Matched For You`
                      : "No outfits found"}
                  </Text>
                  <TouchableOpacity onPress={handleReset} style={styles.modalCloseBtn}>
                    <Text style={styles.modalCloseBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {suggestions.length > 0 ? (
                  <View style={styles.grid}>
                    {suggestions.map((item, i) => (
                      <Animated.View key={item._id} entering={FadeInUp.delay(i * 60).duration(300)}>
                        <TouchableOpacity
                          style={styles.garmentCard}
                          onPress={() => handleSelectSuggestion(item)}
                          activeOpacity={0.85}
                        >
                          <Image
                            source={{
                              uri: item.imagePath.startsWith("http")
                                ? item.imagePath
                                : `${API_URL.replace("/api", "")}/${item.imagePath.replace(/\\/g, "/")}`,
                            }}
                            style={styles.garmentImage}
                            resizeMode="cover"
                          />
                          <View style={styles.garmentInfo}>
                            <Text style={styles.garmentColor}>{item.color}</Text>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyResults}>
                    <Text style={styles.emptyResultsIcon}>👗</Text>
                    <Text style={styles.emptyResultsText}>No outfits available right now.</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.tryAgainBtn} onPress={handleReset}>
                  <Text style={styles.tryAgainText}>🔄 Try Another Photo</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {alertElement}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 4,
    marginTop: 50,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  backBtnText: { color: "#8b5cf6", fontWeight: "600", fontSize: 14 },
  pointsBadge: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.5)',
  },
  pointsBadgeText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },

  // Upload step — bigger image (#10)
  uploadBoxWrapper: { flex: 1, marginBottom: 16, minHeight: 420 },
  uploadBox: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    borderStyle: "dashed",
    overflow: "hidden",
  },
  uploadPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  uploadTitle: {
    color: "#E2E8F0",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  uploadHint: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  uploadHintText: { color: "#8b5cf6", fontSize: 13, fontWeight: "600" },
  personPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  removeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: { color: "#FFF", fontSize: 14, fontWeight: "bold" },

  sectionLabel: {
    color: "#A0AEC0",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  genderContainer: { marginBottom: 16 },
  genderRow: { flexDirection: "row", gap: 12 },
  genderBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  genderBtnActive: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    borderColor: "#8b5cf6",
  },
  genderIcon: { fontSize: 18, color: "#A0AEC0" },
  genderText: { color: "#A0AEC0", fontSize: 15, fontWeight: "600" },
  genderTextActive: { color: "#FFFFFF" },

  suggestBtn: { borderRadius: 50, overflow: "hidden" },
  suggestBtnDisabled: { opacity: 0.5 },
  suggestBtnGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "bold" },

  // Loading step — skeleton grid (#13)
  loadingPersonRow: { gap: 12 },
  loadingPersonCard: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  loadingPersonImage: { width: "100%", height: "100%", resizeMode: "cover" },
  loadingPersonOverlay: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingPersonOverlayIcon: { color: "#FFFFFF", fontSize: 14 },

  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  skeletonCard: {
    width: CARD_SIZE,
    height: CARD_SIZE * 1.3,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  skeletonShimmer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(139, 92, 246, 0.15)",
  },
  skeletonText: { color: "#64748b", fontSize: 12, fontWeight: "600" },

  analyzingBar: {
    marginTop: 16,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  analyzingText: { color: "#8b5cf6", fontWeight: "700", fontSize: 14 },

  // Results step
  suggestionsTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    marginTop: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  garmentCard: {
    width: CARD_SIZE,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  garmentImage: { width: "100%", height: CARD_SIZE * 1.3 },
  garmentInfo: { padding: 10 },
  garmentColor: { color: "#A0AEC0", fontSize: 12, fontWeight: "600", textTransform: "capitalize" },

  emptyResults: { alignItems: "center", padding: 40 },

  // Modal styles (item 8)
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalSheet: {
    backgroundColor: '#0f1629',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    maxHeight: '82%',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  modalHandle: {
    width: 40, height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  modalResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: { color: '#CBD5E1', fontSize: 14, fontWeight: '700' },
  modalLoadingSection: { alignItems: 'center', paddingVertical: 8 },
  skeletonGridModal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
    width: '100%',
  },
  emptyResultsIcon: { fontSize: 48, marginBottom: 16 },
  emptyResultsText: { color: "#64748b", fontSize: 14, textAlign: "center" },

  tryAgainBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 20,
  },
  tryAgainText: { color: "#A0AEC0", fontSize: 15, fontWeight: "600" },
});

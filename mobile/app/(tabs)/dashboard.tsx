import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "@/constants/config";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
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
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SmartCamera from "../../components/SmartCamera";
import { useGlassAlert } from "../../components/GlassAlert";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Garment {
  _id: string;
  name: string;
  imagePath: string;
}

async function getAuthToken(): Promise<string> {
  const AsyncStorageLib =
    await import("@react-native-async-storage/async-storage");
  const token = await AsyncStorageLib.default.getItem("authToken");
  return token ?? "";
}

// ─── Pulsing dot loader ───────────────────────────────────────────────────────

function PulsingDots() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const pulse = (sv: typeof dot1, delay: number) => {
      setTimeout(() => {
        sv.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 500 }),
            withTiming(0.3, { duration: 500 }),
          ),
          -1,
          false,
        );
      }, delay);
    };
    pulse(dot1, 0);
    pulse(dot2, 200);
    pulse(dot3, 400);
    // Reanimated shared values are stable refs — safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        marginTop: 16,
      }}
    >
      {[s1, s2, s3].map((s, i) => (
        <Animated.View
          key={i}
          style={[
            {
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "#8b5cf6",
            },
            s,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    garmentId?: string;
    garmentName?: string;
    garmentImagePath?: string;
    personImage?: string;
  }>();
  const { show: showAlert, element: alertElement } = useGlassAlert();

  // --- Data & Economy State ---
  const [garments, setGarments] = useState<Garment[]>([]);
  const [isLoadingGarments, setIsLoadingGarments] = useState(true);
  const [diamonds, setDiamonds] = useState<number | null>(null);

  // --- UI & Action State ---
  const [selectedGarmentId, setSelectedGarmentId] = useState<string | null>(
    null,
  );
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // ── Fetch diamonds (points) from backend on focus (#20) ──────────────────────
  // Mirrors GET /users/me used elsewhere — ensures mobile shows the same
  // balance as web instead of a hardcoded value. Refetched on focus so
  // spending diamonds in AI Suggest or buying via Payment screen is reflected
  // immediately when returning to the dashboard.
  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        try {
          const token = await getAuthToken();
          if (!token) return;
          const { data } = await axios.get(`${API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setDiamonds(data.points ?? 0);
        } catch {
          setDiamonds(0);
        }
      };
      fetchUserData();
    }, []),
  );

  // ── Fetch garments ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchGarments = async () => {
      try {
        const response = await axios.get(`${API_URL}/garments`, {
          headers: { "Bypass-Tunnel-Reminder": "true" },
        });
        setGarments(response.data);
      } catch (error) {
        console.error("Failed to fetch garments:", error);
      } finally {
        setIsLoadingGarments(false);
      }
    };
    fetchGarments();
  }, []);

  // ── Handle incoming AI suggestion (garment + photo) (#12) ───────────────────
  useEffect(() => {
    if (!params.garmentId || isLoadingGarments) return;

    const incomingId = params.garmentId;
    const exists = garments.some((g) => g._id === incomingId);

    if (!exists && params.garmentImagePath) {
      setGarments((prev) => [
        {
          _id: incomingId,
          name: params.garmentName ?? "Suggested",
          imagePath: params.garmentImagePath as string,
        },
        ...prev,
      ]);
    }

    setSelectedGarmentId(incomingId);

    if (params.personImage) {
      setPersonImage(params.personImage);
      setGeneratedImage(null);
    }
    // Intentionally only re-run when garmentId/loading state changes —
    // params.* and garments are read once per incoming navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.garmentId, isLoadingGarments]);

  // ── Image selection ─────────────────────────────────────────────────────────

  const handleCameraOpen = () => {
    setShowCamera(true);
    setGeneratedImage(null);
  };

  const handleGalleryOpen = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
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
      setGeneratedImage(null);
    }
  };

  const handleImageOption = () => {
    showAlert("Add Your Photo", "How would you like to provide your photo?", [
      { text: "Smart Camera", onPress: handleCameraOpen },
      { text: "Gallery", onPress: handleGalleryOpen },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRemoveImage = () => {
    setPersonImage(null);
    setGeneratedImage(null);
  };

  // ── Try-on ──────────────────────────────────────────────────────────────────

  const handleGenerateTryOn = async () => {
    if ((diamonds ?? 0) < 40) {
      router.push("/PaymentScreen" as any);
      return;
    }

    setIsGenerating(true);

    try {
      const token = await getAuthToken();
      const selectedGarment = garments.find((g) => g._id === selectedGarmentId);
      if (!selectedGarment) return;

      const formData = new FormData();
      formData.append("image", {
        uri: personImage,
        name: "person.jpg",
        type: "image/jpeg",
      } as any);
      formData.append("garmentId", selectedGarment._id);

      const { data } = await axios.post(`${API_URL}/users/generate`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 120000,
      });

      setDiamonds(data.points);
      setGeneratedImage(data.resultImage);

      if (data.pointsExhausted) {
        showAlert(
          "Out of Diamonds! 💎",
          "You've used all your diamonds. Top up to keep generating try-ons.",
          [
            {
              text: "View Plans",
              onPress: () => router.push("/PaymentScreen" as any),
            },
          ],
        );
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "";
      const reason = err?.response?.data?.reason ?? "";

      if (msg.includes("full") || msg.includes("Invalid image")) {
        showAlert(
          "Full Body Required 📸",
          `Please upload a clear head-to-toe photo.\n\n${reason}`,
          [{ text: "Try Again" }],
        );
      } else if (msg.includes("points") || msg.includes("Points")) {
        showAlert(
          "Out of Diamonds! 💎",
          "You don't have enough diamonds for this. Top up to continue.",
          [
            {
              text: "View Plans",
              onPress: () => router.push("/PaymentScreen" as any),
            },
          ],
        );
      } else {
        showAlert("Error", msg || "Something went wrong. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setGeneratedImage(null);
    setSelectedGarmentId(null);
    setPersonImage(null);
  };

  // ── Sign out ─────────────────────────────────────────────────────────────────

  const handleSignOut = () => {
    showAlert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          const token = await getAuthToken();

          // #15 — clear all try-on history before logging out.
          // No bulk-delete endpoint exists, so fetch the list and
          // delete each record individually.
          if (token) {
            try {
              const { data: history } = await axios.get(
                `${API_URL}/images/my`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                },
              );

              await Promise.all(
                (history ?? []).map(
                  (record: { _id: string }) =>
                    axios
                      .delete(`${API_URL}/images/${record._id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      })
                      .catch(() => null), // don't block logout if one delete fails
                ),
              );
            } catch {
              // If fetching history fails, proceed with logout anyway
            }
          }

          await AsyncStorage.multiRemove(["authToken", "userId"]);
          // Clear local state so images don't persist on next login (#18)
          setPersonImage(null);
          setGeneratedImage(null);
          setSelectedGarmentId(null);
          setDiamonds(null);
          router.replace("/auth");
        },
      },
    ]);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isReadyToGenerate = selectedGarmentId !== null && personImage !== null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <LinearGradient
      colors={["#1c103f", "#080d1a", "#080d1a", "#2d1445"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.backgroundGradient}
    >
      <SafeAreaView style={styles.container}>
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.mainWrapper}
        >
          {/* ── HEADER ── */}
          <View style={styles.header}>
            <Image
              source={require("../../assets/images/logo1.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={styles.headerRight}>
              {/* Diamond badge */}
              <TouchableOpacity
                onPress={() => router.push("/PaymentScreen" as any)}
              >
                <View style={styles.diamondBadge}>
                  <Text style={styles.diamondText}>
                    💎 {diamonds === null ? "..." : diamonds}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* About Us */}
              <TouchableOpacity
                onPress={() => router.push("/AboutUsScreen" as any)}
                style={styles.signOutBtn}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              {/* Sign out — icon only (#5) */}
              <TouchableOpacity
                onPress={handleSignOut}
                style={styles.signOutBtn}
              >
                <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── GARMENT CAROUSEL ── */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.carouselContainer}
          >
            {isLoadingGarments ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={garments}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                  const isSelected = selectedGarmentId === item._id;
                  return (
                    <TouchableOpacity
                      onPress={() =>
                        !isGenerating && setSelectedGarmentId(item._id)
                      }
                      style={[
                        styles.garmentCard,
                        isSelected && styles.garmentCardSelected,
                      ]}
                    >
                      <Image
                        source={{
                          uri: item.imagePath.startsWith("http")
                            ? item.imagePath
                            : `${API_URL.replace("/api", "")}/${item.imagePath.replace(/\\/g, "/")}`,
                        }}
                        style={styles.garmentImage}
                      />
                      {isSelected && (
                        <View style={styles.checkmarkBadge}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </Animated.View>

          {/* ── DYNAMIC CANVAS ── */}
          <Animated.View
            entering={FadeIn.delay(150).duration(400)}
            style={styles.canvasWrapper}
          >
            <TouchableOpacity
              style={[
                styles.mainContainer,
                generatedImage ? styles.mainContainerSuccess : null,
              ]}
              onPress={
                generatedImage || isGenerating
                  ? undefined
                  : personImage
                    ? undefined
                    : handleImageOption
              }
              activeOpacity={generatedImage || personImage ? 1 : 0.7}
            >
              {isGenerating ? (
                <View style={styles.placeholder}>
                  <PulsingDots />
                  <Text style={[styles.uploadText, { marginTop: 20 }]}>
                    Generating AI Preview...
                  </Text>
                  <Text style={styles.subUploadText}>
                    Applying diffusion models
                  </Text>
                </View>
              ) : generatedImage ? (
                <Image
                  source={{ uri: generatedImage }}
                  style={styles.previewImage}
                />
              ) : personImage ? (
                <View style={{ flex: 1, width: "100%" }}>
                  <Image
                    source={{ uri: personImage }}
                    style={styles.previewImage}
                  />
                  {/* ✕ cancel button (#16) */}
                  <TouchableOpacity
                    style={styles.cancelImageBtn}
                    onPress={handleRemoveImage}
                  >
                    <Text style={styles.cancelImageText}>✕</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editOverlay}
                    onPress={handleImageOption}
                  >
                    <Text style={styles.editOverlayText}>
                      Tap to change photo
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.placeholder}
                  onPress={handleImageOption}
                  activeOpacity={0.7}
                >
                  <Text style={styles.uploadText}>Upload Image</Text>
                  <Text style={styles.subUploadText}>
                    Tap to open camera or gallery
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* ── ACTION BUTTON ── */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(400)}
            style={styles.footer}
          >
            {!generatedImage ? (
              <TouchableOpacity
                style={[
                  styles.buttonContainer,
                  !isReadyToGenerate || isGenerating
                    ? styles.buttonDisabled
                    : null,
                ]}
                disabled={!isReadyToGenerate || isGenerating}
                onPress={handleGenerateTryOn}
              >
                <LinearGradient
                  colors={
                    isReadyToGenerate
                      ? ["#8b5cf6", "#3b82f6"]
                      : ["#1f2937", "#1f2937"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradient}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      !isReadyToGenerate ? styles.buttonTextDisabled : null,
                    ]}
                  >
                    {isGenerating ? "Processing..." : "Try On (40 💎)"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={handleReset}
              >
                <LinearGradient
                  colors={["#10b981", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradient}
                >
                  <Text style={styles.buttonText}>Try Another Garment 🔄</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* ── BOTTOM NAV — AI Suggest, My Try-Ons & Plans (#4) ── */}
          <Animated.View
            entering={FadeInUp.delay(250).duration(400)}
            style={styles.bottomNav}
          >
            <TouchableOpacity
              style={styles.bottomNavBtn}
              onPress={() =>
                !isGenerating && router.push("/AISuggestionScreen" as any)
              }
              disabled={isGenerating}
            >
              <LinearGradient
                colors={["rgba(139,92,246,0.25)", "rgba(59,130,246,0.25)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bottomNavGradient}
              >
                <Text style={styles.bottomNavIcon}>✨</Text>
                <Text style={styles.bottomNavText}>AI Suggest</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomNavBtn}
              onPress={() =>
                !isGenerating && router.push("/TryOnHistoryScreen" as any)
              }
              disabled={isGenerating}
            >
              <LinearGradient
                colors={["rgba(16,185,129,0.25)", "rgba(5,150,105,0.25)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bottomNavGradient}
              >
                <Text style={styles.bottomNavIcon}>🕓</Text>
                <Text style={styles.bottomNavText}>My Try-Ons</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomNavBtn}
              onPress={() =>
                !isGenerating && router.push("/PaymentScreen" as any)
              }
              disabled={isGenerating}
            >
              <LinearGradient
                colors={["rgba(245,158,11,0.25)", "rgba(217,119,6,0.25)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bottomNavGradient}
              >
                <Text style={styles.bottomNavIcon}>💎</Text>
                <Text style={styles.bottomNavText}>Plans</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>

      {/* ── GENERATION LOCK OVERLAY (#17) ── */}
      {isGenerating && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.generatingOverlay}
        >
          <View style={styles.generatingCard}>
            <PulsingDots />
            <Text style={styles.generatingTitle}>Generating your look...</Text>
            <Text style={styles.generatingSubtitle}>
              This may take up to 2 minutes
            </Text>
          </View>
        </Animated.View>
      )}

      {/* ── SMART CAMERA MODAL ── */}
      <Modal
        visible={showCamera}
        animationType="slide"
        onRequestClose={() => setShowCamera(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <SmartCamera
            onCapture={(uri) => {
              setPersonImage(uri);
              setShowCamera(false);
            }}
          />
          <TouchableOpacity
            style={styles.closeCameraBtn}
            onPress={() => setShowCamera(false)}
          >
            <Text style={styles.closeCameraText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Glass Alert */}
      {alertElement}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backgroundGradient: { flex: 1 },
  container: { flex: 1, backgroundColor: "transparent" },
  mainWrapper: { flex: 1, paddingHorizontal: 20, paddingBottom: 12 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 50,
  },
  headerLogo: { width: 100, height: 40, marginLeft: -25 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },

  diamondBadge: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.5)",
  },
  diamondText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },

  // Sign out icon button (#5)
  signOutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(139,92,246,0.2)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Carousel
  carouselContainer: {
    height: 100,
    marginBottom: 16,
    justifyContent: "center",
  },
  garmentCard: {
    width: 75,
    height: 100,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  garmentCardSelected: { borderColor: "#8b5cf6" },
  garmentImage: { width: "100%", height: "100%", resizeMode: "cover" },
  checkmarkBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#8b5cf6",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },

  // Canvas
  canvasWrapper: { flex: 1, justifyContent: "center", marginBottom: 12 },
  mainContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderStyle: "dashed",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  mainContainerSuccess: {
    borderStyle: "solid",
    borderColor: "#8b5cf6",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  placeholder: { alignItems: "center", padding: 20 },
  uploadText: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  subUploadText: { color: "#64748b", fontSize: 12 },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },

  // ✕ cancel image button (#16)
  cancelImageBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  cancelImageText: { color: "#FFF", fontSize: 14, fontWeight: "bold" },

  editOverlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 12,
    alignItems: "center",
  },
  editOverlayText: { color: "#FFFFFF", fontSize: 14, fontWeight: "500" },

  // Action button — fully round (#7)
  footer: { width: "100%", marginBottom: 12 },
  buttonContainer: {
    width: "100%",
    borderRadius: 50, // fully round
    overflow: "hidden",
  },
  buttonDisabled: { opacity: 0.7 },
  gradient: {
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  buttonTextDisabled: { color: "#9ca3af" },

  // Bottom nav (#4)
  bottomNav: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  bottomNavBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  bottomNavGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 4,
  },
  bottomNavIcon: { fontSize: 14 },
  bottomNavText: { color: "#FFFFFF", fontWeight: "600", fontSize: 12 },

  // Generation overlay (#17)
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  generatingCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 24,
    padding: 36,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    width: "75%",
  },
  generatingTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 8,
  },
  generatingSubtitle: { color: "#A0AEC0", fontSize: 13, textAlign: "center" },

  // Camera
  closeCameraBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeCameraText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});

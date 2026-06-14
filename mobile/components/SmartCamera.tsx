import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from "react-native-vision-camera";
import { API_URL } from "../constants/config";

interface SmartCameraProps {
  onCapture: (uri: string) => void;
}

export default function SmartCamera({ onCapture }: SmartCameraProps) {
  const { hasPermission, requestPermission } = useCameraPermission();

  const [cameraPosition, setCameraPosition] = useState<"front" | "back">(
    "back",
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState(
    "Take a photo to check your pose",
  );
  const [canCapture, setCanCapture] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 10>(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isBodyInFrame = useSharedValue(false);
  const isProcessing = useRef(false);

  const device = useCameraDevice(cameraPosition);
  const photoOutput = usePhotoOutput();

  // ─── Run AI Check via Backend ─────────────────────────────────────
  const runAICheck = async () => {
    isProcessing.current = true;
    setIsAnalyzing(true);
    setStatusText("Analyzing your pose...");
    setCanCapture(false);

    try {
      const photo = await photoOutput.capturePhoto({ flashMode: "off" }, {});
      const imageUri = await photo.saveToTemporaryFileAsync();
      if (!imageUri) throw new Error("No image URI");

      const formData = new FormData();
      formData.append("image", {
        uri: imageUri.startsWith("file://") ? imageUri : `file://${imageUri}`,
        type: "image/jpeg",
        name: "pose.jpg",
      } as any);

      console.log("📤 Sending image to backend...");

      const response = await fetch(`${API_URL}/pose/check`, {
        method: "POST",
        body: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      FileSystem.deleteAsync(imageUri, { idempotent: true }).catch(() => {});

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const result = await response.json();
      console.log("📊 Pose result:", result);

      isBodyInFrame.value = result.isFullBody;

      if (result.isFullBody) {
        setCanCapture(true);
        setStatusText("✅ Perfect pose! Press capture to save.");
      } else if (result.tooClose) {
        setCanCapture(false);
        setStatusText("↔️ Step back — you're too close to the camera");
      } else if (result.tooFar) {
        setCanCapture(false);
        setStatusText("🔍 Come closer — you're too far away");
      } else {
        setCanCapture(false);
        setStatusText("⚠️ Make sure your full body is visible head to toe");
      }
    } catch (e: any) {
      console.log("❌ Pose Error:", e?.message || e);
      setStatusText(
        "Could not analyze pose. Check your connection and try again.",
      );
    } finally {
      isProcessing.current = false;
      setIsAnalyzing(false);
    }
  };

  // ─── Main Button Handler (with optional timer) ────────────────────
  const handleButtonPress = async () => {
    if (isProcessing.current || countdown !== null) return;

    if (timerSeconds > 0) {
      setStatusText("Get ready...");
      setCanCapture(false);
      for (let i = timerSeconds; i > 0; i--) {
        setCountdown(i);
        await new Promise((res) => setTimeout(res, 1000));
      }
      setCountdown(null);
    }

    await runAICheck();
  };

  // ─── Final Capture ────────────────────────────────────────────────
  const takeFinalPhoto = async () => {
    try {
      const photo = await photoOutput.capturePhoto({ flashMode: "off" }, {});
      const uri = await photo.saveToTemporaryFileAsync();
      if (uri) onCapture(uri.startsWith("file://") ? uri : `file://${uri}`);
    } catch (e) {
      console.log("Capture Error:", e);
    }
  };

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(isBodyInFrame.value ? "#32CD32" : "#FF3B30", {
      duration: 300,
    }),
    borderWidth: 5,
    borderRadius: 20,
  }));

  // ─── Guards ───────────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Camera permission required</Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
        >
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="white" size="large" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  // ─── UI ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Camera */}
      <View style={styles.cameraSection}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          outputs={[photoOutput]}
        />

        {/* Guide box + status */}
        <View style={styles.overlayContainer}>
          <Animated.View style={[styles.guideBox, animatedBorderStyle]} />
          <Text style={styles.instructionText}>{statusText}</Text>
        </View>

        {/* Countdown overlay */}
        {countdown !== null && (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}

        {/* Flip camera — top right */}
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() =>
            setCameraPosition((p) => (p === "back" ? "front" : "back"))
          }
          activeOpacity={0.7}
        >
          <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View style={styles.controlSection}>
        {/* Timer selector */}
        <View style={styles.timerRow}>
          <Text style={styles.timerLabel}>Timer:</Text>
          {([0, 3, 10] as const).map((sec) => (
            <TouchableOpacity
              key={sec}
              style={[
                styles.timerOption,
                timerSeconds === sec && styles.timerOptionActive,
              ]}
              onPress={() => setTimerSeconds(sec)}
            >
              <Text
                style={[
                  styles.timerOptionText,
                  timerSeconds === sec && styles.timerOptionTextActive,
                ]}
              >
                {sec === 0 ? "Off" : `${sec}s`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Buttons row */}
        <View style={styles.buttonsRow}>
          {/* Check Pose */}
          <TouchableOpacity
            style={[
              styles.checkPoseBtn,
              (isAnalyzing || countdown !== null) && { opacity: 0.6 },
            ]}
            onPress={handleButtonPress}
            disabled={isAnalyzing || countdown !== null}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.checkPoseText}>
                {countdown !== null
                  ? `${countdown}s`
                  : timerSeconds > 0
                    ? `⏱ ${timerSeconds}s`
                    : "Check Pose"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Capture */}
          <TouchableOpacity
            style={[styles.captureButton, { opacity: canCapture ? 1 : 0.3 }]}
            onPress={takeFinalPhoto}
            disabled={!canCapture}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  cameraSection: { height: "80%", width: "100%", position: "relative" },
  controlSection: {
    height: "20%",
    backgroundColor: "#0A0F1C",
    flexDirection: "column",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  guideBox: { width: "78%", height: "72%", marginTop: 70 },
  instructionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 8,
    paddingVertical: 6,
  },
  flipButton: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(20,20,30,0.55)",
    borderRadius: 24,
    width: 46,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    zIndex: 10,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  countdownText: { fontSize: 120, fontWeight: "900", color: "white" },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timerLabel: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    marginRight: 4,
  },
  timerOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  timerOptionActive: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  timerOptionText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "600",
  },
  timerOptionTextActive: { color: "white" },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    width: "100%",
  },
  checkPoseBtn: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 130,
    alignItems: "center",
  },
  checkPoseText: { color: "white", fontWeight: "700", fontSize: 15 },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "white",
  },
  loadingText: {
    color: "white",
    textAlign: "center",
    marginTop: 16,
    fontSize: 16,
  },
  centered: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  permissionBtn: {
    marginTop: 16,
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: { color: "white", fontWeight: "600" },
});

import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated as RNAnimated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';
import { API_URL } from '../constants/config';

interface SmartCameraProps {
  onCapture: (uri: string) => void;
}

// Progress steps shown during the 7s pose check
const ANALYSIS_STEPS = [
  'Capturing your photo...',
  'Detecting body outline...',
  'Checking pose alignment...',
  'Almost done...',
];

export default function SmartCamera({ onCapture }: SmartCameraProps) {
  const { hasPermission, requestPermission } = useCameraPermission();

  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('back');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState('Position your full body in the frame, then tap Verify Pose');
  const [analysisStep, setAnalysisStep] = useState(0);
  const [progressAnim] = useState(new RNAnimated.Value(0));
  const [canCapture, setCanCapture] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 10>(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isBodyInFrame = useSharedValue(false);
  const isProcessing = useRef(false);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const device = useCameraDevice(cameraPosition);
  const photoOutput = usePhotoOutput();

  // Animate progress bar across ~7s with step labels
  const startProgressAnimation = () => {
    progressAnim.setValue(0);
    RNAnimated.timing(progressAnim, {
      toValue: 1,
      duration: 7000,
      useNativeDriver: false,
    }).start();

    // Cycle through step labels
    ANALYSIS_STEPS.forEach((_, i) => {
      stepTimerRef.current = setTimeout(() => {
        setAnalysisStep(i);
      }, i * 1750);
    });
  };

  const stopProgressAnimation = () => {
    progressAnim.stopAnimation();
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    setAnalysisStep(0);
  };

  // ─── Run AI pose check via backend ───────────────────────────────────────────
  const runAICheck = async () => {
    isProcessing.current = true;
    setIsAnalyzing(true);
    setCanCapture(false);
    startProgressAnimation();

    try {
      const photo = await photoOutput.capturePhoto({ flashMode: 'off' }, {});
      const imageUri = await photo.saveToTemporaryFileAsync();
      if (!imageUri) throw new Error('No image URI');

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`,
        type: 'image/jpeg',
        name: 'pose.jpg',
      } as any);

      const response = await fetch(`${API_URL}/pose/check`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      FileSystem.deleteAsync(imageUri, { idempotent: true }).catch(() => {});

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const result = await response.json();
      isBodyInFrame.value = result.isFullBody;

      if (result.isFullBody) {
        setCanCapture(true);
        setStatusText('✅ Perfect pose! Tap the capture button to save your photo.');
      } else if (result.tooClose) {
        setCanCapture(false);
        setStatusText('↔️ Step back — you\'re too close to the camera');
      } else if (result.tooFar) {
        setCanCapture(false);
        setStatusText('🔍 Come closer — you\'re a bit too far away');
      } else {
        setCanCapture(false);
        setStatusText('⚠️ Make sure your full body is visible from head to toe');
      }
    } catch (e: any) {
      console.log('❌ Pose Error:', e?.message || e);
      setStatusText('Could not analyze pose — check your connection and try again.');
      isBodyInFrame.value = false;
    } finally {
      stopProgressAnimation();
      isProcessing.current = false;
      setIsAnalyzing(false);
    }
  };

  // ─── Main button handler (with optional timer) ────────────────────────────────
  const handleVerifyPose = async () => {
    if (isProcessing.current || countdown !== null) return;

    if (timerSeconds > 0) {
      setStatusText('Get ready...');
      setCanCapture(false);
      for (let i = timerSeconds; i > 0; i--) {
        setCountdown(i);
        await new Promise(res => setTimeout(res, 1000));
      }
      setCountdown(null);
    }

    await runAICheck();
  };

  // ─── Final capture ────────────────────────────────────────────────────────────
  const takeFinalPhoto = async () => {
    try {
      const photo = await photoOutput.capturePhoto({ flashMode: 'off' }, {});
      const uri = await photo.saveToTemporaryFileAsync();
      if (uri) onCapture(uri.startsWith('file://') ? uri : `file://${uri}`);
    } catch (e) {
      console.log('Capture Error:', e);
    }
  };

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(isBodyInFrame.value ? '#22c55e' : '#ef4444', { duration: 400 }),
    borderWidth: 3,
    borderRadius: 20,
  }));

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // ─── Guards ───────────────────────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-outline" size={48} color="rgba(255,255,255,0.4)" />
        <Text style={styles.loadingText}>Camera permission required</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
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

  // ─── UI ───────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Camera viewport */}
      <View style={styles.cameraSection}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          outputs={[photoOutput]}
        />

        {/* Guide frame */}
        <View style={styles.overlayContainer}>
          <Animated.View style={[styles.guideBox, animatedBorderStyle]} />

          {/* Status pill — shown when not analyzing */}
          {!isAnalyzing && (
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{statusText}</Text>
            </View>
          )}
        </View>

        {/* Analysis overlay with progress bar */}
        {isAnalyzing && (
          <View style={styles.analysisOverlay}>
            <View style={styles.analysisCard}>
              <ActivityIndicator color="#8b5cf6" size="large" />
              <Text style={styles.analysisStepText}>{ANALYSIS_STEPS[analysisStep]}</Text>
              <View style={styles.progressTrack}>
                <RNAnimated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
              <Text style={styles.analysisTip}>This usually takes about 7 seconds</Text>
            </View>
          </View>
        )}

        {/* Countdown overlay */}
        {countdown !== null && (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}

        {/* Flip camera */}
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() => setCameraPosition(p => p === 'back' ? 'front' : 'back')}
          activeOpacity={0.7}
        >
          <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View style={styles.controlSection}>
        {/* Timer row */}
        <View style={styles.timerRow}>
          <Text style={styles.timerLabel}>Timer:</Text>
          {([0, 3, 10] as const).map(sec => (
            <TouchableOpacity
              key={sec}
              style={[styles.timerOption, timerSeconds === sec && styles.timerOptionActive]}
              onPress={() => setTimerSeconds(sec)}
            >
              <Text style={[styles.timerOptionText, timerSeconds === sec && styles.timerOptionTextActive]}>
                {sec === 0 ? 'Off' : `${sec}s`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonsRow}>
          {/* Verify Pose button */}
          <TouchableOpacity
            style={[styles.verifyBtn, (isAnalyzing || countdown !== null) && styles.verifyBtnDisabled]}
            onPress={handleVerifyPose}
            disabled={isAnalyzing || countdown !== null}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isAnalyzing ? 'hourglass-outline' : 'body-outline'}
              size={18}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.verifyBtnText}>
              {countdown !== null ? `Starting in ${countdown}s...` : isAnalyzing ? 'Checking...' : 'Verify Pose'}
            </Text>
          </TouchableOpacity>

          {/* Capture button */}
          <TouchableOpacity
            style={[styles.captureButton, !canCapture && styles.captureButtonDisabled]}
            onPress={takeFinalPhoto}
            disabled={!canCapture}
          >
            <View style={[styles.captureInner, !canCapture && styles.captureInnerDisabled]} />
          </TouchableOpacity>
        </View>

        {canCapture && (
          <Text style={styles.captureHint}>👆 Tap the white button to capture</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraSection: { flex: 1, position: 'relative' },
  controlSection: {
    backgroundColor: '#0A0F1C',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },

  overlayContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  guideBox: { width: '78%', height: '72%', marginTop: 40 },

  statusPill: {
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxWidth: '85%',
  },
  statusPillText: { color: 'white', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },

  // Analysis overlay
  analysisOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  analysisCard: {
    backgroundColor: '#0f1629',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '75%',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    gap: 12,
  },
  analysisStepText: { color: '#E2E8F0', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 3,
  },
  analysisTip: { color: '#64748b', fontSize: 11, textAlign: 'center' },

  // Countdown
  countdownOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  countdownText: { fontSize: 120, fontWeight: '900', color: 'white' },

  // Flip
  flipButton: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: 'rgba(20,20,30,0.55)',
    borderRadius: 24, width: 46, height: 46,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    zIndex: 10,
  },

  // Timer
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timerLabel: { color: 'white', fontSize: 13, fontWeight: '600', marginRight: 4 },
  timerOption: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  timerOptionActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  timerOptionText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  timerOptionTextActive: { color: 'white' },

  // Buttons
  buttonsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  verifyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#8b5cf6', paddingVertical: 14, borderRadius: 50,
  },
  verifyBtnDisabled: { backgroundColor: 'rgba(139,92,246,0.4)' },
  verifyBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  captureButton: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'white',
  },
  captureButtonDisabled: { opacity: 0.3 },
  captureInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white' },
  captureInnerDisabled: { backgroundColor: 'rgba(255,255,255,0.5)' },

  captureHint: { color: '#22c55e', fontSize: 12, fontWeight: '600', textAlign: 'center' },

  // Guards
  loadingText: { color: 'white', textAlign: 'center', marginTop: 16, fontSize: 16 },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', gap: 12 },
  permissionBtn: { marginTop: 8, backgroundColor: '#8b5cf6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  permissionBtnText: { color: 'white', fontWeight: '600' },
});

import { BlurView } from "expo-blur";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface GlassAlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface GlassAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: GlassAlertButton[];
  onClose: () => void;
}

export default function GlassAlert({
  visible,
  title,
  message,
  buttons,
  onClose,
}: GlassAlertProps) {
  const btns =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: "OK", onPress: onClose }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView
          intensity={40}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.card}>
          {/* ambient glow */}
          <View style={styles.glow} />

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.divider} />

          <View
            style={[
              styles.btnRow,
              btns.length === 1 && styles.btnRowCenter,
              btns.length >= 3 && styles.btnRowStacked,
            ]}
          >
            {btns.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.btn,
                  btns.length < 3 && styles.btnRowItem,
                  btn.style === "cancel" && styles.btnCancel,
                  btn.style === "destructive" && styles.btnDestructive,
                ]}
                onPress={() => {
                  onClose();
                  btn.onPress?.();
                }}
              >
                <Text
                  style={[
                    styles.btnText,
                    btn.style === "cancel" && styles.btnTextCancel,
                    btn.style === "destructive" && styles.btnTextDestructive,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── hook for easy use ────────────────────────────────────────────────────────

export function useGlassAlert() {
  const [visible, setVisible] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [buttons, setButtons] = React.useState<GlassAlertButton[]>([]);

  const show = React.useCallback(
    (t: string, m: string, btns?: GlassAlertButton[]) => {
      setTitle(t);
      setMessage(m);
      setButtons(btns ?? [{ text: "OK" }]);
      setVisible(true);
    },
    [],
  );

  const hide = React.useCallback(() => setVisible(false), []);

  const element = (
    <GlassAlert
      visible={visible}
      title={title}
      message={message}
      buttons={buttons}
      onClose={hide}
    />
  );

  return { show, hide, element };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    padding: 28,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -40,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(139,92,246,0.18)",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
  btnRowCenter: {
    justifyContent: "center",
  },
  btnRowStacked: {
    flexDirection: "column",
    gap: 10,
  },
  btn: {
    backgroundColor: "rgba(139,92,246,0.85)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRowItem: {
    flex: 1,
  },
  btnCancel: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  btnDestructive: {
    backgroundColor: "rgba(239,68,68,0.75)",
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
  },
  btnTextCancel: { color: "#94A3B8" },
  btnTextDestructive: { color: "#FFFFFF" },
});

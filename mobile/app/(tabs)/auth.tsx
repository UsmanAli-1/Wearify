import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL1 } from "@/constants/config";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
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

  const showAlert = (
    title: string,
    message: string,
    buttons?: GlassAlertButton[],
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertButtons(buttons ?? [{ text: "OK" }]);
    setAlertVisible(true);
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

        await AsyncStorage.setItem("authToken", response.data.token);
        await AsyncStorage.setItem(
          "userId",
          response.data.user?.id ?? response.data.user?._id ?? "",
        );

        showAlert("Welcome back! 👋", "You've successfully signed in.", [
          {
            text: "Let's Go",
            onPress: () => router.replace("/dashboard"),
          },
        ]);
      } else {
        await axios.post(
          `${API_URL1}/`,
          { name, email: email.toLowerCase(), phone, password },
          { headers: { "Bypass-Tunnel-Reminder": "true" } },
        );

        showAlert(
          "Account Created! 🎉",
          "You can now log in with your credentials.",
          [
            {
              text: "Sign In",
              onPress: () => setIsLogin(true),
            },
          ],
        );
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

  return (
    <LinearGradient
      colors={["#1c103f", "#080d1a", "#080d1a", "#2d1445"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.backgroundGradient}
    >
      <Starfield />
      <SafeAreaView style={styles.container}>
        <Image
          source={require("../../assets/images/logo1.png")}
          style={{
            width: 64,
            height: 64,
            resizeMode: "contain",
            marginTop: 32,
            marginLeft: 20,
          }}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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
                style={[
                  styles.buttonContainer,
                  isSubmitting && styles.buttonDisabled,
                ]}
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
                  {isLogin
                    ? "Don't have an account? "
                    : "Already have an account? "}
                  <Text style={styles.toggleHighlight}>
                    {isLogin ? "Sign Up" : "Sign In"}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

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
  keyboardView: { flex: 1, padding: 20, paddingTop: 0 },
  headerContainer: { marginBottom: 0, marginTop: 30 },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#8b5cf6",
    marginBottom: 8,
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
    borderRadius: 12,
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
});

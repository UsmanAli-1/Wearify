import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import 'react-native-reanimated';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Starfield from "../../components/Starfield"; // (Adjust the path if you put it in a components folder)

export default function WelcomeScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [hasSeenOnboarding, authToken, lastActiveStr] = await Promise.all([
          AsyncStorage.getItem("hasSeenOnboarding"),
          AsyncStorage.getItem("authToken"),
          AsyncStorage.getItem("lastActiveTime"),
        ]);

        if (hasSeenOnboarding === "true") {
          if (authToken) {
            // Item 10: Check session expiry.
            // If app was closed > 15min ago, force re-login.
            const lastActive = lastActiveStr ? parseInt(lastActiveStr) : 0;
            const elapsed = Date.now() - lastActive;
            const FIFTEEN_MIN = 15 * 60 * 1000;

            if (elapsed > FIFTEEN_MIN) {
              await AsyncStorage.multiRemove(['authToken', 'userId', 'lastActiveTime']);
              router.replace("/auth");
            } else {
              // Update last active time
              await AsyncStorage.setItem('lastActiveTime', Date.now().toString());
              router.replace("/dashboard");
            }
          } else {
            router.replace("/auth");
          }
          return;
        }
      } catch {
        // fall through to show welcome screen
      } finally {
        setChecking(false);
      }
    })();
  }, [router]);

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
    } catch {
      // Non-fatal — worst case the welcome screen shows again next time.
    }
    router.push("/auth");
  };

  if (checking) {
    return (
      <LinearGradient
        colors={["#1c103f", "#080d1a", "#080d1a", "#2d1445"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#1c103f", "#080d1a", "#080d1a", "#2d1445"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.backgroundGradient}
    >
      <Starfield />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/logo1.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={handleGetStarted}
        >
          {/* 2. Restored the visual button inside the TouchableOpacity */}
          <LinearGradient
            colors={["#8b5cf6", "#3b82f6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <Text style={styles.buttonText}>Get Started ✨</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  backgroundGradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent", // 3. Made transparent to reveal the gradient
    justifyContent: "space-between",
    padding: 24,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoImage: {
    width: 200,
    height: 200,
  },
  buttonContainer: {
    width: "100%",
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  gradient: {
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});

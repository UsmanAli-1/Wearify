import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
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
} from "react-native-reanimated";
import Starfield from "../components/Starfield";

export default function AboutUsScreen() {
  const router = useRouter();

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
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>About Us</Text>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View entering={FadeIn.delay(100).duration(350)}>
            <Text style={styles.intro}>
              We&apos;re building an AI-powered fashion assistant that helps you
              discover what truly suits you. Upload your picture, and our system
              analyzes your body type and skin tone to recommend perfect
              outfits.
            </Text>
            <Text style={[styles.intro, styles.introSpacing]}>
              You can also try on any garment you like — our Virtual Try-On
              technology shows a realistic preview of how it will look on you.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(180).duration(350)}
            style={styles.goalCard}
          >
            <Text style={styles.goalLabel}>Our goal is simple:</Text>
            <Text style={styles.goalText}>
              &quot;Make online shopping personal, smart, and
              confidence-boosting.&quot;
            </Text>
          </Animated.View>

          {/* Project Title */}
          <Animated.View
            entering={FadeInUp.delay(220).duration(350)}
            style={styles.card}
          >
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: "rgba(139,92,246,0.25)" },
              ]}
            >
              <Ionicons name="sparkles" size={20} color="#c4b5fd" />
            </View>
            <Text style={styles.cardTitle}>Project Title</Text>
            <Text style={styles.cardBody}>
              Wearify - AI-Powered Virtual Try-On System
            </Text>

            <View style={styles.footerBadge}>
              <Ionicons name="school-outline" size={14} color="#c4b5fd" />
              <Text style={styles.footerBadgeText}>
                Final Year Project — B.S. Computer Science, Iqra University
              </Text>
            </View>
          </Animated.View>

          {/* Our Team */}
          <Animated.View
            entering={FadeInUp.delay(280).duration(350)}
            style={styles.card}
          >
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: "rgba(59,130,246,0.25)" },
              ]}
            >
              <Ionicons name="people" size={20} color="#93c5fd" />
            </View>
            <Text style={styles.cardTitle}>Our Team</Text>

            <View style={styles.memberRow}>
              <Text style={styles.memberLabel}>Member 1: </Text>
              <Text style={styles.memberValue}>
                Usman Ali – [23237] - &quot;LEADER&quot;
              </Text>
            </View>
            <View style={styles.memberRow}>
              <Text style={styles.memberLabel}>Member 2: </Text>
              <Text style={styles.memberValue}>Adil Usman – [23151]</Text>
            </View>
            <View style={styles.memberRow}>
              <Text style={styles.memberLabel}>Member 3: </Text>
              <Text style={styles.memberValue}>Syed Rohan Shah – [23166]</Text>
            </View>
            <View style={styles.memberRow}>
              <Text style={styles.memberLabel}>Member 4: </Text>
              <Text style={styles.memberValue}>Hadia Rafiq – [25195]</Text>
            </View>
          </Animated.View>

          {/* Supervisor */}
          <Animated.View
            entering={FadeInUp.delay(340).duration(350)}
            style={[styles.card, styles.lastCard]}
          >
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: "rgba(16,185,129,0.25)" },
              ]}
            >
              <Ionicons name="person-circle" size={20} color="#6ee7b7" />
            </View>
            <Text style={styles.cardTitle}>Supervisor</Text>
            <Text style={styles.supervisorName}>Dr. Saad Ahmed</Text>
            <Text style={styles.cardBody}>
              Head of Department – Computer Science
            </Text>
            <Text style={styles.cardBody}>Iqra University</Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  backgroundGradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },

  headerCard: { marginTop: 50, marginBottom: 16 },
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
  headerTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },

  scrollContent: { paddingBottom: 40 },

  intro: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  introSpacing: { marginTop: 12 },

  goalCard: {
    marginTop: 24,
    alignItems: "center",
  },
  goalLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  goalText: {
    color: "#d8b4fe",
    fontSize: 14,
    fontStyle: "italic",
    fontWeight: "600",
    textAlign: "center",
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginTop: 20,
  },
  lastCard: { marginBottom: 8 },

  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  cardBody: { color: "#94A3B8", fontSize: 13, lineHeight: 20 },

  footerBadge: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  footerBadgeText: {
    color: "#c4b5fd",
    fontSize: 12,
    flex: 1,
    flexWrap: "wrap",
  },

  memberRow: { flexDirection: "row", marginBottom: 6, flexWrap: "wrap" },
  memberLabel: { color: "#94A3B8", fontSize: 13, fontWeight: "700" },
  memberValue: { color: "#E2E8F0", fontSize: 13, flexShrink: 1 },

  supervisorName: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
});

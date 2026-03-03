// ============================================
// Welcome/Landing Screen
// First screen users see - Login or Register
// ============================================

import { useAppStore } from "@/store/appStore";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAppStore();

  useEffect(() => {
    // Wait for initialization to complete
    if (!isInitialized) return;

    // If already authenticated, go to home
    if (isAuthenticated) {
      console.log("User authenticated, redirecting to tabs");
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isInitialized, router]);

  const handleLogin = () => {
    router.push("/auth/login");
  };

  const handleRegister = () => {
    router.push("/auth/register");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.appIcon}>🌟</Text>
        <Text style={styles.appName}>MyLife</Text>
        <Text style={styles.tagline}>Your life, organized in one place</Text>
      </View>

      {/* Features Grid */}
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Everything you need</Text>

        <View style={styles.featuresGrid}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>👤</Text>
            <Text style={styles.featureText}>Profile</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.featureText}>Family</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🛒</Text>
            <Text style={styles.featureText}>Shopping</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>❤️</Text>
            <Text style={styles.featureText}>Health</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>💡</Text>
            <Text style={styles.featureText}>Utility</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✅</Text>
            <Text style={styles.featureText}>To-Do</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>💰</Text>
            <Text style={styles.featureText}>Finance</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📅</Text>
            <Text style={styles.featureText}>Events</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleRegister}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>🚀 Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>
            🔐 I already have an account
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Organize your life with ease</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  appIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 18,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: 40,
  },
  featuresTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 24,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  featureItem: {
    width: 80,
    alignItems: "center",
  },
  featureIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    textAlign: "center",
  },
  actionsContainer: {
    gap: 16,
    marginTop: "auto",
  },
  primaryButton: {
    backgroundColor: "#4ECDC4",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "white",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#4ECDC4",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4ECDC4",
    textAlign: "center",
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
});

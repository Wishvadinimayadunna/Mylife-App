// ============================================
// MyLife Dashboard - Main Home Screen
// Shows all 8 modules with navigation
// ============================================

import futureEventService from "@/services/futureEventService";
import profileService from "@/services/profileService";
import shoppingService from "@/services/shoppingService";
import todoService from "@/services/todoService";
import utilityService from "@/services/utilityService";
import { useAppStore } from "@/store/appStore";
import { requestNotificationPermissions } from "@/utils/notifications";
import { clearAuthToken } from "@/utils/storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Module configuration - Professional color scheme
const modules = [
  {
    id: "profile",
    name: "Profile",
    icon: "👤",
    color: "#1E3A8A",
    route: "/profile",
  },
  {
    id: "family",
    name: "Family",
    icon: "👨‍👩‍👧‍👦",
    color: "#1E40AF",
    route: "/family",
  },
  {
    id: "shopping",
    name: "Shopping",
    icon: "🛒",
    color: "#0369A1",
    route: "/shopping",
  },
  {
    id: "health",
    name: "Health",
    icon: "❤️",
    color: "#0F766E",
    route: "/health",
  },
  {
    id: "utility",
    name: "Utility",
    icon: "💡",
    color: "#0E7490",
    route: "/utility",
  },
  {
    id: "todo",
    name: "To-Do List",
    icon: "✅",
    color: "#334155",
    route: "/todo",
  },
  {
    id: "finance",
    name: "Finance",
    icon: "💰",
    color: "#065F46",
    route: "/finance",
  },
  {
    id: "future-event",
    name: "Future Events",
    icon: "📅",
    color: "#1F2937",
    route: "/future-event",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const {
    profile,
    setProfile,
    isInitialized,
    setIsInitialized,
    isAuthenticated,
    clearAuth,
  } = useAppStore();
  const [quickStats, setQuickStats] = useState({
    tasks: 0,
    bills: 0,
    events: 0,
    shopping: 0,
  });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    if (isInitialized) return;

    // Request notification permissions
    await requestNotificationPermissions();

    // Load profile
    const profileData = await profileService.getProfile();
    setProfile(profileData);

    if (profileData) {
      await loadQuickStats();
    }

    setIsInitialized(true);
  };

  const loadQuickStats = async () => {
    try {
      const [pendingTasks, unpaidBills, events, shoppingItems] = await Promise.all([
        todoService.getPendingTasks(),
        utilityService.getUnpaidBills(),
        futureEventService.getFutureEvents(),
        shoppingService.getShoppingItems(""),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingEvents = events.filter((event) => {
        const eventDate = new Date(event.eventDate);
        if (Number.isNaN(eventDate.getTime())) {
          return false;
        }
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today && !event.completedAt;
      });

      const activeShoppingItems = shoppingItems.filter((item) => !item.isBought);

      setQuickStats({
        tasks: pendingTasks.length,
        bills: unpaidBills.length,
        events: upcomingEvents.length,
        shopping: activeShoppingItems.length,
      });
    } catch (error) {
      console.error("Load quick stats error:", error);
    }
  };

  const handleModulePress = (route: string) => {
    router.push(route as any);
  };

  const handleLogin = () => {
    router.push("/auth/login");
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          // Clear auth state
          clearAuth();
          setProfile(null);
          setIsInitialized(false);

          // Clear stored token
          await clearAuthToken();

          // Navigate to login
          router.replace("/auth/login");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>MyLife</Text>
          <Text style={styles.subtitle}>
            {profile
              ? `Welcome back, ${profile.fullName}! 👋`
              : "Your life, organized in one place 🌟"}
          </Text>

          {/* Login/Logout Button */}
          {isAuthenticated ? (
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutButtonText}>🚪 Logout</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>🔐 Login</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Modules Grid - Centered and Balanced */}
        <View style={styles.gridContainer}>
          <View style={styles.grid}>
            {modules.map((module) => (
              <TouchableOpacity
                key={module.id}
                style={[styles.moduleCard, { backgroundColor: module.color }]}
                onPress={() => handleModulePress(module.route)}
                activeOpacity={0.8}
              >
                <View style={styles.moduleContent}>
                  <Text style={styles.moduleIcon}>{module.icon}</Text>
                  <Text style={styles.moduleName}>{module.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Overview - Bottom Section */}
        {profile && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>📊 Quick Overview</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>✅</Text>
                <Text style={styles.statValue}>{quickStats.tasks}</Text>
                <Text style={styles.statLabel}>Tasks</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>💰</Text>
                <Text style={styles.statValue}>{quickStats.bills}</Text>
                <Text style={styles.statLabel}>Bills</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>📅</Text>
                <Text style={styles.statValue}>{quickStats.events}</Text>
                <Text style={styles.statLabel}>Events</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>🛒</Text>
                <Text style={styles.statValue}>{quickStats.shopping}</Text>
                <Text style={styles.statLabel}>Shopping</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E5E7EB",
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 12,
  },
  header: {
    marginBottom: 12,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 6,
    letterSpacing: -1,
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: "#1F2937",
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
  },
  logoutButton: {
    marginTop: 8,
    backgroundColor: "#374151",
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  logoutButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 16,
  },
  hint: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    fontWeight: "500",
  },
  gridContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    width: "100%",
    maxWidth: 360,
  },
  moduleCard: {
    width: 170,
    height: 120,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  moduleContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  moduleIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  moduleName: {
    fontSize: 13,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  statsContainer: {
    marginTop: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },
});

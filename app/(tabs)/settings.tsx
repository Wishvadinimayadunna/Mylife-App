// ============================================
// Settings Screen — App preferences + Logout
// ============================================

import { useAppStore } from "@/store/appStore";
import { clearAuthToken } from "@/utils/storage";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const STATUS_H = Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 44;

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, clearAuth, setProfile, setIsInitialized } = useAppStore();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          clearAuth();
          setProfile(null);
          setIsInitialized(false);
          await clearAuthToken();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const initials = profile ? getInitials(profile.fullName) : "?";

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1E2340" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile card */}
        {profile && (
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitials}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.profileName}>{profile.fullName}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
            </View>
          </View>
        )}

        {/* App info */}
        <View style={styles.group}>
          <Text style={styles.groupLabel}>APP INFO</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>{Platform.OS}</Text>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.group}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#1E2340",
    paddingTop: STATUS_H + 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  scroll: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Profile card
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 16,
    marginBottom: 24,
    gap: 14,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitials: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4F46E5",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 3,
  },
  profileEmail: {
    fontSize: 13,
    color: "#94A3B8",
  },

  // Groups
  group: {
    marginBottom: 20,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.0,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 0,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: -1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    color: "#94A3B8",
  },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 15,
    gap: 8,
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC2626",
  },
});

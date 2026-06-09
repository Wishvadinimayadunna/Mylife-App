// ============================================
// Settings Screen — App preferences + Logout
// Includes partner account linking for data sharing
// ============================================

import { linkPartner, unlinkPartner } from "@/services/authService";
import { useAppStore } from "@/store/appStore";
import { clearAuthToken } from "@/utils/storage";
import api from "@/utils/api";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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

  // Partner link state
  const [partnerEmail, setPartnerEmail] = useState("");
  const [linkedPartner, setLinkedPartner] = useState<{
    id: string; email: string; fullName: string;
  } | null>(null);
  const [linking, setLinking] = useState(false);
  const [loadingPartner, setLoadingPartner] = useState(true);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchPartnerStatus();
    });
    return () => task.cancel();
  }, []);

  const fetchPartnerStatus = async () => {
    try {
      setLoadingPartner(true);
      const res = await api.get("/auth/me");
      const user = res.data;
      if (user.linkedUserId) {
        // Fetch partner's profile using a dedicated endpoint
        // For now we display the linkedUserId with a placeholder
        setLinkedPartner({ id: user.linkedUserId, email: user.linkedEmail || "", fullName: user.linkedFullName || "Partner" });
      } else {
        setLinkedPartner(null);
      }
    } catch {
      setLinkedPartner(null);
    } finally {
      setLoadingPartner(false);
    }
  };

  const handleLinkPartner = async () => {
    if (!partnerEmail.trim()) {
      Alert.alert("Error", "Please enter your partner's email address.");
      return;
    }
    setLinking(true);
    try {
      const result = await linkPartner(partnerEmail.trim());
      setLinkedPartner(result.linkedUser);
      setPartnerEmail("");
      Alert.alert("✅ Linked!", result.message);
    } catch (err: any) {
      Alert.alert("Link Failed", err.message);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkPartner = () => {
    Alert.alert(
      "Unlink Partner",
      "Are you sure? Shared data will no longer be visible to either account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: async () => {
            try {
              await unlinkPartner();
              setLinkedPartner(null);
              Alert.alert("Unlinked", "Partner account has been unlinked.");
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ],
    );
  };

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
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1E2340" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.navigate("/(tabs)");
            }
          }}
        >
          <Text style={styles.backBtnTxt}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
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

        {/* ── Partner Linking ──────────────────────────────────── */}
        <View style={styles.group}>
          <Text style={styles.groupLabel}>DATA SHARING</Text>

          <View style={styles.partnerCard}>
            {/* Icon row */}
            <View style={styles.partnerIconRow}>
              <View style={styles.partnerIconBox}>
                <Text style={styles.partnerIcon}>🔗</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.partnerCardTitle}>Link with Partner</Text>
                <Text style={styles.partnerCardSub}>
                  Share shopping, events, tasks &amp; utility bills
                </Text>
              </View>
            </View>

            {loadingPartner ? (
              <ActivityIndicator
                color="#4F46E5"
                style={{ marginTop: 12 }}
              />
            ) : linkedPartner ? (
              /* Already linked */
              <View>
                <View style={styles.linkedBadge}>
                  <Text style={styles.linkedDot}>●</Text>
                  <Text style={styles.linkedBadgeText}>
                    Linked with{" "}
                    <Text style={styles.linkedName}>
                      {linkedPartner.fullName || linkedPartner.email || "Partner"}
                    </Text>
                  </Text>
                </View>

                {/* Shared modules */}
                <View style={styles.sharedModules}>
                  {["🛒 Shopping", "📅 Events", "✅ To-Do", "⚡ Utility"].map(
                    (m) => (
                      <View key={m} style={styles.sharedChip}>
                        <Text style={styles.sharedChipText}>{m}</Text>
                      </View>
                    ),
                  )}
                </View>

                <TouchableOpacity
                  style={styles.unlinkBtn}
                  onPress={handleUnlinkPartner}
                  activeOpacity={0.8}
                >
                  <Text style={styles.unlinkBtnText}>Unlink Partner</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Not linked yet */
              <View style={{ marginTop: 14, gap: 10 }}>
                <Text style={styles.inputLabel}>{"Partner's email address"}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="partner@example.com"
                  placeholderTextColor="#94A3B8"
                  value={partnerEmail}
                  onChangeText={setPartnerEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={handleLinkPartner}
                />
                <TouchableOpacity
                  style={[styles.linkBtn, linking && { opacity: 0.7 }]}
                  onPress={handleLinkPartner}
                  activeOpacity={0.8}
                  disabled={linking}
                >
                  {linking ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.linkBtnText}>🔗  Link Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

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
    </KeyboardAvoidingView>
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
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    marginRight: 14,
    padding: 4,
  },
  backBtnTxt: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "500",
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

  // Partner card
  partnerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    padding: 16,
  },
  partnerIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  partnerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  partnerIcon: {
    fontSize: 20,
  },
  partnerCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  partnerCardSub: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "400",
  },

  // Linked state
  linkedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 14,
    gap: 6,
  },
  linkedDot: {
    color: "#16A34A",
    fontSize: 10,
  },
  linkedBadgeText: {
    fontSize: 13,
    color: "#15803D",
    fontWeight: "500",
  },
  linkedName: {
    fontWeight: "700",
  },
  sharedModules: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  sharedChip: {
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  sharedChipText: {
    fontSize: 11,
    color: "#4F46E5",
    fontWeight: "600",
  },
  unlinkBtn: {
    marginTop: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    paddingVertical: 11,
    alignItems: "center",
  },
  unlinkBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },

  // Input
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: -4,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#1E293B",
  },
  linkBtn: {
    backgroundColor: "#4F46E5",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  linkBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // Info rows
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

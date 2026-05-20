// ============================================
// Alerts Screen — Notification center
// ============================================

import React from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

const STATUS_H = Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 44;

export default function AlertsScreen() {
  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
      </View>

      {/* Empty state */}
      <View style={styles.body}>
        <Text style={styles.emptyIcon}>🔔</Text>
        <Text style={styles.emptyTitle}>No new alerts</Text>
        <Text style={styles.emptyDesc}>
          You're all caught up! Reminders for tasks, bills, and events will
          appear here.
        </Text>
      </View>
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
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    marginTop: -60,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 21,
  },
});

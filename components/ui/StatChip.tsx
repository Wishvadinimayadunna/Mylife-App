import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

export type StatChipType = "success" | "warning" | "danger" | "info" | "default";

interface StatChipProps {
  count: string | number;
  label: string;
  type?: StatChipType;
  style?: StyleProp<ViewStyle>;
}

export function StatChip({ count, label, type = "default", style }: StatChipProps) {
  const getColors = () => {
    switch (type) {
      case "success":
        return { bg: "#D1FAE5", text: "#10B981" };
      case "warning":
        return { bg: "#FEF3C7", text: "#F59E0B" };
      case "danger":
        return { bg: "#FEE2E2", text: "#EF4444" };
      case "info":
        return { bg: "#DBEAFE", text: "#3B82F6" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.chip, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.count, { color: colors.text }]}>{count}</Text>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    fontSize: 16,
    fontWeight: "800",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});

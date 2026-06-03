import React from "react";
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  emoji = "📋",
  title,
  subtitle,
  actionText,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.emptyContainer, style]}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
      {actionText && onAction ? (
        <TouchableOpacity style={styles.emptyBtn} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.emptyBtnTxt}>{actionText}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface LoadingStateProps {
  color?: string;
  size?: "small" | "large";
  style?: StyleProp<ViewStyle>;
}

export function LoadingState({ color = "#3B82F6", size = "large", style }: LoadingStateProps) {
  return (
    <View style={[styles.loadingContainer, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 12,
  },
  emptyBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  emptyBtnTxt: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});

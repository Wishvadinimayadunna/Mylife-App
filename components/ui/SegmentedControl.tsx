import React from "react";
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";

interface TabOption {
  id: string;
  label: string;
}

interface SegmentedControlProps {
  tabs: TabOption[];
  activeTab: string;
  onChange: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl({ tabs, activeTab, onChange, style }: SegmentedControlProps) {
  return (
    <View style={[styles.container, style]}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.text, isActive && styles.textActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  pillActive: {
    backgroundColor: "#3B82F6",
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  textActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

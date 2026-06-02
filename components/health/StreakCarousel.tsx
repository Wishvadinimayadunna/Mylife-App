// ============================================
// StreakCarousel — horizontal scroll of streak tracking cards
// ============================================

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

interface StreakData {
  waterStreak: number;
  sleepStreak: number;
  medsStreak: number;
  wellnessStreak: number;
}

const STREAKS = [
  { key: "wellnessStreak", emoji: "🔥", label: "Wellness", sublabel: "Score ≥ 70", color: "#F97316", bg: "#FFF7ED" },
  { key: "waterStreak", emoji: "💧", label: "Hydration", sublabel: "≥ 1500ml daily", color: "#0EA5E9", bg: "#F0F9FF" },
  { key: "sleepStreak", emoji: "😴", label: "Sleep", sublabel: "≥ 7h per night", color: "#7C3AED", bg: "#F5F3FF" },
  { key: "medsStreak", emoji: "💊", label: "Medicines", sublabel: "100% daily", color: "#10B981", bg: "#F0FDF4" },
] as const;

export default function StreakCarousel({ waterStreak, sleepStreak, medsStreak, wellnessStreak }: StreakData) {
  const values: Record<string, number> = { waterStreak, sleepStreak, medsStreak, wellnessStreak };

  return (
    <View>
      <Text style={s.sectionLabel}>STREAKS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {STREAKS.map((streak) => {
          const days = values[streak.key] ?? 0;
          return (
            <View key={streak.key} style={[s.card, { backgroundColor: streak.bg, borderColor: streak.color + "40" }]}>
              <Text style={s.emoji}>{streak.emoji}</Text>
              <Text style={[s.days, { color: days > 0 ? streak.color : "#D1D5DB" }]}>
                {days}
              </Text>
              <Text style={s.unit}>day{days !== 1 ? "s" : ""}</Text>
              <Text style={s.label}>{streak.label}</Text>
              <Text style={s.sub}>{streak.sublabel}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
    letterSpacing: 1.1,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  scroll: {
    gap: 10,
    paddingRight: 4,
  },
  card: {
    width: 110,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
  },
  emoji: {
    fontSize: 26,
    marginBottom: 6,
  },
  days: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 30,
  },
  unit: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "400",
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
    textAlign: "center",
  },
  sub: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "400",
    textAlign: "center",
  },
});

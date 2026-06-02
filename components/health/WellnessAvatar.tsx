// ============================================
// WellnessAvatar — Animated emoji avatar with state-driven expressions
// Uses React Native core Animated API only — no Reanimated
// ============================================

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface Props {
  score: number;
  waterML: number;
  sleepHours: number;
  hasSevereSymptom: boolean;
}

type AvatarState = "happy" | "hydrated" | "sleepy" | "low_energy" | "sick";

function getState(score: number, waterML: number, sleepHours: number, hasSevereSymptom: boolean): AvatarState {
  if (hasSevereSymptom || score < 30) return "sick";
  if (score < 50 && waterML < 1000) return "low_energy";
  if (sleepHours > 0 && sleepHours < 6) return "sleepy";
  if (waterML >= 2000) return "hydrated";
  if (score >= 75) return "happy";
  return "happy";
}

const AVATAR_CONFIG: Record<AvatarState, {
  emoji: string;
  label: string;
  labelColor: string;
  glowColor: string;
  message: string;
}> = {
  happy: {
    emoji: "😊",
    label: "Feeling Great",
    labelColor: "#10B981",
    glowColor: "#D1FAE5",
    message: "You're on fire today!",
  },
  hydrated: {
    emoji: "💧",
    label: "Well Hydrated",
    labelColor: "#0EA5E9",
    glowColor: "#E0F2FE",
    message: "Hydration goal achieved!",
  },
  sleepy: {
    emoji: "😴",
    label: "Needs Rest",
    labelColor: "#7C3AED",
    glowColor: "#EDE9FE",
    message: "Try to get 7–8 hours tonight",
  },
  low_energy: {
    emoji: "🔋",
    label: "Low Energy",
    labelColor: "#D97706",
    glowColor: "#FEF3C7",
    message: "Drink water & take a break",
  },
  sick: {
    emoji: "🌡️",
    label: "Under the Weather",
    labelColor: "#EF4444",
    glowColor: "#FEE2E2",
    message: "Take care of yourself today",
  },
};

export default function WellnessAvatar({ score, waterML, sleepHours, hasSevereSymptom }: Props) {
  const state = getState(score, waterML, sleepHours, hasSevereSymptom);
  const cfg = AVATAR_CONFIG[state];

  // Gentle pulse animation
  const pulse = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    // Float loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -6, duration: 1200, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      pulse.stopAnimation();
      float.stopAnimation();
    };
  }, [state]);

  return (
    <View style={s.wrapper}>
      <Animated.View
        style={[
          s.glowRing,
          { backgroundColor: cfg.glowColor, transform: [{ scale: pulse }] },
        ]}
      />
      <Animated.View style={{ transform: [{ translateY: float }] }}>
        <Text style={s.emoji}>{cfg.emoji}</Text>
      </Animated.View>
      <View style={s.textArea}>
        <Text style={[s.label, { color: cfg.labelColor }]}>{cfg.label}</Text>
        <Text style={s.message}>{cfg.message}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    paddingVertical: 8,
  },
  glowRing: {
    position: "absolute",
    top: 0,
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  emoji: {
    fontSize: 52,
    lineHeight: 60,
    marginBottom: 8,
  },
  textArea: {
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  message: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
    textAlign: "center",
  },
});

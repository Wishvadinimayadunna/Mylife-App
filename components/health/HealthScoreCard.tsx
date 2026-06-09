// ============================================
// HealthScoreCard — View-based circular progress ring
// No external SVG dependencies
// ============================================

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { AppCard } from "../ui/AppCard";

interface Props {
  score: number; // 0–100
  waterML: number;
  sleepHours: number;
  medsCompliance: number; // 0–1
  moodLogged: boolean;
}

function getMotivation(score: number): string {
  if (score >= 90) return "You're unstoppable today! 🔥";
  if (score >= 75) return "Crushing it — keep the momentum! 💪";
  if (score >= 60) return "Good progress, a bit more to go 👍";
  if (score >= 40) return "Let's get hydrated and moving 💧";
  if (score >= 20) return "Small steps forward today 🌱";
  return "Start fresh — every action counts ✨";
}

function getScoreColor(score: number): string {
  if (score >= 75) return "#10B981";
  if (score >= 50) return "#F59E0B";
  if (score >= 25) return "#EF4444";
  return "#9CA3AF";
}

export default function HealthScoreCard({ score, waterML, sleepHours, medsCompliance, moodLogged }: Props) {
  const animScore = useRef(new Animated.Value(0)).current;
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));
  const color = getScoreColor(clampedScore);

  useEffect(() => {
    Animated.timing(animScore, {
      toValue: clampedScore,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [clampedScore]);

  // Pure View-based progress ring using two half-circles
  // Each half is a clipped View rotated to fill the arc
  const fillDeg = (clampedScore / 100) * 360;
  const leftRotation = Math.min(fillDeg, 180);
  const rightRotation = fillDeg > 180 ? fillDeg - 180 : 0;

  const RING_SIZE = 130;
  const RING_BORDER = 14;
  const INNER_SIZE = RING_SIZE - RING_BORDER * 2;

  return (
    <AppCard style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <View style={s.ringArea}>
        {/* Base grey ring */}
        <View style={[s.ringBase, { width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderColor: "#F3F4F6", borderWidth: RING_BORDER }]}>
          {/* Right half clip */}
          <View style={[s.halfClip, { left: RING_SIZE / 2 }]}>
            <View
              style={[
                s.halfFill,
                {
                  width: RING_SIZE / 2,
                  height: RING_SIZE,
                  borderTopRightRadius: RING_SIZE / 2,
                  borderBottomRightRadius: RING_SIZE / 2,
                  backgroundColor: rightRotation > 0 ? color : "transparent",
                  transform: [{ rotate: `${rightRotation}deg` }],
                  transformOrigin: "0% 50%",
                },
              ]}
            />
          </View>
          {/* Left half clip */}
          <View style={[s.halfClip, { right: RING_SIZE / 2 }]}>
            <View
              style={[
                s.halfFill,
                {
                  width: RING_SIZE / 2,
                  height: RING_SIZE,
                  borderTopLeftRadius: RING_SIZE / 2,
                  borderBottomLeftRadius: RING_SIZE / 2,
                  backgroundColor: leftRotation > 0 ? color : "transparent",
                  transform: [{ rotate: `${-(180 - leftRotation)}deg` }],
                  transformOrigin: "100% 50%",
                },
              ]}
            />
          </View>
          {/* White center hole */}
          <View
            style={{
              position: "absolute",
              top: RING_BORDER,
              left: RING_BORDER,
              width: INNER_SIZE,
              height: INNER_SIZE,
              borderRadius: INNER_SIZE / 2,
              backgroundColor: "#fff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={[s.scoreNum, { color }]}>{clampedScore}</Text>
            <Text style={s.scoreLabel}>/ 100</Text>
          </View>
        </View>
      </View>

      <View style={s.rightSide}>
        <Text style={s.title}>Wellness Score</Text>
        <Text style={s.motivation}>{getMotivation(clampedScore)}</Text>

        {/* Breakdown bars */}
        <View style={s.breakdown}>
          <ScoreRow label="💧 Hydration" value={Math.min(waterML / 2000, 1)} color="#0EA5E9" />
          <ScoreRow label="😴 Sleep" value={sleepHours > 0 ? Math.min(sleepHours / 8, 1) : 0} color="#7C3AED" />
          <ScoreRow label="💊 Meds" value={medsCompliance} color="#10B981" />
          <ScoreRow label="😊 Mood" value={moodLogged ? 1 : 0} color="#F59E0B" />
        </View>
      </View>
    </AppCard>
  );
}

function ScoreRow({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
        <Text style={{ fontSize: 10, color: "#6B7280", fontWeight: "400" }}>{label}</Text>
        <Text style={{ fontSize: 10, color, fontWeight: "500" }}>{pct}%</Text>
      </View>
      <View style={{ height: 4, backgroundColor: "#F3F4F6", borderRadius: 2 }}>
        <View style={{ height: 4, width: `${pct}%`, backgroundColor: color, borderRadius: 2 }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  ringArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringBase: {
    position: "relative",
    overflow: "hidden",
  },
  halfClip: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "50%",
    overflow: "hidden",
  },
  halfFill: {
    position: "absolute",
    top: 0,
  },
  scoreNum: {
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 32,
  },
  scoreLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  rightSide: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  motivation: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "400",
    marginBottom: 10,
  },
  breakdown: {},
});

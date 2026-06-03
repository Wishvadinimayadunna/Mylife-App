// ============================================
// CycleInsightsCard — Period statistics summary card
// ============================================

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "../ui/AppCard";

const PINK = "#DB2777";

interface Props {
  periods: any[];
}

export default function CycleInsightsCard({ periods }: Props) {
  if (periods.length === 0) {
    return (
      <AppCard stripeColor={PINK}>
        <Text style={s.title}>🌸 Cycle Insights</Text>
        <View style={s.emptyBox}>
          <Text style={s.emptyEmoji}>🌸</Text>
          <Text style={s.emptyTxt}>Log your first period to see insights</Text>
        </View>
      </AppCard>
    );
  }

  // Deduplicate cycles (same logic as existing screen)
  const sorted = [...periods].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
  const uniqueCycles: any[] = [];
  sorted.forEach((record) => {
    const date = new Date(record.startDate);
    const isClose = uniqueCycles.some((c) => {
      const diffDays = Math.abs((new Date(c.startDate).getTime() - date.getTime()) / 86400000);
      return diffDays < 15;
    });
    if (!isClose) uniqueCycles.push(record);
  });

  let avgCycle = 28;
  let isCalculated = false;
  if (uniqueCycles.length >= 2) {
    const diffs = uniqueCycles.slice(0, -1).map((_, i) =>
      Math.round(
        (new Date(uniqueCycles[i].startDate).getTime() - new Date(uniqueCycles[i + 1].startDate).getTime()) /
        86400000
      )
    );
    const valid = diffs.filter((d) => d > 0);
    if (valid.length > 0) {
      avgCycle = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
      isCalculated = true;
    }
  }

  const today = new Date();
  let daysUntilNext: number | string = "—";
  let nextDateStr = "";
  if (uniqueCycles.length > 0) {
    const nextDate = new Date(
      new Date(uniqueCycles[0].startDate).getTime() + avgCycle * 86400000
    );
    nextDateStr = nextDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const diff = Math.round((nextDate.getTime() - today.getTime()) / 86400000);
    if (diff === 0) daysUntilNext = "Today";
    else if (diff < 0) daysUntilNext = "Overdue";
    else daysUntilNext = diff;
  }

  // Cycle day
  let cycleDay: number | string = "—";
  if (uniqueCycles.length > 0) {
    cycleDay = Math.round((Date.now() - new Date(uniqueCycles[0].startDate).getTime()) / 86400000) + 1;
    if ((cycleDay as number) > avgCycle) cycleDay = "—";
  }

  // Average duration
  let avgDuration = "—";
  const durationArr = periods
    .filter((p) => p.endDate)
    .map((p) =>
      Math.round((new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / 86400000) + 1
    );
  if (durationArr.length > 0) {
    avgDuration = `${Math.round(durationArr.reduce((a, b) => a + b, 0) / durationArr.length)}d`;
  }

  const stats = [
    { label: "Avg Cycle", value: isCalculated ? `${avgCycle}d` : "~28d", hint: isCalculated ? "Calculated" : "Default" },
    { label: "Cycle Day", value: cycleDay, hint: "Current day" },
    { label: "Next Period", value: daysUntilNext, hint: nextDateStr || (isCalculated ? "Predicted" : "Est.") },
    { label: "Avg Duration", value: avgDuration, hint: "Period length" },
  ];

  return (
    <AppCard stripeColor={PINK}>
      <Text style={s.title}>🌸 Cycle Insights</Text>
      <View style={s.row}>
        {stats.map((stat) => (
          <View key={stat.label} style={s.statBox}>
            <Text style={[s.statValue, typeof stat.value === "number" || (typeof stat.value === "string" && stat.value !== "—") ? { color: PINK } : { color: "#D1D5DB" }]}>
              {stat.value}
            </Text>
            <Text style={s.statLabel}>{stat.label}</Text>
            <Text style={s.statHint}>{stat.hint}</Text>
          </View>
        ))}
      </View>
    </AppCard>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#FBD5E8",
    padding: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFF0F7",
    borderRadius: 12,
    padding: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 2,
  },
  statHint: {
    fontSize: 9,
    color: "#D97706",
    fontWeight: "400",
    textAlign: "center",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTxt: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "400",
  },
});

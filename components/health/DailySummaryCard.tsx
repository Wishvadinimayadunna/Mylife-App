// ============================================
// DailySummaryCard — Today's activity feed
// Chronological log of health events with category colors
// ============================================

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "../ui/AppCard";

interface FeedEntry {
  id: string;
  time: string; // "HH:MM AM/PM"
  icon: string;
  title: string;
  color: string;
}

interface Props {
  entries: FeedEntry[];
}

export function buildTodayFeed(
  waterLogs: any[],
  sleepLogs: any[],
  moods: any[],
  medicines: any[],
  symptoms: any[],
  vitals: any[],
  todayStr: string
): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const today = new Date().toDateString();

  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  // Water logs
  waterLogs
    .filter((l) => new Date(l.recordedAt || l.createdAt).toDateString() === today)
    .forEach((l) => {
      entries.push({
        id: l._id || l.id,
        time: fmt(new Date(l.recordedAt || l.createdAt)),
        icon: "💧",
        title: `Water Intake +${l.amountML}ml`,
        color: "#0EA5E9",
      });
    });

  // Sleep logs
  sleepLogs
    .filter((l) => new Date(l.recordedAt || l.createdAt).toDateString() === today)
    .forEach((l) => {
      entries.push({
        id: l._id || l.id,
        time: fmt(new Date(l.recordedAt || l.createdAt)),
        icon: "😴",
        title: `Sleep Logged · ${l.durationHours}h (${l.quality})`,
        color: "#7C3AED",
      });
    });

  // Mood logs
  moods
    .filter((m) => new Date(m.recordDate || m.createdAt).toDateString() === today)
    .forEach((m) => {
      entries.push({
        id: m._id || m.id,
        time: fmt(new Date(m.recordDate || m.createdAt)),
        icon: "😊",
        title: `Mood · ${m.mood}`,
        color: "#F59E0B",
      });
    });

  // Medicine taken today
  medicines
    .filter((med) => med.takenDates?.includes(todayStr))
    .forEach((med) => {
      entries.push({
        id: (med._id || med.id) + "_taken",
        time: med.reminderTime || "—",
        icon: "💊",
        title: `Medicine Taken · ${med.medicineName}`,
        color: "#10B981",
      });
    });

  // Symptoms today
  symptoms
    .filter((s) => new Date(s.recordDate || s.createdAt).toDateString() === today)
    .forEach((s) => {
      entries.push({
        id: s._id || s.id,
        time: fmt(new Date(s.recordDate || s.createdAt)),
        icon: "🌡️",
        title: `Symptom · ${s.symptomName} (${s.severity})`,
        color: "#EF4444",
      });
    });

  // Vitals today
  vitals
    .filter((v) => new Date(v.recordDate || v.createdAt).toDateString() === today)
    .forEach((v) => {
      const parts = [
        v.bloodPressureSystolic && `BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`,
        v.weight && `${v.weight}kg`,
      ].filter(Boolean);
      entries.push({
        id: v._id || v.id,
        time: fmt(new Date(v.recordDate || v.createdAt)),
        icon: "❤️",
        title: `Vitals · ${parts.join(", ") || "Recorded"}`,
        color: "#2563EB",
      });
    });

  // Sort by time (use raw Date for sorting)
  return entries.sort((a, b) => a.time.localeCompare(b.time));
}

export default function DailySummaryCard({ entries }: Props) {
  return (
    <AppCard>
      <Text style={s.title}>Today's Activity</Text>
      {entries.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>📋</Text>
          <Text style={s.emptyTxt}>No activity logged today yet</Text>
          <Text style={s.emptyHint}>Use quick actions above to get started</Text>
        </View>
      ) : (
        entries.map((entry, idx) => (
          <View key={entry.id} style={s.row}>
            <View style={s.timeline}>
              <View style={[s.dot, { backgroundColor: entry.color }]} />
              {idx < entries.length - 1 && <View style={s.line} />}
            </View>
            <View style={s.content}>
              <Text style={s.timeLabel}>{entry.time}</Text>
              <View style={s.pill}>
                <Text style={{ fontSize: 12, marginRight: 4 }}>{entry.icon}</Text>
                <Text style={[s.entryTitle, { color: entry.color }]}>{entry.title}</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </AppCard>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 14,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTxt: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  row: {
    flexDirection: "row",
    minHeight: 44,
  },
  timeline: {
    width: 24,
    alignItems: "center",
    marginRight: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 1.5,
    backgroundColor: "#F3F4F6",
    marginTop: 4,
    marginBottom: -4,
  },
  content: {
    flex: 1,
    paddingBottom: 12,
  },
  timeLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "400",
    marginBottom: 3,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  entryTitle: {
    fontSize: 12,
    fontWeight: "500",
  },
});

// ============================================
// WellnessTimeline — Full historical feed grouped by date
// Aggregates all health categories with colored category icons
// ============================================

import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface TimelineEntry {
  id: string;
  date: string; // "YYYY-MM-DD"
  displayDate: string;
  time: string;
  icon: string;
  category: string;
  title: string;
  subtitle?: string;
  color: string;
  bg: string;
  raw: any;
  type: string;
}

interface Props {
  entries: TimelineEntry[];
  onDelete: (entry: TimelineEntry) => void;
}

function groupByDate(entries: TimelineEntry[]): { date: string; displayDate: string; items: TimelineEntry[] }[] {
  const map = new Map<string, TimelineEntry[]>();
  entries.forEach((e) => {
    if (!map.has(e.date)) map.set(e.date, []);
    map.get(e.date)!.push(e);
  });

  const sorted = [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  return sorted.map(([date, items]) => ({
    date,
    displayDate: items[0]?.displayDate || date,
    items: items.sort((a, b) => b.time.localeCompare(a.time)),
  }));
}

export function buildTimelineEntries(
  waterLogs: any[],
  sleepLogs: any[],
  moods: any[],
  medicines: any[],
  symptoms: any[],
  vitals: any[],
  periods: any[],
  appointments: any[]
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  const toDateStr = (d: any) => new Date(d).toISOString().split("T")[0];
  const toDisplayDate = (d: any) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const toTime = (d: any) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  waterLogs.forEach((l) => {
    const at = l.recordedAt || l.createdAt;
    entries.push({
      id: "water_" + (l._id || l.id),
      date: toDateStr(at), displayDate: toDisplayDate(at), time: toTime(at),
      icon: "💧", category: "Water", title: `Water Intake`, subtitle: `+${l.amountML}ml`,
      color: "#0EA5E9", bg: "#EFF6FF", raw: l, type: "water",
    });
  });

  sleepLogs.forEach((l) => {
    const at = l.recordedAt || l.createdAt;
    entries.push({
      id: "sleep_" + (l._id || l.id),
      date: toDateStr(at), displayDate: toDisplayDate(at), time: toTime(at),
      icon: "😴", category: "Sleep", title: `Sleep Logged`, subtitle: `${l.durationHours}h · ${l.quality}`,
      color: "#7C3AED", bg: "#F5F3FF", raw: l, type: "sleep",
    });
  });

  moods.forEach((m) => {
    const at = m.recordDate || m.createdAt;
    entries.push({
      id: "mood_" + (m._id || m.id),
      date: toDateStr(at), displayDate: toDisplayDate(at), time: toTime(at),
      icon: "😊", category: "Mood", title: `Mood · ${m.mood}`, subtitle: m.notes || undefined,
      color: "#F59E0B", bg: "#FFFBEB", raw: m, type: "mood",
    });
  });

  symptoms.forEach((s) => {
    const at = s.recordDate || s.createdAt;
    entries.push({
      id: "symptom_" + (s._id || s.id),
      date: toDateStr(at), displayDate: toDisplayDate(at), time: toTime(at),
      icon: "🌡️", category: "Symptom", title: s.symptomName, subtitle: `${s.severity}${s.notes ? " · " + s.notes : ""}`,
      color: "#EF4444", bg: "#FEF2F2", raw: s, type: "symptom",
    });
  });

  vitals.forEach((v) => {
    const at = v.recordDate || v.createdAt;
    const parts = [
      v.bloodPressureSystolic && `BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`,
      v.weight && `${v.weight}kg`,
      v.bloodSugar && `Sugar ${v.bloodSugar}`,
    ].filter(Boolean);
    entries.push({
      id: "vital_" + (v._id || v.id),
      date: toDateStr(at), displayDate: toDisplayDate(at), time: toTime(at),
      icon: "❤️", category: "Vitals", title: "Vitals Recorded", subtitle: parts.join(" · ") || undefined,
      color: "#2563EB", bg: "#EFF6FF", raw: v, type: "vital",
    });
  });

  periods.forEach((p) => {
    const at = p.startDate;
    entries.push({
      id: "period_" + (p._id || p.id),
      date: toDateStr(at), displayDate: toDisplayDate(at), time: "00:00",
      icon: "🌸", category: "Cycle", title: "Period Started", subtitle: `Flow: ${p.flow}`,
      color: "#DB2777", bg: "#FCE7F3", raw: p, type: "period",
    });
  });

  appointments.forEach((a) => {
    const at = a.appointmentDate;
    entries.push({
      id: "appt_" + (a._id || a.id),
      date: toDateStr(at), displayDate: toDisplayDate(at), time: a.appointmentTime || "00:00",
      icon: "📅", category: "Appointment", title: `Dr. ${a.doctorName}`, subtitle: a.notes || undefined,
      color: "#0D9488", bg: "#F0FDFA", raw: a, type: "appointment",
    });
  });

  return entries;
}

export default function WellnessTimeline({ entries, onDelete }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const groups = groupByDate(entries);

  if (groups.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyEmoji}>📅</Text>
        <Text style={s.emptyTxt}>No health logs yet</Text>
        <Text style={s.emptyHint}>Start logging from the Home tab</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      {groups.map((group) => (
        <View key={group.date} style={s.group}>
          <Text style={s.dateLabel}>{group.displayDate}</Text>
          {group.items.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <TouchableOpacity
                key={entry.id}
                style={[s.entry, { borderLeftColor: entry.color }]}
                onPress={() => setExpandedId(isExpanded ? null : entry.id)}
                activeOpacity={0.8}
              >
                <View style={[s.iconBadge, { backgroundColor: entry.bg }]}>
                  <Text style={{ fontSize: 16 }}>{entry.icon}</Text>
                </View>
                <View style={s.entryBody}>
                  <View style={s.entryHeader}>
                    <Text style={s.entryTitle}>{entry.title}</Text>
                    <Text style={s.entryTime}>{entry.time}</Text>
                  </View>
                  {entry.subtitle && (
                    <Text style={s.entrySub}>{entry.subtitle}</Text>
                  )}
                  {isExpanded && (
                    <View style={s.expandArea}>
                      <Text style={s.expandCat}>Category: {entry.category}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert("Delete", `Remove this ${entry.category} log?`, [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => onDelete(entry) },
                          ]);
                        }}
                        style={s.deleteBtn}
                      >
                        <Text style={s.deleteBtnTxt}>🗑 Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 80,
    gap: 20,
  },
  group: {},
  dateLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  entry: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderWidth: 0.5,
    borderColor: "#F3F4F6",
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  entryBody: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  entryTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1F2937",
    flex: 1,
    marginRight: 8,
  },
  entryTime: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  entrySub: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "400",
    marginTop: 2,
  },
  expandArea: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#F3F4F6",
    paddingTop: 10,
  },
  expandCat: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
  },
  deleteBtnTxt: {
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "500",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTxt: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
  },
});

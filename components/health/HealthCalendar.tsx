// ============================================
// HealthCalendar — Monthly grid calendar with multi-dot indicators
// No external calendar library — pure View-based grid
// ============================================

import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface DayData {
  hasWater: boolean;
  hasSleep: boolean;
  hasMeds: boolean;
  hasPeriod: boolean;
  hasSymptom: boolean;
  events: string[];
}

interface Props {
  waterLogs: any[];
  sleepLogs: any[];
  medicines: any[];
  periods: any[];
  symptoms: any[];
  moods: any[];
  vitals: any[];
}

const DOT_COLORS = {
  water: "#0EA5E9",
  sleep: "#7C3AED",
  meds: "#10B981",
  period: "#DB2777",
  symptom: "#F97316",
};

function toYMD(d: any): string {
  return new Date(d).toISOString().split("T")[0];
}

export default function HealthCalendar({ waterLogs, sleepLogs, medicines, periods, symptoms, moods, vitals }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  // Build day data map
  const dayMap = new Map<string, DayData>();

  const ensure = (ymd: string) => {
    if (!dayMap.has(ymd)) {
      dayMap.set(ymd, { hasWater: false, hasSleep: false, hasMeds: false, hasPeriod: false, hasSymptom: false, events: [] });
    }
    return dayMap.get(ymd)!;
  };

  waterLogs.forEach((l) => {
    const ymd = toYMD(l.recordedAt || l.createdAt);
    const d = ensure(ymd);
    d.hasWater = true;
    d.events.push(`💧 Water +${l.amountML}ml`);
  });

  sleepLogs.forEach((l) => {
    const ymd = toYMD(l.recordedAt || l.createdAt);
    const d = ensure(ymd);
    d.hasSleep = true;
    d.events.push(`😴 Sleep ${l.durationHours}h`);
  });

  // Meds: mark dates where any medicine was taken
  medicines.forEach((med) => {
    (med.takenDates || []).forEach((date: string) => {
      const d = ensure(date);
      d.hasMeds = true;
      d.events.push(`💊 ${med.medicineName} taken`);
    });
  });

  periods.forEach((p) => {
    const s = new Date(p.startDate);
    const e = p.endDate ? new Date(p.endDate) : new Date(s.getTime() + 5 * 86400000);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const ymd = d.toISOString().split("T")[0];
      const day = ensure(ymd);
      day.hasPeriod = true;
      if (!day.events.some((ev) => ev.startsWith("🌸"))) {
        day.events.push(`🌸 Period (${p.flow})`);
      }
    }
  });

  symptoms.forEach((s) => {
    const ymd = toYMD(s.recordDate || s.createdAt);
    const d = ensure(ymd);
    d.hasSymptom = true;
    d.events.push(`🌡️ ${s.symptomName} (${s.severity})`);
  });

  moods.forEach((m) => {
    const ymd = toYMD(m.recordDate || m.createdAt);
    const d = ensure(ymd);
    d.events.push(`😊 Mood: ${m.mood}`);
  });

  vitals.forEach((v) => {
    const ymd = toYMD(v.recordDate || v.createdAt);
    const d = ensure(ymd);
    const parts = [v.bloodPressureSystolic && `BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`, v.weight && `${v.weight}kg`].filter(Boolean);
    if (parts.length) d.events.push(`❤️ ${parts.join(", ")}`);
  });

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const getYMD = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const todayYMD = today.toISOString().split("T")[0];

  const selectedYMD = selectedDay ? getYMD(selectedDay) : null;
  const selectedData = selectedYMD ? dayMap.get(selectedYMD) : null;

  return (
    <View style={s.container}>
      {/* Nav */}
      <View style={s.navRow}>
        <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
          <Text style={s.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>
          {new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.legendScroll}>
        <View style={s.legend}>
          {[
            { color: DOT_COLORS.water, label: "Water" },
            { color: DOT_COLORS.sleep, label: "Sleep" },
            { color: DOT_COLORS.meds, label: "Meds" },
            { color: DOT_COLORS.period, label: "Period" },
            { color: DOT_COLORS.symptom, label: "Symptom" },
          ].map((item) => (
            <View key={item.label} style={s.legendItem}>
              <View style={[s.dot, { backgroundColor: item.color }]} />
              <Text style={s.legendTxt}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Day headers */}
      <View style={s.grid}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <Text key={i} style={s.dayHeader}>{d}</Text>
        ))}

        {/* Day cells */}
        {cells.map((day, idx) => {
          if (!day) return <View key={`empty-${idx}`} style={s.cell} />;
          const ymd = getYMD(day);
          const data = dayMap.get(ymd);
          const isToday = ymd === todayYMD;
          const isSelected = selectedDay === day;

          return (
            <TouchableOpacity
              key={ymd}
              style={s.cell}
              onPress={() => { setSelectedDay(day); setShowSheet(true); }}
            >
              <View style={[
                s.dayCircle,
                isToday && s.todayCircle,
                isSelected && !isToday && s.selectedCircle,
              ]}>
                <Text style={[s.dayNum, isToday && s.todayNum, isSelected && !isToday && s.selectedNum]}>
                  {day}
                </Text>
              </View>
              <View style={s.dotRow}>
                {data?.hasWater && <View style={[s.dot, { backgroundColor: DOT_COLORS.water }]} />}
                {data?.hasSleep && <View style={[s.dot, { backgroundColor: DOT_COLORS.sleep }]} />}
                {data?.hasMeds && <View style={[s.dot, { backgroundColor: DOT_COLORS.meds }]} />}
                {data?.hasPeriod && <View style={[s.dot, { backgroundColor: DOT_COLORS.period }]} />}
                {data?.hasSymptom && <View style={[s.dot, { backgroundColor: DOT_COLORS.symptom }]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Day Detail Sheet */}
      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSheet(false)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>
              {selectedDay
                ? new Date(year, month, selectedDay).toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric",
                  })
                : ""}
            </Text>
            {!selectedData || selectedData.events.length === 0 ? (
              <View style={s.sheetEmpty}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
                <Text style={{ color: "#9CA3AF", fontSize: 13 }}>No logs for this day</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {selectedData.events.map((ev, i) => (
                  <View key={i} style={s.eventRow}>
                    <Text style={s.eventTxt}>{ev}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowSheet(false)}>
              <Text style={s.closeBtnTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navBtn: {
    width: 32,
    height: 32,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  navArrow: {
    fontSize: 20,
    color: "#1F2937",
    fontWeight: "500",
    lineHeight: 24,
  },
  navTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  legendScroll: {
    marginBottom: 12,
  },
  legend: {
    flexDirection: "row",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendTxt: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "400",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayHeader: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
    marginBottom: 8,
  },
  cell: {
    width: "14.28%",
    alignItems: "center",
    marginBottom: 6,
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  todayCircle: {
    backgroundColor: "#2563EB",
  },
  selectedCircle: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#2563EB",
  },
  dayNum: {
    fontSize: 12,
    fontWeight: "400",
    color: "#1F2937",
  },
  todayNum: {
    color: "#fff",
    fontWeight: "600",
  },
  selectedNum: {
    color: "#2563EB",
    fontWeight: "600",
  },
  dotRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
    height: 6,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 44,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  sheetEmpty: {
    alignItems: "center",
    paddingVertical: 24,
  },
  eventRow: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  eventTxt: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "400",
  },
  closeBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  closeBtnTxt: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});

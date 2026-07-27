// ============================================
// QuickActionBar — 2×2 grid of quick-tap wellness actions
// Water, Sleep, Meds Checklist, Mood
// ============================================

import healthService from "@/services/healthService";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Medicine {
  id: string;
  medicineName: string;
  dosage?: string;
  reminderTime: string;
  takenDates?: string[];
}

interface Props {
  waterML: number;
  sleepHours: number;
  medicines: Medicine[];
  moodToday: string | null;
  todayStr: string; // "YYYY-MM-DD"
  onDrinkWater: () => void;
  onLogSleep: (hours: number) => void;
  onToggleMed: (id: string, taken: boolean) => void;
  onLogMood: (mood: string) => void;
  onMedDeleted?: () => void; // refresh after delete
}

const MOODS = [
  { emoji: "😁", label: "Amazing" },
  { emoji: "😊", label: "Good" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "😔", label: "Bad" },
  { emoji: "😢", label: "Terrible" },
];

const SLEEP_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12];

// How many doses a dosage string implies
function doseCount(dosage?: string): number {
  const d = (dosage || "").toLowerCase();
  if (d.includes("three")) return 3;
  if (d.includes("twice")) return 2;
  return 1; // "once" or anything else
}

// Build a key for each dose slot: "YYYY-MM-DD_doseN"
function doseKey(dateStr: string, n: number) {
  return `${dateStr}_dose${n}`;
}

export default function QuickActionBar({
  waterML,
  sleepHours,
  medicines,
  moodToday,
  todayStr,
  onDrinkWater,
  onLogSleep,
  onToggleMed,
  onLogMood,
  onMedDeleted,
}: Props) {
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showMedsModal, setShowMedsModal] = useState(false);
  const [selectedSleep, setSelectedSleep] = useState(7);
  // Optimistic local overrides: key = "medId_dose1", value = true/false
  const [localTaken, setLocalTaken] = useState<Record<string, boolean>>({});

  const waterPct = Math.min((waterML / 2000) * 100, 100);

  // Resolve checked state: local override first, then server data
  const isChecked = (medId: string, doseIndex: number, takenDates?: string[]) => {
    const key = `${medId}_${doseKey(todayStr, doseIndex)}`;
    if (key in localTaken) return localTaken[key];
    return takenDates?.includes(doseKey(todayStr, doseIndex)) ?? false;
  };

  // Count total dose slots and taken slots for the progress bar
  const totalDoses = medicines.reduce((sum, m) => sum + doseCount(m.dosage), 0);
  const takenDoses = medicines.reduce((sum, m) => {
    const count = doseCount(m.dosage);
    let taken = 0;
    for (let i = 1; i <= count; i++) {
      if (isChecked(m.id, i, m.takenDates)) taken++;
    }
    return sum + taken;
  }, 0);

  const handleDeleteMed = (med: Medicine) => {
    Alert.alert(
      "Remove Medicine",
      `Remove "${med.medicineName}" from your list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await healthService.deleteMedicineReminder(med.id);
              onMedDeleted?.();
            } catch {
              Alert.alert("Error", "Could not remove medicine.");
            }
          },
        },
      ]
    );
  };

  // Toggle a specific dose slot with optimistic UI
  const handleToggleDose = (med: Medicine, doseIndex: number) => {
    const serverKey = doseKey(todayStr, doseIndex);   // stored in takenDates
    const localKey  = `${med.id}_${serverKey}`;        // used for local override

    const currentChecked = isChecked(med.id, doseIndex, med.takenDates);
    const nextChecked = !currentChecked;

    // ① Optimistically flip the checkbox immediately
    setLocalTaken(prev => ({ ...prev, [localKey]: nextChecked }));

    // ② Persist to backend
    healthService.logMedicineTaken(med.id, serverKey, nextChecked)
      .then(() => {
        // Trigger parent loadAll so server data catches up; local override stays until parent reloads
        onToggleMed(med.id, nextChecked);
      })
      .catch(() => {
        // ③ Roll back on failure
        setLocalTaken(prev => ({ ...prev, [localKey]: currentChecked }));
        Alert.alert("Error", "Could not update dose.");
      });
  };

  return (
    <View style={s.container}>
      <Text style={s.sectionLabel}>QUICK ACTIONS</Text>
      <View style={s.grid}>
        {/* 💧 Water */}
        <TouchableOpacity style={[s.card, { backgroundColor: "#EFF6FF" }]} onPress={onDrinkWater} activeOpacity={0.75}>
          <Text style={s.cardEmoji}>💧</Text>
          <Text style={s.cardTitle}>Drink Water</Text>
          <Text style={s.cardSub}>{waterML} / 2000 ml</Text>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${waterPct}%`, backgroundColor: "#0EA5E9" }]} />
          </View>
          <Text style={s.cardTap}>+250 ml per tap</Text>
        </TouchableOpacity>

        {/* 😴 Sleep */}
        <TouchableOpacity style={[s.card, { backgroundColor: "#F5F3FF" }]} onPress={() => setShowSleepModal(true)} activeOpacity={0.75}>
          <Text style={s.cardEmoji}>😴</Text>
          <Text style={s.cardTitle}>Log Sleep</Text>
          <Text style={s.cardSub}>
            {sleepHours > 0 ? `${sleepHours}h logged` : "Not logged yet"}
          </Text>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${Math.min((sleepHours / 8) * 100, 100)}%`, backgroundColor: "#7C3AED" }]} />
          </View>
          <Text style={s.cardTap}>Tap to log hours</Text>
        </TouchableOpacity>

        {/* 💊 Meds */}
        <TouchableOpacity style={[s.card, { backgroundColor: "#F0FDF4" }]} onPress={() => setShowMedsModal(true)} activeOpacity={0.75}>
          <Text style={s.cardEmoji}>💊</Text>
          <Text style={s.cardTitle}>Medicines</Text>
          <Text style={s.cardSub}>
            {totalDoses === 0 ? "None set up" : `${takenDoses} / ${totalDoses} doses`}
          </Text>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: totalDoses > 0 ? `${(takenDoses / totalDoses) * 100}%` : "0%", backgroundColor: "#10B981" }]} />
          </View>
          <Text style={s.cardTap}>Tap to check off</Text>
        </TouchableOpacity>

        {/* 😊 Mood */}
        <View style={[s.card, { backgroundColor: "#FFFBEB" }]}>
          <Text style={s.cardEmoji}>{moodToday ? MOODS.find(m => m.label === moodToday)?.emoji || "😊" : "😊"}</Text>
          <Text style={s.cardTitle}>Mood</Text>
          <Text style={s.cardSub}>{moodToday || "Not logged"}</Text>
          <View style={s.moodRow}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.label}
                onPress={() => onLogMood(m.label)}
                style={[s.moodBtn, moodToday === m.label && s.moodBtnActive]}
              >
                <Text style={{ fontSize: 16 }}>{m.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Sleep Modal */}
      <Modal visible={showSleepModal} transparent animationType="slide" onRequestClose={() => setShowSleepModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Log Sleep Duration</Text>
            <Text style={s.sheetSub}>How many hours did you sleep?</Text>
            <View style={s.sleepGrid}>
              {SLEEP_OPTIONS.map((h) => (
                <TouchableOpacity
                  key={h}
                  onPress={() => setSelectedSleep(h)}
                  style={[s.sleepChip, selectedSleep === h && s.sleepChipActive]}
                >
                  <Text style={[s.sleepChipTxt, selectedSleep === h && s.sleepChipTxtActive]}>{h}h</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={s.saveBtn}
              onPress={() => {
                onLogSleep(selectedSleep);
                setShowSleepModal(false);
              }}
            >
              <Text style={s.saveBtnTxt}>Save {selectedSleep} hours</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSleepModal(false)} style={s.cancelBtn}>
              <Text style={s.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Meds Checklist Modal */}
      <Modal visible={showMedsModal} transparent animationType="slide" onRequestClose={() => setShowMedsModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Medicine Checklist</Text>
            <Text style={s.sheetSub}>{"Mark each dose you've taken today"}</Text>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {medicines.length === 0 ? (
                <Text style={{ textAlign: "center", color: "#9CA3AF", marginTop: 20, fontSize: 13 }}>
                  No medicines set up yet
                </Text>
              ) : (
                medicines.map((med) => {
                  const count = doseCount(med.dosage);
                  const doseLabels =
                    count === 1 ? ["Once"] :
                    count === 2 ? ["Morning", "Night"] :
                    ["Morning", "Afternoon", "Night"];

                  return (
                    <View key={med.id} style={s.medCard}>
                      {/* Medicine header */}
                      <View style={s.medCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.medName}>{med.medicineName}</Text>
                          {med.dosage ? (
                            <Text style={s.medSub}>{med.dosage}</Text>
                          ) : null}
                        </View>
                        {/* Delete button */}
                        <TouchableOpacity
                          onPress={() => handleDeleteMed(med)}
                          style={s.delBtn}
                          activeOpacity={0.7}
                        >
                          <Text style={s.delBtnTxt}>🗑️</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Dose checkboxes */}
                      <View style={s.doseRow}>
                        {Array.from({ length: count }, (_, i) => {
                          const key = doseKey(todayStr, i + 1);
                          const checked = med.takenDates?.includes(key) ?? false;
                          return (
                            <TouchableOpacity
                              key={i}
                              style={[s.doseChip, checked && s.doseChipChecked]}
                              onPress={() => handleToggleDose(med, i + 1)}
                              activeOpacity={0.7}
                            >
                              <View style={[s.checkbox, checked && s.checkboxChecked]}>
                                {checked && <Text style={{ color: "#fff", fontSize: 11 }}>✓</Text>}
                              </View>
                              <Text style={[s.doseLabel, checked && s.doseLabelChecked]}>
                                {doseLabels[i]}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowMedsModal(false)} style={[s.saveBtn, { marginTop: 16 }]}>
              <Text style={s.saveBtnTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {},
  sectionLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
    letterSpacing: 1.1,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    width: "48%",
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  cardEmoji: { fontSize: 24, marginBottom: 6 },
  cardTitle: { fontSize: 13, fontWeight: "600", color: "#1F2937", marginBottom: 2 },
  cardSub: { fontSize: 11, color: "#6B7280", fontWeight: "400", marginBottom: 8 },
  cardTap: { fontSize: 10, color: "#9CA3AF", fontWeight: "400", marginTop: 6 },
  barBg: { height: 4, backgroundColor: "#E5E7EB", borderRadius: 2 },
  barFill: { height: 4, borderRadius: 2 },
  moodRow: { flexDirection: "row", gap: 4, marginTop: 8, flexWrap: "wrap" },
  moodBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#F9FAFB", alignItems: "center", justifyContent: "center",
    borderWidth: 0.5, borderColor: "#E5E7EB",
  },
  moodBtnActive: { backgroundColor: "#FEF9C3", borderColor: "#F59E0B" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 44,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: "#E5E7EB",
    borderRadius: 2, alignSelf: "center", marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937", marginBottom: 4 },
  sheetSub: { fontSize: 13, color: "#6B7280", fontWeight: "400", marginBottom: 20 },
  sleepGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  sleepChip: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10,
    borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB",
  },
  sleepChipActive: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  sleepChipTxt: { fontSize: 14, color: "#4B5563", fontWeight: "500" },
  sleepChipTxtActive: { color: "#fff" },
  saveBtn: { backgroundColor: "#2563EB", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cancelBtn: { alignItems: "center", marginTop: 12 },
  cancelBtnTxt: { fontSize: 13, color: "#6B7280", fontWeight: "400" },

  // Medicine card
  medCard: {
    backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12,
    marginBottom: 10, borderWidth: 0.5, borderColor: "#E5E7EB",
  },
  medCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  medName: { fontSize: 14, fontWeight: "600", color: "#1F2937", marginBottom: 2 },
  medSub: { fontSize: 11, color: "#6B7280", fontWeight: "400" },
  delBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", marginLeft: 8,
  },
  delBtnTxt: { fontSize: 14 },

  // Per-dose checkboxes
  doseRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  doseChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  doseChipChecked: { backgroundColor: "#F0FDF4", borderColor: "#A7F3D0" },
  checkbox: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: "#D1D5DB",
    alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#10B981", borderColor: "#10B981" },
  doseLabel: { fontSize: 12, fontWeight: "500", color: "#4B5563" },
  doseLabelChecked: { color: "#10B981" },
});

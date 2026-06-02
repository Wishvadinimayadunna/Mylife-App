// ============================================
// QuickActionBar — 2×2 grid of quick-tap wellness actions
// Water, Sleep, Meds Checklist, Mood
// ============================================

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
}

const MOODS = [
  { emoji: "😁", label: "Amazing" },
  { emoji: "😊", label: "Good" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "😔", label: "Bad" },
  { emoji: "😢", label: "Terrible" },
];

const SLEEP_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12];

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
}: Props) {
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showMedsModal, setShowMedsModal] = useState(false);
  const [selectedSleep, setSelectedSleep] = useState(7);

  const waterPct = Math.min((waterML / 2000) * 100, 100);
  const enabledMeds = medicines.filter((m) => m.takenDates !== undefined || true);
  const medsTotal = enabledMeds.length;
  const medsTaken = enabledMeds.filter((m) => m.takenDates?.includes(todayStr)).length;

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
            {medsTotal === 0 ? "None set up" : `${medsTaken} / ${medsTotal} taken`}
          </Text>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: medsTotal > 0 ? `${(medsTaken / medsTotal) * 100}%` : "0%", backgroundColor: "#10B981" }]} />
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
            <Text style={s.sheetSub}>Mark what you've taken today</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {medicines.length === 0 ? (
                <Text style={{ textAlign: "center", color: "#9CA3AF", marginTop: 20, fontSize: 13 }}>
                  No medicines set up yet
                </Text>
              ) : (
                medicines.map((med) => {
                  const isTaken = med.takenDates?.includes(todayStr) ?? false;
                  return (
                    <TouchableOpacity
                      key={med.id}
                      style={s.medRow}
                      onPress={() => onToggleMed(med.id, !isTaken)}
                    >
                      <View style={[s.checkbox, isTaken && s.checkboxChecked]}>
                        {isTaken && <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.medName, isTaken && { color: "#9CA3AF", textDecorationLine: "line-through" }]}>
                          {med.medicineName}
                        </Text>
                        <Text style={s.medSub}>
                          {[med.dosage, med.reminderTime].filter(Boolean).join(" · ")}
                        </Text>
                      </View>
                    </TouchableOpacity>
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
  cardEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "400",
    marginBottom: 8,
  },
  cardTap: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "400",
    marginTop: 6,
  },
  barBg: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  moodRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
    flexWrap: "wrap",
  },
  moodBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  moodBtnActive: {
    backgroundColor: "#FEF9C3",
    borderColor: "#F59E0B",
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
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  sheetSub: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "400",
    marginBottom: 20,
  },
  sleepGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  sleepChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  sleepChipActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  sleepChipTxt: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  sleepChipTxtActive: {
    color: "#fff",
  },
  saveBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnTxt: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  cancelBtn: {
    alignItems: "center",
    marginTop: 12,
  },
  cancelBtnTxt: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "400",
  },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  medName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  medSub: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
    marginTop: 2,
  },
});

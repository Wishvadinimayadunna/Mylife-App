// ============================================
// AppointmentCard — Doctor Visit Logger
// Inline calendar · dosage dropdown · no time field
// Prescription medicines auto-populate the Medicine card
// ============================================

import healthService from "@/services/healthService";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AppCard } from "../ui/AppCard";

interface PrescriptionItem {
  medicineName: string;
  dosage: string;
}

interface Props {
  appointments: any[];
  onSaved: () => void;
}

const ACCENT = "#2563EB";
const GREEN = "#059669";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// Common dosage presets
const DOSAGE_PRESETS = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Morning & Night",
  "Every 8 hours",
  "Every 6 hours",
  "As needed",
  "Before meals",
  "After meals",
  "At bedtime",
];

// ── Inline calendar ───────────────────────────────────────────────────────────
function CalendarPicker({
  selected,
  onSelect,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isSelected = (d: number) =>
    selected !== null &&
    d === selected.getDate() &&
    viewMonth === selected.getMonth() &&
    viewYear === selected.getFullYear();

  return (
    <View style={cal.wrapper}>
      <View style={cal.nav}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
          <Text style={cal.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={cal.navTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
          <Text style={cal.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={cal.row}>
        {DAY_HEADERS.map((h) => (
          <Text key={h} style={cal.dayHdr}>{h}</Text>
        ))}
      </View>

      <View style={cal.row}>
        {cells.map((day, i) => {
          if (day === null) return <View key={`e${i}`} style={cal.cell} />;
          const sel = isSelected(day);
          const tod = isToday(day);
          return (
            <TouchableOpacity
              key={day}
              style={cal.cell}
              onPress={() => onSelect(new Date(viewYear, viewMonth, day))}
              activeOpacity={0.7}
            >
              <View style={[
                cal.circle,
                sel && { backgroundColor: ACCENT },
                !sel && tod && { backgroundColor: "#DBEAFE" },
              ]}>
                <Text style={[
                  cal.dayNum,
                  sel && { color: "#fff", fontWeight: "700" },
                  !sel && tod && { color: ACCENT, fontWeight: "600" },
                ]}>
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Dosage Dropdown ───────────────────────────────────────────────────────────
function DosageDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);

  const selectPreset = (preset: string) => {
    onChange(preset);
    setOpen(false);
    setCustomMode(false);
  };

  const enterCustom = () => {
    setCustomMode(true);
    setOpen(false);
  };

  return (
    <View style={dd.container}>
      {/* Trigger button */}
      <TouchableOpacity
        style={[dd.trigger, open && dd.triggerOpen]}
        onPress={() => { setOpen((o) => !o); setCustomMode(false); }}
        activeOpacity={0.8}
      >
        <Text style={[dd.triggerTxt, !value && { color: "#9CA3AF" }]} numberOfLines={1}>
          {value || "Select dosage"}
        </Text>
        <Text style={dd.chevron}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {/* Dropdown list */}
      {open && (
        <View style={dd.list}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
            {DOSAGE_PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[dd.listItem, value === p && dd.listItemActive]}
                onPress={() => selectPreset(p)}
              >
                <Text style={[dd.listItemTxt, value === p && dd.listItemTxtActive]}>
                  {p}
                </Text>
                {value === p && <Text style={{ color: ACCENT, fontSize: 13 }}>✓</Text>}
              </TouchableOpacity>
            ))}
            {/* Custom option */}
            <TouchableOpacity style={dd.listItem} onPress={enterCustom}>
              <Text style={[dd.listItemTxt, { color: ACCENT }]}>✏️  Type custom…</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Custom text input (shown after choosing "Type custom") */}
      {customMode && (
        <TextInput
          style={dd.customInput}
          placeholder="e.g. 5ml twice daily"
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChange}
          autoFocus
        />
      )}
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AppointmentCard({ appointments, onSaved }: Props) {
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [doctorName, setDoctorName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [reason, setReason] = useState("");
  const [prescription, setPrescription] = useState<PrescriptionItem[]>([
    { medicineName: "", dosage: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setDoctorName("");
    setSelectedDate(null);
    setReason("");
    setPrescription([{ medicineName: "", dosage: "" }]);
    setSaving(false);
  };

  const openModal = () => { resetForm(); setShowModal(true); };
  const closeModal = () => { setShowModal(false); resetForm(); };

  const addMedicineRow = () =>
    setPrescription((p) => [...p, { medicineName: "", dosage: "" }]);

  const removeMedicineRow = (index: number) =>
    setPrescription((p) => p.filter((_, i) => i !== index));

  const updateMedicine = (index: number, field: "medicineName" | "dosage", value: string) =>
    setPrescription((p) =>
      p.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );

  const handleSave = async () => {
    if (!doctorName.trim()) {
      Alert.alert("Required", "Please enter the doctor's name.");
      return;
    }
    if (!selectedDate) {
      Alert.alert("Required", "Please select the appointment date.");
      return;
    }

    // Only include medicines that have a name
    const validMeds = prescription.filter((m) => m.medicineName.trim() !== "");

    setSaving(true);
    try {
      // ⚠️ Do NOT send userId — backend reads it from the auth token.
      // Sending an empty userId would overwrite req.userId and break the save.
      await healthService.addAppointment({
        doctorName: doctorName.trim(),
        appointmentDate: selectedDate,
        appointmentTime: "",        // field no longer shown in UI, kept optional in schema
        reason: reason.trim(),
        reminderEnabled: false,
        prescription: validMeds.map((m) => ({
          medicineName: m.medicineName.trim(),
          dosage: m.dosage.trim(),
        })),
      } as any);

      setShowModal(false);
      resetForm();
      onSaved(); // reload all health data so Medicine card updates
    } catch (e: any) {
      console.error("Save appointment error:", e?.response?.data || e?.message || e);
      Alert.alert("Error", "Could not save appointment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // 3 most recent
  const recent = [...appointments]
    .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())
    .slice(0, 3);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.headerRow}>
        <Text style={s.sectionLabel}>DOCTOR VISITS</Text>
        <TouchableOpacity style={s.addBtn} onPress={openModal} activeOpacity={0.8}>
          <Text style={s.addBtnTxt}>+ Log Visit</Text>
        </TouchableOpacity>
      </View>

      {/* Appointments list */}
      <AppCard style={{ padding: 0, overflow: "hidden" }}>
        {recent.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🩺</Text>
            <Text style={s.emptyTxt}>No visits logged yet</Text>
            <Text style={s.emptySub}>Tap "Log Visit" to record a doctor visit</Text>
          </View>
        ) : (
          recent.map((apt, idx) => {
            const d = new Date(apt.appointmentDate);
            const dateStr = d.toLocaleDateString("en-GB", {
              day: "2-digit", month: "short", year: "numeric",
            });
            const medCount = (apt.prescription || []).length;
            return (
              <View
                key={apt._id || idx}
                style={[s.aptRow, idx < recent.length - 1 && s.aptRowBorder]}
              >
                <View style={s.aptIconWrap}>
                  <Text style={s.aptIcon}>🩺</Text>
                </View>
                <View style={s.aptBody}>
                  <Text style={s.aptDoctor}>{apt.doctorName}</Text>
                  <Text style={s.aptMeta}>{dateStr}</Text>
                  {apt.reason ? (
                    <Text style={s.aptReason} numberOfLines={1}>{apt.reason}</Text>
                  ) : null}
                </View>
                {medCount > 0 && (
                  <View style={s.pillBadge}>
                    <Text style={s.pillBadgeTxt}>💊 {medCount}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </AppCard>

      {/* ── Add Visit Modal ── */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              <Text style={s.sheetTitle}>Log Doctor Visit</Text>
              <Text style={s.sheetSub}>Fill in the details from your appointment</Text>

              {/* Doctor Name */}
              <Text style={s.fieldLabel}>Doctor Name *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Dr. Silva"
                placeholderTextColor="#9CA3AF"
                value={doctorName}
                onChangeText={setDoctorName}
              />

              {/* Date — inline calendar */}
              <View style={s.dateHeaderRow}>
                <Text style={s.fieldLabel}>Date *</Text>
                {selectedDate && (
                  <View style={s.dateChip}>
                    <Text style={s.dateChipTxt}>
                      {selectedDate.toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </Text>
                  </View>
                )}
              </View>
              <CalendarPicker selected={selectedDate} onSelect={setSelectedDate} />

              {/* Reason */}
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>What is it for?</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Fever, routine checkup…"
                placeholderTextColor="#9CA3AF"
                value={reason}
                onChangeText={setReason}
              />

              {/* Prescription */}
              <View style={s.prescriptionHeader}>
                <Text style={s.fieldLabel}>Prescription</Text>
                <TouchableOpacity onPress={addMedicineRow} style={s.addRowBtn}>
                  <Text style={s.addRowBtnTxt}>+ Add Medicine</Text>
                </TouchableOpacity>
              </View>

              {prescription.map((item, idx) => (
                <View key={idx} style={s.medBlock}>
                  {/* Medicine name row */}
                  <View style={s.medNameRow}>
                    <TextInput
                      style={[s.input, { flex: 1, marginBottom: 6 }]}
                      placeholder={`Medicine ${idx + 1} name`}
                      placeholderTextColor="#9CA3AF"
                      value={item.medicineName}
                      onChangeText={(v) => updateMedicine(idx, "medicineName", v)}
                    />
                    {prescription.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeMedicineRow(idx)}
                        style={s.removeBtn}
                      >
                        <Text style={s.removeBtnTxt}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Dosage dropdown */}
                  <DosageDropdown
                    value={item.dosage}
                    onChange={(v) => updateMedicine(idx, "dosage", v)}
                  />

                  {/* Divider between medicines */}
                  {idx < prescription.length - 1 && <View style={s.medDivider} />}
                </View>
              ))}

              <Text style={s.prescriptionNote}>
                💡 Medicines will appear in your daily Medicine checklist
              </Text>

              {/* Actions */}
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={s.saveBtnTxt}>{saving ? "Saving…" : "Save Visit"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={closeModal} style={s.cancelBtn}>
                <Text style={s.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Calendar styles ───────────────────────────────────────────────────────────
const cal = StyleSheet.create({
  wrapper: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 4,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navBtn: {
    width: 32,
    height: 32,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  navArrow: { fontSize: 20, color: "#374151", lineHeight: 24 },
  navTitle: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  row: { flexDirection: "row", flexWrap: "wrap" },
  dayHdr: {
    width: "14.28%", textAlign: "center",
    fontSize: 11, fontWeight: "600", color: "#9CA3AF", marginBottom: 4,
  },
  cell: { width: "14.28%", alignItems: "center", marginBottom: 3 },
  circle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  dayNum: { fontSize: 13, color: "#374151" },
});

// ── Dropdown styles ───────────────────────────────────────────────────────────
const dd = StyleSheet.create({
  container: { marginBottom: 12, zIndex: 10 },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#F9FAFB",
  },
  triggerOpen: { borderColor: ACCENT, backgroundColor: "#EFF6FF" },
  triggerTxt: { flex: 1, fontSize: 14, color: "#1F2937" },
  chevron: { fontSize: 10, color: "#6B7280", marginLeft: 8 },
  list: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#fff",
    marginTop: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  listItemActive: { backgroundColor: "#EFF6FF" },
  listItemTxt: { fontSize: 14, color: "#374151" },
  listItemTxtActive: { color: ACCENT, fontWeight: "600" },
  customInput: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#EFF6FF",
    marginTop: 6,
  },
});

// ── Component styles ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {},

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: "500", color: "#6B7280",
    letterSpacing: 1.1, textTransform: "uppercase",
  },
  addBtn: {
    backgroundColor: ACCENT, borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 14,
  },
  addBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },

  card: {
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 0.5, borderColor: "#E5E7EB", overflow: "hidden",
  },

  emptyState: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 16 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyTxt: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4 },
  emptySub: { fontSize: 12, color: "#9CA3AF", textAlign: "center" },

  aptRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 13, gap: 12,
  },
  aptRowBorder: { borderBottomWidth: 0.5, borderBottomColor: "#F3F4F6" },
  aptIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center",
  },
  aptIcon: { fontSize: 18 },
  aptBody: { flex: 1 },
  aptDoctor: { fontSize: 14, fontWeight: "600", color: "#1F2937", marginBottom: 2 },
  aptMeta: { fontSize: 11, color: "#6B7280", marginBottom: 2 },
  aptReason: { fontSize: 11, color: "#9CA3AF", fontStyle: "italic" },
  pillBadge: {
    backgroundColor: "#F0FDF4", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 0.5, borderColor: "#BBF7D0",
  },
  pillBadgeTxt: { fontSize: 11, color: GREEN, fontWeight: "600" },

  // Modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 44, maxHeight: "92%",
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: "#E5E7EB",
    borderRadius: 2, alignSelf: "center", marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 4 },
  sheetSub: { fontSize: 13, color: "#6B7280", marginBottom: 20 },

  fieldLabel: {
    fontSize: 12, fontWeight: "600", color: "#374151",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5,
  },
  dateHeaderRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 6,
  },
  dateChip: {
    backgroundColor: ACCENT, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  dateChipTxt: { color: "#fff", fontSize: 11, fontWeight: "600" },

  input: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: "#1F2937", backgroundColor: "#F9FAFB",
    marginBottom: 14,
  },

  prescriptionHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 10,
  },
  addRowBtn: {
    backgroundColor: "#EFF6FF", borderRadius: 8,
    paddingVertical: 4, paddingHorizontal: 12,
    borderWidth: 0.5, borderColor: "#BFDBFE",
  },
  addRowBtnTxt: { color: ACCENT, fontSize: 12, fontWeight: "600" },

  medBlock: { marginBottom: 4 },
  medNameRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  removeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center",
    marginTop: 2,
  },
  removeBtnTxt: { color: "#EF4444", fontSize: 12, fontWeight: "700" },
  medDivider: {
    height: 1, backgroundColor: "#F3F4F6", marginVertical: 10,
  },

  prescriptionNote: {
    fontSize: 11, color: GREEN, backgroundColor: "#F0FDF4",
    borderRadius: 8, padding: 10, marginBottom: 20, marginTop: 8,
  },

  saveBtn: {
    backgroundColor: ACCENT, borderRadius: 12,
    paddingVertical: 14, alignItems: "center", marginBottom: 10,
  },
  saveBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cancelBtn: { alignItems: "center", paddingVertical: 8 },
  cancelBtnTxt: { fontSize: 13, color: "#6B7280" },
});

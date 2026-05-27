// ============================================
// Health Centre Module - Redesigned UX
// Conforming to solid visual guidelines, font weight limits,
// horizontal tab segmented selection, and inline input forms.
// ============================================

import Calendar from "@/components/ui/calendar";
import healthService from "@/services/healthService";
import { useAppStore } from "@/store/appStore";
import { PeriodFlow } from "@/types";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const COLOR_BLUE = "#2563EB";
const PINK = "#D4537E";
const COLOR_BORDER = "#E5E7EB";
const COLOR_BG = "#F5F7FA";
const COLOR_CARD = "#FFFFFF";
const NAVY = "#1a1f36";

type Screen = "home" | "mood" | "appointments" | "medication" | "vitals" | "symptoms" | "period";

const SCREENS = [
  { id: "home", label: "Home" },
  { id: "mood", label: "Mood" },
  { id: "appointments", label: "Visits" },
  { id: "medication", label: "Meds" },
  { id: "vitals", label: "Vitals" },
  { id: "symptoms", label: "Symptoms" },
  { id: "period", label: "Cycle", femaleOnly: true },
];

const FEATURES = [
  { id: "mood", label: "Mood Tracker", sub: "Log how you feel today", icon: "😊", color: "#7C3AED", tint: "#EDE9FE" },
  { id: "appointments", label: "Appointments", sub: "Manage doctor visits", icon: "📅", color: "#0D9488", tint: "#E6F4F2" },
  { id: "medication", label: "Medication", sub: "Reminders and dosages", icon: "💊", color: "#E11D48", tint: "#FFE4E6" },
  { id: "vitals", label: "Vitals Tracker", sub: "BP, sugar, and weight", icon: "❤️", color: COLOR_BLUE, tint: "#DBEAFE" },
  { id: "symptoms", label: "Symptom Log", sub: "Record symptoms and severity", icon: "🌡️", color: "#D97706", tint: "#FEF3C7" },
  { id: "period", label: "Period Tracker", sub: "Cycle logs and flow", icon: "🌸", color: "#DB2777", tint: "#FCE7F3", femaleOnly: true },
];

const MOODS = ["Amazing", "Good", "Neutral", "Bad", "Terrible"];
const SEVERITIES = ["Mild", "Moderate", "Severe"];
const FLOWS = ["Light", "Medium", "Heavy"];

function fmt(d: any) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function HealthScreen() {
  const { profile } = useAppStore();
  const router = useRouter();
  const isFemale = profile?.gender === "Female";

  const [screen, setScreen] = useState<Screen>("home");
  const [items, setItems] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [showCal, setShowCal] = useState(false);
  const [calField, setCalField] = useState("");
  
  // Period Calendar Logger State
  const [ptStep, setPtStep] = useState<"idle" | "end">("idle");
  const [ptStart, setPtStart] = useState<Date | null>(null);
  const [ptEnd, setPtEnd] = useState<Date | null>(null);
  const [ptFlow, setPtFlow] = useState("Medium");
  const [showFlowPicker, setShowFlowPicker] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  // Header Subtitle Stats
  const [todayLogsCount, setTodayLogsCount] = useState(0);
  const [counts, setCounts] = useState({ mood: 0, appointments: 0, meds: 0, vitals: 0, symptoms: 0 });

  const loadCounts = useCallback(async () => {
    try {
      const moods = await healthService.getMoods();
      const appts = await healthService.getAppointments();
      const meds = await healthService.getMedicineReminders();
      const vitals = await healthService.getHealthRecords();
      const symptoms = await healthService.getSymptoms();

      const today = new Date().toDateString();
      const moodToday = moods.filter((m: any) => new Date(m.recordDate || m.createdAt).toDateString() === today).length;
      const apptsToday = appts.filter((a: any) => new Date(a.appointmentDate || a.createdAt).toDateString() === today).length;
      const vitalsToday = vitals.filter((v: any) => new Date(v.recordDate || v.createdAt).toDateString() === today).length;
      const symptomsToday = symptoms.filter((s: any) => new Date(s.recordDate || s.createdAt).toDateString() === today).length;

      setCounts({
        mood: moods.length,
        appointments: appts.length,
        meds: meds.filter((m: any) => m.isEnabled).length,
        vitals: vitals.length,
        symptoms: symptoms.length,
      });

      setTodayLogsCount(moodToday + apptsToday + vitalsToday + symptomsToday);
    } catch (e) {
      console.error("Load counts error:", e);
    }
  }, []);

  const load = useCallback(async () => {
    loadCounts();
    if (screen === "home") return;
    try {
      let data: any[] = [];
      if (screen === "mood") data = await healthService.getMoods();
      if (screen === "appointments") data = await healthService.getAppointments();
      if (screen === "medication") data = await healthService.getMedicineReminders();
      if (screen === "vitals") data = await healthService.getHealthRecords();
      if (screen === "symptoms") data = await healthService.getSymptoms();
      if (screen === "period") data = await healthService.getPeriods();
      setItems(data);
    } catch (e) {
      console.error("Load section error:", e);
    }
  }, [screen, loadCounts]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    const defaults: any = {};
    if (screen === "mood") { defaults.mood = "Good"; defaults.notes = ""; }
    if (screen === "appointments") { defaults.doctorName = ""; defaults.appointmentDate = ""; defaults.appointmentTime = ""; defaults.notes = ""; defaults.reminderEnabled = true; }
    if (screen === "medication") { defaults.medicineName = ""; defaults.dosage = ""; defaults.reminderTime = ""; defaults.isEnabled = true; }
    if (screen === "vitals") { defaults.bloodPressureSystolic = ""; defaults.bloodPressureDiastolic = ""; defaults.bloodSugar = ""; defaults.weight = ""; defaults.bmi = ""; defaults.recordDate = ""; defaults.notes = ""; }
    if (screen === "symptoms") { defaults.symptomName = ""; defaults.severity = "Mild"; defaults.notes = ""; defaults.recordDate = ""; }
    if (screen === "period") { defaults.startDate = ""; defaults.endDate = ""; defaults.flow = "Medium"; defaults.notes = ""; }
    setForm(defaults);
    setShowAddForm(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    const f: any = { ...item };
    if (f.appointmentDate) f.appointmentDate = new Date(f.appointmentDate).toISOString().split("T")[0];
    if (f.recordDate) f.recordDate = new Date(f.recordDate).toISOString().split("T")[0];
    if (f.startDate) f.startDate = new Date(f.startDate).toISOString().split("T")[0];
    if (f.endDate) f.endDate = new Date(f.endDate).toISOString().split("T")[0];
    setForm(f);
    setShowAddForm(true);
  };

  const save = async () => {
    const id = editing?.id || editing?._id;
    try {
      if (screen === "mood") {
        const d = { profileID: profile?.id || "", mood: form.mood, notes: form.notes, recordDate: new Date() };
        id ? await healthService.updateMood(id, d) : await healthService.addMood(d);
      } else if (screen === "appointments") {
        const d = { profileID: profile?.id || "", ...form, appointmentDate: new Date(form.appointmentDate) };
        id ? await healthService.updateAppointment(id, d) : await healthService.addAppointment(d);
      } else if (screen === "medication") {
        const d = { profileID: profile?.id || "", ...form };
        id ? await healthService.updateMedicineReminder(id, form) : await healthService.addMedicineReminder(d);
      } else if (screen === "vitals") {
        const d = {
          profileID: profile?.id || "",
          ...form,
          bloodPressureSystolic: form.bloodPressureSystolic ? Number(form.bloodPressureSystolic) : undefined,
          bloodPressureDiastolic: form.bloodPressureDiastolic ? Number(form.bloodPressureDiastolic) : undefined,
          bloodSugar: form.bloodSugar ? Number(form.bloodSugar) : undefined,
          weight: form.weight ? Number(form.weight) : undefined,
          bmi: form.bmi ? Number(form.bmi) : undefined,
          recordDate: new Date(form.recordDate || new Date()),
        };
        id ? await healthService.updateHealthRecord(id, d) : await healthService.addHealthRecord(d);
      } else if (screen === "symptoms") {
        const d = { profileID: profile?.id || "", ...form, recordDate: new Date(form.recordDate || new Date()) };
        id ? await healthService.updateSymptom(id, d) : await healthService.addSymptom(d);
      } else if (screen === "period") {
        const d = { profileID: profile?.id || "", ...form, startDate: new Date(form.startDate), endDate: form.endDate ? new Date(form.endDate) : undefined };
        id ? await healthService.updatePeriod(id, d) : await healthService.addPeriod(d);
      }
      setShowAddForm(false);
      setEditing(null);
      load();
    } catch (e) {
      Alert.alert("Error", "Failed to save. Try again.");
    }
  };

  const del = (item: any) => {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const id = item.id || item._id;
          if (screen === "mood") await healthService.deleteMood(id);
          if (screen === "appointments") await healthService.deleteAppointment(id);
          if (screen === "medication") await healthService.deleteMedicineReminder(id);
          if (screen === "vitals") await healthService.deleteHealthRecord(id);
          if (screen === "symptoms") await healthService.deleteSymptom(id);
          if (screen === "period") await healthService.deletePeriod(id);
          load();
        },
      },
    ]);
  };

  const savePeriodCal = async () => {
    if (!ptStart) return;
    try {
      await healthService.addPeriod({ profileID: profile?.id || "", startDate: ptStart, endDate: ptEnd || undefined, flow: ptFlow as any, notes: "" });
      setShowFlowPicker(false);
      setPtStep("idle");
      setPtStart(null);
      setPtEnd(null);
      setPtFlow("Medium");
      load();
    } catch (e) {
      Alert.alert("Error", "Failed to save period.");
    }
  };

  // Subtitle header resolver
  const getPeriodSubtitle = () => {
    const sorted = [...items].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    const uniqueCycles: any[] = [];
    sorted.forEach((record) => {
      const date = new Date(record.startDate);
      const isClose = uniqueCycles.some((c) => {
        const diffDays = Math.abs((new Date(c.startDate).getTime() - date.getTime()) / 864e5);
        return diffDays < 15;
      });
      if (!isClose) {
        uniqueCycles.push(record);
      }
    });

    const monthYear = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (uniqueCycles.length >= 2) {
      const diffs = uniqueCycles.slice(0, -1).map((_: any, i: number) =>
        Math.round((new Date(uniqueCycles[i].startDate).getTime() - new Date(uniqueCycles[i + 1].startDate).getTime()) / 864e5)
      );
      const validDiffs = diffs.filter((d) => d > 0);
      if (validDiffs.length > 0) {
        const avg = Math.round(validDiffs.reduce((a: number, b: number) => a + b, 0) / validDiffs.length);
        return `${monthYear} · Avg cycle ${avg} days`;
      }
    }
    if (uniqueCycles.length === 1) {
      const cycleDay = Math.round((Date.now() - new Date(uniqueCycles[0].startDate).getTime()) / 864e5) + 1;
      return `${monthYear} · Cycle day ${cycleDay}`;
    }
    return `${monthYear} · No cycles logged`;
  };

  const renderPeriodScreen = () => {
    const today = new Date();
    const year = calYear, month = calMonth;
    const sorted = [...items].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    const uniqueCycles: any[] = [];
    sorted.forEach((record) => {
      const date = new Date(record.startDate);
      const isClose = uniqueCycles.some((c) => {
        const diffDays = Math.abs((new Date(c.startDate).getTime() - date.getTime()) / 864e5);
        return diffDays < 15;
      });
      if (!isClose) {
        uniqueCycles.push(record);
      }
    });

    let avgCycle = 28;
    let isCalculated = false;
    if (uniqueCycles.length >= 2) {
      const diffs = uniqueCycles.slice(0, -1).map((_: any, i: number) =>
        Math.round((new Date(uniqueCycles[i].startDate).getTime() - new Date(uniqueCycles[i + 1].startDate).getTime()) / 864e5)
      );
      const validDiffs = diffs.filter((d) => d > 0);
      if (validDiffs.length > 0) {
        avgCycle = Math.round(validDiffs.reduce((a: number, b: number) => a + b, 0) / validDiffs.length);
        isCalculated = true;
      }
    }

    let daysUntilNext: number | string | null = null;
    if (uniqueCycles.length > 0) {
      const nextDate = new Date(new Date(uniqueCycles[0].startDate).getTime() + avgCycle * 864e5);
      const diff = Math.round((nextDate.getTime() - today.getTime()) / 864e5);
      if (diff === 0) {
        daysUntilNext = "Today";
      } else if (diff < 0) {
        daysUntilNext = `Overdue`;
      } else {
        daysUntilNext = diff;
      }
    }

    const periodDays = new Set<number>(), predictedDays = new Set<number>(), fertileDays = new Set<number>();
    items.forEach((p: any) => {
      const s2 = new Date(p.startDate);
      const e2 = p.endDate ? new Date(p.endDate) : new Date(s2.getTime() + 5 * 864e5);
      for (let d = new Date(s2); d <= e2; d.setDate(d.getDate() + 1))
        if (d.getFullYear() === year && d.getMonth() === month) periodDays.add(d.getDate());
    });

    if (uniqueCycles.length > 0) {
      const lastStart = new Date(uniqueCycles[0].startDate);
      const nextStart = new Date(lastStart.getTime() + avgCycle * 864e5);
      for (let d = new Date(nextStart); d <= new Date(nextStart.getTime() + 5 * 864e5); d.setDate(d.getDate() + 1))
        if (d.getFullYear() === year && d.getMonth() === month) predictedDays.add(d.getDate());
      for (let d = new Date(lastStart.getTime() + 10 * 864e5); d <= new Date(lastStart.getTime() + 15 * 864e5); d.setDate(d.getDate() + 1))
        if (d.getFullYear() === year && d.getMonth() === month) fertileDays.add(d.getDate());
    }

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    
    const getCellStyle = (day: number) => {
      const dayDate = new Date(year, month, day);
      if (ptStart && ptEnd) {
        if (dayDate >= ptStart && dayDate <= ptEnd) return { bg: "#FBEAF0", text: "#72243E" };
      }
      if (ptStart && day === ptStart.getDate() && month === ptStart.getMonth() && year === ptStart.getFullYear()) return { bg: PINK, text: "#fff" };
      if (ptEnd && day === ptEnd.getDate() && month === ptEnd.getMonth() && year === ptEnd.getFullYear()) return { bg: PINK, text: "#fff" };
      if (ptStart && !ptEnd && day === ptStart.getDate() && month === ptStart.getMonth() && year === ptStart.getFullYear()) return { bg: PINK, text: "#fff" };
      if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) return { bg: NAVY, text: "#fff" };
      if (periodDays.has(day)) return { bg: "#FBEAF0", text: "#72243E" };
      if (predictedDays.has(day)) return { bg: "#F4C0D1", text: "#72243E" };
      if (fertileDays.has(day)) return { bg: "#EAF3DE", text: "#27500A" };
      return { bg: "transparent", text: "#1F2937" };
    };

    const latest = sorted[0];
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
        {/* Stat Chips */}
        <View style={ps.chipRow}>
          <View style={ps.chip}>
            <Text style={ps.chipNum}>{uniqueCycles.length >= 2 ? avgCycle : "—"}</Text>
            <Text style={ps.chipLabel}>Avg cycle days</Text>
            <Text style={ps.chipHint}>
              {isCalculated ? "Calculated" : "Log 2+ cycles"}
            </Text>
          </View>
          <View style={ps.chip}>
            <Text style={[ps.chipNum, { color: daysUntilNext !== null ? PINK : "#D1D5DB" }]}>
              {daysUntilNext !== null ? daysUntilNext : "—"}
            </Text>
            <Text style={ps.chipLabel}>Days until next</Text>
            <Text style={ps.chipHint}>
              {daysUntilNext !== null ? (isCalculated ? "Prediction" : "Using 28d default") : "Log a cycle"}
            </Text>
          </View>
        </View>
        
        {/* Legend */}
        <View style={ps.legendRow}>
          <View style={ps.legendItem}><View style={[ps.dot, { backgroundColor: PINK }]} /><Text style={ps.legendTxt}>Period</Text></View>
          <View style={ps.legendItem}><View style={[ps.dot, { backgroundColor: "#F4C0D1" }]} /><Text style={ps.legendTxt}>Predicted</Text></View>
          <View style={ps.legendItem}><View style={[ps.dot, { backgroundColor: "#EAF3DE", borderWidth: 0.5, borderColor: "#27500A" }]} /><Text style={ps.legendTxt}>Fertile</Text></View>
          <View style={ps.legendItem}><View style={[ps.dot, { backgroundColor: NAVY }]} /><Text style={ps.legendTxt}>Today</Text></View>
        </View>
        
        {/* Calendar */}
        <View style={ps.calBox}>
          <View style={ps.calNavRow}>
            <TouchableOpacity
              style={ps.calNavBtn}
              onPress={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
                else { setCalMonth(calMonth - 1); }
              }}
            >
              <Text style={ps.calNavArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={ps.calMonth}>{new Date(calYear, calMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</Text>
            <TouchableOpacity
              style={ps.calNavBtn}
              onPress={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
                else { setCalMonth(calMonth + 1); }
              }}
            >
              <Text style={ps.calNavArrow}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={ps.calGrid}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <Text key={i} style={ps.dayLbl}>{d}</Text>)}
            {cells.map((day, i) => {
              if (!day) return <View key={`e${i}`} style={ps.cell} />;
              const { bg, text } = getCellStyle(day);
              const onTap = () => {
                const tapped = new Date(year, month, day);
                if (ptStep === "idle") { setPtStart(tapped); setPtStep("end"); }
                else {
                  const s2 = ptStart!, e2 = tapped;
                  setPtStart(s2 <= e2 ? s2 : e2);
                  setPtEnd(s2 <= e2 ? e2 : s2);
                  setShowFlowPicker(true);
                }
              };
              return (
                <TouchableOpacity key={day} style={ps.cell} onPress={onTap}>
                  <View style={[ps.circle, { backgroundColor: bg }]}>
                    <Text style={[ps.dayNum, { color: text }]}>{day}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {ptStep === "end" && ptStart && (
          <View style={ps.calHint}>
            <Text style={ps.calHintTxt}>📍 {ptStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} selected — tap end date</Text>
            <TouchableOpacity onPress={() => { setPtStep("idle"); setPtStart(null); }}><Text style={{ color: PINK, fontSize: 12, fontWeight: "500" }}>Cancel</Text></TouchableOpacity>
          </View>
        )}
        
        {/* Action rows */}
        <View style={ps.actionBox}>
          <View style={ps.actionRow}>
            <Text style={ps.actionIcon}>💧</Text>
            <Text style={ps.actionLbl}>Flow intensity</Text>
            <Text style={ps.actionVal}>{latest?.flow || "—"}</Text>
          </View>
          <View style={ps.divider} />
          <View style={ps.actionRow}>
            <Text style={ps.actionIcon}>😊</Text>
            <Text style={ps.actionLbl}>Mood today</Text>
            <Text style={ps.actionVal}>{latest?.notes || "—"}</Text>
          </View>
        </View>
        <View style={{ padding: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "400" }}>🌸 Tap a day on the calendar to log your period</Text>
        </View>
      </ScrollView>
    );
  };

  const renderCard = (item: any) => {
    let title = "", sub = "";
    if (screen === "mood") { title = item.mood; sub = fmt(item.recordDate); }
    if (screen === "appointments") { title = item.doctorName; sub = `${fmt(item.appointmentDate)} • ${item.appointmentTime}`; }
    if (screen === "medication") { title = item.medicineName; sub = `${item.dosage || ""} • ${item.reminderTime}`; }
    if (screen === "vitals") { title = fmt(item.recordDate); sub = [item.bloodPressureSystolic && `BP ${item.bloodPressureSystolic}/${item.bloodPressureDiastolic}`, item.weight && `${item.weight}kg`, item.bmi && `BMI ${item.bmi}`].filter(Boolean).join(" • "); }
    if (screen === "symptoms") { title = item.symptomName; sub = `${item.severity} • ${fmt(item.recordDate)}`; }
    if (screen === "period") { title = `From ${fmt(item.startDate)}`; sub = `Flow: ${item.flow}${item.endDate ? ` • Until ${fmt(item.endDate)}` : ""}`; }
    
    const color = activeFeat?.color || COLOR_BLUE;
    const tint = activeFeat?.tint || "#F3F4F6";
    
    return (
      <View style={s.card} key={item.id || item._id}>
        <View style={[s.cardIcon, { backgroundColor: tint }]}><Text style={{ fontSize: 18 }}>{activeFeat?.icon}</Text></View>
        <View style={s.cardBody}>
          <Text style={s.cardTitle}>{title}</Text>
          <Text style={s.cardSub}>{sub}</Text>
        </View>
        <TouchableOpacity onPress={() => openEdit(item)} style={s.actionBtn}><Text style={{ fontSize: 13 }}>✏️</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => del(item)} style={s.actionBtn}><Text style={{ fontSize: 13 }}>🗑️</Text></TouchableOpacity>
      </View>
    );
  };

  const renderFormField = (label: string, key: string, opts?: any) => (
    <View key={key} style={{ marginBottom: 14 }}>
      <Text style={s.formLabel}>{label}</Text>
      {opts?.isDate ? (
        <TouchableOpacity style={s.input} onPress={() => { setCalField(key); setShowCal(true); }}>
          <Text style={{ color: form[key] ? "#1F2937" : "#9CA3AF", fontSize: 13, fontWeight: "400" }}>{form[key] || "Select date"}</Text>
        </TouchableOpacity>
      ) : opts?.options ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {opts.options.map((o: string) => (
            <TouchableOpacity
              key={o}
              onPress={() => setForm({ ...form, [key]: o })}
              style={[s.optBtn, form[key] === o && { backgroundColor: activeFeat?.tint, borderColor: activeFeat?.color }]}
            >
              <Text style={[s.optBtnText, form[key] === o && { color: activeFeat?.color, fontWeight: "500" }]}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : opts?.isSwitch ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
          <Text style={{ fontSize: 13, color: "#4B5563", flex: 1, fontWeight: "400" }}>{opts.switchLabel || ""}</Text>
          <Switch
            value={!!form[key]}
            onValueChange={(v) => setForm({ ...form, [key]: v })}
            trackColor={{ false: "#D1D5DB", true: "#A7F3D0" }}
            thumbColor={form[key] ? COLOR_BLUE : "#F3F4F6"}
          />
        </View>
      ) : (
        <TextInput
          style={s.input}
          value={form[key]?.toString() || ""}
          onChangeText={(t) => setForm({ ...form, [key]: t })}
          placeholder={opts?.placeholder || ""}
          placeholderTextColor="#9CA3AF"
          keyboardType={opts?.numeric ? "numeric" : "default"}
          multiline={opts?.multi}
          numberOfLines={opts?.multi ? 3 : 1}
          textAlignVertical={opts?.multi ? "top" : "auto"}
        />
      )}
    </View>
  );

  const renderFormContent = () => {
    if (screen === "mood") return (
      <>
        {renderFormField("How are you feeling?", "mood", { options: MOODS })}
        {renderFormField("Notes (optional)", "notes", { placeholder: "Any additional thoughts...", multi: true })}
      </>
    );
    if (screen === "appointments") return (
      <>
        {renderFormField("Doctor Name", "doctorName", { placeholder: "Dr. Smith" })}
        {renderFormField("Date", "appointmentDate", { isDate: true })}
        {renderFormField("Time", "appointmentTime", { placeholder: "10:00 AM" })}
        {renderFormField("Notes", "notes", { placeholder: "Notes...", multi: true })}
        {renderFormField("", "reminderEnabled", { isSwitch: true, switchLabel: "Enable Reminder" })}
      </>
    );
    if (screen === "medication") return (
      <>
        {renderFormField("Medicine Name", "medicineName", { placeholder: "Aspirin" })}
        {renderFormField("Dosage", "dosage", { placeholder: "100mg" })}
        {renderFormField("Reminder Time", "reminderTime", { placeholder: "08:00 AM" })}
        {renderFormField("", "isEnabled", { isSwitch: true, switchLabel: "Enable Reminder" })}
      </>
    );
    if (screen === "vitals") return (
      <>
        {renderFormField("Date", "recordDate", { isDate: true })}
        {renderFormField("BP Systolic", "bloodPressureSystolic", { placeholder: "120", numeric: true })}
        {renderFormField("BP Diastolic", "bloodPressureDiastolic", { placeholder: "80", numeric: true })}
        {renderFormField("Blood Sugar (mg/dL)", "bloodSugar", { placeholder: "100", numeric: true })}
        {renderFormField("Weight (kg)", "weight", { placeholder: "70", numeric: true })}
        {renderFormField("BMI", "bmi", { placeholder: "22.5", numeric: true })}
        {renderFormField("Notes", "notes", { placeholder: "Notes...", multi: true })}
      </>
    );
    if (screen === "symptoms") return (
      <>
        {renderFormField("Symptom Name", "symptomName", { placeholder: "Headache" })}
        {renderFormField("Severity", "severity", { options: SEVERITIES })}
        {renderFormField("Date", "recordDate", { isDate: true })}
        {renderFormField("Notes", "notes", { placeholder: "Notes...", multi: true })}
      </>
    );
    if (screen === "period") return (
      <>
        {renderFormField("Start Date", "startDate", { isDate: true })}
        {renderFormField("End Date (optional)", "endDate", { isDate: true })}
        {renderFormField("Flow", "flow", { options: FLOWS })}
        {renderFormField("Notes", "notes", { placeholder: "Notes...", multi: true })}
      </>
    );
    return null;
  };

  const feat = FEATURES.filter((f) => !f.femaleOnly || isFemale);
  const activeFeat = FEATURES.find((f) => f.id === screen);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* PREMIUM SOLID BLUE HEADER */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.back}
          onPress={screen !== "home" ? () => setScreen("home") : () => router.back()}
        >
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>
            {screen === "home" ? "Health Centre" : activeFeat?.label}
          </Text>
          <Text style={s.headerSub}>
            {screen === "home"
              ? (todayLogsCount > 0 ? `Today: ${todayLogsCount} logs logged` : "No logs recorded today")
              : screen === "period"
              ? getPeriodSubtitle()
              : activeFeat?.sub}
          </Text>
        </View>
        {/* Header Stats Chips Row */}
        <View style={s.headerStatsRow}>
          <View style={s.headerStatChip}>
            <Text style={s.headerStatCount}>{counts.meds}</Text>
            <Text style={s.headerStatLabel}>Meds</Text>
          </View>
          <View style={s.headerStatChip}>
            <Text style={s.headerStatCount}>{counts.appointments}</Text>
            <Text style={s.headerStatLabel}>Visits</Text>
          </View>
        </View>
      </View>

      {/* Segmented horizontal scroll tab bar */}
      <View style={s.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
          {SCREENS.filter((scr) => !scr.femaleOnly || isFemale).map((item) => {
            const isActive = screen === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[s.tabPill, isActive && s.tabPillActive]}
                onPress={() => {
                  setScreen(item.id as Screen);
                  setShowAddForm(false);
                  setEditing(null);
                }}
              >
                <Text style={[s.tabPillText, isActive && s.tabPillTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={s.container}>
        {screen === "home" ? (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            <Text style={s.sectionLabel}>HEALTH FEATURES</Text>
            {feat.map((f) => (
              <TouchableOpacity key={f.id} style={s.featureCard} onPress={() => { setScreen(f.id as Screen); }}>
                <View style={[s.featureIcon, { backgroundColor: f.tint }]}>
                  <Text style={{ fontSize: 22 }}>{f.icon}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={s.featureTitle}>{f.label}</Text>
                  <Text style={s.featureSub}>{f.sub}</Text>
                </View>
                <Text style={{ fontSize: 16, color: "#9CA3AF" }}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <>
            {/* Inline Add/Edit Form Card (not on period calendar screen) */}
            {screen !== "period" && (
              <View style={s.inlineFormCard}>
                <TouchableOpacity
                  style={s.formHeaderToggle}
                  onPress={() => {
                    if (showAddForm) {
                      setShowAddForm(false);
                      setEditing(null);
                    } else {
                      openAdd();
                    }
                  }}
                >
                  <Text style={s.formHeaderToggleText}>
                    {editing ? `✏️ Edit ${activeFeat?.label}` : `＋ Add New ${activeFeat?.label}`}
                  </Text>
                  <Text style={s.formHeaderToggleIcon}>{showAddForm ? "▲" : "▼"}</Text>
                </TouchableOpacity>

                {showAddForm && (
                  <View style={s.formContent}>
                    {renderFormContent()}
                    <View style={s.formActions}>
                      <TouchableOpacity style={s.formCancelBtn} onPress={() => { setShowAddForm(false); setEditing(null); }}>
                        <Text style={s.formCancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.formSaveBtn, { backgroundColor: activeFeat?.color || COLOR_BLUE }]} onPress={save}>
                        <Text style={s.formSaveBtnText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {screen === "period" ? renderPeriodScreen() : (
              <FlatList
                data={items}
                keyExtractor={(item) => item.id || item._id}
                contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
                ListEmptyComponent={
                  <View style={s.empty}>
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>{activeFeat?.icon}</Text>
                    <Text style={s.emptyTxt}>No {activeFeat?.label} records yet</Text>
                  </View>
                }
                renderItem={({ item }) => renderCard(item)}
              />
            )}
          </>
        )}
      </View>

      {/* Mini Flow Picker Modal for Cycle Logs */}
      <Modal
        visible={showFlowPicker}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowFlowPicker(false); setPtStep("idle"); setPtStart(null); setPtEnd(null); }}
      >
        <View style={ps.flowOverlay}>
          <View style={ps.flowBox}>
            <Text style={ps.flowTitle}>Log Period</Text>
            <Text style={ps.flowSub}>{ptStart ? fmt(ptStart) : ""}{ptEnd && ptEnd.getTime() !== ptStart?.getTime() ? ` → ${fmt(ptEnd)}` : ""}</Text>
            <Text style={ps.flowLabel}>Flow intensity</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
              {FLOWS.map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setPtFlow(f)}
                  style={[ps.flowBtn, ptFlow === f && { backgroundColor: PINK, borderColor: PINK }]}
                >
                  <Text style={[ps.flowBtnTxt, ptFlow === f && { color: "#fff" }]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[s.addBtn, { backgroundColor: PINK }]} onPress={savePeriodCal}>
              <Text style={s.addBtnTxt}>Save Period</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowFlowPicker(false); setPtStep("idle"); setPtStart(null); setPtEnd(null); }}
              style={{ marginTop: 12, alignItems: "center" }}
            >
              <Text style={{ color: "#6B7280", fontSize: 13, fontWeight: "400" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Calendar Picker for custom inputs */}
      <Calendar
        visible={showCal}
        onClose={() => setShowCal(false)}
        onSelectDate={(d) => {
          setForm((p: any) => ({ ...p, [calField]: d.toISOString().split("T")[0] }));
          setShowCal(false);
        }}
        selectedDate={form[calField] ? new Date(form[calField]) : undefined}
      />
    </>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: COLOR_BLUE,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  back: {
    marginRight: 14,
    padding: 4,
  },
  backTxt: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "500",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
  },
  headerSub: {
    color: "#EFF6FF",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "400",
  },
  headerStatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  headerStatChip: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerStatCount: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  headerStatLabel: {
    color: "#EFF6FF",
    fontSize: 10,
    fontWeight: "400",
  },

  // Segmented tab styles
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
    backgroundColor: COLOR_BG,
  },
  tabScroll: {
    backgroundColor: "#E5E7EB",
    borderRadius: 24,
    padding: 3,
    flexDirection: "row",
    gap: 2,
  },
  tabPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPillActive: {
    backgroundColor: COLOR_CARD,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabPillText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "400",
  },
  tabPillTextActive: {
    color: "#1F2937",
    fontWeight: "500",
  },

  container: {
    flex: 1,
    backgroundColor: COLOR_BG,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
    letterSpacing: 1.1,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  featureCard: {
    backgroundColor: COLOR_CARD,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1F2937",
  },
  featureSub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "400",
  },
  card: {
    backgroundColor: COLOR_CARD,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1F2937",
  },
  cardSub: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "400",
  },
  actionBtn: {
    padding: 8,
  },

  // Inline forms style
  inlineFormCard: {
    backgroundColor: COLOR_CARD,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: "hidden",
  },
  formHeaderToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  formHeaderToggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  formHeaderToggleIcon: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  formContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
    paddingTop: 8,
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  formCancelBtn: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  formCancelBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  formSaveBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  formSaveBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },

  addBtn: {
    backgroundColor: COLOR_BLUE,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  addBtnTxt: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTxt: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  formLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#4B5563",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#1F2937",
    minHeight: 40,
    fontWeight: "400",
  },
  optBtn: {
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
  },
  optBtnText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "400",
  },
});

const ps = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    backgroundColor: COLOR_CARD,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  chipNum: {
    fontSize: 32,
    fontWeight: "500",
    color: "#1F2937",
  },
  chipLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
    fontWeight: "400",
  },
  chipHint: {
    fontSize: 10,
    color: "#D97706",
    marginTop: 3,
    textAlign: "center",
    fontWeight: "400",
  },
  legendRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendTxt: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "400",
  },
  calBox: {
    backgroundColor: COLOR_CARD,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  calNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  calNavArrow: {
    fontSize: 20,
    color: NAVY,
    fontWeight: "500",
    lineHeight: 24,
  },
  calMonth: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayLbl: {
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
    marginBottom: 4,
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  dayNum: {
    fontSize: 13,
    fontWeight: "500",
  },
  actionBox: {
    backgroundColor: COLOR_CARD,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  actionIcon: {
    fontSize: 18,
    width: 28,
  },
  actionLbl: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "400",
  },
  actionIconText: {
    fontSize: 20,
    color: "#9CA3AF",
  },
  actionVal: {
    fontSize: 13,
    color: PINK,
    fontWeight: "500",
  },
  divider: {
    height: 0.5,
    backgroundColor: COLOR_BORDER,
    marginLeft: 56,
  },
  calHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF0F5",
    borderWidth: 0.5,
    borderColor: PINK,
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  calHintTxt: {
    fontSize: 12,
    color: "#72243E",
    flex: 1,
    marginRight: 8,
    fontWeight: "400",
  },
  flowOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  flowBox: {
    backgroundColor: COLOR_CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 44,
  },
  flowTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 4,
  },
  flowSub: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 20,
    fontWeight: "400",
  },
  flowLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#4B5563",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  flowBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLOR_BORDER,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  flowBtnTxt: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",
  },
});

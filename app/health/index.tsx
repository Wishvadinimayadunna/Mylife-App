import CycleInsightsCard from "@/components/health/CycleInsightsCard";
import DailySummaryCard, { buildTodayFeed } from "@/components/health/DailySummaryCard";
import HealthCalendar from "@/components/health/HealthCalendar";
import HealthScoreCard from "@/components/health/HealthScoreCard";
import QuickActionBar from "@/components/health/QuickActionBar";
import StreakCarousel from "@/components/health/StreakCarousel";
import WellnessAvatar from "@/components/health/WellnessAvatar";
import WellnessTimeline, { buildTimelineEntries } from "@/components/health/WellnessTimeline";
import healthService from "@/services/healthService";
import { useAppStore } from "@/store/appStore";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Tab = "home" | "timeline" | "calendar" | "insights" | "cycle";
const TABS: { id: Tab; label: string; femaleOnly?: boolean }[] = [
  { id: "home", label: "Home" },
  { id: "timeline", label: "Timeline" },
  { id: "calendar", label: "Calendar" },
  { id: "insights", label: "Insights" },
  { id: "cycle", label: "Cycle", femaleOnly: true },
];
const PINK = "#DB2777";
const BLUE = "#2563EB";
const FLOWS = ["Light", "Medium", "Heavy"];

export default function HealthScreen() {
  const { profile } = useAppStore();
  const router = useRouter();
  const isFemale = profile?.gender === "Female";
  const [tab, setTab] = useState<Tab>("home");
  const [moods, setMoods] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [symptoms, setSymptoms] = useState<any[]>([]);
  const [vitals, setVitals] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [waterLogs, setWaterLogs] = useState<any[]>([]);
  const [sleepLogs, setSleepLogs] = useState<any[]>([]);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [ptStep, setPtStep] = useState<"idle" | "end">("idle");
  const [ptStart, setPtStart] = useState<Date | null>(null);
  const [ptEnd, setPtEnd] = useState<Date | null>(null);
  const [ptFlow, setPtFlow] = useState("Medium");
  const [showFlowPicker, setShowFlowPicker] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];
  const today = new Date();

  const loadAll = useCallback(async () => {
    try {
      const [m, med, sy, vi, pe, ap, wa, sl] = await Promise.all([
        healthService.getMoods(), healthService.getMedicineReminders(),
        healthService.getSymptoms(), healthService.getHealthRecords(),
        healthService.getPeriods(), healthService.getAppointments(),
        healthService.getWaterLogs(), healthService.getSleepLogs(),
      ]);
      setMoods(m); setMedicines(med); setSymptoms(sy); setVitals(vi);
      setPeriods(pe); setAppointments(ap); setWaterLogs(wa); setSleepLogs(sl);
    } catch (e) { console.error("Load error:", e); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const todayWater = waterLogs.filter(l => new Date(l.recordedAt || l.createdAt).toDateString() === today.toDateString()).reduce((s, l) => s + l.amountML, 0);
  const todaySleep = sleepLogs.filter(l => new Date(l.recordedAt || l.createdAt).toDateString() === today.toDateString()).reduce((_, l) => l.durationHours, 0);
  const enabledMeds = medicines.filter(m => m.isEnabled);
  const medsTaken = enabledMeds.filter(m => m.takenDates?.includes(todayStr)).length;
  const medsCompliance = enabledMeds.length > 0 ? medsTaken / enabledMeds.length : 0;
  const moodToday = moods.find(m => new Date(m.recordDate || m.createdAt).toDateString() === today.toDateString());
  const hasSevere = symptoms.some(s => new Date(s.recordDate || s.createdAt).toDateString() === today.toDateString() && s.severity === "Severe");
  const score = Math.round(Math.min(todayWater / 2000, 1) * 25 + (todaySleep > 0 ? Math.min(todaySleep / 8, 1) * 25 : 0) + medsCompliance * 25 + (moodToday ? 25 : 0));

  const streak = (check: (ymd: string) => boolean) => { let n = 0; const d = new Date(); d.setHours(0, 0, 0, 0); while (check(d.toISOString().split("T")[0])) { n++; d.setDate(d.getDate() - 1); } return n; };
  const waterStreak = streak(ymd => waterLogs.filter(l => new Date(l.recordedAt || l.createdAt).toISOString().split("T")[0] === ymd).reduce((s, l) => s + l.amountML, 0) >= 1500);
  const sleepStreak = streak(ymd => sleepLogs.filter(l => new Date(l.recordedAt || l.createdAt).toISOString().split("T")[0] === ymd).reduce((_, l) => l.durationHours, 0) >= 7);
  const medsStreak = enabledMeds.length > 0 ? streak(ymd => enabledMeds.every(m => m.takenDates?.includes(ymd))) : 0;

  const handleWater = async () => { try { const l = await healthService.addWaterLog(250); setWaterLogs(p => [l, ...p]); } catch {} };
  const handleSleep = async (h: number) => { try { const l = await healthService.addSleepLog(h); setSleepLogs(p => [l, ...p]); } catch {} };
  const handleMed = async (id: string, taken: boolean) => { try { const u = await healthService.logMedicineTaken(id, todayStr, taken); setMedicines(p => p.map(m => (m._id || m.id) === id ? { ...m, takenDates: u.takenDates } : m)); } catch {} };
  const handleMood = async (mood: string) => { try { await healthService.addMood({ profileID: profile?.id || "", mood: mood as any, recordDate: new Date() }); const m = await healthService.getMoods(); setMoods(m); } catch {} };
  const handleDelete = async (entry: any) => {
    try {
      const id = entry.raw._id || entry.raw.id;
      if (entry.type === "water") await healthService.deleteWaterLog(id);
      else if (entry.type === "sleep") await healthService.deleteSleepLog(id);
      else if (entry.type === "mood") await healthService.deleteMood(id);
      else if (entry.type === "symptom") await healthService.deleteSymptom(id);
      else if (entry.type === "vital") await healthService.deleteHealthRecord(id);
      else if (entry.type === "period") await healthService.deletePeriod(id);
      else if (entry.type === "appointment") await healthService.deleteAppointment(id);
      loadAll();
    } catch { Alert.alert("Error", "Could not delete."); }
  };
  const savePeriod = async () => {
    if (!ptStart) return;
    try { await healthService.addPeriod({ profileID: profile?.id || "", startDate: ptStart, endDate: ptEnd || undefined, flow: ptFlow as any, notes: "" }); setShowFlowPicker(false); setPtStep("idle"); setPtStart(null); setPtEnd(null); setPtFlow("Medium"); loadAll(); }
    catch { Alert.alert("Error", "Failed to save period."); }
  };

  const renderCycle = () => {
    const sorted = [...periods].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    const unique: any[] = [];
    sorted.forEach(r => { const d = new Date(r.startDate); if (!unique.some(c => Math.abs((new Date(c.startDate).getTime() - d.getTime()) / 86400000) < 15)) unique.push(r); });
    let avgCycle = 28;
    if (unique.length >= 2) { const diffs = unique.slice(0, -1).map((_, i) => Math.round((new Date(unique[i].startDate).getTime() - new Date(unique[i + 1].startDate).getTime()) / 86400000)).filter(d => d > 0); if (diffs.length) avgCycle = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length); }
    const periodDays = new Set<number>(), predicted = new Set<number>(), fertile = new Set<number>();
    periods.forEach(p => { const s = new Date(p.startDate), e = p.endDate ? new Date(p.endDate) : new Date(s.getTime() + 5 * 86400000); for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) if (d.getFullYear() === calYear && d.getMonth() === calMonth) periodDays.add(d.getDate()); });
    if (unique.length > 0) { const ls = new Date(unique[0].startDate), ns = new Date(ls.getTime() + avgCycle * 86400000); for (const d = new Date(ns); d <= new Date(ns.getTime() + 5 * 86400000); d.setDate(d.getDate() + 1)) if (d.getFullYear() === calYear && d.getMonth() === calMonth) predicted.add(d.getDate()); for (const d = new Date(ls.getTime() + 10 * 86400000); d <= new Date(ls.getTime() + 15 * 86400000); d.setDate(d.getDate() + 1)) if (d.getFullYear() === calYear && d.getMonth() === calMonth) fertile.add(d.getDate()); }
    const firstDay = new Date(calYear, calMonth, 1).getDay(), dim = new Date(calYear, calMonth + 1, 0).getDate();
    const cells = ([] as (number | null)[]).concat(Array(firstDay).fill(null), Array.from({ length: dim }, (_, i) => i + 1));
    const cs = (day: number) => { const dt = new Date(calYear, calMonth, day); if (ptStart && ptEnd && dt >= ptStart && dt <= ptEnd) return { bg: "#FBEAF0", txt: "#72243E" }; if (ptStart && day === ptStart.getDate() && calMonth === ptStart.getMonth() && calYear === ptStart.getFullYear()) return { bg: PINK, txt: "#fff" }; if (day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()) return { bg: "#1a1f36", txt: "#fff" }; if (periodDays.has(day)) return { bg: "#FBEAF0", txt: "#72243E" }; if (predicted.has(day)) return { bg: "#F4C0D1", txt: "#72243E" }; if (fertile.has(day)) return { bg: "#EAF3DE", txt: "#27500A" }; return { bg: "transparent", txt: "#1F2937" }; };
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 12 }}>
        <CycleInsightsCard periods={periods} />
        <View style={cy.box}>
          <View style={cy.nav}>
            <TouchableOpacity style={cy.navBtn} onPress={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}><Text style={cy.arrow}>‹</Text></TouchableOpacity>
            <Text style={cy.navTitle}>{new Date(calYear, calMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</Text>
            <TouchableOpacity style={cy.navBtn} onPress={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}><Text style={cy.arrow}>›</Text></TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <Text key={i} style={cy.dayHdr}>{d}</Text>)}
            {cells.map((day, i) => { if (!day) return <View key={`e${i}`} style={cy.cell} />; const { bg, txt } = cs(day); return (<TouchableOpacity key={day} style={cy.cell} onPress={() => { const t = new Date(calYear, calMonth, day); if (ptStep === "idle") { setPtStart(t); setPtStep("end"); } else { const s2 = ptStart!, e2 = t; setPtStart(s2 <= e2 ? s2 : e2); setPtEnd(s2 <= e2 ? e2 : s2); setShowFlowPicker(true); } }}><View style={[cy.circle, { backgroundColor: bg }]}><Text style={[cy.dayNum, { color: txt }]}>{day}</Text></View></TouchableOpacity>); })}
          </View>
          {ptStep === "end" && ptStart && (<View style={cy.hint}><Text style={{ fontSize: 12, color: "#72243E", flex: 1 }}>📍 {ptStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} selected — tap end date</Text><TouchableOpacity onPress={() => { setPtStep("idle"); setPtStart(null); }}><Text style={{ color: PINK, fontSize: 12 }}>Cancel</Text></TouchableOpacity></View>)}
        </View>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          {[{ c: PINK, l: "Period" }, { c: "#F4C0D1", l: "Predicted" }, { c: "#EAF3DE", l: "Fertile" }, { c: "#1a1f36", l: "Today" }].map(({ c, l }) => (<View key={l} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} /><Text style={{ fontSize: 11, color: "#4B5563" }}>{l}</Text></View>))}
        </View>
      </ScrollView>
    );
  };

  const renderInsights = () => {
    const bars = [
      { label: "💧 Hydration Today", val: `${todayWater}ml`, pct: Math.min(todayWater / 2000, 1), color: "#0EA5E9" },
      { label: "😴 Sleep Last Night", val: todaySleep > 0 ? `${todaySleep}h` : "—", pct: Math.min(todaySleep / 8, 1), color: "#7C3AED" },
      { label: "💊 Meds Today", val: `${medsTaken}/${enabledMeds.length}`, pct: medsCompliance, color: "#10B981" },
      { label: "😊 Mood Entries", val: `${moods.length}`, pct: Math.min(moods.length / 30, 1), color: "#F59E0B" },
      { label: "❤️ Vitals Records", val: `${vitals.length}`, pct: Math.min(vitals.length / 20, 1), color: BLUE },
      { label: "🌡️ Symptoms", val: `${symptoms.length}`, pct: Math.min(symptoms.length / 20, 1), color: "#EF4444" },
    ];
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 12 }}>
        <View style={ins.card}>
          <Text style={ins.cardTitle}>Health Overview</Text>
          {bars.map(b => (
            <View key={b.label} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: "#4B5563" }}>{b.label}</Text>
                <Text style={{ fontSize: 12, color: b.color, fontWeight: "500" }}>{b.val}</Text>
              </View>
              <View style={{ height: 6, backgroundColor: "#F3F4F6", borderRadius: 3 }}>
                <View style={{ height: 6, width: `${Math.round(b.pct * 100)}%`, backgroundColor: b.color, borderRadius: 3 }} />
              </View>
            </View>
          ))}
        </View>
        <View style={ins.card}>
          <Text style={ins.cardTitle}>This Week</Text>
          {[
            { label: "Water logs", val: waterLogs.filter(l => new Date(l.recordedAt || l.createdAt) >= new Date(Date.now() - 7 * 86400000)).length },
            { label: "Sleep nights", val: sleepLogs.filter(l => new Date(l.recordedAt || l.createdAt) >= new Date(Date.now() - 7 * 86400000)).length },
            { label: "Mood entries", val: moods.filter(m => new Date(m.recordDate || m.createdAt) >= new Date(Date.now() - 7 * 86400000)).length },
          ].map(row => (
            <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: "#F3F4F6" }}>
              <Text style={{ fontSize: 13, color: "#4B5563" }}>{row.label}</Text>
              <Text style={{ fontSize: 13, color: BLUE, fontWeight: "500" }}>{row.val}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}><Text style={s.backTxt}>←</Text></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Health Centre</Text>
          <Text style={s.headerSub}>Wellness score: {score}/100</Text>
        </View>
        <View style={[s.badge, { backgroundColor: score >= 75 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444" }]}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>{score}</Text>
        </View>
      </View>

      <View style={s.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
          {TABS.filter(t => !t.femaleOnly || isFemale).map(t => (
            <TouchableOpacity key={t.id} style={[s.tab, tab === t.id && s.tabActive]} onPress={() => setTab(t.id)}>
              <Text style={[s.tabTxt, tab === t.id && s.tabTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
        {tab === "home" && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 14 }}>
            <WellnessAvatar score={score} waterML={todayWater} sleepHours={todaySleep} hasSevereSymptom={hasSevere} />
            <HealthScoreCard score={score} waterML={todayWater} sleepHours={todaySleep} medsCompliance={medsCompliance} moodLogged={!!moodToday} />
            <QuickActionBar waterML={todayWater} sleepHours={todaySleep} medicines={enabledMeds.map(m => ({ ...m, id: m._id || m.id }))} moodToday={moodToday?.mood || null} todayStr={todayStr} onDrinkWater={handleWater} onLogSleep={handleSleep} onToggleMed={handleMed} onLogMood={handleMood} />
            <StreakCarousel waterStreak={waterStreak} sleepStreak={sleepStreak} medsStreak={medsStreak} wellnessStreak={0} />
            <DailySummaryCard entries={buildTodayFeed(waterLogs, sleepLogs, moods, medicines, symptoms, vitals, todayStr)} />
          </ScrollView>
        )}
        {tab === "timeline" && <WellnessTimeline entries={buildTimelineEntries(waterLogs, sleepLogs, moods, medicines, symptoms, vitals, periods, appointments)} onDelete={handleDelete} />}
        {tab === "calendar" && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
            <HealthCalendar waterLogs={waterLogs} sleepLogs={sleepLogs} medicines={medicines} periods={periods} symptoms={symptoms} moods={moods} vitals={vitals} />
          </ScrollView>
        )}
        {tab === "insights" && renderInsights()}
        {tab === "cycle" && renderCycle()}
      </View>

      <Modal visible={showFlowPicker} transparent animationType="slide" onRequestClose={() => { setShowFlowPicker(false); setPtStep("idle"); setPtStart(null); setPtEnd(null); }}>
        <View style={cy.overlay}>
          <View style={cy.sheet}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#1F2937", marginBottom: 4 }}>Log Period</Text>
            <Text style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>{ptStart ? ptStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}{ptEnd && ptEnd.getTime() !== ptStart?.getTime() ? ` → ${ptEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</Text>
            <Text style={{ fontSize: 11, fontWeight: "500", color: "#4B5563", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Flow intensity</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
              {FLOWS.map(f => (<TouchableOpacity key={f} onPress={() => setPtFlow(f)} style={[cy.flowBtn, ptFlow === f && { backgroundColor: PINK, borderColor: PINK }]}><Text style={[{ fontSize: 13, fontWeight: "500", color: "#4B5563" }, ptFlow === f && { color: "#fff" }]}>{f}</Text></TouchableOpacity>))}
            </View>
            <TouchableOpacity style={{ borderRadius: 10, paddingVertical: 14, alignItems: "center", backgroundColor: PINK }} onPress={savePeriod}><Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>Save Period</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowFlowPicker(false); setPtStep("idle"); setPtStart(null); setPtEnd(null); }} style={{ marginTop: 12, alignItems: "center" }}><Text style={{ color: "#6B7280", fontSize: 13 }}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: BLUE, paddingTop: 52, paddingBottom: 18, paddingHorizontal: 20, flexDirection: "row", alignItems: "center" },
  back: { marginRight: 14, padding: 4 },
  backTxt: { color: "#fff", fontSize: 22, fontWeight: "500" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  headerSub: { color: "#BFDBFE", fontSize: 11, marginTop: 2 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  tabBar: { backgroundColor: "#fff", borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB" },
  tabScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  tab: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20, backgroundColor: "#F3F4F6" },
  tabActive: { backgroundColor: BLUE },
  tabTxt: { fontSize: 13, fontWeight: "500", color: "#6B7280" },
  tabTxtActive: { color: "#fff" },
});

const cy = StyleSheet.create({
  box: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 0.5, borderColor: "#E5E7EB", padding: 16 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  navBtn: { width: 32, height: 32, backgroundColor: "#F3F4F6", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  arrow: { fontSize: 20, color: "#1F2937", fontWeight: "500", lineHeight: 24 },
  navTitle: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  dayHdr: { width: "14.28%", textAlign: "center", fontSize: 11, fontWeight: "500", color: "#9CA3AF", marginBottom: 8 },
  cell: { width: "14.28%", alignItems: "center", marginBottom: 4 },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  dayNum: { fontSize: 13, fontWeight: "400" },
  hint: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF0F5", borderWidth: 0.5, borderColor: PINK, borderRadius: 8, padding: 10, marginTop: 10, gap: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  flowBtn: { flex: 1, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
});

const ins = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 0.5, borderColor: "#E5E7EB", padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#1F2937", marginBottom: 16 },
});

import AppointmentCard from "@/components/health/AppointmentCard";
import DailySummaryCard, { buildTodayFeed } from "@/components/health/DailySummaryCard";
import HealthCalendar from "@/components/health/HealthCalendar";
import HealthScoreCard from "@/components/health/HealthScoreCard";
import QuickActionBar from "@/components/health/QuickActionBar";
import WellnessAvatar from "@/components/health/WellnessAvatar";
import WellnessTimeline, { buildTimelineEntries } from "@/components/health/WellnessTimeline";
import healthService from "@/services/healthService";
import { useAppStore } from "@/store/appStore";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { StatChip } from "@/components/ui/StatChip";


type Tab = "home" | "timeline" | "calendar" | "cycle";
const TABS: { id: Tab; label: string; femaleOnly?: boolean }[] = [
  { id: "home", label: "Home" },
  { id: "timeline", label: "Timeline" },
  { id: "calendar", label: "Calendar" },
  { id: "cycle", label: "Cycle", femaleOnly: true },
];
const PINK = "#DB2777";
const BLUE = "#2563EB";

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
  const handlePeriodTap = async (date: Date) => {
    const ds = date.toISOString().split("T")[0];
    const existing = periods.find((p: any) => new Date(p.startDate).toISOString().split("T")[0] === ds);
    try {
      if (existing) { await healthService.deletePeriod(existing._id || existing.id); }
      else { await healthService.addPeriod({ profileID: profile?.id || "", startDate: date, flow: "Medium" as any, notes: "" }); }
      loadAll();
    } catch { Alert.alert("Error", "Could not update period."); }
  };

  const renderCycle = () => {
    const sorted = [...periods].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    let avgCycle = 28;
    if (sorted.length >= 2) {
      const diffs = sorted.slice(0, -1).map((_, i) =>
        Math.round((new Date(sorted[i].startDate).getTime() - new Date(sorted[i + 1].startDate).getTime()) / 86400000)
      ).filter(d => d > 10 && d < 60);
      if (diffs.length) avgCycle = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
    }
    const lastPeriod = sorted.length > 0 ? new Date(sorted[0].startDate) : null;
    const nextPeriod = lastPeriod ? new Date(lastPeriod.getTime() + avgCycle * 86400000) : null;
    const periodStartStrs = new Set(sorted.map(p => new Date(p.startDate).toISOString().split("T")[0]));
    const predictedStrs = new Set<string>();
    if (nextPeriod) {
      for (let d = -2; d <= 2; d++) {
        const pd = new Date(nextPeriod.getTime() + d * 86400000);
        predictedStrs.add(pd.toISOString().split("T")[0]);
      }
    }
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const dim = new Date(calYear, calMonth + 1, 0).getDate();
    const cells = ([] as (number | null)[]).concat(Array(firstDay).fill(null), Array.from({ length: dim }, (_, i) => i + 1));
    const getDayStyle = (day: number) => {
      const ds = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
      if (periodStartStrs.has(ds)) return { bg: PINK, txt: "#fff" };
      if (nextPeriod && ds === nextPeriod.toISOString().split("T")[0]) return { bg: "#F9A8D4", txt: "#9D174D" };
      if (predictedStrs.has(ds)) return { bg: "#FCE7F3", txt: "#9D174D" };
      if (isToday) return { bg: "#1a1f36", txt: "#fff" };
      return { bg: "transparent", txt: "#1F2937" };
    };
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 12 }}>
        <View style={cy.summaryCard}>
          {[
            { label: "🩸 Last Period", value: lastPeriod ? lastPeriod.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Not logged yet", pink: false },
            { label: "🔄 Avg Cycle", value: `${avgCycle} days`, pink: false },
            { label: "🔮 Next Expected", value: nextPeriod ? nextPeriod.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Log more data", pink: true },
          ].map((row, i, arr) => (
            <View key={row.label}>
              <View style={cy.summaryRow}>
                <Text style={cy.summaryLabel}>{row.label}</Text>
                <Text style={[cy.summaryValue, row.pink && { color: PINK }]}>{row.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={cy.summaryDivider} />}
            </View>
          ))}
        </View>
        <View style={cy.box}>
          <View style={cy.nav}>
            <TouchableOpacity style={cy.navBtn} onPress={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}><Text style={cy.arrow}>‹</Text></TouchableOpacity>
            <Text style={cy.navTitle}>{new Date(calYear, calMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</Text>
            <TouchableOpacity style={cy.navBtn} onPress={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}><Text style={cy.arrow}>›</Text></TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <Text key={i} style={cy.dayHdr}>{d}</Text>)}
            {cells.map((day, i) => {
              if (!day) return <View key={`e${i}`} style={cy.cell} />;
              const { bg, txt } = getDayStyle(day);
              return (
                <TouchableOpacity key={day} style={cy.cell} onPress={() => handlePeriodTap(new Date(calYear, calMonth, day))}>
                  <View style={[cy.circle, { backgroundColor: bg }]}><Text style={[cy.dayNum, { color: txt }]}>{day}</Text></View>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={cy.hintTxt}>Tap a date to mark / unmark your period</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
          {[{ c: PINK, l: "Period" }, { c: "#F9A8D4", l: "Predicted" }, { c: "#1a1f36", l: "Today" }].map(({ c, l }) => (
            <View key={l} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} />
              <Text style={{ fontSize: 11, color: "#4B5563" }}>{l}</Text>
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
        <Text style={s.headerTitle}>Health Centre</Text>
      </View>

      <View style={{ backgroundColor: "#FFFFFF", paddingVertical: 10 }}>
        <SegmentedControl
          tabs={TABS.filter(t => !t.femaleOnly || isFemale).map(t => ({ id: t.id, label: t.label }))}
          activeTab={tab}
          onChange={(id) => setTab(id as Tab)}
          style={{ marginHorizontal: 16 }}
        />
      </View>

      <View style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
        {tab === "home" && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 14 }}>
            <WellnessAvatar score={score} waterML={todayWater} sleepHours={todaySleep} hasSevereSymptom={hasSevere} />
            <HealthScoreCard score={score} waterML={todayWater} sleepHours={todaySleep} medsCompliance={medsCompliance} moodLogged={!!moodToday} />
             <QuickActionBar waterML={todayWater} sleepHours={todaySleep} medicines={enabledMeds.map(m => ({ ...m, id: m._id || m.id }))} moodToday={moodToday?.mood || null} todayStr={todayStr} onDrinkWater={handleWater} onLogSleep={handleSleep} onToggleMed={handleMed} onLogMood={handleMood} />
            <AppointmentCard appointments={appointments} onSaved={loadAll} />
            <DailySummaryCard entries={buildTodayFeed(waterLogs, sleepLogs, moods, medicines, symptoms, vitals, todayStr)} />
          </ScrollView>
        )}
        {tab === "timeline" && <WellnessTimeline entries={buildTimelineEntries(waterLogs, sleepLogs, moods, medicines, symptoms, vitals, periods, appointments)} onDelete={handleDelete} />}
        {tab === "calendar" && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
            <HealthCalendar waterLogs={waterLogs} sleepLogs={sleepLogs} medicines={medicines} periods={periods} symptoms={symptoms} moods={moods} vitals={vitals} />
          </ScrollView>
        )}

        {tab === "cycle" && renderCycle()}
      </View>


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
  hintTxt: { fontSize: 11, color: "#9CA3AF", textAlign: "center", marginTop: 10 },
  summaryCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 0.5, borderColor: "#E5E7EB", padding: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  summaryDivider: { height: 0.5, backgroundColor: "#F3F4F6" },
  summaryLabel: { fontSize: 13, color: "#6B7280" },
  summaryValue: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
});


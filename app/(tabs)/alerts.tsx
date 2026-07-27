// ============================================
// Alerts Screen — Notification Center
// Category-based reminders with overdue/upcoming filters,
// manual clear, and auto-clear after 30 days
// ============================================

import familyService from "@/services/familyService";
import futureEventService from "@/services/futureEventService";
import healthService from "@/services/healthService";
import todoService from "@/services/todoService";
import utilityService from "@/services/utilityService";
import { useAppStore } from "@/store/appStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const STATUS_H = Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 44;
const DISMISSED_KEY = "alerts_dismissed_v2";
const AUTO_CLEAR_DAYS = 30;

type CategoryFilter = "all" | "birthday" | "event" | "medicine" | "appointment" | "utility" | "todo";
type StatusFilter = "all" | "overdue" | "upcoming";

interface AlertItem {
  id: string;
  category: CategoryFilter;
  title: string;
  subTitle: string;
  date: Date;
  dateLabel: string;
  timeLabel?: string;
  icon: string;
  color: string;
  route: string;
  daysRemaining: number;
}

interface DismissedRecord {
  id: string;
  dismissedAt: number; // timestamp ms
}

// ── Helpers ────────────────────────────────────────────────
async function loadDismissed(): Promise<DismissedRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    if (!raw) return [];
    const all: DismissedRecord[] = JSON.parse(raw);
    // auto-clear records older than 30 days
    const cutoff = Date.now() - AUTO_CLEAR_DAYS * 24 * 60 * 60 * 1000;
    return all.filter((r) => r.dismissedAt > cutoff);
  } catch {
    return [];
  }
}

async function saveDismissed(records: DismissedRecord[]) {
  await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(records));
}

async function dismissItem(id: string) {
  const existing = await loadDismissed();
  const updated = [...existing.filter((r) => r.id !== id), { id, dismissedAt: Date.now() }];
  await saveDismissed(updated);
}

// (clearAllDismissed removed — use 30-day auto-clear instead)

// ── Component ──────────────────────────────────────────────
export default function AlertsScreen() {
  const router = useRouter();
  const { profile } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [allAlerts, setAllAlerts] = useState<AlertItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // ── Load dismissed state ─────────────────────────────────
  const syncDismissed = useCallback(async () => {
    const records = await loadDismissed();
    setDismissed(new Set(records.map((r) => r.id)));
  }, []);

  // ── Fetch all data ───────────────────────────────────────
  const loadAlerts = useCallback(async () => {
    if (!profile) return;
    try {
      const [members, events, medicines, appointments, bills, tasks, dismissedRecords] =
        await Promise.all([
          familyService.getFamilyMembers("").catch(() => []),
          futureEventService.getFutureEvents().catch(() => []),
          healthService.getMedicineReminders().catch(() => []),
          healthService.getAppointments().catch(() => []),
          utilityService.getAllBills().catch(() => []),
          todoService.getAllTasks().catch(() => []),
          loadDismissed(),
        ]);

      setDismissed(new Set(dismissedRecords.map((r) => r.id)));

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const items: AlertItem[] = [];

      // ── 1. Birthdays ─────────────────────────────────────
      members.forEach((member) => {
        const bdate = new Date(member.dateOfBirth);
        if (isNaN(bdate.getTime())) return;
        const next = new Date(now.getFullYear(), bdate.getMonth(), bdate.getDate());
        if (next < now) next.setFullYear(now.getFullYear() + 1);
        const diff = Math.ceil((next.getTime() - now.getTime()) / 86400000);
        if (diff <= 45) {
          const age = next.getFullYear() - bdate.getFullYear();
          items.push({
            id: `birthday-${member.id}`,
            category: "birthday",
            title: `${member.fullName}'s Birthday`,
            subTitle: member.birthdayReminderEnabled ? `Turning ${age} · Reminder set` : `Turning ${age}`,
            date: next,
            dateLabel: next.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            icon: "🎂",
            color: "#F59E0B",
            route: "/family",
            daysRemaining: diff,
          });
        }
      });

      // ── 2. Future Events ─────────────────────────────────
      events.forEach((event) => {
        if (event.completedAt) return;
        const edate = new Date(event.eventDate);
        if (isNaN(edate.getTime())) return;
        edate.setHours(0, 0, 0, 0);
        let next = new Date(edate);
        if (event.isRecurringYearly) {
          next.setFullYear(now.getFullYear());
          if (next < now) next.setFullYear(now.getFullYear() + 1);
        }
        const diff = Math.ceil((next.getTime() - now.getTime()) / 86400000);
        let icon = "📅", color = "#6366F1";
        if (event.type === "Anniversary") { icon = "💍"; color = "#EC4899"; }
        else if (event.type === "Wedding") { icon = "💒"; color = "#8B5CF6"; }
        else if (event.type === "Party") { icon = "🎉"; color = "#10B981"; }
        else if (event.type === "Vacation") { icon = "✈️"; color = "#3B82F6"; }
        else if (event.type === "Interview") { icon = "💼"; color = "#EF4444"; }
        else if (event.type === "Meeting") { icon = "👥"; color = "#4F46E5"; }
        else if (event.type === "Birthday") { icon = "🎂"; color = "#F59E0B"; }

        if (diff >= 0 && diff <= 45) {
          items.push({
            id: `event-${event.id}`,
            category: "event",
            title: event.title,
            subTitle: `${event.type} · ${event.location || "No location"}`,
            date: next,
            dateLabel: next.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            timeLabel: event.eventTime,
            icon,
            color,
            route: "/future-event",
            daysRemaining: diff,
          });
        } else if (diff < 0) {
          items.push({
            id: `event-overdue-${event.id}`,
            category: "event",
            title: event.title,
            subTitle: `${event.type} · Was due ${edate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
            date: edate,
            dateLabel: "Overdue",
            timeLabel: event.eventTime,
            icon: "⚠️",
            color: "#EF4444",
            route: "/future-event",
            daysRemaining: diff,
          });
        }
      });

      // ── 3. Medicine Reminders ────────────────────────────
      medicines.forEach((med, idx) => {
        if (!med.isEnabled) return;
        // Guard: fallback to index when id is missing to avoid duplicate keys
        const medId = med.id ?? `idx-${idx}`;
        items.push({
          id: `medicine-${medId}`,
          category: "medicine",
          title: med.medicineName,
          subTitle: `${med.dosage || "No dosage"} · ${med.reminderTime}`,
          date: now,
          dateLabel: "Daily",
          timeLabel: med.reminderTime,
          icon: "💊",
          color: "#10B981",
          route: "/health",
          daysRemaining: 0,
        });
      });

      // ── 4. Medical Appointments ──────────────────────────
      appointments.forEach((appt) => {
        const adate = new Date(appt.appointmentDate);
        if (isNaN(adate.getTime())) return;
        adate.setHours(0, 0, 0, 0);
        const diff = Math.ceil((adate.getTime() - now.getTime()) / 86400000);
        if (diff >= -7 && diff <= 45) {
          items.push({
            id: `appointment-${appt.id}`,
            category: "appointment",
            title: `Dr. ${appt.doctorName}`,
            subTitle: appt.reason || "Medical Appointment",
            date: adate,
            dateLabel: adate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            timeLabel: appt.appointmentTime,
            icon: "🏥",
            color: "#6366F1",
            route: "/health",
            daysRemaining: diff,
          });
        }
      });

      // ── 5. Utility Bills ─────────────────────────────────
      bills.forEach((bill) => {
        if (bill.isPaid) return;
        const ddate = new Date(bill.dueDate);
        if (isNaN(ddate.getTime())) return;
        ddate.setHours(0, 0, 0, 0);
        const diff = Math.ceil((ddate.getTime() - now.getTime()) / 86400000);
        if (diff >= -30 && diff <= 45) {
          let icon = "💡", color = "#F59E0B";
          if (bill.type === "Water") { icon = "💧"; color = "#3B82F6"; }
          else if (bill.type === "Wi-Fi") { icon = "📶"; color = "#8B5CF6"; }
          else if (bill.type === "Mobile") { icon = "📱"; color = "#EC4899"; }
          else if (bill.type === "Gas") { icon = "🔥"; color = "#EF4444"; }
          else if (bill.type === "Rent") { icon = "🏠"; color = "#10B981"; }
          else if (bill.type === "Insurance") { icon = "🛡️"; color = "#4F46E5"; }
          items.push({
            id: `utility-${bill.id}`,
            category: "utility",
            title: bill.name,
            subTitle: `${bill.type} · ₨ ${bill.amount.toLocaleString()}`,
            date: ddate,
            dateLabel: ddate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            icon,
            color,
            route: "/utility",
            daysRemaining: diff,
          });
        }
      });

      // ── 6. Todo Tasks with reminders ─────────────────────
      tasks.forEach((task) => {
        if (task.isCompleted || !task.reminderEnabled || !task.dueDate) return;
        const tdate = new Date(task.dueDate);
        if (isNaN(tdate.getTime())) return;
        tdate.setHours(0, 0, 0, 0);
        const diff = Math.ceil((tdate.getTime() - now.getTime()) / 86400000);
        if (diff >= -30 && diff <= 45) {
          let icon = "✅", color = "#6366F1";
          if (task.priority === "High") color = "#EF4444";
          else if (task.priority === "Medium") color = "#F59E0B";
          items.push({
            id: `todo-${task.id}`,
            category: "todo",
            title: task.title,
            subTitle: `${task.category} · ${task.priority} Priority`,
            date: tdate,
            dateLabel: tdate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            timeLabel: task.reminderTime,
            icon,
            color,
            route: "/todo",
            daysRemaining: diff,
          });
        }
      });

      items.sort((a, b) => a.daysRemaining - b.daysRemaining);
      setAllAlerts(items);
    } catch (error) {
      console.error("Failed to load alerts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const onRefresh = () => { setRefreshing(true); loadAlerts(); };

  // ── Dismiss handlers ─────────────────────────────────────
  const handleDismiss = async (id: string) => {
    await dismissItem(id);
    setDismissed((prev) => new Set([...prev, id]));
  };

  // "Clear All" removed — individual dismiss + 30-day auto-clear is used instead

  // ── Filter logic ─────────────────────────────────────────
  const visibleAlerts = allAlerts.filter((a) => !dismissed.has(a.id));

  const filtered = visibleAlerts.filter((a) => {
    const catMatch = categoryFilter === "all" || a.category === categoryFilter;
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "overdue" && a.daysRemaining < 0) ||
      (statusFilter === "upcoming" && a.daysRemaining >= 0);
    return catMatch && statusMatch;
  });

  // ── Group by category ────────────────────────────────────
  const CATEGORIES: { key: CategoryFilter; label: string; icon: string; color: string }[] = [
    { key: "all", label: "All", icon: "🔔", color: "#6366F1" },
    { key: "birthday", label: "Birthdays", icon: "🎂", color: "#F59E0B" },
    { key: "event", label: "Events", icon: "📅", color: "#8B5CF6" },
    { key: "medicine", label: "Medicine", icon: "💊", color: "#10B981" },
    { key: "appointment", label: "Appts", icon: "🏥", color: "#6366F1" },
    { key: "utility", label: "Bills", icon: "💡", color: "#F59E0B" },
    { key: "todo", label: "Tasks", icon: "✅", color: "#EF4444" },
  ];

  // ── Render card ──────────────────────────────────────────
  // NOTE: key must be on the element returned from .map(), NOT inside this function.
  //       renderSection passes key correctly via items.map((item) => renderCard(item, item.id))
  const renderCard = (item: AlertItem) => (
    <View style={styles.alertCard}>
      <TouchableOpacity
        style={styles.cardMain}
        onPress={() => router.push(item.route as any)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.color + "1A" }]}>
          <Text style={styles.iconEmoji}>{item.icon}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.alertTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.alertSubTitle} numberOfLines={1}>{item.subTitle}</Text>
          {item.timeLabel ? (
            <View style={styles.timeRow}>
              <MaterialCommunityIcons name="clock-outline" size={12} color="#94A3B8" />
              <Text style={styles.timeText}>{item.timeLabel}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.dateBadge}>
          <Text style={[styles.dateText, item.daysRemaining < 0 && { color: "#EF4444", fontWeight: "700" }]}>
            {item.dateLabel}
          </Text>
          <Text style={styles.daysText}>
            {item.daysRemaining < 0
              ? `${Math.abs(item.daysRemaining)}d ago`
              : item.daysRemaining === 0
              ? "today"
              : item.daysRemaining === 1
              ? "tomorrow"
              : `${item.daysRemaining} days`}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dismissBtn} onPress={() => handleDismiss(item.id)}>
        <MaterialCommunityIcons name="close" size={16} color="#94A3B8" />
      </TouchableOpacity>
    </View>
  );

  // ── Render section ───────────────────────────────────────
  const renderSection = (title: string, items: AlertItem[], color: string) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIndicator, { backgroundColor: color }]} />
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>{items.length}</Text>
        </View>
        {/* key lives here on the React element, not inside renderCard */}
        {items.map((item) => (
          <React.Fragment key={item.id}>
            {renderCard(item)}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const overdueItems = filtered.filter((a) => a.daysRemaining < 0);
  const todayItems = filtered.filter((a) => a.daysRemaining === 0);
  const weekItems = filtered.filter((a) => a.daysRemaining > 0 && a.daysRemaining <= 7);
  const upcomingItems = filtered.filter((a) => a.daysRemaining > 7);

  // ── UI ───────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1E2340" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Alerts Center</Text>
            <Text style={styles.headerSubtitle}>
              {visibleAlerts.length} active reminder{visibleAlerts.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.filterPill, categoryFilter === cat.key && styles.filterPillActive]}
              onPress={() => setCategoryFilter(cat.key)}
            >
              <Text style={[styles.filterText, categoryFilter === cat.key && styles.filterTextActive]}>
                {cat.icon} {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status Filter */}
        <View style={styles.statusRow}>
          {(["all", "overdue", "upcoming"] as StatusFilter[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusPill, statusFilter === s && styles.statusPillActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.statusText, statusFilter === s && styles.statusTextActive]}>
                {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Syncing reminders...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No alerts</Text>
          <Text style={styles.emptyDesc}>
            {dismissed.size > 0
              ? `You dismissed ${dismissed.size} reminder${dismissed.size !== 1 ? "s" : ""}. They will be automatically removed after 30 days.`
              : "Everything is calm. Reminders will appear here as dates approach."}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.feedScroll}
          contentContainerStyle={styles.feedContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {renderSection("⚠️ Overdue", overdueItems, "#EF4444")}
          {renderSection("🔴 Today", todayItems, "#10B981")}
          {renderSection("📅 This Week", weekItems, "#3B82F6")}
          {renderSection("🔜 Upcoming", upcomingItems, "#6366F1")}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: "#1E2340",
    paddingTop: STATUS_H + 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  headerSubtitle: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 2 },
  autoClearBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(148,163,184,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
  },
  autoClearText: { color: "#94A3B8", fontSize: 11, fontWeight: "600" },
  pillScroll: { marginBottom: 10 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginRight: 8,
  },
  filterPillActive: { backgroundColor: "#FFFFFF", borderColor: "#FFFFFF" },
  filterText: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: "#1E2340" },
  statusRow: { flexDirection: "row", gap: 8 },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statusPillActive: { backgroundColor: "rgba(99,102,241,0.6)", borderColor: "#6366F1" },
  statusText: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "600" },
  statusTextActive: { color: "#FFFFFF" },
  loaderContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: "#64748B", fontSize: 14, fontWeight: "500" },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginBottom: 8, textAlign: "center" },
  emptyDesc: { fontSize: 14, color: "#94A3B8", textAlign: "center", lineHeight: 22 },
  feedScroll: { flex: 1 },
  feedContent: { paddingHorizontal: 16, paddingTop: 20 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionIndicator: { width: 4, height: 14, borderRadius: 2, marginRight: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    flex: 1,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  cardMain: { flex: 1, flexDirection: "row", alignItems: "center", padding: 14 },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconEmoji: { fontSize: 22 },
  textContainer: { flex: 1, marginRight: 8 },
  alertTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  alertSubTitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  timeText: { fontSize: 11, color: "#94A3B8", fontWeight: "500" },
  dateBadge: { alignItems: "flex-end", justifyContent: "center" },
  dateText: { fontSize: 13, fontWeight: "600", color: "#334155" },
  daysText: { fontSize: 11, color: "#94A3B8", marginTop: 2, fontWeight: "500" },
  dismissBtn: {
    paddingHorizontal: 14,
    paddingVertical: 22,
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#F1F5F9",
  },
});

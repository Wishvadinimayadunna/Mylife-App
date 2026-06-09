// ============================================
// MyLife Dashboard — Redesigned Home Screen
// Dark hero banner · compact cards · events widget
// ============================================

import familyService from "@/services/familyService";
import financeService from "@/services/financeService";
import futureEventService from "@/services/futureEventService";
import healthService from "@/services/healthService";
import profileService from "@/services/profileService";
import shoppingService from "@/services/shoppingService";
import todoService from "@/services/todoService";
import utilityService from "@/services/utilityService";
import { useAppStore } from "@/store/appStore";
import { FutureEvent } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Section config ──────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "profile",
    name: "Profile",
    icon: "account-circle-outline" as const,
    color: "#4F46E5",
    bg: "#EEF2FF",
    route: "/profile",
    staticLabel: "My details",
  },
  {
    id: "family",
    name: "Family",
    icon: "account-group-outline" as const,
    color: "#2563EB",
    bg: "#DBEAFE",
    route: "/family",
    staticLabel: "members",
  },
  {
    id: "shopping",
    name: "Shopping",
    icon: "cart-outline" as const,
    color: "#0D9488",
    bg: "#CCFBF1",
    route: "/shopping",
    staticLabel: "items",
  },
  {
    id: "health",
    name: "Health",
    icon: "heart-pulse" as const,
    color: "#DC2626",
    bg: "#FEE2E2",
    route: "/health",
    staticLabel: "Log today",
  },
  {
    id: "utility",
    name: "Utility",
    icon: "lightning-bolt-outline" as const,
    color: "#D97706",
    bg: "#FEF3C7",
    route: "/utility",
    staticLabel: "unpaid",
  },
  {
    id: "todo",
    name: "To-Do",
    icon: "checkbox-marked-circle-outline" as const,
    color: "#16A34A",
    bg: "#DCFCE7",
    route: "/todo",
    staticLabel: "pending",
  },
  {
    id: "finance",
    name: "Finance",
    icon: "wallet-outline" as const,
    color: "#F97316",
    bg: "#FFEDD5",
    route: "/finance",
    staticLabel: "Rs. 0",
  },
  {
    id: "future-event",
    name: "Events",
    icon: "calendar-month-outline" as const,
    color: "#DB2777",
    bg: "#FCE7F3",
    route: "/future-event",
    staticLabel: "upcoming",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatEventDate(dateVal: Date | string): { month: string; day: string } {
  const d = new Date(dateVal);
  return {
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { profile, setProfile, isInitialized, setIsInitialized, isAuthenticated } =
    useAppStore();

  const [stats, setStats] = useState({
    tasks: 0,
    events: 0,
    shopping: 0,
    familyCount: 0,
    unpaidBills: 0,
    netBalance: 0,
    healthScore: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<FutureEvent[]>([]);

  useFocusEffect(
    useCallback(() => {
      initializeApp();
    }, [])
  );

  const initializeApp = async () => {
    if (isInitialized) {
      // Still refresh data on each visit
      await loadData();
      return;
    }

    // Silently request notifications (no error banner)
    try {
      const { requestNotificationPermissions } = await import(
        "@/utils/notifications"
      );
      await requestNotificationPermissions();
    } catch (_) {}

    const profileData = await profileService.getProfile();
    setProfile(profileData);

    if (profileData) {
      await loadData();
    }

    setIsInitialized(true);
  };

  const loadData = async () => {
    try {
      const [
        pendingTasks,
        unpaidBills,
        allEvents,
        shoppingItems,
        family,
        transactions,
        waterLogs,
        sleepLogs,
        medicines,
        moods
      ] = await Promise.all([
        todoService.getPendingTasks(),
        utilityService.getUnpaidBills(),
        futureEventService.getFutureEvents(),
        shoppingService.getShoppingItems(""),
        familyService.getFamilyMembers(""),
        financeService.getTransactions(profile?.id || ""),
        healthService.getWaterLogs().catch(() => []),
        healthService.getSleepLogs().catch(() => []),
        healthService.getMedicineReminders().catch(() => []),
        healthService.getMoods().catch(() => []),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = allEvents
        .filter((e) => {
          const d = new Date(e.eventDate);
          if (Number.isNaN(d.getTime())) return false;
          d.setHours(0, 0, 0, 0);
          return d >= today && !e.completedAt;
        })
        .sort(
          (a, b) =>
            new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
        );

      setUpcomingEvents(upcoming.slice(0, 2));

      const netBalance = transactions.reduce((acc, t) => {
        return t.type === "income" ? acc + t.amount : acc - t.amount;
      }, 0);

      // Compute health wellness score
      const todayStr = new Date().toISOString().split("T")[0];
      const todayDate = new Date();

      const todayWater = waterLogs.filter((l: any) => new Date(l.recordedAt || l.createdAt).toDateString() === todayDate.toDateString()).reduce((s: number, l: any) => s + l.amountML, 0);
      const todaySleep = sleepLogs.filter((l: any) => new Date(l.recordedAt || l.createdAt).toDateString() === todayDate.toDateString()).reduce((_: any, l: any) => l.durationHours, 0);
      const enabledMeds = medicines.filter((m: any) => m.isEnabled);
      const medsTaken = enabledMeds.filter((m: any) => m.takenDates?.includes(todayStr)).length;
      const medsCompliance = enabledMeds.length > 0 ? medsTaken / enabledMeds.length : 0;
      const moodToday = moods.find((m: any) => new Date(m.recordDate || m.createdAt).toDateString() === todayDate.toDateString());
      
      const healthScore = Math.round(
        Math.min(todayWater / 2000, 1) * 25 +
        (todaySleep > 0 ? Math.min(todaySleep / 8, 1) * 25 : 0) +
        medsCompliance * 25 +
        (moodToday ? 25 : 0)
      );

      setStats({
        tasks: pendingTasks.length,
        events: upcoming.length,
        shopping: shoppingItems.filter((i) => !i.isBought).length,
        familyCount: family.length,
        unpaidBills: unpaidBills.length,
        netBalance,
        healthScore,
      });
    } catch (err) {
      console.error("loadData error:", err);
    }
  };

  // Build sub-labels per section
  const getSubLabel = (id: string, staticLabel: string): string => {
    switch (id) {
      case "profile":
        return profile?.fullName || "Setup profile";
      case "family":
        return stats.familyCount === 1
          ? "1 member"
          : `${stats.familyCount} members`;
      case "shopping":
        return stats.shopping === 1 ? "1 item" : `${stats.shopping} items`;
      case "health":
        return `Score: ${stats.healthScore}/100`;
      case "utility":
        return stats.unpaidBills === 0
          ? "All paid"
          : `${stats.unpaidBills} unpaid`;
      case "todo":
        return stats.tasks === 0
          ? "0 pending"
          : `${stats.tasks} pending`;
      case "future-event":
        return stats.events === 0
          ? "0 upcoming"
          : `${stats.events} upcoming`;
      case "finance":
        const formattedBal = Math.abs(stats.netBalance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        return stats.netBalance >= 0 ? `Rs. ${formattedBal}` : `-Rs. ${formattedBal}`;
      default:
        return staticLabel;
    }
  };

  const firstName = profile?.fullName?.split(" ")[0] ?? "there";
  const initials = profile ? getInitials(profile.fullName) : "?";

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1E2340" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Banner ───────────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Avatar */}
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => router.navigate("/settings")}
            activeOpacity={0.7}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>

          {/* Date + greeting */}
          <Text style={styles.heroDate}>{formatDate(new Date())}</Text>
          <Text style={styles.heroGreeting}>
            {getGreeting()}, {firstName} 👋
          </Text>
          <Text style={styles.heroSub}>{"Here's what's on your plate today."}</Text>

          {/* Stat chips */}
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Text style={styles.chipNum}>{stats.shopping}</Text>
              <Text style={styles.chipLbl}>Shopping</Text>
            </View>
            <View style={styles.chipDivider} />
            <View style={styles.chip}>
              <Text style={styles.chipNum}>{stats.tasks}</Text>
              <Text style={styles.chipLbl}>Tasks</Text>
            </View>
            <View style={styles.chipDivider} />
            <View style={styles.chip}>
              <Text style={styles.chipNum}>{stats.events}</Text>
              <Text style={styles.chipLbl}>Upcoming</Text>
            </View>
          </View>
        </View>

        {/* ── Quick Access Cards ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ACCESS</Text>

          {/* 2-column grid */}
          <View style={styles.grid}>
            {SECTIONS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.card}
                onPress={() => router.push(s.route as any)}
                activeOpacity={0.75}
              >
                {/* Colored icon box — left */}
                <View style={[styles.cardIcon, { backgroundColor: s.bg }]}>
                  <MaterialCommunityIcons
                    name={s.icon}
                    size={22}
                    color={s.color}
                  />
                </View>

                {/* Name + sub-label stacked — right */}
                <View style={styles.cardTextBlock}>
                  <Text style={styles.cardName}>{s.name}</Text>
                  <Text style={styles.cardSub}>
                    {getSubLabel(s.id, s.staticLabel)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Upcoming Events Widget ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPCOMING EVENTS</Text>

          {upcomingEvents.length === 0 ? (
            <View style={styles.emptyEventsCard}>
              <Text style={styles.emptyEventsText}>
                📅  No upcoming events
              </Text>
            </View>
          ) : (
            upcomingEvents.map((ev) => {
              const { month, day } = formatEventDate(ev.eventDate);
              return (
                <TouchableOpacity
                  key={ev.id}
                  style={styles.eventRow}
                  onPress={() => router.push("/future-event" as any)}
                  activeOpacity={0.7}
                >
                  {/* Date badge */}
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeMon}>{month}</Text>
                    <Text style={styles.dateBadgeDay}>{day}</Text>
                  </View>

                  {/* Event info */}
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{ev.title}</Text>
                    <Text style={styles.eventMeta}>
                      {ev.location ? `${ev.location} · ` : ""}
                      {ev.eventTime}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Bottom padding so last card clears tab bar */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const STATUS_H = Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 44;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // ── Hero
  hero: {
    backgroundColor: "#1E2340",
    paddingTop: STATUS_H + 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  avatarWrap: {
    position: "absolute",
    top: STATUS_H + 16,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  heroDate: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  heroGreeting: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: "400",
    marginBottom: 20,
  },


  // ── Stat chips
  chipRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  chip: {
    flex: 1,
    alignItems: "center",
  },
  chipNum: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
  },
  chipLbl: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  chipDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  // ── Sections
  section: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.0,
    marginBottom: 10,
  },

  // ── Section grid + cards
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  // cardEmoji removed — now using MaterialCommunityIcons vector component
  cardTextBlock: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "400",
  },

  // ── Events widget
  emptyEventsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 18,
    alignItems: "center",
  },
  emptyEventsText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  dateBadge: {
    width: 44,
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingVertical: 6,
    marginRight: 14,
  },
  dateBadgeMon: {
    fontSize: 9,
    fontWeight: "700",
    color: "#2563EB",
    letterSpacing: 0.5,
  },
  dateBadgeDay: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E40AF",
    lineHeight: 22,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 3,
  },
  eventMeta: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "400",
  },
});

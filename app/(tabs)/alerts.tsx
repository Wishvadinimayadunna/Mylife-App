// ============================================
// Alerts Screen — Notification Center
// Displays upcoming and today's family birthdays & future events
// ============================================

import familyService from "@/services/familyService";
import futureEventService from "@/services/futureEventService";
import { useAppStore } from "@/store/appStore";
import { FamilyMember, FutureEvent } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

interface AlertItem {
  id: string;
  type: "birthday" | "event";
  title: string;
  subTitle: string;
  date: Date;
  dateLabel: string;
  timeLabel?: string;
  icon: string;
  color: string;
  route: "/family" | "/future-event";
  daysRemaining: number;
}

export default function AlertsScreen() {
  const router = useRouter();
  const { profile } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "birthday" | "event">("all");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const loadAlerts = useCallback(async () => {
    if (!profile) return;
    try {
      const [members, events] = await Promise.all([
        familyService.getFamilyMembers(""),
        futureEventService.getFutureEvents(),
      ]);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const items: AlertItem[] = [];

      // 1. Process family birthdays
      members.forEach((member) => {
        const bdate = new Date(member.dateOfBirth);
        if (isNaN(bdate.getTime())) return;

        // Calculate next birthday occurrence
        const nextBirthday = new Date(now.getFullYear(), bdate.getMonth(), bdate.getDate());
        if (nextBirthday < now) {
          nextBirthday.setFullYear(now.getFullYear() + 1);
        }

        const diffTime = nextBirthday.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Only show birthdays in the next 45 days
        if (diffDays <= 45) {
          const age = nextBirthday.getFullYear() - bdate.getFullYear();
          items.push({
            id: `birthday-${member.id}`,
            type: "birthday",
            title: `${member.fullName}'s Birthday`,
            subTitle: member.birthdayReminderEnabled 
              ? `Turning ${age} · Reminder set` 
              : `Turning ${age} · Reminder disabled`,
            date: nextBirthday,
            dateLabel: nextBirthday.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            icon: "🎂",
            color: "#F59E0B",
            route: "/family",
            daysRemaining: diffDays,
          });
        }
      });

      // 2. Process upcoming future events
      events.forEach((event) => {
        if (event.completedAt) return; // skip completed events

        const edate = new Date(event.eventDate);
        if (isNaN(edate.getTime())) return;
        edate.setHours(0, 0, 0, 0);

        // For yearly recurring (e.g. general anniversary/birthday type events)
        let nextOccurrence = new Date(edate);
        if (event.isRecurringYearly) {
          nextOccurrence.setFullYear(now.getFullYear());
          if (nextOccurrence < now) {
            nextOccurrence.setFullYear(now.getFullYear() + 1);
          }
        }

        const diffTime = nextOccurrence.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Show events in next 45 days, or overdue incomplete ones
        if (diffDays <= 45 && diffDays >= 0) {
          let eventEmoji = "📅";
          let eventColor = "#6366F1";
          if (event.type === "Anniversary") { eventEmoji = "💍"; eventColor = "#EC4899"; }
          else if (event.type === "Wedding") { eventEmoji = "💒"; eventColor = "#8B5CF6"; }
          else if (event.type === "Party") { eventEmoji = "🎉"; eventColor = "#10B981"; }
          else if (event.type === "Vacation") { eventEmoji = "✈️"; eventColor = "#3B82F6"; }
          else if (event.type === "Interview") { eventEmoji = "💼"; eventColor = "#EF4444"; }
          else if (event.type === "Meeting") { eventEmoji = "👥"; eventColor = "#4F46E5"; }
          else if (event.type === "Birthday") { eventEmoji = "🎂"; eventColor = "#F59E0B"; }

          items.push({
            id: `event-${event.id}`,
            type: "event",
            title: event.title,
            subTitle: `${event.type} · ${event.location || "No location"}`,
            date: nextOccurrence,
            dateLabel: nextOccurrence.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            timeLabel: event.eventTime,
            icon: eventEmoji,
            color: eventColor,
            route: "/future-event",
            daysRemaining: diffDays,
          });
        } else if (diffDays < 0) {
          // Overdue event
          items.push({
            id: `event-overdue-${event.id}`,
            type: "event",
            title: `[OVERDUE] ${event.title}`,
            subTitle: `${event.type} · Was due on ${edate.toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}`,
            date: edate,
            dateLabel: "Overdue",
            timeLabel: event.eventTime,
            icon: "⚠️",
            color: "#EF4444",
            route: "/future-event",
            daysRemaining: diffDays,
          });
        }
      });

      // Sort chronological: overdue (negative) first, then today (0), then tomorrow...
      items.sort((a, b) => a.daysRemaining - b.daysRemaining);
      setAlerts(items);
    } catch (error) {
      console.error("Failed to load alerts feed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAlerts();
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (activeFilter === "all") return true;
    return alert.type === activeFilter;
  });

  // Group alerts into Today, This Week, and Upcoming
  const overdueAlerts = filteredAlerts.filter(a => a.daysRemaining < 0);
  const todayAlerts = filteredAlerts.filter(a => a.daysRemaining === 0);
  const thisWeekAlerts = filteredAlerts.filter(a => a.daysRemaining > 0 && a.daysRemaining <= 7);
  const upcomingAlerts = filteredAlerts.filter(a => a.daysRemaining > 7);

  const renderSection = (title: string, items: AlertItem[], sectionColor: string) => {
    if (items.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIndicator, { backgroundColor: sectionColor }]} />
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>{items.length}</Text>
        </View>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.alertCard}
            onPress={() => router.push(item.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color + "1A" }]}>
              <Text style={styles.iconEmoji}>{item.icon}</Text>
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.alertTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.alertSubTitle} numberOfLines={1}>{item.subTitle}</Text>
              {item.timeLabel && (
                <View style={styles.timeRow}>
                  <MaterialCommunityIcons name="clock-outline" size={12} color="#94A3B8" />
                  <Text style={styles.timeText}>{item.timeLabel}</Text>
                </View>
              )}
            </View>
            <View style={styles.dateBadge}>
              <Text style={[styles.dateText, item.daysRemaining < 0 ? { color: "#EF4444", fontWeight: "700" } : {}]}>
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
        ))}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1E2340" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts Center</Text>
        <Text style={styles.headerSubtitle}>
          Real-time reminders for family members & upcoming events
        </Text>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === "all" && styles.filterPillActive]}
            onPress={() => setActiveFilter("all")}
          >
            <Text style={[styles.filterText, activeFilter === "all" && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === "birthday" && styles.filterPillActive]}
            onPress={() => setActiveFilter("birthday")}
          >
            <Text style={[styles.filterText, activeFilter === "birthday" && styles.filterTextActive]}>
              🎂 Birthdays
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === "event" && styles.filterPillActive]}
            onPress={() => setActiveFilter("event")}
          >
            <Text style={[styles.filterText, activeFilter === "event" && styles.filterTextActive]}>
              📅 Events
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List / Content */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Syncing reminders...</Text>
        </View>
      ) : filteredAlerts.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No alerts matching filter</Text>
          <Text style={styles.emptyDesc}>
            Everything is calm. Scheduled notifications will show up here as their dates draw close.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.feedScroll}
          contentContainerStyle={styles.feedContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {renderSection("Overdue Items", overdueAlerts, "#EF4444")}
          {renderSection("Today", todayAlerts, "#10B981")}
          {renderSection("This Week", thisWeekAlerts, "#3B82F6")}
          {renderSection("Upcoming", upcomingAlerts, "#6366F1")}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#1E2340",
    paddingTop: STATUS_H + 16,
    paddingBottom: 20,
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
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: "row",
    marginTop: 18,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  filterPillActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  filterText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "700",
  },
  filterTextActive: {
    color: "#1E2340",
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
  },
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionIndicator: {
    width: 4,
    height: 14,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconEmoji: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  alertSubTitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  dateBadge: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  daysText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },
});

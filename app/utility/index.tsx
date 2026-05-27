// ============================================
// Utility Bills Module (UX Redesigned & Compacted)
// Electricity, Water, Wi-Fi, Mobile, Gas, TV, Rent, Insurance
// ============================================

import Calendar from "@/components/ui/calendar";
import utilityService from "@/services/utilityService";
import { UtilityBill, UtilityType } from "@/types";
import {
  cancelNotification,
  scheduleUtilityBillReminder
} from "@/utils/notifications";
import { Stack, useFocusEffect } from "expo-router";
import React, { useCallback, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from "react-native";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TabType = "all" | "unpaid" | "paid";

const BILL_TYPES: UtilityType[] = [
  "Electricity",
  "Water",
  "Wi-Fi",
  "Mobile",
  "Gas",
  "TV",
  "Rent",
  "Insurance",
];

const BILL_TYPE_ICONS: Record<UtilityType, string> = {
  Electricity: "⚡",
  Water: "💧",
  "Wi-Fi": "📡",
  Mobile: "📱",
  Gas: "🔥",
  TV: "📺",
  Rent: "🏠",
  Insurance: "🛡️",
  Other: "💰",
};

const datePresets = [
  { label: "Today", days: 0 },
  { label: "5 Days", days: 5 },
  { label: "10 Days", days: 10 },
  { label: "15 Days", days: 15 },
];

export default function UtilityScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>("unpaid");
  const [allBills, setAllBills] = useState<UtilityBill[]>([]);
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingExpanded, setIsAddingExpanded] = useState(false);
  const [editingBill, setEditingBill] = useState<UtilityBill | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Form state (Toggles default to true/false in backend but stripped from simple UI)
  const [formData, setFormData] = useState({
    name: "",
    type: "Electricity" as UtilityType,
    amount: "",
    dueDay: "",
    dueDate: new Date(),
    isRecurring: true,
    reminderEnabled: true,
    reminderTime: "09:00",
    isShared: false,
  });

  // Load bills and sync notification states
  const loadBills = async () => {
    setLoading(true);
    try {
      const data = await utilityService.getAllBills();
      setAllBills(data);

      // Filter list based on active tab
      let filtered: UtilityBill[] = [];
      if (activeTab === "all") {
        filtered = data;
      } else if (activeTab === "unpaid") {
        filtered = data.filter(b => !b.isPaid);
      } else {
        filtered = data.filter(b => b.isPaid);
      }
      setBills(filtered);

      // Auto-schedule missing notifications for active unpaid bills
      for (const bill of data) {
        if (!bill.isPaid && bill.reminderEnabled && !bill.notificationId) {
          const reminderDate = new Date(bill.dueDate);
          reminderDate.setDate(reminderDate.getDate() - 3);
          const [hourStr, minuteStr] = (bill.reminderTime || "09:00").split(":");
          reminderDate.setHours(parseInt(hourStr) || 9, parseInt(minuteStr) || 0, 0, 0);

          if (reminderDate > new Date()) {
            const notifId = await scheduleUtilityBillReminder(bill.name, bill.dueDate, bill.id);
            if (notifId) {
              await utilityService.updateBill(bill.id, { notificationId: notifId });
            }
          }
        }
      }
    } catch (error) {
      console.error("Load bills error:", error);
      Alert.alert("Error", "Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBills();
    }, [activeTab]),
  );

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      type: "Electricity",
      amount: "",
      dueDay: "",
      dueDate: new Date(),
      isRecurring: true,
      reminderEnabled: true,
      reminderTime: "09:00",
      isShared: false,
    });
    setEditingBill(null);
  };

  // Open edit modal (re-routed inline)
  const openEditModal = (bill: UtilityBill) => {
    setEditingBill(bill);
    setFormData({
      name: bill.name,
      type: bill.type,
      amount: bill.amount.toString(),
      dueDay: bill.dueDay.toString(),
      dueDate: new Date(bill.dueDate),
      isRecurring: bill.isRecurring,
      reminderEnabled: bill.reminderEnabled,
      reminderTime: bill.reminderTime || "09:00",
      isShared: bill.isShared,
    });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAddingExpanded(true);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Save bill
  const saveBill = async () => {
    if (!formData.name || !formData.amount || !formData.dueDay) {
      Alert.alert("Error", "Please fill name, amount and due day fields");
      return;
    }

    const amount = parseFloat(formData.amount);
    const dueDay = parseInt(formData.dueDay);

    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Invalid amount entered");
      return;
    }

    if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
      Alert.alert("Error", "Due day must be between 1 and 31");
      return;
    }

    try {
      let finalNotificationId = editingBill?.notificationId || undefined;

      // Handle Notifications scheduling
      if (formData.reminderEnabled) {
        if (finalNotificationId) {
          await cancelNotification(finalNotificationId);
        }

        const id = await scheduleUtilityBillReminder(
          formData.name,
          formData.dueDate,
          editingBill?.id || "temp"
        );
        if (id) {
          finalNotificationId = id;
        }
      } else {
        if (finalNotificationId) {
          await cancelNotification(finalNotificationId);
          finalNotificationId = undefined;
        }
      }

      const billData = {
        profileID: editingBill?.profileID || "",
        name: formData.name,
        type: formData.type,
        amount,
        dueDay,
        dueDate: formData.dueDate,
        isRecurring: formData.isRecurring,
        reminderEnabled: formData.reminderEnabled,
        reminderTime: formData.reminderTime,
        notificationId: finalNotificationId,
        isShared: formData.isShared,
        isPaid: false,
      };

      if (editingBill) {
        await utilityService.updateBill(editingBill.id, billData);
      } else {
        await utilityService.addBill(billData);
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsAddingExpanded(false);
      resetForm();
      loadBills();
    } catch (error) {
      console.error("Save bill error:", error);
      Alert.alert("Error", "Failed to save bill");
    }
  };

  // Delete bill
  const deleteBill = (bill: UtilityBill) => {
    Alert.alert("Delete Bill", `Are you sure you want to delete ${bill.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (bill.notificationId) {
              await cancelNotification(bill.notificationId);
            }
            await utilityService.deleteBill(bill.id);
            loadBills();
          } catch (error) {
            console.error("Delete error:", error);
            Alert.alert("Error", "Failed to delete bill");
          }
        },
      },
    ]);
  };

  // Toggle payment status
  const togglePayment = async (bill: UtilityBill) => {
    try {
      if (bill.isPaid) {
        await utilityService.markBillAsUnpaid(bill.id);
      } else {
        if (bill.notificationId) {
          await cancelNotification(bill.notificationId);
        }
        await utilityService.markBillAsPaid(bill.id);
      }
      loadBills();
    } catch (error) {
      console.error("Toggle payment error:", error);
      Alert.alert("Error", "Failed to update payment status");
    }
  };

  // Date calculation utilities
  const getDaysDiff = (dateStr: Date | string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const isOverdue = (dueDate: Date | string, isPaid: boolean) => {
    if (isPaid) return false;
    return getDaysDiff(dueDate) < 0;
  };

  const isDueSoon = (dueDate: Date | string, isPaid: boolean) => {
    if (isPaid) return false;
    return getDaysDiff(dueDate) >= 0;
  };

  // Group list visually
  const getFilteredAndGroupedBills = () => {
    const unpaid = allBills.filter(b => !b.isPaid);
    const paid = allBills.filter(b => b.isPaid);

    const overdueGroup = unpaid.filter(b => isOverdue(b.dueDate, false));
    const dueSoonGroup = unpaid.filter(b => isDueSoon(b.dueDate, false));

    if (activeTab === "unpaid") {
      return [
        { title: "🚨 Overdue", data: overdueGroup, color: "#EF4444" },
        { title: "⏳ Due Soon", data: dueSoonGroup, color: "#F59E0B" },
      ].filter(group => group.data.length > 0);
    } else if (activeTab === "paid") {
      return [
        { title: "✅ Paid History", data: paid, color: "#10B981" }
      ].filter(group => group.data.length > 0);
    } else {
      return [
        { title: "🚨 Overdue", data: overdueGroup, color: "#EF4444" },
        { title: "⏳ Due Soon", data: dueSoonGroup, color: "#F59E0B" },
        { title: "✅ Paid History", data: paid, color: "#10B981" }
      ].filter(group => group.data.length > 0);
    }
  };

  // Render Metric Strip
  const renderSummaryStrip = () => {
    let totalUnpaid = 0;
    let overdueCount = 0;
    let dueSoonCount = 0;

    allBills.forEach(bill => {
      if (!bill.isPaid) {
        totalUnpaid += bill.amount;
        if (isOverdue(bill.dueDate, false)) {
          overdueCount++;
        } else if (isDueSoon(bill.dueDate, false)) {
          dueSoonCount++;
        }
      }
    });

    return (
      <View style={styles.summaryStrip}>
        <View style={[styles.summaryCard, styles.unpaidCard]}>
          <Text style={styles.summaryLabel}>💸 Total Unpaid</Text>
          <Text style={styles.summaryValue}>Rs. {totalUnpaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>
        <View style={[styles.summaryCard, styles.overdueCard]}>
          <Text style={[styles.summaryLabel, styles.overdueLabel]}>🚨 Overdue</Text>
          <Text style={[styles.summaryValue, styles.overdueValue]}>{overdueCount}</Text>
        </View>
        <View style={[styles.summaryCard, styles.dueSoonCard]}>
          <Text style={[styles.summaryLabel, styles.dueSoonLabel]}>⏳ Due Soon</Text>
          <Text style={[styles.summaryValue, styles.dueSoonValue]}>{dueSoonCount}</Text>
        </View>
      </View>
    );
  };

  // Render Quick Add Trigger & Simplified Accordion Form
  const renderQuickAddSection = () => {
    return (
      <View style={styles.inlineFormContainer}>
        {/* Shrunk flush-left pill button */}
        <TouchableOpacity
          style={[styles.pillTriggerBtn, isAddingExpanded && styles.pillTriggerBtnActive]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsAddingExpanded(!isAddingExpanded);
            if (isAddingExpanded) {
              resetForm();
            }
          }}
        >
          <Text style={[styles.pillTriggerBtnText, isAddingExpanded && styles.pillTriggerBtnTextActive]}>
            {isAddingExpanded ? "✕ Cancel" : "➕ Add Bill"}
          </Text>
        </TouchableOpacity>

        {isAddingExpanded && (
          <View style={styles.inlineFormCard}>
            {/* Step 1: Pick Bill Type (Horizontal scroll chips row) */}
            <Text style={styles.inputLabel}>Bill Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalChipsScroll}
              contentContainerStyle={styles.horizontalChipsContainer}
            >
              {BILL_TYPES.map((type) => {
                const isSelected = formData.type === type;
                const icon = BILL_TYPE_ICONS[type] || "💰";
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.horizontalChip,
                      isSelected && styles.horizontalChipSelected,
                    ]}
                    onPress={() => {
                      const shouldAutofill = !formData.name || BILL_TYPES.includes(formData.name as any);
                      setFormData({
                        ...formData,
                        type,
                        name: shouldAutofill ? type : formData.name,
                      });
                    }}
                  >
                    <Text style={styles.horizontalChipIcon}>{icon}</Text>
                    <Text style={[styles.horizontalChipText, isSelected && styles.horizontalChipTextSelected]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Step 2: Core Details */}
            <View style={styles.formRow}>
              <View style={[styles.formCol, { flex: 1.5 }]}>
                <Text style={styles.inputLabel}>Bill Name</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g., Home Electricity"
                  placeholderTextColor="#94A3B8"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>
              <View style={[styles.formCol, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Amount</Text>
                <View style={styles.currencyInputContainer}>
                  <Text style={styles.currencyPrefix}>Rs.</Text>
                  <TextInput
                    style={styles.currencyInputField}
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={formData.amount}
                    onChangeText={(text) => setFormData({ ...formData, amount: text })}
                  />
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formCol, { flex: 1.3 }]}>
                <Text style={styles.inputLabel}>Due Date</Text>
                <TouchableOpacity
                  style={styles.dateSelectorBtn}
                  onPress={() => setShowCalendar(true)}
                >
                  <Text style={styles.dateSelectorText}>
                    📅 {formData.dueDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.formCol, { flex: 0.7, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Due Day (1-31)</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="15"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  value={formData.dueDay}
                  onChangeText={(text) => setFormData({ ...formData, dueDay: text })}
                />
              </View>
            </View>

            {/* Inline Date Preset Chips */}
            <View style={styles.datePresetRow}>
              {datePresets.map((preset) => {
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={styles.presetChip}
                    onPress={() => {
                      const targetDate = new Date();
                      targetDate.setDate(targetDate.getDate() + preset.days);
                      setFormData({
                        ...formData,
                        dueDate: targetDate,
                        dueDay: targetDate.getDate().toString(),
                      });
                    }}
                  >
                    <Text style={styles.presetChipText}>+{preset.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Shared Option Toggle Chip */}
            <View style={styles.sharedToggleRow}>
              <TouchableOpacity
                style={[styles.toggleChip, formData.isShared && styles.toggleChipActive]}
                onPress={() => setFormData({ ...formData, isShared: !formData.isShared })}
              >
                <Text style={[styles.toggleChipText, formData.isShared && styles.toggleChipTextActive]}>
                  {formData.isShared ? "👥 Shared with Spouse" : "👤 Personal Bill"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action CTAs */}
            <View style={styles.formActionsRow}>
              <TouchableOpacity style={styles.saveFormBtn} onPress={saveBill}>
                <Text style={styles.saveFormBtnText}>
                  {editingBill ? "Update Bill" : "Save Bill"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render Single Compact Bill Card
  const renderBillCard = (bill: UtilityBill) => {
    const dueDate = new Date(bill.dueDate);
    const overdue = isOverdue(bill.dueDate, bill.isPaid);
    const dueSoon = isDueSoon(bill.dueDate, bill.isPaid);

    // Color definitions
    let themeColor = "#6366F1"; // Upcoming indigo
    if (bill.isPaid) themeColor = "#10B981"; // Green
    else if (overdue) themeColor = "#EF4444"; // Red
    else if (dueSoon) themeColor = "#F59E0B"; // Amber

    return (
      <View
        key={bill.id}
        style={[
          styles.card,
          { borderLeftColor: themeColor, opacity: bill.isPaid ? 0.65 : 1 }
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.billInfo}>
            <View style={styles.billIconContainer}>
              <Text style={styles.billIcon}>
                {BILL_TYPE_ICONS[bill.type] || "💰"}
              </Text>
            </View>
            <View style={styles.billDetails}>
              <Text style={styles.billName}>{bill.name}</Text>
              <Text style={styles.billType}>{bill.type}</Text>
            </View>
          </View>
          <Text style={[styles.billAmount, { color: themeColor }]}>
            Rs. {bill.amount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Due Date:</Text>
            <Text style={[styles.infoValue, overdue && styles.overdueText]}>
              {dueDate.toLocaleDateString()}
              {overdue && " (Overdue)"}
            </Text>
          </View>

          {bill.isRecurring && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Recurring:</Text>
              <Text style={styles.infoValue}>Day {bill.dueDay} of month</Text>
            </View>
          )}

          {bill.isShared && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>👥 Shared</Text>
            </View>
          )}

          {/* Action Row */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                bill.isPaid ? styles.unpayBtn : styles.payBtn,
                { flex: 1.5 }
              ]}
              onPress={() => togglePayment(bill)}
            >
              <Text
                style={[
                  styles.actionBtnText,
                  bill.isPaid ? styles.unpayBtnText : styles.payBtnText
                ]}
              >
                {bill.isPaid ? "↩️ Unpaid" : "✅ Settle"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() => openEditModal(bill)}
            >
              <Text style={styles.secondaryBtnText}>✏️ Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => deleteBill(bill)}
            >
              <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const groupedSections = getFilteredAndGroupedBills();
  const totalDisplayCount = groupedSections.reduce((acc, g) => acc + g.data.length, 0);

  return (
    <>
      <Stack.Screen options={{ title: "Utility Bills", headerShown: true }} />
      <View style={styles.container}>
        {/* Summary Metric Strip */}
        {renderSummaryStrip()}

        {/* Filters Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "unpaid" && styles.activeTab]}
            onPress={() => setActiveTab("unpaid")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "unpaid" && styles.activeTabText,
              ]}
            >
              ⏳ Unpaid
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "paid" && styles.activeTab]}
            onPress={() => setActiveTab("paid")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "paid" && styles.activeTabText,
              ]}
            >
              ✅ Paid
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "all" && styles.activeTab]}
            onPress={() => setActiveTab("all")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "all" && styles.activeTabText,
              ]}
            >
              📋 All Bills
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Main Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D97706" />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Shrunk trigger pill and inline accordion simplified form */}
            {renderQuickAddSection()}

            {totalDisplayCount === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💡</Text>
                <Text style={styles.emptyText}>No bills found</Text>
                <Text style={styles.emptySubtext}>
                  Tap Add Bill above to schedule your first utility payment.
                </Text>
              </View>
            ) : (
              groupedSections.map((group) => (
                <View key={group.title} style={styles.sectionContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionHeader, { color: group.color }]}>
                      {group.title}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: group.color + "20" }]}>
                      <Text style={[styles.statusPillText, { color: group.color }]}>
                        {group.data.length}
                      </Text>
                    </View>
                  </View>
                  {group.data.map(renderBillCard)}
                </View>
              ))
            )}
            <View style={styles.bottomPadding} />
          </ScrollView>
        )}

        {/* Calendar Modal */}
        <Calendar
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
          onSelectDate={(date: Date) => {
            setFormData({
              ...formData,
              dueDate: date,
              dueDay: date.getDate().toString()
            });
            setShowCalendar(false);
          }}
          selectedDate={formData.dueDate}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  summaryStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  unpaidCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FEF3C7",
  },
  overdueCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FEE2E2",
  },
  dueSoonCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FEF3C7",
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D97706",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  overdueLabel: {
    color: "#EF4444",
  },
  dueSoonLabel: {
    color: "#D97706",
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#78350F",
  },
  overdueValue: {
    color: "#7F1D1D",
  },
  dueSoonValue: {
    color: "#78350F",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: "#D97706",
  },
  tabText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16, // Clean rounded card borders
    marginBottom: 6, // Shrunk gap between cards (6px)
    padding: 10, // Compact padding
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  billInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  billIconContainer: {
    width: 32, // Tighter 32px size icon container
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  billIcon: {
    fontSize: 16,
  },
  billDetails: {
    flex: 1,
  },
  billName: {
    fontSize: 13, // 13px throughout card details
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 1,
  },
  billType: {
    fontSize: 11, // Subtext stays slightly smaller for contrast
    color: "#64748B",
    fontWeight: "500",
  },
  billAmount: {
    fontSize: 13, // 13px throughout card details
    fontWeight: "800",
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12, // Compact card font layout
    color: "#64748B",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13, // 13px card texts
    color: "#1E293B",
    fontWeight: "600",
  },
  overdueText: {
    color: "#EF4444",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: "#FCD34D",
  },
  badgeText: {
    fontSize: 10,
    color: "#92400E",
    fontWeight: "700",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  actionBtn: {
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  payBtn: {
    backgroundColor: "#10B981",
  },
  payBtnText: {
    color: "#FFFFFF",
  },
  unpayBtn: {
    backgroundColor: "#E2E8F0",
  },
  unpayBtnText: {
    color: "#475569",
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#FFFBEB",
    borderWidth: 0.5,
    borderColor: "#FCD34D",
  },
  secondaryBtnText: {
    color: "#D97706",
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    borderWidth: 0.5,
    borderColor: "#FCA5A5",
  },
  deleteBtnText: {
    color: "#DC2626",
  },
  bottomPadding: {
    height: 40,
  },

  // Shrunk Trigger Pill Styles (Flush Left, no full-width card)
  inlineFormContainer: {
    marginBottom: 12,
    alignItems: "flex-start", // Left flush alignment
  },
  pillTriggerBtn: {
    backgroundColor: "#FEF3C7", // Soft amber
    borderWidth: 1,
    borderColor: "#D97706", // Amber border
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
    alignSelf: "flex-start", // Only spans content width
  },
  pillTriggerBtnActive: {
    backgroundColor: "#F1F5F9",
    borderColor: "#94A3B8",
  },
  pillTriggerBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D97706",
  },
  pillTriggerBtnTextActive: {
    color: "#475569",
  },

  // Simplified Form Card Layout
  inlineFormCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#D97706",
    padding: 14,
    marginTop: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  // Form Labels: 11px and lighter gray color to reduce weight
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
    marginTop: 6,
  },
  inputField: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    backgroundColor: "#F8FAFC",
    color: "#1E293B",
  },
  currencyInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginRight: 4,
  },
  currencyInputField: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 13,
    color: "#1E293B",
  },
  dateSelectorBtn: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: "center",
  },
  dateSelectorText: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "600",
  },

  // Horizontal scroll row for type chips
  horizontalChipsScroll: {
    marginTop: 2,
    marginBottom: 8,
  },
  horizontalChipsContainer: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  horizontalChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  horizontalChipSelected: {
    backgroundColor: "#FEF3C7",
    borderColor: "#D97706",
  },
  horizontalChipIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  horizontalChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "700",
  },
  horizontalChipTextSelected: {
    color: "#78350F",
  },

  // Date Presets
  datePresetRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    marginBottom: 8,
  },
  presetChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  presetChipText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
  },

  // Simplified Form actions
  formActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  saveFormBtn: {
    backgroundColor: "#D97706",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saveFormBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  formRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  formCol: {
    flexDirection: "column",
  },
  sharedToggleRow: {
    flexDirection: "row",
    marginTop: 4,
    marginBottom: 8,
  },
  toggleChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  toggleChipActive: {
    backgroundColor: "#FEF3C7",
    borderColor: "#D97706",
  },
  toggleChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "700",
  },
  toggleChipTextActive: {
    color: "#78350F",
  },
});

// ============================================
// Utility Bills Module
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
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

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
  "Other",
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

export default function UtilityScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("unpaid");
  const [allBills, setAllBills] = useState<UtilityBill[]>([]);
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<UtilityBill | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "Electricity" as UtilityType,
    amount: "",
    dueDay: "",
    dueDate: new Date(),
    isRecurring: true,
    reminderEnabled: false,
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
      reminderEnabled: false,
      reminderTime: "09:00",
      isShared: false,
    });
    setEditingBill(null);
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  // Open edit modal
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
    setModalVisible(true);
  };

  // Save bill
  const saveBill = async () => {
    if (!formData.name || !formData.amount || !formData.dueDay) {
      Alert.alert("Error", "Please fill required fields");
      return;
    }

    const amount = parseFloat(formData.amount);
    const dueDay = parseInt(formData.dueDay);

    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Invalid amount");
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

      setModalVisible(false);
      resetForm();
      loadBills();
    } catch (error) {
      console.error("Save bill error:", error);
      Alert.alert("Error", "Failed to save bill");
    }
  };

  // Delete bill
  const deleteBill = (bill: UtilityBill) => {
    Alert.alert("Delete Bill", `Delete ${bill.name}?`, [
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
    const diff = getDaysDiff(dueDate);
    return diff >= 0 && diff <= 7;
  };

  const calculateProgress = (dueDate: Date | string, isPaid: boolean) => {
    if (isPaid) return 1;
    const diff = getDaysDiff(dueDate);
    if (diff <= 0) return 1;
    if (diff >= 30) return 0;
    return (30 - diff) / 30;
  };

  // Group list visually
  const getFilteredAndGroupedBills = () => {
    const unpaid = allBills.filter(b => !b.isPaid);
    const paid = allBills.filter(b => b.isPaid);

    const overdueGroup = unpaid.filter(b => isOverdue(b.dueDate, false));
    const dueSoonGroup = unpaid.filter(b => isDueSoon(b.dueDate, false));
    const upcomingGroup = unpaid.filter(b => !isOverdue(b.dueDate, false) && !isDueSoon(b.dueDate, false));

    if (activeTab === "unpaid") {
      return [
        { title: "🚨 Overdue", data: overdueGroup, color: "#EF4444" },
        { title: "⏳ Due Soon", data: dueSoonGroup, color: "#F59E0B" },
        { title: "📅 Upcoming", data: upcomingGroup, color: "#6366F1" },
      ].filter(group => group.data.length > 0);
    } else if (activeTab === "paid") {
      return [
        { title: "✅ Paid History", data: paid, color: "#10B981" }
      ].filter(group => group.data.length > 0);
    } else {
      return [
        { title: "🚨 Overdue", data: overdueGroup, color: "#EF4444" },
        { title: "⏳ Due Soon", data: dueSoonGroup, color: "#F59E0B" },
        { title: "📅 Upcoming", data: upcomingGroup, color: "#6366F1" },
        { title: "✅ Paid History", data: paid, color: "#10B981" }
      ].filter(group => group.data.length > 0);
    }
  };

  // Render Metric Strip (viewBalanceSummary)
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

  // Render Single Bill Card
  const renderBillCard = (bill: UtilityBill) => {
    const dueDate = new Date(bill.dueDate);
    const overdue = isOverdue(bill.dueDate, bill.isPaid);
    const dueSoon = isDueSoon(bill.dueDate, bill.isPaid);
    const progress = calculateProgress(bill.dueDate, bill.isPaid);

    // Color definitions
    let themeColor = "#6366F1"; // Purple/Indigo default
    if (bill.isPaid) themeColor = "#10B981"; // Green
    else if (overdue) themeColor = "#EF4444"; // Red
    else if (dueSoon) themeColor = "#F59E0B"; // Amber

    return (
      <View key={bill.id} style={[styles.card, { borderLeftColor: themeColor }]}>
        <View style={styles.cardHeader}>
          <View style={styles.billInfo}>
            <Text style={styles.billIcon}>
              {BILL_TYPE_ICONS[bill.type] || "💰"}
            </Text>
            <View style={styles.billDetails}>
              <Text style={styles.billName}>{bill.name}</Text>
              <Text style={styles.billType}>{bill.type}</Text>
            </View>
          </View>
          <Text style={[styles.billAmount, { color: themeColor }]}>Rs. {bill.amount.toFixed(2)}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Due Date:</Text>
            <Text style={[styles.infoValue, overdue && styles.overdueText]}>
              {dueDate.toLocaleDateString()}
              {overdue && " (Overdue)"}
              {dueSoon && " (Due Soon)"}
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
              <Text style={styles.badgeText}>👥 Shared with Spouse</Text>
            </View>
          )}

          {/* Progress Bar representing Billing Cycle */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: themeColor }]} />
          </View>

          {/* Notification Banner Confirmation */}
          {bill.reminderEnabled && !bill.isPaid && (
            <View style={styles.reminderBanner}>
              <Text style={styles.reminderBannerText}>
                🔔 Reminder active: 3 days before due date{bill.reminderTime ? ` at ${bill.reminderTime}` : ""}
              </Text>
            </View>
          )}

          {/* Direct Card Actions (Replacing hidden gestures) */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, bill.isPaid ? styles.unpayBtn : styles.payBtn]}
              onPress={() => togglePayment(bill)}
            >
              <Text style={[styles.actionBtnText, bill.isPaid ? styles.unpayBtnText : styles.payBtnText]}>
                {bill.isPaid ? "↩️ Mark Unpaid" : "✅ Mark Paid"}
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

        {/* Scrollable Grouped Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : totalDisplayCount === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💡</Text>
            <Text style={styles.emptyText}>No bills found</Text>
            <Text style={styles.emptySubtext}>
              Tap + to add your first bill
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {groupedSections.map(group => (
              <View key={group.title} style={styles.sectionContainer}>
                <Text style={[styles.sectionHeader, { color: group.color }]}>{group.title}</Text>
                {group.data.map(renderBillCard)}
              </View>
            ))}
            <View style={styles.bottomPadding} />
          </ScrollView>
        )}

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={openAddModal}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>

        {/* Add/Edit Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setModalVisible(false);
            resetForm();
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingBill ? "Edit Bill" : "Add Bill"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. Icon-Forward Bill Type Picker Grid (Direct selection) */}
                <Text style={styles.label}>Bill Type *</Text>
                <View style={styles.typeGrid}>
                  {BILL_TYPES.map((type) => {
                    const isSelected = formData.type === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeGridChip,
                          isSelected && styles.typeGridChipSelected,
                        ]}
                        onPress={() => setFormData({ ...formData, type })}
                      >
                        <Text style={styles.typeGridIcon}>{BILL_TYPE_ICONS[type]}</Text>
                        <Text
                          style={[
                            styles.typeGridText,
                            isSelected && styles.typeGridTextSelected,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 2. Inline Two-Column Inputs (Name & Amount) */}
                <View style={styles.formRow}>
                  <View style={[styles.formCol, { flex: 1.5 }]}>
                    <Text style={styles.label}>Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Home Electricity"
                      value={formData.name}
                      onChangeText={(text) =>
                        setFormData({ ...formData, name: text })
                      }
                    />
                  </View>
                  <View style={[styles.formCol, { flex: 1, marginLeft: 12 }]}>
                    <Text style={styles.label}>Amount (Rs.) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={formData.amount}
                      onChangeText={(text) =>
                        setFormData({ ...formData, amount: text })
                      }
                    />
                  </View>
                </View>

                {/* 3. Inline Two-Column Inputs (Due Date & Due Day) */}
                <View style={styles.formRow}>
                  <View style={[styles.formCol, { flex: 1.3 }]}>
                    <Text style={styles.label}>Next Due Date *</Text>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => setShowCalendar(true)}
                    >
                      <Text style={styles.inputText}>
                        {formData.dueDate.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.formCol, { flex: 0.7, marginLeft: 12 }]}>
                    <Text style={styles.label}>Due Day (1-31) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 15"
                      keyboardType="number-pad"
                      value={formData.dueDay}
                      onChangeText={(text) =>
                        setFormData({ ...formData, dueDay: text })
                      }
                    />
                  </View>
                </View>

                {/* Recurring switch */}
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Recurring (Monthly)</Text>
                  <Switch
                    value={formData.isRecurring}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isRecurring: value })
                    }
                    trackColor={{ false: "#E5E7EB", true: "#6366F1" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Reminder switch */}
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable Reminder (3 days before)</Text>
                  <Switch
                    value={formData.reminderEnabled}
                    onValueChange={(value) =>
                      setFormData({ ...formData, reminderEnabled: value })
                    }
                    trackColor={{ false: "#E5E7EB", true: "#6366F1" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {formData.reminderEnabled && (
                  <>
                    <Text style={styles.label}>Reminder Time</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="HH:MM (e.g., 09:00)"
                      value={formData.reminderTime}
                      onChangeText={(text) =>
                        setFormData({ ...formData, reminderTime: text })
                      }
                    />
                  </>
                )}

                {/* Shared switch */}
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Shared Bill</Text>
                  <Switch
                    value={formData.isShared}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isShared: value })
                    }
                    trackColor={{ false: "#E5E7EB", true: "#6366F1" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveButton} onPress={saveBill}>
                  <Text style={styles.saveButtonText}>
                    {editingBill ? "Update Bill" : "Add Bill"}
                  </Text>
                </TouchableOpacity>
                
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Calendar Modal */}
        <Calendar
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
          onSelectDate={(date: Date) => {
            setFormData({ ...formData, dueDate: date });
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
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  unpaidCard: {
    backgroundColor: "#EEF2FF",
    borderColor: "#E0E7FF",
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
    color: "#4F46E5",
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
    fontSize: 13,
    fontWeight: "800",
    color: "#312E81",
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
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#6366F1",
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  billInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  billIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  billDetails: {
    flex: 1,
  },
  billName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  billType: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  billAmount: {
    fontSize: 16,
    fontWeight: "800",
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 12,
    color: "#1E293B",
    fontWeight: "600",
  },
  overdueText: {
    color: "#EF4444",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: "#BFDBFE",
  },
  badgeText: {
    fontSize: 10,
    color: "#1E40AF",
    fontWeight: "700",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 2,
    overflow: "hidden",
    marginVertical: 10,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  reminderBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  reminderBannerText: {
    fontSize: 11,
    color: "#047857",
    fontWeight: "600",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1.2,
    paddingVertical: 8,
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
    fontSize: 11,
    fontWeight: "700",
  },
  unpayBtn: {
    backgroundColor: "#E2E8F0",
  },
  unpayBtnText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "700",
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderWidth: 0.5,
    borderColor: "#BFDBFE",
  },
  secondaryBtnText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "700",
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    borderWidth: 0.5,
    borderColor: "#FCA5A5",
  },
  deleteBtnText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "300",
  },
  bottomPadding: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  closeButton: {
    fontSize: 20,
    color: "#64748B",
    fontWeight: "500",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#FFFFFF",
    color: "#1E293B",
    justifyContent: "center",
  },
  inputText: {
    fontSize: 14,
    color: "#1E293B",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingVertical: 4,
  },
  saveButton: {
    backgroundColor: "#6366F1",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 10,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 360,
    overflow: "hidden",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  typeGridChip: {
    width: "31%", // Fits 3 columns nicely
    aspectRatio: 1.1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  typeGridChipSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
  },
  typeGridIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  typeGridText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  typeGridTextSelected: {
    color: "#4F46E5",
    fontWeight: "700",
  },
  formRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  formCol: {
    flexDirection: "column",
  },
});

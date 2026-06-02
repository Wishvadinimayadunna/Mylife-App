// ============================================
// Utility Bills Module (UX Aligned with To-Do)
// Electricity, Water, Wi-Fi, Mobile, Gas, TV, Rent, Insurance
// ============================================

import Calendar from "@/components/ui/calendar";
import utilityService from "@/services/utilityService";
import { UtilityBill, UtilityType } from "@/types";
import {
  cancelNotification,
  scheduleUtilityBillReminder
} from "@/utils/notifications";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useFocusEffect } from "expo-router";
import React, { useCallback, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
  Modal
} from "react-native";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TabType = "unpaid" | "paid" | "all";

const BILL_TYPES: UtilityType[] = [
  "Electricity",
  "Water",
  "Wi-Fi",
  "Mobile",
  "Gas",
  "TV",
  "Rent",
  "Insurance",
  "Other"
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
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>("unpaid");
  const [allBills, setAllBills] = useState<UtilityBill[]>([]);
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  // Modals Visibility
  const [modalVisible, setModalVisible] = useState(false); // Edit modal
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showAmountSelector, setShowAmountSelector] = useState(false);
  const [selectorTarget, setSelectorTarget] = useState<"composer" | "modal">("composer");

  // Composer States (Quick Add Card)
  const [composerName, setComposerName] = useState("");
  const [composerType, setComposerType] = useState<UtilityType>("Electricity");
  const [composerAmount, setComposerAmount] = useState("");
  const [composerDueDate, setComposerDueDate] = useState<Date | null>(null);
  const [composerDueDay, setComposerDueDay] = useState("");
  const [composerIsRecurring, setComposerIsRecurring] = useState(true);
  const [composerReminderEnabled, setComposerReminderEnabled] = useState(true);
  const [composerReminderTime, setComposerReminderTime] = useState("09:00");
  const [composerIsShared, setComposerIsShared] = useState(false);

  // Form State (for detailed Edit Modal)
  const [editingBill, setEditingBill] = useState<UtilityBill | null>(null);
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

  const resetComposer = () => {
    setComposerName("");
    setComposerAmount("");
    setComposerDueDate(null);
    setComposerDueDay("");
    setComposerType("Electricity");
    setComposerIsRecurring(true);
    setComposerReminderEnabled(true);
    setComposerReminderTime("09:00");
    setComposerIsShared(false);
  };

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

  // Handle Quick Add from Composer
  const handleAddBill = async () => {
    if (!composerName || !composerAmount) {
      Alert.alert("Error", "Please enter a bill name and amount");
      return;
    }

    const amountVal = parseFloat(composerAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    const finalDueDate = composerDueDate || new Date();
    const finalDueDay = composerDueDay ? parseInt(composerDueDay) : finalDueDate.getDate();

    if (isNaN(finalDueDay) || finalDueDay < 1 || finalDueDay > 31) {
      Alert.alert("Error", "Due day must be between 1 and 31");
      return;
    }

    try {
      let notificationId: string | undefined;
      if (composerReminderEnabled) {
        const id = await scheduleUtilityBillReminder(
          composerName,
          finalDueDate,
          "temp"
        );
        if (id) {
          notificationId = id;
        }
      }

      const billData = {
        profileID: "", // Assigned by backend
        name: composerName,
        type: composerType,
        amount: amountVal,
        dueDay: finalDueDay,
        dueDate: finalDueDate,
        isRecurring: composerIsRecurring,
        reminderEnabled: composerReminderEnabled,
        reminderTime: composerReminderTime,
        notificationId,
        isShared: composerIsShared,
        isPaid: false,
      };

      await utilityService.addBill(billData);
      resetComposer();
      loadBills();
      Alert.alert("Success", "Utility bill added successfully");
    } catch (error) {
      console.error("Add bill error:", error);
      Alert.alert("Error", "Failed to add utility bill");
    }
  };

  // Open edit modal (re-routed to dialog)
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

  // Save bill from edit form modal
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
        isPaid: editingBill?.isPaid || false,
      };

      if (editingBill) {
        await utilityService.updateBill(editingBill.id, billData);
      }

      setModalVisible(false);
      resetForm();
      loadBills();
      Alert.alert("Success", "Utility bill updated successfully");
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

  // Get visually grouped lists
  const getFilteredAndGroupedBills = () => {
    const unpaid = allBills.filter(b => !b.isPaid);
    const paid = allBills.filter(b => b.isPaid);

    const overdueGroup = unpaid.filter(b => isOverdue(b.dueDate, false));
    const dueSoonGroup = unpaid.filter(b => isDueSoon(b.dueDate, false));

    if (activeTab === "unpaid") {
      return [
        { title: "Overdue", data: overdueGroup, bgColor: "#FEE2E2", color: "#EF4444" },
        { title: "Due Soon", data: dueSoonGroup, bgColor: "#FEF3C7", color: "#D97706" },
      ].filter(group => group.data.length > 0);
    } else if (activeTab === "paid") {
      return [
        { title: "Paid History", data: paid, bgColor: "#D1FAE5", color: "#10B981" }
      ].filter(group => group.data.length > 0);
    } else {
      return [
        { title: "Overdue", data: overdueGroup, bgColor: "#FEE2E2", color: "#EF4444" },
        { title: "Due Soon", data: dueSoonGroup, bgColor: "#FEF3C7", color: "#D97706" },
        { title: "Paid History", data: paid, bgColor: "#D1FAE5", color: "#10B981" }
      ].filter(group => group.data.length > 0);
    }
  };

  // Open selectors
  const openTypeSelectorModal = (target: "composer" | "modal") => {
    setSelectorTarget(target);
    setShowTypeSelector(true);
  };

  const openAmountSelectorModal = (target: "composer" | "modal") => {
    setSelectorTarget(target);
    setShowAmountSelector(true);
  };

  const openCalendarModal = (target: "composer" | "modal") => {
    setSelectorTarget(target);
    setShowCalendar(true);
  };

  // Computations for Header Card
  const totalCount = allBills.length;
  const paidCount = allBills.filter(b => b.isPaid).length;
  const overdueCount = allBills.filter(b => isOverdue(b.dueDate, b.isPaid)).length;
  const unpaidCount = allBills.filter(b => !b.isPaid).length;
  const completionRate = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

  const groupedSections = getFilteredAndGroupedBills();

  // Render Grouped Section
  const renderGroupSection = (
    title: string,
    data: UtilityBill[],
    bgColor: string,
    color: string
  ) => {
    return (
      <View key={title} style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={[styles.sectionBadge, { backgroundColor: bgColor }]}>
            <Text style={[styles.sectionBadgeText, { color }]}>{data.length}</Text>
          </View>
        </View>
        {data.map(renderBillCard)}
      </View>
    );
  };

  // Render Single Bill Card
  const renderBillCard = (bill: UtilityBill) => {
    const isExpanded = expandedBillId === bill.id;
    const overdue = isOverdue(bill.dueDate, bill.isPaid);
    const dueSoon = isDueSoon(bill.dueDate, bill.isPaid);

    let priorityColor = "#10B981"; // green for paid
    if (!bill.isPaid) {
      if (overdue) {
        priorityColor = "#EF4444"; // red for overdue
      } else {
        priorityColor = "#F59E0B"; // amber for due soon
      }
    }

    return (
      <View
        key={bill.id}
        style={[
          styles.card,
          bill.isPaid && styles.completedCardOpacity,
        ]}
      >
        <View style={[styles.priorityBar, { backgroundColor: priorityColor }]} />
        <View style={styles.cardMain}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setExpandedBillId(isExpanded ? null : bill.id);
            }}
            activeOpacity={0.7}
          >
            {/* Checkbox button */}
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => togglePayment(bill)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={bill.isPaid ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                size={22}
                color={bill.isPaid ? "#10B981" : "#9CA3AF"}
              />
            </TouchableOpacity>

            {/* Bill Info */}
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, bill.isPaid && styles.taskTitleCompleted]}>
                {bill.name}
              </Text>
              
              {/* Meta Row */}
              <View style={styles.taskMeta}>
                <View style={styles.metaRow}>
                  <Text style={styles.categoryIconText}>
                    {BILL_TYPE_ICONS[bill.type] || "💰"}
                  </Text>
                  <Text style={styles.metaLabelText}>{bill.type}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabelText}>
                    Rs. {bill.amount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="calendar" size={12} color="#6B7280" />
                  <Text style={[styles.metaLabelText, overdue && styles.overdueDateText]}>
                    {new Date(bill.dueDate).toLocaleDateString()}
                    {overdue && " (Overdue)"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Chevron toggle */}
            <View style={styles.chevron}>
              <MaterialCommunityIcons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color="#6B7280"
              />
            </View>
          </TouchableOpacity>

          {/* Accordion Body */}
          {isExpanded && (
            <View style={styles.cardBody}>
              {/* Extra Details */}
              <Text style={styles.descriptionText}>
                • Recurring: {bill.isRecurring ? `Yes (Day ${bill.dueDay} of month)` : "No"}{"\n"}
                • Reminder: {bill.reminderEnabled ? `Enabled at ${bill.reminderTime || "09:00"}` : "Disabled"}{"\n"}
                • Sharing: {bill.isShared ? "Shared with Family" : "Personal Bill"}
              </Text>

              {/* Action buttons */}
              <View style={styles.cardActionsContainer}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editActionBtn]}
                  onPress={() => openEditModal(bill)}
                >
                  <MaterialCommunityIcons name="pencil" size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteActionBtn]}
                  onPress={() => deleteBill(bill)}
                >
                  <MaterialCommunityIcons name="trash-can" size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Utility Bills", headerShown: true }} />
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Header productivity/stats card */}
          <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              <View style={styles.greetingSection}>
                <Text style={styles.greetingTitle}>Utility Bills</Text>
                <Text style={styles.greetingSubtitle}>
                  Track, schedule, and settle your recurring expenses
                </Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPercentText}>
                  {Math.round(completionRate)}%
                </Text>
                <Text style={styles.progressSubtext}>Paid</Text>
              </View>
            </View>

            <View style={styles.statChipsRow}>
              <View style={[styles.statChip, styles.statChipOverdue]}>
                <Text style={[styles.statChipCount, styles.overdueChipText]}>
                  {overdueCount}
                </Text>
                <Text style={[styles.statChipLabel, styles.overdueChipText]}>
                  Overdue
                </Text>
              </View>
              <View style={[styles.statChip, styles.statChipPending]}>
                <Text style={[styles.statChipCount, styles.pendingChipText]}>
                  {unpaidCount}
                </Text>
                <Text style={[styles.statChipLabel, styles.pendingChipText]}>
                  Unpaid
                </Text>
              </View>
              <View style={[styles.statChip, styles.statChipDone]}>
                <Text style={[styles.statChipCount, styles.doneChipText]}>
                  {paidCount}
                </Text>
                <Text style={[styles.statChipLabel, styles.doneChipText]}>
                  Settled
                </Text>
              </View>
            </View>
          </View>

          {/* 2. Segmented Pill Filter */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterPill, activeTab === "unpaid" && styles.filterPillActive]}
              onPress={() => setActiveTab("unpaid")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === "unpaid" && styles.filterPillTextActive,
                ]}
              >
                Unpaid
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeTab === "paid" && styles.filterPillActive]}
              onPress={() => setActiveTab("paid")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === "paid" && styles.filterPillTextActive,
                ]}
              >
                Paid
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeTab === "all" && styles.filterPillActive]}
              onPress={() => setActiveTab("all")}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === "all" && styles.filterPillTextActive,
                ]}
              >
                All Bills
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3. Inline Composer Card */}
          <View style={styles.composerCard}>
            <View style={styles.composerInputRow}>
              <TextInput
                style={styles.composerInput}
                placeholder="Enter bill name..."
                placeholderTextColor="#9CA3AF"
                value={composerName}
                onChangeText={setComposerName}
              />
              <TouchableOpacity
                style={styles.composerSubmitBtn}
                onPress={handleAddBill}
              >
                <MaterialCommunityIcons name="arrow-up" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.composerChipsRow}>
              {/* Type Chip */}
              <TouchableOpacity
                style={styles.composerChip}
                onPress={() => openTypeSelectorModal("composer")}
              >
                <Text style={styles.composerChipText}>
                  {BILL_TYPE_ICONS[composerType] || "💰"} {composerType}
                </Text>
              </TouchableOpacity>

              {/* Amount Chip */}
              <TouchableOpacity
                style={styles.composerChip}
                onPress={() => openAmountSelectorModal("composer")}
              >
                <Text style={styles.composerChipText}>
                  💰 {composerAmount ? `Rs. ${composerAmount}` : "Amount"}
                </Text>
              </TouchableOpacity>

              {/* Date Chip */}
              <TouchableOpacity
                style={styles.composerChip}
                onPress={() => openCalendarModal("composer")}
              >
                <Text style={styles.composerChipText}>
                  📅 {composerDueDate ? composerDueDate.toLocaleDateString() : "Due Date"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. Scrollable Feed */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : bills.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💡</Text>
              <Text style={styles.emptyText}>No bills found</Text>
              <Text style={styles.emptySubtext}>
                Use the quick add composer above to create a bill payment request.
              </Text>
            </View>
          ) : (
            <View style={styles.feedContainer}>
              {groupedSections.map(g => renderGroupSection(g.title, g.data, g.bgColor, g.color))}
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Modal: Edit Bill Form */}
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
                <Text style={styles.modalTitle}>Edit Bill Details</Text>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Name */}
                <Text style={styles.label}>Bill Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Home Electricity"
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                />

                {/* Amount */}
                <Text style={styles.label}>Amount * (Rs.)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={formData.amount}
                  onChangeText={(text) =>
                    setFormData({ ...formData, amount: text })
                  }
                />

                {/* Type Selection Trigger */}
                <Text style={styles.label}>Bill Type</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => openTypeSelectorModal("modal")}
                >
                  <Text style={styles.inputText}>
                    {BILL_TYPE_ICONS[formData.type] || "💰"} {formData.type}
                  </Text>
                </TouchableOpacity>

                {/* Due Date Calendar Trigger */}
                <Text style={styles.label}>Due Date</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => openCalendarModal("modal")}
                >
                  <Text style={styles.inputText}>
                    📅 {formData.dueDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                {/* Due Day */}
                <Text style={styles.label}>Due Day (1-31)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 15"
                  keyboardType="number-pad"
                  value={formData.dueDay}
                  onChangeText={(text) =>
                    setFormData({ ...formData, dueDay: text })
                  }
                />

                {/* Recurring Switch */}
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Recurring Bill</Text>
                  <Switch
                    value={formData.isRecurring}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isRecurring: value })
                    }
                    trackColor={{ false: "#E5E7EB", true: "#2563EB" }}
                  />
                </View>

                {/* Reminder Alert toggle */}
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable Reminder</Text>
                  <Switch
                    value={formData.reminderEnabled}
                    onValueChange={(value) =>
                      setFormData({ ...formData, reminderEnabled: value })
                    }
                    trackColor={{ false: "#E5E7EB", true: "#2563EB" }}
                  />
                </View>

                {formData.reminderEnabled && (
                  <>
                    <Text style={styles.label}>Reminder Time</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="HH:MM (e.g. 09:00)"
                      value={formData.reminderTime}
                      onChangeText={(text) =>
                        setFormData({ ...formData, reminderTime: text })
                      }
                    />
                  </>
                )}

                {/* Shared Task Switch */}
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Shared Bill</Text>
                  <Switch
                    value={formData.isShared}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isShared: value })
                    }
                    trackColor={{ false: "#E5E7EB", true: "#2563EB" }}
                  />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={saveBill}>
                  <Text style={styles.saveButtonText}>Update Bill Details</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Type Picker Option Sheet */}
        {showTypeSelector && (
          <Modal
            visible={showTypeSelector}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowTypeSelector(false)}
          >
            <View style={styles.selectorOverlay}>
              <View style={styles.selectorContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>Select Bill Type</Text>
                  <TouchableOpacity onPress={() => setShowTypeSelector(false)}>
                    <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.selectorBody}>
                  {BILL_TYPES.map((type) => {
                    const currentType = selectorTarget === "modal" ? formData.type : composerType;
                    const isActive = currentType === type;

                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.selectorOption,
                          isActive && styles.activeSelectorOption,
                        ]}
                        onPress={() => {
                          if (selectorTarget === "modal") {
                            setFormData((prev) => ({ ...prev, type }));
                          } else {
                            setComposerType(type);
                          }
                          setShowTypeSelector(false);
                        }}
                      >
                        <Text style={styles.selectorIcon}>
                          {BILL_TYPE_ICONS[type] || "💰"}
                        </Text>
                        <Text style={styles.selectorText}>{type}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* Modal: Amount Picker dialog */}
        {showAmountSelector && (
          <Modal
            visible={showAmountSelector}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setShowAmountSelector(false)}
          >
            <View style={styles.dialogOverlay}>
              <View style={styles.dialogContent}>
                <Text style={styles.dialogTitle}>Set Bill Amount</Text>
                <View style={styles.dialogInputRow}>
                  <Text style={styles.dialogCurrencyPrefix}>Rs.</Text>
                  <TextInput
                    style={styles.dialogInput}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    autoFocus={true}
                    defaultValue={selectorTarget === "modal" ? formData.amount : composerAmount}
                    onChangeText={(text) => {
                      if (selectorTarget === "modal") {
                        setFormData((prev) => ({ ...prev, amount: text }));
                      } else {
                        setComposerAmount(text);
                      }
                    }}
                  />
                </View>
                <View style={styles.dialogActions}>
                  <TouchableOpacity
                    style={[styles.dialogBtn, styles.dialogBtnCancel]}
                    onPress={() => setShowAmountSelector(false)}
                  >
                    <Text style={styles.dialogBtnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dialogBtn, styles.dialogBtnSave]}
                    onPress={() => setShowAmountSelector(false)}
                  >
                    <Text style={styles.dialogBtnSaveText}>Set Amount</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Modal: Calendar Select */}
        <Calendar
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
          onSelectDate={(date) => {
            if (selectorTarget === "modal") {
              setFormData((prev) => ({ ...prev, dueDate: date, dueDay: date.getDate().toString() }));
            } else {
              setComposerDueDate(date);
              setComposerDueDay(date.getDate().toString());
            }
            setShowCalendar(false);
          }}
          selectedDate={
            (selectorTarget === "modal" ? formData.dueDate : composerDueDate) || new Date()
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6", // soft light gray background
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  bottomSpacer: {
    height: 60,
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  feedContainer: {
    marginTop: 8,
  },
  
  // 1. Header productivity card styling
  headerCard: {
    backgroundColor: "#2563EB", // premium productivity blue
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingSection: {
    flex: 1,
    marginRight: 12,
  },
  greetingTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    color: "#BFDBFE",
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500",
  },
  progressCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressPercentText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  progressSubtext: {
    color: "#93C5FD",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statChipsRow: {
    flexDirection: "row",
    marginTop: 18,
    gap: 8,
  },
  statChip: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statChipOverdue: {
    backgroundColor: "#FEE2E2",
  },
  statChipPending: {
    backgroundColor: "#FEF3C7",
  },
  statChipDone: {
    backgroundColor: "#D1FAE5",
  },
  statChipCount: {
    fontSize: 16,
    fontWeight: "800",
  },
  statChipLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  overdueChipText: {
    color: "#DC2626",
  },
  pendingChipText: {
    color: "#D97706",
  },
  doneChipText: {
    color: "#10B981",
  },

  // 2. Segmented Pill Filter
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 24,
    padding: 3,
    marginBottom: 16,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 20,
  },
  filterPillActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterPillTextActive: {
    color: "#1F2937",
    fontWeight: "700",
  },

  // 3. Inline Composer Card
  composerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  composerInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 10,
  },
  composerInput: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
    paddingVertical: 6,
    fontWeight: "500",
  },
  composerSubmitBtn: {
    backgroundColor: "#2563EB",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  composerChipsRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 8,
    flexWrap: "wrap",
  },
  composerChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  composerChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },

  // 4. Task Cards & Sections
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  completedCardOpacity: {
    opacity: 0.55,
  },
  priorityBar: {
    width: 5,
    height: "100%",
  },
  cardMain: {
    flex: 1,
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
    flexWrap: "wrap",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaLabelText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  categoryIconText: {
    fontSize: 11,
  },
  overdueDateText: {
    color: "#EF4444",
    fontWeight: "600",
  },
  chevron: {
    padding: 4,
  },

  // 5. Collapsible Body details
  cardBody: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  descriptionText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 12,
  },
  cardActionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  editActionBtn: {
    backgroundColor: "#3B82F6",
  },
  deleteActionBtn: {
    backgroundColor: "#EF4444",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  // 6. Modals & Overlay forms
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalBody: {
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
  },
  inputText: {
    fontSize: 14,
    color: "#1F2937",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  selectorOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  selectorContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  selectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  selectorBody: {
    padding: 8,
  },
  selectorOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  activeSelectorOption: {
    backgroundColor: "#EFF6FF",
  },
  selectorIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  selectorText: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
  },

  // Amount Dialog Selector
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialogContent: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  dialogInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
  },
  dialogCurrencyPrefix: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
    marginRight: 4,
  },
  dialogInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    paddingVertical: 10,
    fontWeight: "600",
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    gap: 12,
  },
  dialogBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dialogBtnCancel: {
    backgroundColor: "#F3F4F6",
  },
  dialogBtnCancelText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
  },
  dialogBtnSave: {
    backgroundColor: "#2563EB",
  },
  dialogBtnSaveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

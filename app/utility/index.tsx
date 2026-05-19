// ============================================
// Utility Bills Module
// Electricity, Water, Wi-Fi, Mobile, Gas, TV, Rent, Insurance
// ============================================

import { Calendar } from "@/components/ui/calendar";
import utilityService from "@/services/utilityService";
import { UtilityBill, UtilityType } from "@/types";
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
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<UtilityBill | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

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

  // Load bills
  const loadBills = async () => {
    setLoading(true);
    try {
      let data: UtilityBill[] = [];
      if (activeTab === "all") {
        data = await utilityService.getAllBills();
      } else if (activeTab === "unpaid") {
        data = await utilityService.getUnpaidBills();
      } else {
        data = await utilityService.getPaidBills();
      }
      setBills(data);
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
      const billData = {
        name: formData.name,
        type: formData.type,
        amount,
        dueDay,
        dueDate: formData.dueDate,
        isRecurring: formData.isRecurring,
        reminderEnabled: formData.reminderEnabled,
        reminderTime: formData.reminderTime,
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
        await utilityService.markBillAsPaid(bill.id);
      }
      loadBills();
    } catch (error) {
      console.error("Toggle payment error:", error);
      Alert.alert("Error", "Failed to update payment status");
    }
  };

  // Render bill card
  const renderBillCard = (bill: UtilityBill) => {
    const dueDate = new Date(bill.dueDate);
    const today = new Date();
    const isOverdue = !bill.isPaid && dueDate < today;

    return (
      <View key={bill.id} style={styles.card}>
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
          <Text style={styles.billAmount}>Rs. {bill.amount.toFixed(2)}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Due Date:</Text>
            <Text style={[styles.infoValue, isOverdue && styles.overdueText]}>
              {dueDate.toLocaleDateString()}
              {isOverdue && " (Overdue)"}
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

          <View style={styles.cardActions}>
            <View style={styles.paymentToggle}>
              <Text style={styles.paymentLabel}>
                {bill.isPaid ? "✅ Paid" : "⏳ Unpaid"}
              </Text>
              <Switch
                value={bill.isPaid}
                onValueChange={() => togglePayment(bill)}
                trackColor={{ false: "#E5E7EB", true: "#10B981" }}
                thumbColor={bill.isPaid ? "#FFFFFF" : "#9CA3AF"}
              />
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => openEditModal(bill)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteBill(bill)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Utility Bills", headerShown: true }} />
      <View style={styles.container}>
        {/* Tabs */}
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

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : bills.length === 0 ? (
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
            {bills.map(renderBillCard)}
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
                {/* Bill Type Selector */}
                <Text style={styles.label}>Bill Type *</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowTypeSelector(true)}
                >
                  <Text style={styles.inputText}>
                    {BILL_TYPE_ICONS[formData.type]} {formData.type}
                  </Text>
                </TouchableOpacity>

                {/* Name */}
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Home Electricity"
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                />

                {/* Amount */}
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

                {/* Due Day */}
                <Text style={styles.label}>Due Day (1-31) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 15 for 15th of month"
                  keyboardType="number-pad"
                  value={formData.dueDay}
                  onChangeText={(text) =>
                    setFormData({ ...formData, dueDay: text })
                  }
                />

                {/* Next Due Date */}
                <Text style={styles.label}>Next Due Date</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowCalendar(true)}
                >
                  <Text style={styles.inputText}>
                    {formData.dueDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                {/* Recurring */}
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Recurring (Monthly)</Text>
                  <Switch
                    value={formData.isRecurring}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isRecurring: value })
                    }
                    trackColor={{ false: "#E5E7EB", true: "#3B82F6" }}
                  />
                </View>

                {/* Reminder */}
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable Reminder</Text>
                  <Switch
                    value={formData.reminderEnabled}
                    onValueChange={(value) =>
                      setFormData({ ...formData, reminderEnabled: value })
                    }
                    trackColor={{ false: "#E5E7EB", true: "#3B82F6" }}
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

                {/* Shared */}
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Shared Bill</Text>
                  <Switch
                    value={formData.isShared}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isShared: value })
                    }
                    trackColor={{ false: "#E5E7EB", true: "#3B82F6" }}
                  />
                </View>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveButton} onPress={saveBill}>
                  <Text style={styles.saveButtonText}>
                    {editingBill ? "Update Bill" : "Add Bill"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Calendar Modal */}
        {showCalendar && (
          <Modal
            visible={showCalendar}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setShowCalendar(false)}
          >
            <View style={styles.calendarOverlay}>
              <View style={styles.calendarModal}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarTitle}>Select Due Date</Text>
                  <TouchableOpacity onPress={() => setShowCalendar(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Calendar
                  onSelectDate={(date) => {
                    setFormData({ ...formData, dueDate: date });
                    setShowCalendar(false);
                  }}
                  selectedDate={formData.dueDate}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Bill Type Selector Modal */}
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
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.selectorBody}>
                  {BILL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        formData.type === type && styles.activeTypeOption,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, type });
                        setShowTypeSelector(false);
                      }}
                    >
                      <Text style={styles.typeIcon}>
                        {BILL_TYPE_ICONS[type]}
                      </Text>
                      <Text
                        style={[
                          styles.typeText,
                          formData.type === type && styles.activeTypeText,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#3B82F6",
  },
  tabText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#3B82F6",
    fontWeight: "700",
  },
  content: {
    flex: 1,
    padding: 16,
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
    color: "#1F2937",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  billInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  billIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  billDetails: {
    flex: 1,
  },
  billName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  billType: {
    fontSize: 13,
    color: "#6B7280",
  },
  billAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#059669",
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "600",
  },
  overdueText: {
    color: "#DC2626",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: "600",
  },
  cardActions: {
    marginTop: 12,
  },
  paymentToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  editButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    fontSize: 24,
    color: "#6B7280",
    fontWeight: "400",
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
  },
  inputText: {
    fontSize: 15,
    color: "#1F2937",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  saveButton: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
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
    maxHeight: "70%",
  },
  selectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  selectorBody: {
    padding: 8,
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  activeTypeOption: {
    backgroundColor: "#EFF6FF",
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  typeText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  activeTypeText: {
    color: "#3B82F6",
    fontWeight: "700",
  },
});

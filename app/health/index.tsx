// ============================================
// Health Module - Health Management
// Medical appointments, medicine reminders, health records, emergency contacts
// ============================================

import Calendar from "@/components/ui/calendar";
import healthService from "@/services/healthService";
import { useAppStore } from "@/store/appStore";
import {
    EmergencyContact,
    HealthRecord,
    MedicalAppointment,
    MedicineReminder,
} from "@/types";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
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

type TabType = "appointments" | "medicines" | "records" | "emergency";

export default function HealthScreen() {
  const { profile } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>("appointments");
  const [loading, setLoading] = useState(true);

  // Data states
  const [appointments, setAppointments] = useState<MedicalAppointment[]>([]);
  const [medicines, setMedicines] = useState<MedicineReminder[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<
    EmergencyContact[]
  >([]);

  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Calendar states
  const [showDateCalendar, setShowDateCalendar] = useState(false);
  const [showRecordDateCalendar, setShowRecordDateCalendar] = useState(false);

  // Form states for each tab
  const [appointmentForm, setAppointmentForm] = useState({
    doctorName: "",
    appointmentDate: "",
    appointmentTime: "",
    notes: "",
    reminderEnabled: true,
  });

  const [medicineForm, setMedicineForm] = useState({
    medicineName: "",
    dosage: "",
    reminderTime: "",
    isEnabled: true,
  });

  const [recordForm, setRecordForm] = useState({
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    bloodSugar: "",
    weight: "",
    bmi: "",
    recordDate: "",
    notes: "",
  });

  const [emergencyForm, setEmergencyForm] = useState({
    name: "",
    relationship: "",
    phoneNumber: "",
    email: "",
  });

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAppointments(),
        loadMedicines(),
        loadHealthRecords(),
        loadEmergencyContacts(),
      ]);
    } catch (error) {
      console.error("Load all data error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const data = await healthService.getAppointments();
      setAppointments(data);
    } catch (error) {
      console.error("Load appointments error:", error);
    }
  };

  const loadMedicines = async () => {
    try {
      const data = await healthService.getMedicineReminders();
      setMedicines(data);
    } catch (error) {
      console.error("Load medicines error:", error);
    }
  };

  const loadHealthRecords = async () => {
    try {
      const data = await healthService.getHealthRecords();
      setHealthRecords(data);
    } catch (error) {
      console.error("Load health records error:", error);
    }
  };

  const loadEmergencyContacts = async () => {
    try {
      const data = await healthService.getEmergencyContacts();
      setEmergencyContacts(data);
    } catch (error) {
      console.error("Load emergency contacts error:", error);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    resetForms();
    setIsModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    if (activeTab === "appointments") {
      setAppointmentForm({
        doctorName: item.doctorName,
        appointmentDate: new Date(item.appointmentDate)
          .toISOString()
          .split("T")[0],
        appointmentTime: item.appointmentTime,
        notes: item.notes || "",
        reminderEnabled: item.reminderEnabled,
      });
    } else if (activeTab === "medicines") {
      setMedicineForm({
        medicineName: item.medicineName,
        dosage: item.dosage || "",
        reminderTime: item.reminderTime,
        isEnabled: item.isEnabled,
      });
    } else if (activeTab === "records") {
      setRecordForm({
        bloodPressureSystolic: item.bloodPressureSystolic?.toString() || "",
        bloodPressureDiastolic: item.bloodPressureDiastolic?.toString() || "",
        bloodSugar: item.bloodSugar?.toString() || "",
        weight: item.weight?.toString() || "",
        bmi: item.bmi?.toString() || "",
        recordDate: new Date(item.recordDate).toISOString().split("T")[0],
        notes: item.notes || "",
      });
    } else if (activeTab === "emergency") {
      setEmergencyForm({
        name: item.name,
        relationship: item.relationship,
        phoneNumber: item.phoneNumber,
        email: item.email || "",
      });
    }
    setIsModalVisible(true);
  };

  const resetForms = () => {
    setAppointmentForm({
      doctorName: "",
      appointmentDate: "",
      appointmentTime: "",
      notes: "",
      reminderEnabled: true,
    });
    setMedicineForm({
      medicineName: "",
      dosage: "",
      reminderTime: "",
      isEnabled: true,
    });
    setRecordForm({
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
      bloodSugar: "",
      weight: "",
      bmi: "",
      recordDate: "",
      notes: "",
    });
    setEmergencyForm({
      name: "",
      relationship: "",
      phoneNumber: "",
      email: "",
    });
  };

  const handleSave = async () => {
    try {
      if (activeTab === "appointments") {
        const data = {
          ...appointmentForm,
          profileID: profile?.id || "",
          appointmentDate: new Date(appointmentForm.appointmentDate),
        };

        if (editingItem) {
          await healthService.updateAppointment(
            editingItem.id || editingItem._id,
            data,
          );
        } else {
          await healthService.addAppointment(data);
        }
        await loadAppointments();
      } else if (activeTab === "medicines") {
        const data = {
          ...medicineForm,
          profileID: profile?.id || "",
        };

        if (editingItem) {
          await healthService.updateMedicineReminder(
            editingItem.id || editingItem._id,
            data,
          );
        } else {
          await healthService.addMedicineReminder(data);
        }
        await loadMedicines();
      } else if (activeTab === "records") {
        const data = {
          profileID: profile?.id || "",
          bloodPressureSystolic: recordForm.bloodPressureSystolic
            ? Number(recordForm.bloodPressureSystolic)
            : undefined,
          bloodPressureDiastolic: recordForm.bloodPressureDiastolic
            ? Number(recordForm.bloodPressureDiastolic)
            : undefined,
          bloodSugar: recordForm.bloodSugar
            ? Number(recordForm.bloodSugar)
            : undefined,
          weight: recordForm.weight ? Number(recordForm.weight) : undefined,
          bmi: recordForm.bmi ? Number(recordForm.bmi) : undefined,
          recordDate: new Date(recordForm.recordDate || new Date()),
          notes: recordForm.notes,
        };

        if (editingItem) {
          await healthService.updateHealthRecord(
            editingItem.id || editingItem._id,
            data,
          );
        } else {
          await healthService.addHealthRecord(data);
        }
        await loadHealthRecords();
      } else if (activeTab === "emergency") {
        const data = {
          ...emergencyForm,
          profileID: profile?.id || "",
        };

        if (editingItem) {
          await healthService.updateEmergencyContact(
            editingItem.id || editingItem._id,
            data,
          );
        } else {
          await healthService.addEmergencyContact(data);
        }
        await loadEmergencyContacts();
      }

      setIsModalVisible(false);
      resetForms();
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to save. Please try again.");
    }
  };

  const handleDelete = async (item: any) => {
    Alert.alert(
      "Delete Confirmation",
      "Are you sure you want to delete this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const itemId = item.id || item._id;
              if (activeTab === "appointments") {
                await healthService.deleteAppointment(itemId);
                await loadAppointments();
              } else if (activeTab === "medicines") {
                await healthService.deleteMedicineReminder(itemId);
                await loadMedicines();
              } else if (activeTab === "records") {
                await healthService.deleteHealthRecord(itemId);
                await loadHealthRecords();
              } else if (activeTab === "emergency") {
                await healthService.deleteEmergencyContact(itemId);
                await loadEmergencyContacts();
              }
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert("Error", "Failed to delete. Please try again.");
            }
          },
        },
      ],
    );
  };

  const renderTabButtons = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === "appointments" && styles.tabButtonActive,
        ]}
        onPress={() => setActiveTab("appointments")}
      >
        <Text
          style={[
            styles.tabButtonText,
            activeTab === "appointments" && styles.tabButtonTextActive,
          ]}
        >
          📅 Appointments
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === "medicines" && styles.tabButtonActive,
        ]}
        onPress={() => setActiveTab("medicines")}
      >
        <Text
          style={[
            styles.tabButtonText,
            activeTab === "medicines" && styles.tabButtonTextActive,
          ]}
        >
          💊 Medicines
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === "records" && styles.tabButtonActive,
        ]}
        onPress={() => setActiveTab("records")}
      >
        <Text
          style={[
            styles.tabButtonText,
            activeTab === "records" && styles.tabButtonTextActive,
          ]}
        >
          📊 Records
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === "emergency" && styles.tabButtonActive,
        ]}
        onPress={() => setActiveTab("emergency")}
      >
        <Text
          style={[
            styles.tabButtonText,
            activeTab === "emergency" && styles.tabButtonTextActive,
          ]}
        >
          🚨 Emergency
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderAppointmentItem = ({ item }: { item: MedicalAppointment }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.doctorName}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEditModal(item)}>
            <Text style={styles.editButton}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Text style={styles.deleteButton}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.cardDetail}>
        📅 {new Date(item.appointmentDate).toLocaleDateString()}
      </Text>
      <Text style={styles.cardDetail}>🕐 {item.appointmentTime}</Text>
      {item.notes && <Text style={styles.cardNotes}>{item.notes}</Text>}
      <View style={styles.reminderBadge}>
        <Text style={styles.reminderText}>
          {item.reminderEnabled ? "🔔 Reminder ON" : "🔕 Reminder OFF"}
        </Text>
      </View>
    </View>
  );

  const renderMedicineItem = ({ item }: { item: MedicineReminder }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.medicineName}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEditModal(item)}>
            <Text style={styles.editButton}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Text style={styles.deleteButton}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
      {item.dosage && (
        <Text style={styles.cardDetail}>💊 Dosage: {item.dosage}</Text>
      )}
      <Text style={styles.cardDetail}>🕐 Time: {item.reminderTime}</Text>
      <View style={styles.reminderBadge}>
        <Text style={styles.reminderText}>
          {item.isEnabled ? "✅ Enabled" : "❌ Disabled"}
        </Text>
      </View>
    </View>
  );

  const renderHealthRecordItem = ({ item }: { item: HealthRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>
          {new Date(item.recordDate).toLocaleDateString()}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEditModal(item)}>
            <Text style={styles.editButton}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Text style={styles.deleteButton}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
      {item.bloodPressureSystolic && item.bloodPressureDiastolic && (
        <Text style={styles.cardDetail}>
          🩸 BP: {item.bloodPressureSystolic}/{item.bloodPressureDiastolic} mmHg
        </Text>
      )}
      {item.bloodSugar && (
        <Text style={styles.cardDetail}>🍬 Sugar: {item.bloodSugar} mg/dL</Text>
      )}
      {item.weight && (
        <Text style={styles.cardDetail}>⚖️ Weight: {item.weight} kg</Text>
      )}
      {item.bmi && <Text style={styles.cardDetail}>📊 BMI: {item.bmi}</Text>}
      {item.notes && <Text style={styles.cardNotes}>{item.notes}</Text>}
    </View>
  );

  const renderEmergencyContactItem = ({ item }: { item: EmergencyContact }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEditModal(item)}>
            <Text style={styles.editButton}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Text style={styles.deleteButton}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.cardDetail}>👥 {item.relationship}</Text>
      <Text style={styles.cardDetail}>📞 {item.phoneNumber}</Text>
      {item.email && <Text style={styles.cardDetail}>📧 {item.email}</Text>}
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      );
    }

    let data: any[] = [];
    let renderItem: any;
    let emptyMessage = "";

    switch (activeTab) {
      case "appointments":
        data = appointments;
        renderItem = renderAppointmentItem;
        emptyMessage = "No appointments scheduled";
        break;
      case "medicines":
        data = medicines;
        renderItem = renderMedicineItem;
        emptyMessage = "No medicine reminders set";
        break;
      case "records":
        data = healthRecords;
        renderItem = renderHealthRecordItem;
        emptyMessage = "No health records logged";
        break;
      case "emergency":
        data = emergencyContacts;
        renderItem = renderEmergencyContactItem;
        emptyMessage = "No emergency contacts added";
        break;
    }

    if (data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>
            {activeTab === "appointments"
              ? "📅"
              : activeTab === "medicines"
                ? "💊"
                : activeTab === "records"
                  ? "📊"
                  : "🚨"}
          </Text>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Add {activeTab}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id || item._id}
        contentContainerStyle={styles.listContainer}
      />
    );
  };

  const renderModal = () => {
    let modalContent;

    if (activeTab === "appointments") {
      modalContent = (
        <ScrollView>
          <Text style={styles.label}>Doctor Name *</Text>
          <TextInput
            style={styles.input}
            value={appointmentForm.doctorName}
            onChangeText={(text) =>
              setAppointmentForm({ ...appointmentForm, doctorName: text })
            }
            placeholder="Dr. Smith"
          />

          <Text style={styles.label}>Appointment Date *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDateCalendar(true)}
          >
            <Text style={styles.dateButtonText}>
              {appointmentForm.appointmentDate || "Select Date"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Appointment Time *</Text>
          <TextInput
            style={styles.input}
            value={appointmentForm.appointmentTime}
            onChangeText={(text) =>
              setAppointmentForm({ ...appointmentForm, appointmentTime: text })
            }
            placeholder="10:00 AM"
          />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={appointmentForm.notes}
            onChangeText={(text) =>
              setAppointmentForm({ ...appointmentForm, notes: text })
            }
            placeholder="Additional notes..."
            multiline
            numberOfLines={3}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable Reminder</Text>
            <Switch
              value={appointmentForm.reminderEnabled}
              onValueChange={(value) =>
                setAppointmentForm({
                  ...appointmentForm,
                  reminderEnabled: value,
                })
              }
            />
          </View>
        </ScrollView>
      );
    } else if (activeTab === "medicines") {
      modalContent = (
        <ScrollView>
          <Text style={styles.label}>Medicine Name *</Text>
          <TextInput
            style={styles.input}
            value={medicineForm.medicineName}
            onChangeText={(text) =>
              setMedicineForm({ ...medicineForm, medicineName: text })
            }
            placeholder="Aspirin"
          />

          <Text style={styles.label}>Dosage</Text>
          <TextInput
            style={styles.input}
            value={medicineForm.dosage}
            onChangeText={(text) =>
              setMedicineForm({ ...medicineForm, dosage: text })
            }
            placeholder="100mg"
          />

          <Text style={styles.label}>Reminder Time *</Text>
          <TextInput
            style={styles.input}
            value={medicineForm.reminderTime}
            onChangeText={(text) =>
              setMedicineForm({ ...medicineForm, reminderTime: text })
            }
            placeholder="08:00"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable Reminder</Text>
            <Switch
              value={medicineForm.isEnabled}
              onValueChange={(value) =>
                setMedicineForm({ ...medicineForm, isEnabled: value })
              }
            />
          </View>
        </ScrollView>
      );
    } else if (activeTab === "records") {
      modalContent = (
        <ScrollView>
          <Text style={styles.label}>Record Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowRecordDateCalendar(true)}
          >
            <Text style={styles.dateButtonText}>
              {recordForm.recordDate || "Select Date"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Blood Pressure (Systolic)</Text>
          <TextInput
            style={styles.input}
            value={recordForm.bloodPressureSystolic}
            onChangeText={(text) =>
              setRecordForm({ ...recordForm, bloodPressureSystolic: text })
            }
            placeholder="120"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Blood Pressure (Diastolic)</Text>
          <TextInput
            style={styles.input}
            value={recordForm.bloodPressureDiastolic}
            onChangeText={(text) =>
              setRecordForm({ ...recordForm, bloodPressureDiastolic: text })
            }
            placeholder="80"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Blood Sugar (mg/dL)</Text>
          <TextInput
            style={styles.input}
            value={recordForm.bloodSugar}
            onChangeText={(text) =>
              setRecordForm({ ...recordForm, bloodSugar: text })
            }
            placeholder="100"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={recordForm.weight}
            onChangeText={(text) =>
              setRecordForm({ ...recordForm, weight: text })
            }
            placeholder="70"
            keyboardType="numeric"
          />

          <Text style={styles.label}>BMI</Text>
          <TextInput
            style={styles.input}
            value={recordForm.bmi}
            onChangeText={(text) => setRecordForm({ ...recordForm, bmi: text })}
            placeholder="22.5"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={recordForm.notes}
            onChangeText={(text) =>
              setRecordForm({ ...recordForm, notes: text })
            }
            placeholder="Additional notes..."
            multiline
            numberOfLines={3}
          />
        </ScrollView>
      );
    } else if (activeTab === "emergency") {
      modalContent = (
        <ScrollView>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={emergencyForm.name}
            onChangeText={(text) =>
              setEmergencyForm({ ...emergencyForm, name: text })
            }
            placeholder="John Doe"
          />

          <Text style={styles.label}>Relationship *</Text>
          <TextInput
            style={styles.input}
            value={emergencyForm.relationship}
            onChangeText={(text) =>
              setEmergencyForm({ ...emergencyForm, relationship: text })
            }
            placeholder="Brother"
          />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={emergencyForm.phoneNumber}
            onChangeText={(text) =>
              setEmergencyForm({ ...emergencyForm, phoneNumber: text })
            }
            placeholder="+1 234 567 8900"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={emergencyForm.email}
            onChangeText={(text) =>
              setEmergencyForm({ ...emergencyForm, email: text })
            }
            placeholder="john@example.com"
            keyboardType="email-address"
          />
        </ScrollView>
      );
    }

    return (
      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingItem ? "Edit" : "Add"}{" "}
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>{modalContent}</View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Calendar Modal for Appointments */}
        <Modal
          visible={showDateCalendar}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDateCalendar(false)}
        >
          <View style={styles.calendarOverlay}>
            <View style={styles.calendarContainer}>
              <Calendar
                onSelectDate={(date) => {
                  setAppointmentForm({
                    ...appointmentForm,
                    appointmentDate: date.toISOString().split("T")[0],
                  });
                  setShowDateCalendar(false);
                }}
                selectedDate={
                  appointmentForm.appointmentDate
                    ? new Date(appointmentForm.appointmentDate)
                    : new Date()
                }
                minDate={new Date()}
              />
              <TouchableOpacity
                style={styles.calendarCloseButton}
                onPress={() => setShowDateCalendar(false)}
              >
                <Text style={styles.calendarCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Date Calendar Modal for Health Records */}
        <Modal
          visible={showRecordDateCalendar}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRecordDateCalendar(false)}
        >
          <View style={styles.calendarOverlay}>
            <View style={styles.calendarContainer}>
              <Calendar
                onSelectDate={(date) => {
                  setRecordForm({
                    ...recordForm,
                    recordDate: date.toISOString().split("T")[0],
                  });
                  setShowRecordDateCalendar(false);
                }}
                selectedDate={
                  recordForm.recordDate
                    ? new Date(recordForm.recordDate)
                    : new Date()
                }
                maxDate={new Date()}
              />
              <TouchableOpacity
                style={styles.calendarCloseButton}
                onPress={() => setShowRecordDateCalendar(false)}
              >
                <Text style={styles.calendarCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Modal>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Health", headerShown: true }} />
      <View style={styles.container}>
        {renderTabButtons()}
        <View style={styles.contentContainer}>{renderContent()}</View>

        {/* Floating Add Button */}
        {(activeTab === "appointments"
          ? appointments.length > 0
          : activeTab === "medicines"
            ? medicines.length > 0
            : activeTab === "records"
              ? healthRecords.length > 0
              : emergencyContacts.length > 0) && (
          <TouchableOpacity style={styles.fab} onPress={openAddModal}>
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        )}

        {renderModal()}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: "#FF6B9D",
  },
  tabButtonText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  tabButtonTextActive: {
    color: "#FF6B9D",
    fontWeight: "700",
  },
  contentContainer: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    fontSize: 18,
  },
  deleteButton: {
    fontSize: 18,
  },
  cardDetail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  cardNotes: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 8,
    fontStyle: "italic",
  },
  reminderBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#FEF3F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reminderText: {
    fontSize: 12,
    color: "#FF6B9D",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: "#FF6B9D",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF6B9D",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "300",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    fontSize: 28,
    color: "#6B7280",
    fontWeight: "300",
  },
  modalBody: {
    flex: 1,
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
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  dateButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F9FAFB",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#374151",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: "#374151",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#FF6B9D",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  calendarCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: "#FF6B9D",
    borderRadius: 8,
    alignItems: "center",
  },
  calendarCloseText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

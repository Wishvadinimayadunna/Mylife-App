// ============================================
// Family Module - Family Member Management
// Add, edit, view family members with birthday reminders
// ============================================

import Calendar from "@/components/ui/calendar";
import familyService from "@/services/familyService";
import { useAppStore } from "@/store/appStore";
import { FamilyMember, RelationshipType } from "@/types";
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

export default function FamilyScreen() {
  const { profile } = useAppStore();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDOBCalendar, setShowDOBCalendar] = useState(false);
  const [selectedDOB, setSelectedDOB] = useState<Date | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    relationship: "Wife" as RelationshipType,
    dateOfBirth: "",
    gender: "Male" as "Male" | "Female" | "Other",
    phoneNumber: "",
    email: "",
    address: "",
    birthdayReminderEnabled: true,
  });

  useEffect(() => {
    console.log("Family screen loaded, profile:", profile);
    loadFamilyMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadFamilyMembers = async () => {
    if (!profile) {
      console.log("No profile available, skipping family members load");
      return;
    }
    console.log("Loading family members for profile:", profile.id);
    setLoading(true);
    const data = await familyService.getFamilyMembers(profile.id);
    console.log("Loaded family members:", data);
    setMembers(data);
    setLoading(false);
  };

  const openAddModal = () => {
    setEditingMember(null);
    setFormData({
      fullName: "",
      relationship: "Wife",
      dateOfBirth: "",
      gender: "Male",
      phoneNumber: "",
      email: "",
      address: "",
      birthdayReminderEnabled: true,
    });
    setIsModalVisible(true);
  };

  const openEditModal = (member: FamilyMember) => {
    setEditingMember(member);
    setFormData({
      fullName: member.fullName,
      relationship: member.relationship,
      dateOfBirth: formatDateToInput(member.dateOfBirth),
      gender: member.gender,
      phoneNumber: member.phoneNumber,
      email: member.email || "",
      address: member.address || "",
      birthdayReminderEnabled: member.birthdayReminderEnabled,
    });
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!profile) return;

    if (!formData.fullName || !formData.phoneNumber || !formData.dateOfBirth) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      const dateOfBirth = new Date(formData.dateOfBirth);

      if (editingMember) {
        await familyService.editFamilyMember(editingMember.id, {
          ...formData,
          dateOfBirth,
        });
      } else {
        await familyService.addFamilyMember({
          ...formData,
          dateOfBirth,
          profileID: profile.id,
        });
      }

      setIsModalVisible(false);
      loadFamilyMembers();
      Alert.alert(
        "Success",
        `Family member ${editingMember ? "updated" : "added"} successfully!`,
      );
    } catch {
      Alert.alert("Error", "Failed to save family member");
    }
  };

  const handleDelete = (member: FamilyMember) => {
    Alert.alert(
      "Delete Family Member",
      `Are you sure you want to delete ${member.fullName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await familyService.deleteFamilyMember(member.id);
            loadFamilyMembers();
          },
        },
      ],
    );
  };

  const toggleReminder = async (member: FamilyMember) => {
    await familyService.setBirthdayReminder(
      member.id,
      !member.birthdayReminderEnabled,
    );
    loadFamilyMembers();
  };

  const formatDateToInput = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRelationshipEmoji = (relationship: RelationshipType): string => {
    const map: Record<string, string> = {
      Wife: "👰",
      Husband: "🤵",
      Son: "👦",
      Daughter: "👧",
      Father: "👨",
      Mother: "👩",
      Brother: "👦",
      Sister: "👧",
      Grandfather: "👴",
      Grandmother: "👵",
      Other: "👤",
    };
    return map[relationship] || "👤";
  };

  const renderMember = ({ item }: { item: FamilyMember }) => (
    <TouchableOpacity
      style={styles.memberCard}
      onPress={() => openEditModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.memberInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>
            {getRelationshipEmoji(item.relationship)}
          </Text>
        </View>
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>{item.fullName}</Text>
          <Text style={styles.memberRelation}>{item.relationship}</Text>
          <Text style={styles.memberDOB}>
            DOB: {formatDateDisplay(item.dateOfBirth)}
          </Text>
          <Text style={styles.memberPhone}>📞 {item.phoneNumber}</Text>
        </View>
      </View>
      <View style={styles.memberActions}>
        <View style={styles.reminderRow}>
          <Text style={styles.reminderText}>Reminder</Text>
          <Switch
            value={item.birthdayReminderEnabled}
            onValueChange={() => toggleReminder(item)}
            trackColor={{ false: "#D1D5DB", true: "#FFB84D" }}
            thumbColor={item.birthdayReminderEnabled ? "#fff" : "#f4f3f4"}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!profile) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Please create a profile first</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Family",
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading...</Text>
          </View>
        ) : members.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.emptyTitle}>No Family Members Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap &quot;+ Add&quot; to add your first family member
            </Text>
          </View>
        ) : (
          <FlatList
            data={members}
            renderItem={renderMember}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* Add/Edit Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingMember ? "Edit Member" : "Add Family Member"}
              </Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.modalSave}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.fullName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, fullName: text })
                  }
                  placeholder="Emma Brown"
                />
              </View>

              {/* Relationship */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Relationship *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.relationshipRow}>
                    {(
                      [
                        "Wife",
                        "Husband",
                        "Son",
                        "Daughter",
                        "Father",
                        "Mother",
                        "Brother",
                        "Sister",
                        "Other",
                      ] as RelationshipType[]
                    ).map((rel) => (
                      <TouchableOpacity
                        key={rel}
                        style={[
                          styles.relationshipChip,
                          formData.relationship === rel &&
                            styles.relationshipChipActive,
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, relationship: rel })
                        }
                      >
                        <Text
                          style={[
                            styles.relationshipChipText,
                            formData.relationship === rel &&
                              styles.relationshipChipTextActive,
                          ]}
                        >
                          {rel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Date of Birth */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date of Birth *</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDOBCalendar(true)}
                >
                  <Text
                    style={
                      formData.dateOfBirth
                        ? styles.datePickerText
                        : styles.datePickerPlaceholder
                    }
                  >
                    {formData.dateOfBirth || "Select date of birth"}
                  </Text>
                  <Text style={styles.datePickerIcon}>📅</Text>
                </TouchableOpacity>
              </View>

              {/* Gender */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.genderRow}>
                  {(["Male", "Female", "Other"] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderOption,
                        formData.gender === g && styles.genderOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, gender: g })}
                    >
                      <Text
                        style={[
                          styles.genderText,
                          formData.gender === g && styles.genderTextActive,
                        ]}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Phone Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phoneNumber}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phoneNumber: text })
                  }
                  placeholder="555-1234"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) =>
                    setFormData({ ...formData, email: text })
                  }
                  placeholder="email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, address: text })
                  }
                  placeholder="Address"
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Birthday Reminder */}
              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.label}>Birthday Reminder</Text>
                    <Text style={styles.switchDescription}>
                      Get notified on their birthday
                    </Text>
                  </View>
                  <Switch
                    value={formData.birthdayReminderEnabled}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        birthdayReminderEnabled: value,
                      })
                    }
                    trackColor={{ false: "#D1D5DB", true: "#FFB84D" }}
                  />
                </View>
              </View>

              {editingMember && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    setIsModalVisible(false);
                    handleDelete(editingMember);
                  }}
                >
                  <Text style={styles.deleteButtonText}>
                    Delete Family Member
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* DOB Calendar */}
        <Calendar
          visible={showDOBCalendar}
          onClose={() => setShowDOBCalendar(false)}
          onSelectDate={(date) => {
            setSelectedDOB(date);
            setFormData({ ...formData, dateOfBirth: formatDateToInput(date) });
          }}
          selectedDate={
            selectedDOB ||
            (formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date())
          }
          maxDate={new Date()}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
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
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#FFB84D",
    borderRadius: 8,
    marginRight: 8,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
  },
  memberCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFB84D20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  memberRelation: {
    fontSize: 14,
    color: "#FFB84D",
    fontWeight: "600",
    marginBottom: 4,
  },
  memberDOB: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  memberPhone: {
    fontSize: 13,
    color: "#6B7280",
  },
  memberActions: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
  },
  reminderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reminderText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalCancel: {
    fontSize: 16,
    color: "#6B7280",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  modalSave: {
    fontSize: 16,
    color: "#FFB84D",
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
  },
  datePickerText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  datePickerPlaceholder: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  datePickerIcon: {
    fontSize: 20,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1F2937",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  relationshipRow: {
    flexDirection: "row",
    gap: 8,
  },
  relationshipChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  relationshipChipActive: {
    backgroundColor: "#FFB84D",
    borderColor: "#FFB84D",
  },
  relationshipChipText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  relationshipChipTextActive: {
    color: "white",
    fontWeight: "600",
  },
  genderRow: {
    flexDirection: "row",
    gap: 8,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  genderOptionActive: {
    backgroundColor: "#FFB84D20",
    borderColor: "#FFB84D",
  },
  genderText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  genderTextActive: {
    color: "#FFB84D",
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  switchDescription: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 40,
  },
  deleteButtonText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
  },
});

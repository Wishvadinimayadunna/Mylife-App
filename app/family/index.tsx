// ============================================
// Family Module (UX Aligned with To-Do & Utility)
// Add, edit, view family members with birthday reminders
// ============================================

import Calendar from "@/components/ui/calendar";
import { AppCard } from "@/components/ui/AppCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { StatChip } from "@/components/ui/StatChip";
import familyService from "@/services/familyService";
import { useAppStore } from "@/store/appStore";
import { FamilyMember, RelationshipType } from "@/types";
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

type TabType = "all" | "immediate" | "extended";

const RELATIONSHIPS: RelationshipType[] = [
  "Wife",
  "Husband",
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Grandfather",
  "Grandmother",
  "Other"
];

const RELATIONSHIP_EMOJIS: Record<RelationshipType, string> = {
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

export default function FamilyScreen() {
  const { profile } = useAppStore();
  const scrollViewRef = useRef<ScrollView>(null);

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  // Modals Visibility
  const [modalVisible, setModalVisible] = useState(false); // Edit modal
  const [showCalendar, setShowCalendar] = useState(false);
  const [showRelationSelector, setShowRelationSelector] = useState(false);
  const [showGenderSelector, setShowGenderSelector] = useState(false);
  const [selectorTarget, setSelectorTarget] = useState<"composer" | "modal">("composer");

  // Composer States (Quick Add Card)
  const [composerName, setComposerName] = useState("");
  const [composerRelation, setComposerRelation] = useState<RelationshipType>("Wife");
  const [composerDOB, setComposerDOB] = useState<Date | null>(null);
  const [composerGender, setComposerGender] = useState<"Male" | "Female" | "Other">("Female");
  const [composerPhone, setComposerPhone] = useState("");
  const [composerEmail, setComposerEmail] = useState("");
  const [composerAddress, setComposerAddress] = useState("");
  const [composerReminderEnabled, setComposerReminderEnabled] = useState(true);

  // Form State (for detailed Edit Modal)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    relationship: "Wife" as RelationshipType,
    dateOfBirth: new Date(),
    gender: "Female" as "Male" | "Female" | "Other",
    phoneNumber: "",
    email: "",
    address: "",
    birthdayReminderEnabled: true,
  });

  const loadFamilyMembers = async () => {
    setLoading(true);
    try {
      const data = await familyService.getFamilyMembers(profile?.id || "");
      setMembers(data);

      // Filter list based on active tab
      let filtered: FamilyMember[] = [];
      if (activeTab === "all") {
        filtered = data;
      } else if (activeTab === "immediate") {
        filtered = data.filter(m => ["Wife", "Husband", "Son", "Daughter"].includes(m.relationship));
      } else {
        filtered = data.filter(m => ["Father", "Mother", "Brother", "Sister", "Grandfather", "Grandmother"].includes(m.relationship));
      }
      setFilteredMembers(filtered);
    } catch (error) {
      console.error("Load family members error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFamilyMembers();
    }, [profile, activeTab]),
  );

  const resetComposer = () => {
    setComposerName("");
    setComposerRelation("Wife");
    setComposerDOB(null);
    setComposerGender("Female");
    setComposerPhone("");
    setComposerEmail("");
    setComposerAddress("");
    setComposerReminderEnabled(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      relationship: "Wife",
      dateOfBirth: new Date(),
      gender: "Female",
      phoneNumber: "",
      email: "",
      address: "",
      birthdayReminderEnabled: true,
    });
    setEditingMember(null);
  };

  // Handle Quick Add from Composer
  const handleAddMember = async () => {
    if (!composerName || !composerPhone || !composerDOB) {
      Alert.alert("Error", "Please fill in Name, Phone Number, and Date of Birth");
      return;
    }
    if (composerDOB > new Date()) {
      Alert.alert("Error", "Date of birth cannot be in the future");
      return;
    }

    try {
      const memberData = {
        profileID: profile?.id || "",
        fullName: composerName,
        relationship: composerRelation,
        dateOfBirth: composerDOB,
        gender: composerGender,
        phoneNumber: composerPhone,
        email: composerEmail || undefined,
        address: composerAddress || undefined,
        birthdayReminderEnabled: composerReminderEnabled,
      };

      await familyService.addFamilyMember(memberData);
      resetComposer();
      loadFamilyMembers();
      Alert.alert("Success", "Family member added successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add family member");
    }
  };

  // Open Edit modal
  const openEditModal = (member: FamilyMember) => {
    setEditingMember(member);
    setFormData({
      fullName: member.fullName,
      relationship: member.relationship,
      dateOfBirth: new Date(member.dateOfBirth),
      gender: member.gender,
      phoneNumber: member.phoneNumber,
      email: member.email || "",
      address: member.address || "",
      birthdayReminderEnabled: member.birthdayReminderEnabled,
    });
    setModalVisible(true);
  };

  // Save member details from modal
  const saveMember = async () => {
    if (!editingMember) return;

    if (!formData.fullName || !formData.phoneNumber || !formData.dateOfBirth) {
      Alert.alert("Error", "Please enter name, phone number and date of birth fields");
      return;
    }
    if (formData.dateOfBirth > new Date()) {
      Alert.alert("Error", "Date of birth cannot be in the future");
      return;
    }

    try {
      await familyService.editFamilyMember(editingMember.id, formData);
      setModalVisible(false);
      resetForm();
      loadFamilyMembers();
      Alert.alert("Success", "Family member details updated successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save details");
    }
  };

  // Delete family member
  const handleDeleteMember = (member: FamilyMember) => {
    Alert.alert(
      "Delete Family Member",
      `Are you sure you want to delete ${member.fullName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await familyService.deleteFamilyMember(member.id);
            if (success) {
              loadFamilyMembers();
            } else {
              Alert.alert("Error", "Failed to delete family member");
            }
          },
        },
      ]
    );
  };

  // Toggle birthday reminder directly
  const toggleReminder = async (member: FamilyMember) => {
    try {
      const success = await familyService.setBirthdayReminder(
        member.id,
        !member.birthdayReminderEnabled
      );
      if (success) {
        loadFamilyMembers();
      }
    } catch (error) {
      console.error("Toggle reminder error:", error);
    }
  };

  // Computations for Header Card
  const totalCount = members.length;
  const remindersCount = members.filter(m => m.birthdayReminderEnabled).length;
  const completionRate = totalCount > 0 ? (remindersCount / totalCount) * 100 : 0;

  // Birthdays count in the next 30 days
  const upcomingBirthdaysCount = members.filter(m => {
    const dob = new Date(m.dateOfBirth);
    const today = new Date();
    const nextBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    if (nextBday < today) {
      nextBday.setFullYear(today.getFullYear() + 1);
    }
    const diffTime = nextBday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  }).length;

  const getRelationClass = (relationship: RelationshipType) => {
    if (["Wife", "Husband", "Son", "Daughter"].includes(relationship)) {
      return "Immediate Family";
    }
    if (["Father", "Mother", "Brother", "Sister", "Grandfather", "Grandmother"].includes(relationship)) {
      return "Extended Family";
    }
    return "Others";
  };

  const getFilteredAndGroupedMembers = () => {
    const immediate = filteredMembers.filter(m => getRelationClass(m.relationship) === "Immediate Family");
    const extended = filteredMembers.filter(m => getRelationClass(m.relationship) === "Extended Family");
    const others = filteredMembers.filter(m => getRelationClass(m.relationship) === "Others");

    const sections = [];
    if (activeTab === "all" || activeTab === "immediate") {
      if (immediate.length > 0) {
        sections.push({ title: "Immediate Family", data: immediate, bgColor: "#DBEAFE", color: "#2563EB" });
      }
    }
    if (activeTab === "all" || activeTab === "extended") {
      if (extended.length > 0) {
        sections.push({ title: "Extended Family", data: extended, bgColor: "#FEF3C7", color: "#D97706" });
      }
    }
    if (activeTab === "all") {
      if (others.length > 0) {
        sections.push({ title: "Others", data: others, bgColor: "#F3F4F6", color: "#6B7280" });
      }
    }
    return sections;
  };

  const openRelationSelectorModal = (target: "composer" | "modal") => {
    setSelectorTarget(target);
    setShowRelationSelector(true);
  };

  const openGenderSelectorModal = (target: "composer" | "modal") => {
    setSelectorTarget(target);
    setShowGenderSelector(true);
  };

  const openCalendarModal = (target: "composer" | "modal") => {
    setSelectorTarget(target);
    setShowCalendar(true);
  };

  const groupedSections = getFilteredAndGroupedMembers();

  // Render Grouped Section
  const renderGroupSection = (
    title: string,
    data: FamilyMember[],
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
        {data.map(renderMemberCard)}
      </View>
    );
  };

  // Render Single Member Card
  const renderMemberCard = (member: FamilyMember) => {
    const isExpanded = expandedMemberId === member.id;
    const relationClass = getRelationClass(member.relationship);
    
    let leftBarColor = "#8B5CF6"; // Purple for others
    if (relationClass === "Immediate Family") leftBarColor = "#2563EB"; // Blue
    else if (relationClass === "Extended Family") leftBarColor = "#F59E0B"; // Amber

    return (
      <AppCard
        key={member.id}
        stripeColor={leftBarColor}
        style={{ padding: 0, overflow: "hidden", marginBottom: 10 }}
      >
        <View style={styles.cardMain}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setExpandedMemberId(isExpanded ? null : member.id);
            }}
            activeOpacity={0.7}
          >
            {/* Checkbox button (toggles birthday reminders status) */}
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => toggleReminder(member)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={member.birthdayReminderEnabled ? "bell-ring-outline" : "bell-off-outline"}
                size={22}
                color={member.birthdayReminderEnabled ? "#F59E0B" : "#9CA3AF"}
              />
            </TouchableOpacity>

            {/* Member Info */}
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle}>
                {member.fullName}
              </Text>
              
              {/* Meta Row */}
              <View style={styles.taskMeta}>
                <View style={styles.metaRow}>
                  <Text style={styles.categoryIconText}>
                    {RELATIONSHIP_EMOJIS[member.relationship] || "👤"}
                  </Text>
                  <Text style={styles.metaLabelText}>{member.relationship}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="phone" size={12} color="#6B7280" />
                  <Text style={styles.metaLabelText}>{member.phoneNumber}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="cake-variant" size={12} color="#6B7280" />
                  <Text style={styles.metaLabelText}>
                    {new Date(member.dateOfBirth).toLocaleDateString()}
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
                • Gender: {member.gender}{"\n"}
                • Email: {member.email || "No email set"}{"\n"}
                • Address: {member.address || "No address set"}{"\n"}
                • Birthday Reminder: {member.birthdayReminderEnabled ? "Enabled" : "Disabled"}
              </Text>

              {/* Action buttons */}
              <View style={styles.cardActionsContainer}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editActionBtn]}
                  onPress={() => openEditModal(member)}
                >
                  <MaterialCommunityIcons name="pencil" size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteActionBtn]}
                  onPress={() => handleDeleteMember(member)}
                >
                  <MaterialCommunityIcons name="trash-can" size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </AppCard>
    );
  };

  if (!profile) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Please create a profile first</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Family Screen", headerShown: true }} />
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Header productivity card */}
          <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              <View style={styles.greetingSection}>
                <Text style={styles.greetingTitle}>Your Family</Text>
                <Text style={styles.greetingSubtitle}>
                  Manage family profiles and setup birthday reminders
                </Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPercentText}>
                  {Math.round(completionRate)}%
                </Text>
                <Text style={styles.progressSubtext}>Reminders</Text>
              </View>
            </View>

            <View style={styles.statChipsRow}>
              <StatChip
                count={totalCount}
                label="Members"
                type="info"
              />
              <StatChip
                count={remindersCount}
                label="Reminders"
                type="success"
              />
              <StatChip
                count={upcomingBirthdaysCount}
                label="Bdays (30d)"
                type="warning"
              />
            </View>
          </View>

          {/* 2. Segmented tab pills filter */}
          <SegmentedControl
            tabs={[
              { id: "all", label: "All" },
              { id: "immediate", label: "Immediate" },
              { id: "extended", label: "Extended" },
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as TabType)}
            style={{ marginHorizontal: 16, marginBottom: 12 }}
          />

          {/* 3. Inline Composer Card */}
          <View style={styles.composerCard}>
            <View style={styles.composerInputRow}>
              <TextInput
                style={styles.composerInput}
                placeholder="Family member full name..."
                placeholderTextColor="#9CA3AF"
                value={composerName}
                onChangeText={setComposerName}
              />
              <TouchableOpacity
                style={styles.composerSubmitBtn}
                onPress={handleAddMember}
              >
                <MaterialCommunityIcons name="arrow-up" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.composerChipsRow}>
              {/* Relationship Type Chip */}
              <TouchableOpacity
                style={styles.composerChip}
                onPress={() => openRelationSelectorModal("composer")}
              >
                <Text style={styles.composerChipText}>
                  {RELATIONSHIP_EMOJIS[composerRelation] || "👤"} {composerRelation}
                </Text>
              </TouchableOpacity>

              {/* DOB Calendar Picker Chip */}
              <TouchableOpacity
                style={styles.composerChip}
                onPress={() => openCalendarModal("composer")}
              >
                <Text style={styles.composerChipText}>
                  🎂 {composerDOB ? composerDOB.toLocaleDateString() : "Birthdate"}
                </Text>
              </TouchableOpacity>

              {/* Gender selector chip */}
              <TouchableOpacity
                style={styles.composerChip}
                onPress={() => openGenderSelectorModal("composer")}
              >
                <Text style={styles.composerChipText}>
                  👥 {composerGender}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick add details container (just Phone input for Composer) */}
            <View style={{ marginTop: 10 }}>
              <TextInput
                style={styles.compactSubInput}
                placeholder="Phone number... *"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={composerPhone}
                onChangeText={setComposerPhone}
              />
            </View>
          </View>

          {/* 4. Feed Sections */}
          {loading ? (
            <LoadingState />
          ) : filteredMembers.length === 0 ? (
            <EmptyState
              emoji="👨‍👩‍👧‍👦"
              title="No family members found"
              subtitle="Use the composer above to add family members and customize tracking."
            />
          ) : (
            <View style={styles.feedContainer}>
              {groupedSections.map(g => renderGroupSection(g.title, g.data, g.bgColor, g.color))}
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Modal: Edit Family Member details */}
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
                <Text style={styles.modalTitle}>Edit Member Details</Text>
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
                {/* Full Name */}
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Emma Brown"
                  value={formData.fullName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, fullName: text })
                  }
                />

                {/* Phone Number */}
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                  value={formData.phoneNumber}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phoneNumber: text })
                  }
                />

                {/* Relationship Selector */}
                <Text style={styles.label}>Relationship</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => openRelationSelectorModal("modal")}
                >
                  <Text style={styles.inputText}>
                    {RELATIONSHIP_EMOJIS[formData.relationship] || "👤"} {formData.relationship}
                  </Text>
                </TouchableOpacity>

                {/* Gender Selector */}
                <Text style={styles.label}>Gender</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => openGenderSelectorModal("modal")}
                >
                  <Text style={styles.inputText}>
                    {formData.gender}
                  </Text>
                </TouchableOpacity>

                {/* DOB Calendar Picker */}
                <Text style={styles.label}>Date of Birth</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => openCalendarModal("modal")}
                >
                  <Text style={styles.inputText}>
                    🎂 {formData.dateOfBirth.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                {/* Email */}
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(text) =>
                    setFormData({ ...formData, email: text })
                  }
                />

                {/* Address */}
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Address details"
                  multiline
                  numberOfLines={2}
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, address: text })
                  }
                />

                {/* Birthday Reminder Switch */}
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Enable Birthday Reminder</Text>
                  <Switch
                    value={formData.birthdayReminderEnabled}
                    onValueChange={(value) =>
                      setFormData({ ...formData, birthdayReminderEnabled: value })
                    }
                    trackColor={{ false: "#E5E7EB", true: "#2563EB" }}
                  />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={saveMember}>
                  <Text style={styles.saveButtonText}>Update Member Details</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Relationship Type Selector */}
        {showRelationSelector && (
          <Modal
            visible={showRelationSelector}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowRelationSelector(false)}
          >
            <View style={styles.selectorOverlay}>
              <View style={styles.selectorContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>Select Relationship Type</Text>
                  <TouchableOpacity onPress={() => setShowRelationSelector(false)}>
                    <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.selectorBody}>
                  {RELATIONSHIPS.map((rel) => {
                    const currentRel = selectorTarget === "modal" ? formData.relationship : composerRelation;
                    const isActive = currentRel === rel;

                    return (
                      <TouchableOpacity
                        key={rel}
                        style={[
                          styles.selectorOption,
                          isActive && styles.activeSelectorOption,
                        ]}
                        onPress={() => {
                          if (selectorTarget === "modal") {
                            setFormData((prev) => ({ ...prev, relationship: rel }));
                          } else {
                            setComposerRelation(rel);
                          }
                          setShowRelationSelector(false);
                        }}
                      >
                        <Text style={styles.selectorIcon}>
                          {RELATIONSHIP_EMOJIS[rel] || "👤"}
                        </Text>
                        <Text style={styles.selectorText}>{rel}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* Modal: Gender Selector */}
        {showGenderSelector && (
          <Modal
            visible={showGenderSelector}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowGenderSelector(false)}
          >
            <View style={styles.selectorOverlay}>
              <View style={styles.selectorContent}>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>Select Gender</Text>
                  <TouchableOpacity onPress={() => setShowGenderSelector(false)}>
                    <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.selectorBody}>
                  {(["Male", "Female", "Other"] as const).map((gender) => {
                    const currentGender = selectorTarget === "modal" ? formData.gender : composerGender;
                    const isActive = currentGender === gender;

                    return (
                      <TouchableOpacity
                        key={gender}
                        style={[
                          styles.selectorOption,
                          isActive && styles.activeSelectorOption,
                        ]}
                        onPress={() => {
                          if (selectorTarget === "modal") {
                            setFormData((prev) => ({ ...prev, gender }));
                          } else {
                            setComposerGender(gender);
                          }
                          setShowGenderSelector(false);
                        }}
                      >
                        <Text style={styles.selectorIcon}>👥</Text>
                        <Text style={styles.selectorText}>{gender}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Modal: Calendar DOB Select */}
        <Calendar
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
          onSelectDate={(date) => {
            if (selectorTarget === "modal") {
              setFormData((prev) => ({ ...prev, dateOfBirth: date }));
            } else {
              setComposerDOB(date);
            }
            setShowCalendar(false);
          }}
          selectedDate={
            (selectorTarget === "modal" ? formData.dateOfBirth : composerDOB) || new Date()
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
  compactSubInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#1F2937",
    backgroundColor: "#F9FAFB",
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
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
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
});

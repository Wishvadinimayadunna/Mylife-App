// ============================================
// Future Event Module - Event Management
// Add, edit, delete events with reminders and family sharing
// ============================================

import Calendar from "@/components/ui/calendar";
import futureEventService from "@/services/futureEventService";
import { useAppStore } from "@/store/appStore";
import { EventType, FutureEvent, ReminderOption } from "@/types";
import { Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const EVENT_TYPES: EventType[] = [
  "Birthday",
  "Anniversary",
  "Wedding",
  "Party",
  "Vacation",
  "Interview",
  "Meeting",
  "Other",
];

const REMINDER_OPTIONS: { value: ReminderOption; label: string }[] = [
  { value: "1_week_before", label: "1 Week Before" },
  { value: "1_day_before", label: "1 Day Before" },
  { value: "same_day", label: "Same Day" },
];

// Voice Templates for easy event creation
const VOICE_TEMPLATES = [
  {
    id: 1,
    name: "Simple Event",
    template: "I have a [event] on [date] at [time]",
    icon: "📅",
    fields: ["event", "date", "time"],
    example: "meeting, January 25th, 3 PM",
  },
  {
    id: 2,
    name: "Event with Location",
    template: "I have a [event] on [date] at [time] in [location]",
    icon: "📍",
    fields: ["event", "date", "time", "location"],
    example: "wedding, June 15th, 5 PM, Grand Hotel",
  },
  {
    id: 3,
    name: "Birthday/Anniversary",
    template: "It's [person] [type] on [date]",
    icon: "🎂",
    fields: ["person", "type", "date"],
    example: "John's, birthday, March 10th",
  },
  {
    id: 4,
    name: "Detailed Event",
    template:
      "I have a [event] on [date] at [time] for [purpose] in [location]",
    icon: "📋",
    fields: ["event", "date", "time", "purpose", "location"],
    example: "interview, tomorrow, 10 AM, job discussion, Microsoft Office",
  },
];

export default function FutureEventScreen() {
  const { profile } = useAppStore();
  const [events, setEvents] = useState<FutureEvent[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FutureEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDateCalendar, setShowDateCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [filterType, setFilterType] = useState<
    "upcoming" | "all" | "completed"
  >("upcoming");

  // Voice Template feature
  const [showVoiceTemplateModal, setShowVoiceTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [voiceInputs, setVoiceInputs] = useState<string[]>([]);
  const [showVoiceInputModal, setShowVoiceInputModal] = useState(false);
  const [currentVoiceFieldIndex, setCurrentVoiceFieldIndex] =
    useState<number>(0);
  const [currentVoiceFieldName, setCurrentVoiceFieldName] =
    useState<string>("");
  const [tempVoiceInput, setTempVoiceInput] = useState<string>("");
  const [showTemplateCalendar, setShowTemplateCalendar] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const voiceInputRef = useRef<TextInput>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    type: "Other" as EventType,
    eventDate: "",
    eventTime: "",
    location: "",
    notes: "",
    reminderOptions: [] as ReminderOption[],
    sendReminderToSpouse: false,
    isShared: false,
    isRecurringYearly: false,
  });

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadEvents = async () => {
    if (!profile) return;
    setLoading(true);
    const data = await futureEventService.getFutureEvents();
    console.log("📅 Loaded events:", data.length);
    data.forEach((event, index) => {
      console.log(`Event ${index + 1}:`, {
        title: event.title,
        date: event.eventDate,
        completed: !!event.completedAt,
      });
    });
    setEvents(data);
    setLoading(false);
  };

  // Voice Template Processing
  const handleVoiceTemplateSelect = (templateId: number) => {
    setSelectedTemplate(templateId);
    const template = VOICE_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setVoiceInputs(new Array(template.fields.length).fill(""));
    }
  };

  const handleVoiceInput = (index: number, value: string) => {
    const newInputs = [...voiceInputs];
    newInputs[index] = value;
    setVoiceInputs(newInputs);
  };

  const openVoiceInputModal = (index: number, fieldName: string) => {
    setCurrentVoiceFieldIndex(index);
    setCurrentVoiceFieldName(fieldName);
    setTempVoiceInput(voiceInputs[index] || "");
    setShowVoiceInputModal(true);
    // Auto-focus the input after modal opens
    setTimeout(() => {
      voiceInputRef.current?.focus();
    }, 300);
  };

  const startVoiceRecognition = () => {
    setIsListening(true);
    // Focus the input to activate the keyboard with microphone
    voiceInputRef.current?.focus();

    // Show instructions for using device's voice recognition
    Alert.alert(
      "🎤 Voice Recognition Ready",
      Platform.select({
        ios: "Tap the microphone button on your keyboard to start speaking.",
        android:
          "Tap the microphone icon on your keyboard to speak, or use Google Voice Typing.",
        default: "Use your keyboard's microphone button to dictate text.",
      }),
      [
        {
          text: "Got it",
          onPress: () => setIsListening(false),
        },
      ],
    );
  };

  const saveVoiceInput = () => {
    handleVoiceInput(currentVoiceFieldIndex, tempVoiceInput);
    setShowVoiceInputModal(false);
    setTempVoiceInput("");
  };

  const handleTemplateCalendarSelect = (date: Date) => {
    // Format date to a readable string for voice input
    const dateString = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    setTempVoiceInput(dateString);
    setShowTemplateCalendar(false);
  };

  const suggestCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    setTempVoiceInput(`${displayHours}:${displayMinutes} ${ampm}`);
  };

  const suggestToday = () => {
    const today = new Date();
    const month = today.toLocaleString("default", { month: "long" });
    const day = today.getDate();
    const year = today.getFullYear();
    setTempVoiceInput(`${month} ${day}, ${year}`);
  };

  const suggestTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const month = tomorrow.toLocaleString("default", { month: "long" });
    const day = tomorrow.getDate();
    const year = tomorrow.getFullYear();
    setTempVoiceInput(`${month} ${day}, ${year}`);
  };

  const processVoiceTemplate = async () => {
    if (!profile || selectedTemplate === null) return;

    const template = VOICE_TEMPLATES.find((t) => t.id === selectedTemplate);
    if (!template) return;

    // Check if all fields are filled
    if (voiceInputs.some((input) => !input.trim())) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      // Parse the inputs based on template type
      let eventData: any = {
        isShared: false,
        sendReminderToSpouse: false,
        reminderOptions: ["1_day_before"],
        isRecurringYearly: false,
      };

      if (template.id === 1) {
        // Simple Event
        eventData.title = voiceInputs[0];
        eventData.type = detectEventType(voiceInputs[0]);
        const parsedDate = parseNaturalDate(voiceInputs[1]);
        eventData.eventDate = parsedDate;
        eventData.eventTime = voiceInputs[2] || "10:00 AM";
      } else if (template.id === 2) {
        // Event with Location
        eventData.title = voiceInputs[0];
        eventData.type = detectEventType(voiceInputs[0]);
        const parsedDate = parseNaturalDate(voiceInputs[1]);
        eventData.eventDate = parsedDate;
        eventData.eventTime = voiceInputs[2] || "10:00 AM";
        eventData.location = voiceInputs[3];
      } else if (template.id === 3) {
        // Birthday/Anniversary
        eventData.title = `${voiceInputs[0]} ${voiceInputs[1]}`;
        eventData.type = voiceInputs[1].toLowerCase().includes("birthday")
          ? "Birthday"
          : "Anniversary";
        const parsedDate = parseNaturalDate(voiceInputs[2]);
        eventData.eventDate = parsedDate;
        eventData.eventTime = "12:00 PM";
        eventData.isRecurringYearly = true;
      } else if (template.id === 4) {
        // Detailed Event
        eventData.title = voiceInputs[0];
        eventData.type = detectEventType(voiceInputs[0]);
        const parsedDate = parseNaturalDate(voiceInputs[1]);
        eventData.eventDate = parsedDate;
        eventData.eventTime = voiceInputs[2] || "10:00 AM";
        eventData.notes = voiceInputs[3];
        eventData.location = voiceInputs[4];
      }

      await futureEventService.addEvent(eventData);

      setShowVoiceTemplateModal(false);
      setSelectedTemplate(null);
      setVoiceInputs([]);
      loadEvents();
      Alert.alert("Success", "Event created from voice template!");
    } catch (error) {
      console.error("Voice template error:", error);
      Alert.alert("Error", "Failed to create event");
    }
  };

  const detectEventType = (eventName: string): EventType => {
    const name = eventName.toLowerCase();
    if (name.includes("birthday")) return "Birthday";
    if (name.includes("anniversary")) return "Anniversary";
    if (name.includes("wedding")) return "Wedding";
    if (name.includes("party")) return "Party";
    if (name.includes("vacation") || name.includes("trip")) return "Vacation";
    if (name.includes("interview")) return "Interview";
    if (name.includes("meeting")) return "Meeting";
    return "Other";
  };

  const parseNaturalDate = (dateStr: string): Date => {
    const str = dateStr.toLowerCase().trim();
    const today = new Date();

    // Handle relative dates
    if (str === "today") return today;
    if (str === "tomorrow") {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow;
    }
    if (str.includes("next week")) {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return nextWeek;
    }

    // Try to parse date formats like "June 15th", "15 June", "15/6"
    try {
      // Simple parsing - in production use a proper date library
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
    } catch (e) {
      // Fallback to tomorrow if parsing fails
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow;
    }

    return today;
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setFormData({
      title: "",
      type: "Other",
      eventDate: "",
      eventTime: "",
      location: "",
      notes: "",
      reminderOptions: [],
      sendReminderToSpouse: false,
      isShared: false,
      isRecurringYearly: false,
    });
    setIsModalVisible(true);
  };

  const openEditModal = (event: FutureEvent) => {
    setEditingEvent(event);
    // Parse the date string properly to avoid timezone issues
    const dateStr =
      typeof event.eventDate === "string"
        ? event.eventDate.split("T")[0] // Get just the date part (YYYY-MM-DD)
        : formatDateToInput(event.eventDate);

    setFormData({
      title: event.title,
      type: event.type,
      eventDate: dateStr,
      eventTime: event.eventTime,
      location: event.location || "",
      notes: event.notes || "",
      reminderOptions: event.reminderOptions,
      sendReminderToSpouse: event.sendReminderToSpouse,
      isShared: event.isShared,
      isRecurringYearly: event.isRecurringYearly,
    });
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!profile) return;

    if (!formData.title || !formData.eventDate || !formData.eventTime) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    // Validate date
    const eventDate = new Date(formData.eventDate);
    if (isNaN(eventDate.getTime())) {
      Alert.alert("Error", "Invalid date format");
      return;
    }

    try {
      if (editingEvent) {
        await futureEventService.editEvent(editingEvent.id, {
          title: formData.title,
          type: formData.type,
          eventDate: eventDate,
          eventTime: formData.eventTime,
          location: formData.location || undefined,
          notes: formData.notes || undefined,
          reminderOptions: formData.reminderOptions,
          sendReminderToSpouse: formData.sendReminderToSpouse,
          isShared: formData.isShared,
          isRecurringYearly: formData.isRecurringYearly,
        });
        Alert.alert("Success", "Event updated successfully!");
      } else {
        console.log("📝 Creating event with data:", {
          title: formData.title,
          type: formData.type,
          eventDate: eventDate.toISOString(),
          eventTime: formData.eventTime,
        });

        await futureEventService.addEvent({
          title: formData.title,
          type: formData.type,
          eventDate: eventDate,
          eventTime: formData.eventTime,
          location: formData.location || undefined,
          notes: formData.notes || undefined,
          reminderOptions: formData.reminderOptions,
          sendReminderToSpouse: formData.sendReminderToSpouse,
          isShared: formData.isShared,
          isRecurringYearly: formData.isRecurringYearly,
        });
        Alert.alert("Success", "Event added successfully!");
      }

      setIsModalVisible(false);
      loadEvents();
    } catch (error: any) {
      console.error("Save event error:", error);
      const errorMsg =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to save event";
      Alert.alert("Error", errorMsg);
    }
  };

  const handleDelete = async (eventId: string) => {
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await futureEventService.deleteEvent(eventId);
          loadEvents();
        },
      },
    ]);
  };

  const handleMarkCompleted = async (eventId: string) => {
    await futureEventService.markEventCompleted(eventId);
    loadEvents();
  };

  const handleToggleShare = async (eventId: string, currentStatus: boolean) => {
    await futureEventService.shareEventWithFamily(eventId, !currentStatus);
    loadEvents();
  };

  const toggleReminderOption = (option: ReminderOption) => {
    const current = formData.reminderOptions;
    if (current.includes(option)) {
      setFormData({
        ...formData,
        reminderOptions: current.filter((o) => o !== option),
      });
    } else {
      setFormData({
        ...formData,
        reminderOptions: [...current, option],
      });
    }
  };

  const formatDateToInput = (date: Date): string => {
    const d = new Date(date);
    // Use local date to avoid timezone issues
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDate = (date: Date | string | undefined) => {
    console.log("📅 formatDate called with:", {
      date,
      type: typeof date,
      value: JSON.stringify(date),
    });

    if (!date) {
      console.log("❌ Date is null/undefined");
      return "";
    }

    try {
      // Simply create a Date object - JavaScript handles ISO strings automatically
      const d = new Date(date);

      console.log("🔵 Parsed date object:", d, "Time:", d.getTime());

      // Check if date is valid
      if (isNaN(d.getTime())) {
        console.error("❌ Invalid date after parsing:", date);
        return "Invalid Date";
      }

      const formatted = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      console.log("✅ Formatted date:", formatted);
      return formatted;
    } catch (error) {
      console.error("❌ Error formatting date:", date, error);
      return "Invalid Date";
    }
  };

  const getDaysUntil = (eventDate: Date | string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // JavaScript Date constructor handles ISO strings automatically
      const event = new Date(eventDate);

      // Check if date is valid
      if (isNaN(event.getTime())) {
        console.error("Invalid event date:", eventDate);
        return -999; // Return very negative to show as past
      }

      event.setHours(0, 0, 0, 0);
      const diff = event.getTime() - today.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error("Error calculating days until:", eventDate, error);
      return -999;
    }
  };

  // Time presets for quick selection
  const TIME_PRESETS = [
    { label: "Morning (9:00 AM)", value: "9:00 AM" },
    { label: "Noon (12:00 PM)", value: "12:00 PM" },
    { label: "Afternoon (2:00 PM)", value: "2:00 PM" },
    { label: "Evening (6:00 PM)", value: "6:00 PM" },
    { label: "Night (8:00 PM)", value: "8:00 PM" },
  ];

  const handleTimeSelect = (time: string) => {
    setFormData({ ...formData, eventTime: time });
    setShowTimePicker(false);
  };

  // Normalize birthday/anniversary dates to current or next occurrence
  const normalizeBirthdayDate = (selectedDate: Date): Date => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time for accurate comparison

    const currentYear = now.getFullYear();
    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(0, 0, 0, 0); // Reset time
    normalizedDate.setFullYear(currentYear);

    // If the date has passed this year, use next year
    if (normalizedDate < now) {
      normalizedDate.setFullYear(currentYear + 1);
    }

    return normalizedDate;
  };

  const handleDateSelect = (date: Date) => {
    let finalDate = date;

    // For birthdays/anniversaries with recurring yearly, normalize to current/next year
    if (
      (formData.type === "Birthday" || formData.type === "Anniversary") &&
      formData.isRecurringYearly
    ) {
      finalDate = normalizeBirthdayDate(date);
    }

    setFormData({ ...formData, eventDate: formatDateToInput(finalDate) });
    setShowDateCalendar(false);
  };

  const getFilteredEvents = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    console.log("🔍 Filtering events. Today:", now.toDateString());
    console.log("📦 Total events:", events.length);

    switch (filterType) {
      case "upcoming":
        const upcomingEvents = events.filter((event) => {
          try {
            const eventDate = new Date(event.eventDate);

            // Check if date is valid
            if (isNaN(eventDate.getTime())) {
              console.error(
                "❌ Invalid date for event:",
                event.title,
                event.eventDate,
              );
              return false;
            }

            eventDate.setHours(0, 0, 0, 0);
            const isUpcoming = eventDate >= now && !event.completedAt;

            console.log(
              `  ${event.title}: ${event.eventDate} → ${eventDate.toDateString()} → ${isUpcoming ? "✅ UPCOMING" : "❌ Not upcoming (completed=" + !!event.completedAt + ")"}`,
            );
            return isUpcoming;
          } catch (error) {
            console.error("❌ Error processing event:", event.title, error);
            return false;
          }
        });
        console.log(`📊 Found ${upcomingEvents.length} upcoming events`);
        return upcomingEvents;
      case "completed":
        return events.filter((event) => event.completedAt);
      default:
        return events;
    }
  };

  const getUpcomingCount = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return events.filter((event) => {
      try {
        const eventDate = new Date(event.eventDate);
        if (isNaN(eventDate.getTime())) return false;
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= now && !event.completedAt;
      } catch (error) {
        return false;
      }
    }).length;
  };

  const getCompletedCount = () => {
    return events.filter((event) => event.completedAt).length;
  };

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case "Birthday":
        return "🎂";
      case "Anniversary":
        return "💍";
      case "Wedding":
        return "💒";
      case "Party":
        return "🎉";
      case "Vacation":
        return "✈️";
      case "Interview":
        return "💼";
      case "Meeting":
        return "👥";
      default:
        return "📅";
    }
  };

  const getEventColor = (type: EventType) => {
    switch (type) {
      case "Birthday":
        return "#F59E0B";
      case "Anniversary":
        return "#EC4899";
      case "Wedding":
        return "#8B5CF6";
      case "Party":
        return "#10B981";
      case "Vacation":
        return "#3B82F6";
      case "Interview":
        return "#EF4444";
      case "Meeting":
        return "#6366F1";
      default:
        return "#6B7280";
    }
  };

  const renderEvent = ({ item }: { item: FutureEvent }) => {
    console.log("🎨 Rendering event:", {
      title: item.title,
      eventDate: item.eventDate,
      type: typeof item.eventDate,
      completedAt: item.completedAt,
    });

    const daysUntil = getDaysUntil(item.eventDate);
    const isUpcoming = daysUntil >= 0 && !item.completedAt;
    const isPast = daysUntil < 0 && !item.completedAt;

    return (
      <View
        style={[
          styles.eventCard,
          item.completedAt && styles.eventCompleted,
          isPast && styles.eventPast,
          { borderLeftColor: getEventColor(item.type), borderLeftWidth: 4 },
        ]}
      >
        <View style={styles.eventHeader}>
          <View style={styles.eventTitleRow}>
            <Text style={styles.eventIcon}>{getEventIcon(item.type)}</Text>
            <View style={styles.eventInfo}>
              <Text
                style={[
                  styles.eventTitle,
                  item.completedAt && styles.eventTitleCompleted,
                ]}
              >
                {item.title}
              </Text>
              <Text style={styles.eventType}>{item.type}</Text>
            </View>
          </View>
          {isUpcoming && (
            <View
              style={[
                styles.countdownBadge,
                { backgroundColor: getEventColor(item.type) },
              ]}
            >
              <Text style={styles.countdownText}>
                {daysUntil === 0 ? "Today" : `${daysUntil}d`}
              </Text>
            </View>
          )}
          {isPast && (
            <View
              style={[styles.countdownBadge, { backgroundColor: "#EF4444" }]}
            >
              <Text style={styles.countdownText}>⚠️ Past</Text>
            </View>
          )}
        </View>

        <View style={styles.eventDetails}>
          <Text style={styles.eventDate}>
            📅{" "}
            {typeof item.eventDate === "object" && item.eventDate !== null
              ? JSON.stringify(item.eventDate)
              : formatDate(item.eventDate)}
          </Text>
          <Text style={styles.eventTime}>⏰ {item.eventTime}</Text>
          {item.location && (
            <Text style={styles.eventLocation}>📍 {item.location}</Text>
          )}
        </View>

        {item.notes && <Text style={styles.eventNotes}>{item.notes}</Text>}

        <View style={styles.eventTags}>
          {item.isRecurringYearly && (
            <View style={[styles.tag, styles.recurringTag]}>
              <Text style={styles.tagText}>🔁 Yearly</Text>
            </View>
          )}
          {item.isShared && (
            <View style={[styles.tag, styles.sharedTag]}>
              <Text style={styles.tagText}>👨‍👩‍👧 Shared</Text>
            </View>
          )}
          {item.sendReminderToSpouse && (
            <View style={[styles.tag, styles.spouseTag]}>
              <Text style={styles.tagText}>💕 Spouse</Text>
            </View>
          )}
          {item.reminderOptions.length > 0 && (
            <View style={[styles.tag, styles.reminderTag]}>
              <Text style={styles.tagText}>
                🔔 {item.reminderOptions.length} Reminders
              </Text>
            </View>
          )}
        </View>

        <View style={styles.eventActions}>
          {!item.completedAt && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleMarkCompleted(item.id)}
            >
              <Text style={styles.actionButtonText}>✓ Complete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleToggleShare(item.id, item.isShared)}
          >
            <Text style={styles.actionButtonText}>
              {item.isShared ? "🔗" : "🔓"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Text style={styles.actionButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item.id)}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Future Events", headerShown: true }} />
      <View style={styles.container}>
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filterType === "upcoming" && styles.filterTabActive,
            ]}
            onPress={() => setFilterType("upcoming")}
          >
            <Text
              style={[
                styles.filterText,
                filterType === "upcoming" && styles.filterTextActive,
              ]}
            >
              🔜 Upcoming ({getUpcomingCount()})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filterType === "all" && styles.filterTabActive,
            ]}
            onPress={() => setFilterType("all")}
          >
            <Text
              style={[
                styles.filterText,
                filterType === "all" && styles.filterTextActive,
              ]}
            >
              📋 All ({events.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filterType === "completed" && styles.filterTabActive,
            ]}
            onPress={() => setFilterType("completed")}
          >
            <Text
              style={[
                styles.filterText,
                filterType === "completed" && styles.filterTextActive,
              ]}
            >
              ✅ Done ({getCompletedCount()})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Events List */}
        <FlatList
          data={getFilteredEvents().sort(
            (a, b) =>
              new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
          )}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No events yet</Text>
              <Text style={styles.emptySubtext}>
                Use voice templates to add events quickly
              </Text>
            </View>
          }
        />

        {/* Quick Action Buttons */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={() => setShowVoiceTemplateModal(true)}
          >
            <Text style={styles.voiceButtonIcon}>🎤</Text>
            <Text style={styles.voiceButtonText}>Voice Templates</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.regularButton} onPress={openAddModal}>
            <Text style={styles.regularButtonText}>+ Manual Add</Text>
          </TouchableOpacity>
        </View>

        {/* Add/Edit Modal */}
        <Modal visible={isModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>
                  {editingEvent ? "Edit Event" : "Add Future Event"}
                </Text>

                <Text style={styles.label}>Event Title *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(text) =>
                    setFormData({ ...formData, title: text })
                  }
                  placeholder="e.g., John's Birthday"
                />

                <Text style={styles.label}>Event Type</Text>
                <View style={styles.buttonGroup}>
                  {EVENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        formData.type === type && styles.optionButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, type })}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          formData.type === type && styles.optionTextActive,
                        ]}
                      >
                        {getEventIcon(type)} {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Event Date *</Text>
                {(formData.type === "Birthday" ||
                  formData.type === "Anniversary") &&
                  formData.isRecurringYearly && (
                    <Text style={styles.helpText}>
                      💡 For recurring events, select the birth date. The year
                      will auto-adjust to the upcoming occurrence.
                    </Text>
                  )}
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowDateCalendar(true)}
                >
                  <Text
                    style={
                      formData.eventDate ? styles.dateText : styles.placeholder
                    }
                  >
                    {formData.eventDate
                      ? formatDate(new Date(formData.eventDate))
                      : "Tap to select date"}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.label}>Event Time *</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text
                    style={
                      formData.eventTime ? styles.dateText : styles.placeholder
                    }
                  >
                    {formData.eventTime || "Tap to select time"}
                  </Text>
                </TouchableOpacity>
                <View style={styles.timePresetsRow}>
                  {TIME_PRESETS.slice(0, 3).map((preset) => (
                    <TouchableOpacity
                      key={preset.value}
                      style={styles.timePresetButton}
                      onPress={() => handleTimeSelect(preset.value)}
                    >
                      <Text style={styles.timePresetText}>{preset.value}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Location (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.location}
                  onChangeText={(text) =>
                    setFormData({ ...formData, location: text })
                  }
                  placeholder="e.g., Central Park"
                />

                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) =>
                    setFormData({ ...formData, notes: text })
                  }
                  placeholder="Additional details..."
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.label}>Reminder Options</Text>
                <View style={styles.checkboxGroup}>
                  {REMINDER_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={styles.checkboxRow}
                      onPress={() => toggleReminderOption(option.value)}
                    >
                      <View style={styles.checkbox}>
                        {formData.reminderOptions.includes(option.value) && (
                          <View style={styles.checkboxChecked} />
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.label}>Send Reminder to Spouse</Text>
                  <Switch
                    value={formData.sendReminderToSpouse}
                    onValueChange={(value) =>
                      setFormData({ ...formData, sendReminderToSpouse: value })
                    }
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.label}>Share with Family</Text>
                  <Switch
                    value={formData.isShared}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isShared: value })
                    }
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.label}>Recurring Yearly</Text>
                  <Switch
                    value={formData.isRecurringYearly}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isRecurringYearly: value })
                    }
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonCancel]}
                    onPress={() => setIsModalVisible(false)}
                  >
                    <Text style={styles.buttonCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSave]}
                    onPress={handleSave}
                  >
                    <Text style={styles.buttonSaveText}>
                      {editingEvent ? "Update" : "Add Event"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Voice Template Modal */}
        <Modal
          visible={showVoiceTemplateModal}
          animationType="slide"
          transparent
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedTemplate === null ? (
                // Template Selection Screen
                <ScrollView>
                  <Text style={styles.modalTitle}>🎤 Voice Templates</Text>
                  <Text style={styles.modalSubtitle}>
                    Choose a template and fill in the blanks with voice
                  </Text>

                  {VOICE_TEMPLATES.map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      style={styles.templateCard}
                      onPress={() => handleVoiceTemplateSelect(template.id)}
                    >
                      <Text style={styles.templateIcon}>{template.icon}</Text>
                      <View style={styles.templateInfo}>
                        <Text style={styles.templateName}>{template.name}</Text>
                        <Text style={styles.templateText}>
                          {template.template}
                        </Text>
                        <Text style={styles.templateExample}>
                          Example: {template.example}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.buttonCancel,
                      { marginTop: 16 },
                    ]}
                    onPress={() => setShowVoiceTemplateModal(false)}
                  >
                    <Text style={styles.buttonCancelText}>Close</Text>
                  </TouchableOpacity>
                </ScrollView>
              ) : (
                // Voice Input Screen
                <ScrollView>
                  <Text style={styles.modalTitle}>
                    {
                      VOICE_TEMPLATES.find((t) => t.id === selectedTemplate)
                        ?.icon
                    }{" "}
                    Fill in the Blanks
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {
                      VOICE_TEMPLATES.find((t) => t.id === selectedTemplate)
                        ?.template
                    }
                  </Text>

                  {VOICE_TEMPLATES.find(
                    (t) => t.id === selectedTemplate,
                  )?.fields.map((field, index) => (
                    <View key={index} style={{ marginBottom: 16 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text style={styles.label}>
                          {field.charAt(0).toUpperCase() + field.slice(1)} *
                        </Text>
                        <TouchableOpacity
                          style={{
                            backgroundColor: "#A78BFA",
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 6,
                          }}
                          onPress={() => openVoiceInputModal(index, field)}
                        >
                          <Text
                            style={{
                              color: "#FFF",
                              fontSize: 12,
                              fontWeight: "600",
                            }}
                          >
                            🎤 Voice
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.input}
                        value={voiceInputs[index]}
                        onChangeText={(text) => handleVoiceInput(index, text)}
                        placeholder={
                          field === "date"
                            ? "e.g., today, tomorrow, June 15"
                            : `Enter ${field}...`
                        }
                        placeholderTextColor="#999"
                      />
                      {field === "date" && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#6B7280",
                            marginTop: 4,
                          }}
                        >
                          💡 Try: today, tomorrow, next week, June 15th,
                          15/6/2026
                        </Text>
                      )}
                      {field === "time" && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#6B7280",
                            marginTop: 4,
                          }}
                        >
                          💡 Try: 10:00 AM, 2:30 PM, 6pm
                        </Text>
                      )}
                    </View>
                  ))}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonCancel]}
                      onPress={() => {
                        setSelectedTemplate(null);
                        setVoiceInputs([]);
                      }}
                    >
                      <Text style={styles.buttonCancelText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonSave]}
                      onPress={processVoiceTemplate}
                    >
                      <Text style={styles.buttonSaveText}>Create Event</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Voice Input Modal with Date/Time Pickers */}
        <Modal
          visible={showVoiceInputModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowVoiceInputModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: "80%" }]}>
              <Text style={styles.modalTitle}>🎤 Voice Input</Text>
              <Text style={styles.label}>
                {currentVoiceFieldName.charAt(0).toUpperCase() +
                  currentVoiceFieldName.slice(1)}
              </Text>

              {/* Voice Recognition Button */}
              <TouchableOpacity
                style={[
                  styles.voiceRecordButton,
                  isListening && styles.voiceRecordButtonActive,
                ]}
                onPress={startVoiceRecognition}
              >
                <Text style={styles.voiceRecordIcon}>
                  {isListening ? "🔴" : "🎤"}
                </Text>
                <Text style={styles.voiceRecordText}>
                  {isListening ? "Listening..." : "Tap to Speak"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.orDivider}>OR</Text>

              <TextInput
                ref={voiceInputRef}
                style={[styles.input, { fontSize: 16 }]}
                value={tempVoiceInput}
                onChangeText={setTempVoiceInput}
                placeholder={`Type here...`}
                placeholderTextColor="#999"
                multiline={
                  currentVoiceFieldName === "purpose" ||
                  currentVoiceFieldName === "notes"
                }
              />

              {/* Quick Actions for Date */}
              {currentVoiceFieldName === "date" && (
                <View style={{ marginTop: 12 }}>
                  <Text
                    style={[styles.label, { fontSize: 12, marginBottom: 8 }]}
                  >
                    Quick Date Selection:
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={suggestToday}
                    >
                      <Text style={styles.quickActionText}>📅 Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={suggestTomorrow}
                    >
                      <Text style={styles.quickActionText}>📅 Tomorrow</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={() => setShowTemplateCalendar(true)}
                    >
                      <Text style={styles.quickActionText}>📆 Calendar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Quick Actions for Time */}
              {currentVoiceFieldName === "time" && (
                <View style={{ marginTop: 12 }}>
                  <Text
                    style={[styles.label, { fontSize: 12, marginBottom: 8 }]}
                  >
                    Quick Time Selection:
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={suggestCurrentTime}
                    >
                      <Text style={styles.quickActionText}>⏰ Now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={() => setTempVoiceInput("9:00 AM")}
                    >
                      <Text style={styles.quickActionText}>🌅 9:00 AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={() => setTempVoiceInput("12:00 PM")}
                    >
                      <Text style={styles.quickActionText}>🌞 12:00 PM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={() => setTempVoiceInput("3:00 PM")}
                    >
                      <Text style={styles.quickActionText}>☕ 3:00 PM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={() => setTempVoiceInput("6:00 PM")}
                    >
                      <Text style={styles.quickActionText}>🌆 6:00 PM</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={[styles.modalButtons, { marginTop: 20 }]}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonCancel]}
                  onPress={() => {
                    setShowVoiceInputModal(false);
                    setTempVoiceInput("");
                  }}
                >
                  <Text style={styles.buttonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSave]}
                  onPress={saveVoiceInput}
                >
                  <Text style={styles.buttonSaveText}>Use This</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Calendar Modal for Template Date Selection */}
        {showTemplateCalendar && (
          <Modal
            visible={showTemplateCalendar}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowTemplateCalendar(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>📆 Select Date</Text>
                <Calendar
                  visible={true}
                  onClose={() => setShowTemplateCalendar(false)}
                  onSelectDate={handleTemplateCalendarSelect}
                  selectedDate={undefined}
                  minDate={new Date()} // Only allow today and future dates
                />
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.buttonCancel,
                    { marginTop: 16 },
                  ]}
                  onPress={() => setShowTemplateCalendar(false)}
                >
                  <Text style={styles.buttonCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Date Calendar Modal */}
        <Calendar
          visible={showDateCalendar}
          onClose={() => setShowDateCalendar(false)}
          onSelectDate={handleDateSelect}
          selectedDate={
            formData.eventDate ? new Date(formData.eventDate) : undefined
          }
          minDate={new Date()} // Only allow today and future dates
        />

        {/* Time Picker Modal */}
        <Modal visible={showTimePicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.timePickerModal}>
              <Text style={styles.modalTitle}>Select Time</Text>

              <Text style={styles.sectionLabel}>Quick Select</Text>
              <View style={styles.timePresetsList}>
                {TIME_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.value}
                    style={[
                      styles.timePresetOption,
                      formData.eventTime === preset.value &&
                        styles.timePresetOptionActive,
                    ]}
                    onPress={() => handleTimeSelect(preset.value)}
                  >
                    <Text
                      style={[
                        styles.timePresetOptionText,
                        formData.eventTime === preset.value &&
                          styles.timePresetOptionTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Or Enter Custom Time</Text>
              <TextInput
                style={styles.input}
                value={formData.eventTime}
                onChangeText={(text) =>
                  setFormData({ ...formData, eventTime: text })
                }
                placeholder="e.g., 3:30 PM or 15:30"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.helpText}>
                Format: 9:00 AM, 2:30 PM, or 24-hour (14:00)
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonCancel]}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.buttonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSave]}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.buttonSaveText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  filterContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: "#60A5FA",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  listContainer: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventCompleted: {
    opacity: 0.6,
    backgroundColor: "#F9FAFB",
  },
  eventPast: {
    borderWidth: 2,
    borderColor: "#FEF3C7",
    backgroundColor: "#FFFBEB",
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  eventTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  eventIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  eventTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  eventType: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  countdownBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  eventDetails: {
    marginBottom: 12,
  },
  eventDate: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
    fontWeight: "500",
  },
  eventTime: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
    fontWeight: "500",
  },
  eventLocation: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  eventNotes: {
    fontSize: 14,
    color: "#6B7280",
    fontStyle: "italic",
    marginBottom: 12,
  },
  eventTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  recurringTag: {
    backgroundColor: "#FBBF24",
  },
  sharedTag: {
    backgroundColor: "#34D399",
  },
  spouseTag: {
    backgroundColor: "#F472B6",
  },
  reminderTag: {
    backgroundColor: "#818CF8",
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  eventActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionButton: {
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
  },
  completeButton: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  addButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#60A5FA",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  placeholder: {
    color: "#9CA3AF",
    fontSize: 16,
  },
  dateText: {
    color: "#1F2937",
    fontSize: 16,
  },
  buttonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionButtonActive: {
    backgroundColor: "#60A5FA",
    borderColor: "#60A5FA",
  },
  optionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  optionTextActive: {
    color: "#FFFFFF",
  },
  checkboxGroup: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#60A5FA",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: "#60A5FA",
  },
  checkboxLabel: {
    fontSize: 15,
    color: "#374151",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonCancel: {
    backgroundColor: "#F3F4F6",
  },
  buttonSave: {
    backgroundColor: "#60A5FA",
  },
  buttonCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  buttonSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  quickActionsContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  voiceButton: {
    flex: 2,
    backgroundColor: "#8B5CF6",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voiceButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  voiceButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  regularButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  regularButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    textAlign: "center",
  },
  templateCard: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  templateIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  templateText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
    fontStyle: "italic",
  },
  templateExample: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  quickActionButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quickActionText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  voiceRecordButton: {
    backgroundColor: "#8B5CF6",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    flexDirection: "row",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  voiceRecordButtonActive: {
    backgroundColor: "#EF4444",
  },
  voiceRecordIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  voiceRecordText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  orDivider: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
    marginVertical: 8,
  },
  helpText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    marginTop: -4,
    fontStyle: "italic",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginTop: 16,
    marginBottom: 12,
  },
  timePickerModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  timePresetsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  timePresetButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  timePresetText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  timePresetsList: {
    gap: 12,
  },
  timePresetOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  timePresetOptionActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#60A5FA",
  },
  timePresetOptionText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "600",
  },
  timePresetOptionTextActive: {
    color: "#2563EB",
  },
});

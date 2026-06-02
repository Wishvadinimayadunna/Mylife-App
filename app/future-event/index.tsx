// ============================================
// Future Event Module - Event Management
// Redesigned with ToDo theme, permanent action cards,
// live preview parser, segmented filters, and expandable items.
// ============================================

import Calendar from "@/components/ui/calendar";
import futureEventService from "@/services/futureEventService";
import { useAppStore } from "@/store/appStore";
import { EventType, FutureEvent, ReminderOption } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  NativeModules,
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



const TRIGGER_KEYWORDS: Record<EventType, string[]> = {
  Birthday: ["birthday", "birth day", "bday", "b-day"],
  Anniversary: ["anniversary", "wedding anniversary"],
  Wedding: ["wedding", "marriage", "matrimony"],
  Party: ["party", "celebration", "gathering", "dinner", "lunch", "get-together"],
  Vacation: ["vacation", "trip", "flight", "travel", "holiday", "tour"],
  Interview: ["interview", "job talk", "assessment"],
  Meeting: ["meeting", "sync", "standup", "discussion", "call", "appointment"],
  Other: [],
};

const EVENT_COLORS: Record<EventType, string> = {
  Birthday: "#F59E0B",
  Anniversary: "#EC4899",
  Wedding: "#8B5CF6",
  Party: "#10B981",
  Vacation: "#3B82F6",
  Interview: "#EF4444",
  Meeting: "#6366F1",
  Other: "#6B7280",
};

const EVENT_ICONS: Record<EventType, string> = {
  Birthday: "🎂",
  Anniversary: "💍",
  Wedding: "💒",
  Party: "🎉",
  Vacation: "✈️",
  Interview: "💼",
  Meeting: "👥",
  Other: "📅",
};

const TIME_PRESETS = [
  { label: "Morning (9:00 AM)", value: "9:00 AM" },
  { label: "Noon (12:00 PM)", value: "12:00 PM" },
  { label: "Afternoon (2:00 PM)", value: "2:00 PM" },
  { label: "Evening (6:00 PM)", value: "6:00 PM" },
  { label: "Night (8:00 PM)", value: "8:00 PM" },
];

interface VoicePreview {
  title: string;
  type: EventType;
  date: Date;
  time: string;
  location: string;
  isRecurringYearly: boolean;
}

export default function FutureEventScreen() {
  const { profile } = useAppStore();
  const [events, setEvents] = useState<FutureEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Panel: 'voice' | 'add' | null
  const [activePanel, setActivePanel] = useState<"voice" | "add" | null>(null);
  
  // Segmented Active Tab
  const [activeTab, setActiveTab] = useState<"this_week" | "upcoming" | "completed">("this_week");
  
  // Expandable Event Card Details
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Stats calculation
  const totalCount = events.length;
  const completedEvents = events.filter((e) => e.completedAt);
  const pendingEvents = events.filter((e) => !e.completedAt);
  const doneCount = completedEvents.length;
  const pendingCount = pendingEvents.length;
  
  const overdueCount = pendingEvents.filter((e) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const event = new Date(e.eventDate);
    event.setHours(0, 0, 0, 0);
    return event.getTime() < today.getTime();
  }).length;
  
  const completionRate = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  // Voice template state
  const [voiceInputText, setVoiceInputText] = useState("");
  const [voicePreview, setVoicePreview] = useState<VoicePreview | null>(null);

  // Real voice recognition state (Option B)
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [webRecognitionInstance, setWebRecognitionInstance] = useState<any>(null);

  // Manual Add Composer state
  const [composerTitle, setComposerTitle] = useState("");
  const [composerType, setComposerType] = useState<EventType>("Other");
  const [composerDate, setComposerDate] = useState<Date | undefined>(undefined);
  const [composerTime, setComposerTime] = useState("10:00 AM");
  const [composerLocation, setComposerLocation] = useState("");
  const [composerNotes, setComposerNotes] = useState("");
  const [composerReminders, setComposerReminders] = useState<ReminderOption[]>([]);
  const [composerSendToSpouse, setComposerSendToSpouse] = useState(false);
  const [composerIsShared, setComposerIsShared] = useState(false);
  const [composerIsRecurringYearly, setComposerIsRecurringYearly] = useState(false);
  
  // Sub-modals for Composer
  const [showDateCalendar, setShowDateCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Edit Modal Form state
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FutureEvent | null>(null);
  const [editFormData, setEditFormData] = useState({
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
  const [editShowDateCalendar, setEditShowDateCalendar] = useState(false);
  const [editShowTimePicker, setEditShowTimePicker] = useState(false);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    const isNativeModuleAvailable = !!(NativeModules.Voice && NativeModules.Voice.startSpeech);

    if (Platform.OS !== "web" && isNativeModuleAvailable) {
      const Voice = require("@react-native-voice/voice").default;
      
      const onSpeechStart = () => {
        setIsListening(true);
        setVoiceError(null);
      };
      
      const onSpeechEnd = () => {
        setIsListening(false);
      };
      
      const onSpeechError = (e: any) => {
        console.error("Native onSpeechError:", e);
        setVoiceError(e.error?.message || "Speech recognition error");
        setIsListening(false);
      };
      
      const onSpeechResults = (e: any) => {
        if (e.value && e.value.length > 0) {
          const txt = e.value[0];
          setVoiceInputText(txt);
          const parsed = parseNaturalLanguageEvent(txt);
          setVoicePreview(parsed);
        }
      };
      
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechError = onSpeechError;
      Voice.onSpeechResults = onSpeechResults;
      
      return () => {
        Voice.destroy().then(() => {
          Voice.removeAllListeners();
        }).catch((err: any) => {
          console.error("Voice destroy error:", err);
        });
      };
    } else {
      // Web speech recognition setup
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";
        
        rec.onstart = () => {
          setIsListening(true);
          setVoiceError(null);
        };
        
        rec.onend = () => {
          setIsListening(false);
        };
        
        rec.onerror = (e: any) => {
          console.error("Web SpeechRecognition error:", e);
          setVoiceError(e.error || "Speech recognition error");
          setIsListening(false);
        };
        
        rec.onresult = (e: any) => {
          const txt = e.results[0][0].transcript;
          setVoiceInputText(txt);
          const parsed = parseNaturalLanguageEvent(txt);
          setVoicePreview(parsed);
        };
        
        setWebRecognitionInstance(rec);
      }
    }
  }, []);

  const loadEvents = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await futureEventService.getFutureEvents();
      setEvents(data);
    } catch (error) {
      console.error("Load events error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Natural Language Parsers
  const parseNaturalLanguageEvent = (text: string): VoicePreview => {
    const lower = text.toLowerCase().trim();
    let type: EventType = "Other";
    let title = "New Event";
    let date = new Date();
    let time = "10:00 AM";
    let location = "";
    let isRecurringYearly = false;

    // Detect type using trigger keywords
    for (const key of Object.keys(TRIGGER_KEYWORDS) as EventType[]) {
      const words = TRIGGER_KEYWORDS[key];
      if (words.some((word) => lower.includes(word))) {
        type = key;
        break;
      }
    }

    // Detect Location "in [location]"
    const inMatch = text.match(/\bin\s+([^,.]+)/i);
    if (inMatch) {
      location = inMatch[1].trim();
    }

    // Parse Date
    date = parseNaturalDate(text);

    // Detect Time (e.g., "at 3 pm", "at 10:00 AM", "6pm")
    const timeMatch = text.match(/(\d{1,2}(:\d{2})?\s*(am|pm|AM|PM))/i) || text.match(/(\d{1,2}\s*(am|pm|AM|PM))/i);
    if (timeMatch) {
      time = timeMatch[0].toUpperCase();
    }

    // Extract Title
    let titleCandidate = text;
    titleCandidate = titleCandidate.replace(/i\s+have\s+a\s+/i, "");
    titleCandidate = titleCandidate.replace(/i\s+have\s+an\s+/i, "");
    titleCandidate = titleCandidate.replace(/it's\s+/i, "");
    
    // Remove date/time/location suffix
    titleCandidate = titleCandidate.replace(/\bon\s+.*$/i, "");
    titleCandidate = titleCandidate.replace(/\bat\s+.*$/i, "");
    titleCandidate = titleCandidate.replace(/\bin\s+.*$/i, "");
    titleCandidate = titleCandidate.replace(/\btomorrow.*$/i, "");
    titleCandidate = titleCandidate.replace(/\btoday.*$/i, "");
    
    const trimmed = titleCandidate.trim();
    title = trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : (type === "Other" ? "Event" : `${type} Event`);

    // Set Yearly Recurrence for birthday/anniversary
    if (type === "Birthday" || type === "Anniversary") {
      isRecurringYearly = true;
      date = normalizeBirthdayDate(date);
    }

    return { title, type, date, time, location, isRecurringYearly };
  };

  const parseNaturalDate = (dateStr: string): Date => {
    const str = dateStr.toLowerCase().trim();
    const today = new Date();

    // Handle relative dates
    if (str.includes("today")) return today;
    if (str.includes("tomorrow")) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow;
    }
    if (str.includes("next week")) {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return nextWeek;
    }

    // Clean ordinal suffixes (e.g., "june 15th" -> "june 15")
    let cleaned = str.replace(/(\d+)(st|nd|rd|th)/g, "$1");

    // Month map for lookup
    const monthsMap: { [key: string]: number } = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11
    };

    // 1. Month Name Formats (e.g., "June 15", "15 June", "June 15, 2026")
    const monthMatch = cleaned.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
    if (monthMatch) {
      const monthName = monthMatch[1];
      const monthIndex = monthsMap[monthName];
      const numbers = cleaned.match(/\b\d+/g) || [];
      
      let day = today.getDate();
      let year = today.getFullYear();
      
      for (const numStr of numbers) {
        const num = parseInt(numStr, 10);
        if (numStr.length === 4) {
          year = num;
        } else if (num >= 1 && num <= 31) {
          day = num;
        }
      }
      return new Date(year, monthIndex, day);
    }

    // 2. Numeric Formats with Year: YYYY-MM-DD
    const ymd = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymd) {
      return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
    }

    // DD/MM/YYYY or MM/DD/YYYY
    const dmyOrMdy = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyOrMdy) {
      const p1 = parseInt(dmyOrMdy[1], 10);
      const p2 = parseInt(dmyOrMdy[2], 10);
      const year = parseInt(dmyOrMdy[3], 10);
      if (p1 > 12) {
        return new Date(year, p2 - 1, p1);
      } else if (p2 > 12) {
        return new Date(year, p1 - 1, p2);
      } else {
        return new Date(year, p2 - 1, p1);
      }
    }

    // 3. Numeric Formats without Year: DD/MM or MM/DD
    const dmOrMd = cleaned.match(/^(\d{1,2})[-/](\d{1,2})$/);
    if (dmOrMd) {
      const p1 = parseInt(dmOrMd[1], 10);
      const p2 = parseInt(dmOrMd[2], 10);
      const year = today.getFullYear();
      if (p1 > 12) {
        return new Date(year, p2 - 1, p1);
      } else if (p2 > 12) {
        return new Date(year, p1 - 1, p2);
      } else {
        return new Date(year, p2 - 1, p1);
      }
    }

    // 4. Standard Parsing Fallback
    try {
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) return date;
    } catch (e) {
      // Ignore
    }

    return today;
  };

  const normalizeBirthdayDate = (selectedDate: Date): Date => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const currentYear = now.getFullYear();
    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(0, 0, 0, 0);
    normalizedDate.setFullYear(currentYear);

    if (normalizedDate < now) {
      normalizedDate.setFullYear(currentYear + 1);
    }

    return normalizedDate;
  };

  const startVoiceRecognition = async () => {
    setVoiceError(null);
    if (isListening) {
      await stopVoiceRecognition();
      return;
    }
    
    if (Platform.OS === "web") {
      if (webRecognitionInstance) {
        try {
          webRecognitionInstance.start();
        } catch (e) {
          console.error("Failed to start web recognition:", e);
        }
      } else {
        Alert.alert("Not Supported", "Speech recognition is not supported in this browser.");
      }
    } else {
      const isNativeModuleAvailable = !!(NativeModules.Voice && NativeModules.Voice.startSpeech);
      if (!isNativeModuleAvailable) {
        Alert.alert(
          "🎤 Keyboard Mic Fallback (Expo Go)",
          "Direct microphone recording is not supported in standard Expo Go. Please use the microphone icon on your device keyboard to dictate text instead."
        );
        return;
      }
      try {
        const Voice = require("@react-native-voice/voice").default;
        await Voice.start("en-US");
      } catch (e: any) {
        console.error("Voice start error:", e);
        Alert.alert("Error", "Could not start voice recognition: " + (e.message || e));
      }
    }
  };

  const stopVoiceRecognition = async () => {
    if (Platform.OS === "web") {
      if (webRecognitionInstance) {
        try {
          webRecognitionInstance.stop();
        } catch (e) {
          console.error("Failed to stop web recognition:", e);
        }
      }
    } else {
      try {
        const Voice = require("@react-native-voice/voice").default;
        await Voice.stop();
      } catch (e) {
        console.error("Voice stop error:", e);
      }
    }
    setIsListening(false);
  };

  // Submit parsed Voice Template
  const handleConfirmVoiceEvent = async () => {
    if (!profile || !voicePreview) return;

    try {
      await futureEventService.addEvent({
        profileID: profile.id,
        title: voicePreview.title,
        type: voicePreview.type,
        eventDate: voicePreview.date,
        eventTime: voicePreview.time,
        location: voicePreview.location || undefined,
        reminderOptions: voicePreview.isRecurringYearly ? ["same_day"] : ["1_day_before"],
        sendReminderToSpouse: false,
        isShared: false,
        isRecurringYearly: voicePreview.isRecurringYearly,
      });

      setVoiceInputText("");
      setVoicePreview(null);
      setActivePanel(null);
      loadEvents();
      Alert.alert("Success", "Event created from voice template!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create event");
    }
  };

  // Submit Manual Event Composer
  const handleSaveManualEvent = async () => {
    if (!profile) return;
    if (!composerTitle.trim()) {
      Alert.alert("Error", "Please enter event title");
      return;
    }
    if (!composerDate) {
      Alert.alert("Error", "Please select event date");
      return;
    }

    try {
      await futureEventService.addEvent({
        profileID: profile.id,
        title: composerTitle,
        type: composerType,
        eventDate: composerDate,
        eventTime: composerTime,
        location: composerLocation || undefined,
        notes: composerNotes || undefined,
        reminderOptions: composerReminders,
        sendReminderToSpouse: composerSendToSpouse,
        isShared: composerIsShared,
        isRecurringYearly: composerIsRecurringYearly,
      });

      // Reset composer
      setComposerTitle("");
      setComposerType("Other");
      setComposerDate(undefined);
      setComposerTime("10:00 AM");
      setComposerLocation("");
      setComposerNotes("");
      setComposerReminders([]);
      setComposerSendToSpouse(false);
      setComposerIsShared(false);
      setComposerIsRecurringYearly(false);
      setShowMoreOptions(false);
      setActivePanel(null);
      loadEvents();
      Alert.alert("Success", "Event added successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add event");
    }
  };

  // Delete event
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

  // Toggle Family Share
  const handleToggleShare = async (eventId: string, currentStatus: boolean) => {
    await futureEventService.shareEventWithFamily(eventId, !currentStatus);
    loadEvents();
  };

  // Complete/Uncomplete Toggle
  const toggleCompletion = async (event: FutureEvent) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? {
              ...e,
              completedAt: e.completedAt ? undefined : new Date().toISOString(),
            }
          : e
      )
    );

    try {
      if (event.completedAt) {
        await futureEventService.editEvent(event.id, { completedAt: null } as any);
      } else {
        await futureEventService.markEventCompleted(event.id);
      }
      loadEvents();
    } catch (error) {
      console.error("Toggle event completion error:", error);
      loadEvents();
    }
  };

  // Edit Modal Form triggers
  const openEditModal = (event: FutureEvent) => {
    const dateStr = typeof event.eventDate === "string"
      ? event.eventDate.split("T")[0]
      : formatDateToInput(event.eventDate);

    setEditingEvent(event);
    setEditFormData({
      title: event.title,
      type: event.type,
      eventDate: dateStr,
      eventTime: event.eventTime,
      location: event.location || "",
      notes: event.notes || "",
      reminderOptions: event.reminderOptions || [],
      sendReminderToSpouse: event.sendReminderToSpouse || false,
      isShared: event.isShared || false,
      isRecurringYearly: event.isRecurringYearly || false,
    });
    setIsEditModalVisible(true);
  };

  const handleSaveEditEvent = async () => {
    if (!profile || !editingEvent) return;
    if (!editFormData.title.trim()) {
      Alert.alert("Error", "Please enter event title");
      return;
    }

    try {
      await futureEventService.editEvent(editingEvent.id, {
        title: editFormData.title,
        type: editFormData.type,
        eventDate: new Date(editFormData.eventDate),
        eventTime: editFormData.eventTime,
        location: editFormData.location || undefined,
        notes: editFormData.notes || undefined,
        reminderOptions: editFormData.reminderOptions,
        sendReminderToSpouse: editFormData.sendReminderToSpouse,
        isShared: editFormData.isShared,
        isRecurringYearly: editFormData.isRecurringYearly,
      });

      setIsEditModalVisible(false);
      setEditingEvent(null);
      loadEvents();
      Alert.alert("Success", "Event updated successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update event");
    }
  };

  // Date Formatting helper
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "Invalid Date";
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatDateToInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDaysUntil = (eventDate: Date | string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const event = new Date(eventDate);
      if (isNaN(event.getTime())) return -999;
      event.setHours(0, 0, 0, 0);
      const diff = event.getTime() - today.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    } catch (error) {
      return -999;
    }
  };

  // Tab Filtering logic
  const getFilteredEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);

    const pendingEvents = events.filter((e) => !e.completedAt);
    const completedEvents = events.filter((e) => e.completedAt);

    switch (activeTab) {
      case "this_week":
        return pendingEvents.filter((e) => {
          const date = new Date(e.eventDate);
          return date < endOfWeek;
        }).sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
        
      case "upcoming":
        return pendingEvents.filter((e) => {
          const date = new Date(e.eventDate);
          return date >= endOfWeek;
        }).sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
        
      case "completed":
        return completedEvents.sort((a, b) => new Date(b.completedAt || b.eventDate).getTime() - new Date(a.completedAt || a.eventDate).getTime());
        
      default:
        return events;
    }
  };

  // Tab Badges Counter
  const getThisWeekCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);
    return events.filter((e) => !e.completedAt && new Date(e.eventDate) < endOfWeek).length;
  };

  const getUpcomingCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);
    return events.filter((e) => !e.completedAt && new Date(e.eventDate) >= endOfWeek).length;
  };

  const getCompletedCount = () => {
    return events.filter((e) => e.completedAt).length;
  };

  // Expandable Event Render Card
  const renderEvent = ({ item }: { item: FutureEvent }) => {
    const isExpanded = expandedEventId === item.id;
    const daysUntil = getDaysUntil(item.eventDate);
    const isOverdue = daysUntil < 0 && !item.completedAt;
    const isCompleted = !!item.completedAt;

    return (
      <View style={[styles.card, isCompleted && styles.completedCardOpacity]}>
        <View style={[styles.priorityBar, { backgroundColor: EVENT_COLORS[item.type] }]} />

        <View style={styles.cardMain}>
          <View style={styles.cardHeader}>
            <TouchableOpacity style={styles.checkbox} onPress={() => toggleCompletion(item)}>
              <MaterialCommunityIcons
                name={isCompleted ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                size={22}
                color={isCompleted ? "#10B981" : "#9CA3AF"}
              />
            </TouchableOpacity>

            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}>
                {item.title}
              </Text>
              
              <View style={styles.taskMeta}>
                <View style={styles.metaRow}>
                  <Text style={styles.categoryIconText}>{EVENT_ICONS[item.type]}</Text>
                  <Text style={styles.metaLabelText}>{item.type}</Text>
                </View>
                
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabelText}>
                    📅 {formatDate(item.eventDate)}
                  </Text>
                </View>
                
                {item.eventTime && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabelText}>⏰ {item.eventTime}</Text>
                  </View>
                )}

                {isOverdue && (
                  <Text style={[styles.metaLabelText, styles.overdueDateText]}>
                    ⚠️ Overdue
                  </Text>
                )}
                
                {!isCompleted && !isOverdue && daysUntil >= 0 && (
                  <View style={[styles.sectionBadge, { backgroundColor: EVENT_COLORS[item.type] + "20" }]}>
                    <Text style={[styles.sectionBadgeText, { color: EVENT_COLORS[item.type] }]}>
                      {daysUntil === 0 ? "Today" : `${daysUntil}d left`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.chevron} onPress={() => setExpandedEventId(isExpanded ? null : item.id)}>
              <MaterialCommunityIcons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          {isExpanded && (
            <View style={styles.cardBody}>
              {item.notes && (
                <Text style={styles.descriptionText}>
                  {item.notes}
                </Text>
              )}

              {item.location && (
                <View style={[styles.metaRow, { marginBottom: 8 }]}>
                  <Text style={styles.metaLabelText}>📍 Location: {item.location}</Text>
                </View>
              )}

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
                {item.reminderOptions && item.reminderOptions.length > 0 && (
                  <View style={[styles.tag, styles.reminderTag]}>
                    <Text style={styles.tagText}>
                      🔔 {item.reminderOptions.join(", ").replace(/_/g, " ")}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.cardActionsContainer}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editActionBtn]}
                  onPress={() => openEditModal(item)}
                >
                  <MaterialCommunityIcons name="pencil" size={14} color="#FFF" />
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteActionBtn]}
                  onPress={() => handleDelete(item.id)}
                >
                  <MaterialCommunityIcons name="trash-can" size={14} color="#FFF" />
                  <Text style={styles.actionBtnText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: item.isShared ? "#10B981" : "#6B7280" }]}
                  onPress={() => handleToggleShare(item.id, item.isShared)}
                >
                  <MaterialCommunityIcons name={item.isShared ? "share-variant" : "share-variant-outline"} size={14} color="#FFF" />
                  <Text style={styles.actionBtnText}>{item.isShared ? "Shared" : "Share"}</Text>
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
      <Stack.Screen options={{ title: "Future Events", headerShown: true }} />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          
          {/* Header Productivity Card */}
          <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              <View style={styles.greetingSection}>
                <Text style={styles.greetingTitle}>Your Future Events</Text>
                <Text style={styles.greetingSubtitle}>Stay on top of your schedule!</Text>
              </View>
              
              {/* Dynamic Progress Ring */}
              <View style={styles.progressCircle}>
                <Text style={styles.progressPercentText}>{Math.round(completionRate)}%</Text>
                <Text style={styles.progressSubtext}>Done</Text>
              </View>
            </View>
            
            {/* Quick Stat Chips */}
            <View style={styles.statChipsRow}>
              <View style={[styles.statChip, styles.statChipOverdue]}>
                <Text style={[styles.statChipCount, styles.overdueChipText]}>{overdueCount}</Text>
                <Text style={[styles.statChipLabel, styles.overdueChipText]}>Overdue</Text>
              </View>
              
              <View style={[styles.statChip, styles.statChipPending]}>
                <Text style={[styles.statChipCount, styles.pendingChipText]}>{pendingCount}</Text>
                <Text style={[styles.statChipLabel, styles.pendingChipText]}>Pending</Text>
              </View>
              
              <View style={[styles.statChip, styles.statChipDone]}>
                <Text style={[styles.statChipCount, styles.doneChipText]}>{doneCount}</Text>
                <Text style={[styles.statChipLabel, styles.doneChipText]}>Completed</Text>
              </View>
            </View>
          </View>

          {/* Permanent Action Panels */}
          <View style={styles.panelsContainer}>
            
            {/* Voice Templates Panel */}
            <View style={[
              styles.permanentCard, 
              styles.voiceCard, 
              activePanel === 'voice' && styles.permanentCardActiveVoice
            ]}>
              <TouchableOpacity 
                style={styles.permanentCardHeader}
                onPress={() => setActivePanel(activePanel === 'voice' ? null : 'voice')}
              >
                <View style={styles.panelTitleRow}>
                  <Text style={styles.panelTitleIcon}>🎤</Text>
                  <View>
                    <Text style={styles.panelTitle}>Voice Templates</Text>
                    <Text style={styles.panelSubtitle}>Create events in natural language</Text>
                  </View>
                </View>
                <MaterialCommunityIcons 
                  name={activePanel === 'voice' ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#7C3AED" 
                />
              </TouchableOpacity>
              
              {activePanel === 'voice' && (
                <View style={styles.panelContent}>

                  <View style={styles.voiceInputWrapper}>
                    <TextInput
                      style={styles.voiceTextInput}
                      value={voiceInputText}
                      onChangeText={(txt) => {
                        setVoiceInputText(txt);
                        if (txt.trim()) {
                          const parsed = parseNaturalLanguageEvent(txt);
                          setVoicePreview(parsed);
                        } else {
                          setVoicePreview(null);
                        }
                      }}
                      placeholder="e.g. dinner with Sarah next Friday at 7 PM in Bistro"
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity 
                      style={[styles.inlineMicrophoneBtn, isListening && styles.inlineMicrophoneBtnListening]}
                      onPress={startVoiceRecognition}
                    >
                      <MaterialCommunityIcons name={isListening ? "stop" : "microphone"} size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>

                  {isListening && (
                    <View style={styles.listeningContainer}>
                      <ActivityIndicator size="small" color="#7C3AED" />
                      <Text style={styles.listeningText}>Listening... Speak now.</Text>
                    </View>
                  )}
                  {voiceError && (
                    <View style={styles.voiceErrorContainer}>
                      <Text style={styles.voiceErrorText}>⚠️ {voiceError}</Text>
                    </View>
                  )}

                  {/* Live Parsed Interpretation Preview Card */}
                  {voicePreview && (
                    <View style={styles.previewCard}>
                      <View style={styles.previewCardHeader}>
                        <Text style={styles.previewCardTitle}>✨ Interpreted Event Preview</Text>
                      </View>
                      <View style={styles.previewCardBody}>
                        <Text style={styles.previewTextRow}>
                          <Text style={styles.previewLabel}>Title: </Text>{voicePreview.title}
                        </Text>
                        <Text style={styles.previewTextRow}>
                          <Text style={styles.previewLabel}>Type: </Text>{EVENT_ICONS[voicePreview.type]} {voicePreview.type}
                        </Text>
                        <Text style={styles.previewTextRow}>
                          <Text style={styles.previewLabel}>Date: </Text>{formatDate(voicePreview.date)}
                        </Text>
                        <Text style={styles.previewTextRow}>
                          <Text style={styles.previewLabel}>Time: </Text>{voicePreview.time}
                        </Text>
                        {voicePreview.location ? (
                          <Text style={styles.previewTextRow}>
                            <Text style={styles.previewLabel}>Location: </Text>{voicePreview.location}
                          </Text>
                        ) : null}
                      </View>

                      <TouchableOpacity 
                        style={styles.confirmCreateBtn}
                        onPress={handleConfirmVoiceEvent}
                      >
                        <Text style={styles.confirmCreateBtnText}>Create Event</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Add Event Panel */}
            <View style={[
              styles.permanentCard, 
              styles.addCard, 
              activePanel === 'add' && styles.permanentCardActiveAdd
            ]}>
              <TouchableOpacity 
                style={styles.permanentCardHeader}
                onPress={() => setActivePanel(activePanel === 'add' ? null : 'add')}
              >
                <View style={styles.panelTitleRow}>
                  <Text style={styles.panelTitleIcon}>📅</Text>
                  <View>
                    <Text style={styles.panelTitle}>Add Event</Text>
                    <Text style={styles.panelSubtitle}>Create a new event manually</Text>
                  </View>
                </View>
                <MaterialCommunityIcons 
                  name={activePanel === 'add' ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#2563EB" 
                />
              </TouchableOpacity>
              
              {activePanel === 'add' && (
                <View style={styles.panelContent}>
                  
                  <Text style={styles.label}>Event Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesScroll}>
                    <View style={styles.typesRow}>
                      {EVENT_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeChip,
                            composerType === type && styles.typeChipActive,
                          ]}
                          onPress={() => setComposerType(type)}
                        >
                          <Text style={[
                            styles.typeChipText,
                            composerType === type && styles.typeChipTextActive
                          ]}>
                            {EVENT_ICONS[type]} {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={styles.label}>Event Title *</Text>
                  <TextInput
                    style={styles.input}
                    value={composerTitle}
                    onChangeText={composerTitle => setComposerTitle(composerTitle)}
                    placeholder="e.g. John's Birthday"
                    placeholderTextColor="#9CA3AF"
                  />

                  <View style={styles.sideBySideRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Event Date *</Text>
                      <TouchableOpacity
                        style={styles.input}
                        onPress={() => setShowDateCalendar(true)}
                      >
                        <Text style={composerDate ? styles.inputText : styles.placeholder}>
                          {composerDate ? formatDate(composerDate) : "Select date"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Event Time *</Text>
                      <TouchableOpacity
                        style={styles.input}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <Text style={composerTime ? styles.inputText : styles.placeholder}>
                          {composerTime || "Select time"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Accordion header */}
                  <TouchableOpacity 
                    style={styles.accordionHeader}
                    onPress={() => setShowMoreOptions(!showMoreOptions)}
                  >
                    <Text style={styles.accordionTitle}>⚙️ More Options</Text>
                    <MaterialCommunityIcons 
                      name={showMoreOptions ? "chevron-up" : "chevron-down"} 
                      size={18} 
                      color="#4B5563" 
                    />
                  </TouchableOpacity>

                  {showMoreOptions && (
                    <View style={styles.accordionContent}>
                      <Text style={styles.label}>Location (Optional)</Text>
                      <TextInput
                        style={styles.input}
                        value={composerLocation}
                        onChangeText={setComposerLocation}
                        placeholder="e.g. Grand Hotel"
                        placeholderTextColor="#9CA3AF"
                      />

                      <Text style={styles.label}>Notes (Optional)</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={composerNotes}
                        onChangeText={setComposerNotes}
                        placeholder="Add description..."
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={2}
                      />

                      <Text style={styles.label}>Reminders</Text>
                      <View style={styles.remindersChipsRow}>
                        {REMINDER_OPTIONS.map((option) => {
                          const isSelected = composerReminders.includes(option.value);
                          return (
                            <TouchableOpacity
                              key={option.value}
                              style={[
                                styles.reminderOptionChip,
                                isSelected && styles.reminderOptionChipActive
                              ]}
                              onPress={() => {
                                if (isSelected) {
                                  setComposerReminders(composerReminders.filter((o) => o !== option.value));
                                } else {
                                  setComposerReminders([...composerReminders, option.value]);
                                }
                              }}
                            >
                              <Text style={[
                                styles.reminderOptionChipText,
                                isSelected && styles.reminderOptionChipTextActive
                              ]}>
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Send Reminder to Spouse</Text>
                        <Switch
                          value={composerSendToSpouse}
                          onValueChange={setComposerSendToSpouse}
                          trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                          thumbColor={composerSendToSpouse ? "#2563EB" : "#F3F4F6"}
                        />
                      </View>

                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Share with Family</Text>
                        <Switch
                          value={composerIsShared}
                          onValueChange={setComposerIsShared}
                          trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                          thumbColor={composerIsShared ? "#2563EB" : "#F3F4F6"}
                        />
                      </View>

                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Recurring Yearly</Text>
                        <Switch
                          value={composerIsRecurringYearly}
                          onValueChange={setComposerIsRecurringYearly}
                          trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                          thumbColor={composerIsRecurringYearly ? "#2563EB" : "#F3F4F6"}
                        />
                      </View>
                    </View>
                  )}

                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={handleSaveManualEvent}
                  >
                    <Text style={styles.saveButtonText}>Save Event</Text>
                  </TouchableOpacity>

                </View>
              )}
            </View>

          </View>

          {/* Segmented Filter Control */}
          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTab === "this_week" && styles.filterPillActive,
              ]}
              onPress={() => setActiveTab("this_week")}
            >
              <Text style={[
                styles.filterPillText,
                activeTab === "this_week" && styles.filterPillTextActive
              ]}>
                This Week ({getThisWeekCount()})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTab === "upcoming" && styles.filterPillActive,
              ]}
              onPress={() => setActiveTab("upcoming")}
            >
              <Text style={[
                styles.filterPillText,
                activeTab === "upcoming" && styles.filterPillTextActive
              ]}>
                Upcoming ({getUpcomingCount()})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTab === "completed" && styles.filterPillActive,
              ]}
              onPress={() => setActiveTab("completed")}
            >
              <Text style={[
                styles.filterPillText,
                activeTab === "completed" && styles.filterPillTextActive
              ]}>
                Completed ({getCompletedCount()})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Timeline Listing */}
          <View style={styles.timelineContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 25 }} />
            ) : getFilteredEvents().length > 0 ? (
              getFilteredEvents().map((item) => (
                <View key={item.id}>
                  {renderEvent({ item })}
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyText}>No events found</Text>
                <Text style={styles.emptySubtext}>
                  Expand the panels above to schedule a new event.
                </Text>
              </View>
            )}
          </View>

        </ScrollView>
      </View>

      {/* Manual Date Calendar Modal (Composer) */}
      <Calendar
        visible={showDateCalendar}
        onClose={() => setShowDateCalendar(false)}
        onSelectDate={(date) => {
          let finalDate = date;
          if ((composerType === "Birthday" || composerType === "Anniversary") && composerIsRecurringYearly) {
            finalDate = normalizeBirthdayDate(date);
          }
          setComposerDate(finalDate);
          setShowDateCalendar(false);
        }}
        selectedDate={composerDate}
        minDate={new Date()}
      />

      {/* Manual Time Picker Modal (Composer) */}
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
                    composerTime === preset.value && styles.timePresetOptionActive,
                  ]}
                  onPress={() => {
                    setComposerTime(preset.value);
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={[
                    styles.timePresetOptionText,
                    composerTime === preset.value && styles.timePresetOptionTextActive,
                  ]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Or Enter Custom Time</Text>
            <TextInput
              style={styles.input}
              value={composerTime}
              onChangeText={setComposerTime}
              placeholder="e.g. 3:30 PM or 15:30"
              placeholderTextColor="#9CA3AF"
            />
            
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

      {/* EDIT MODAL */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Event</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.label}>Event Title *</Text>
              <TextInput
                style={styles.input}
                value={editFormData.title}
                onChangeText={(text) => setEditFormData({ ...editFormData, title: text })}
              />

              <Text style={styles.label}>Event Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesScroll}>
                <View style={styles.typesRow}>
                  {EVENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeChip,
                        editFormData.type === type && styles.typeChipActive,
                      ]}
                      onPress={() => setEditFormData({ ...editFormData, type })}
                    >
                      <Text style={[
                        styles.typeChipText,
                        editFormData.type === type && styles.typeChipTextActive
                      ]}>
                        {EVENT_ICONS[type]} {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.sideBySideRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Event Date *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setEditShowDateCalendar(true)}
                  >
                    <Text style={styles.inputText}>
                      {editFormData.eventDate ? formatDate(new Date(editFormData.eventDate)) : "Select Date"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Event Time *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setEditShowTimePicker(true)}
                  >
                    <Text style={styles.inputText}>
                      {editFormData.eventTime}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.label}>Location (Optional)</Text>
              <TextInput
                style={styles.input}
                value={editFormData.location}
                onChangeText={(text) => setEditFormData({ ...editFormData, location: text })}
                placeholder="e.g. Grand Hotel"
              />

              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editFormData.notes}
                onChangeText={(text) => setEditFormData({ ...editFormData, notes: text })}
                placeholder="Add description..."
                multiline
                numberOfLines={2}
              />

              <Text style={styles.label}>Reminders</Text>
              <View style={styles.remindersChipsRow}>
                {REMINDER_OPTIONS.map((option) => {
                  const isSelected = editFormData.reminderOptions.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.reminderOptionChip,
                        isSelected && styles.reminderOptionChipActive
                      ]}
                      onPress={() => {
                        const current = editFormData.reminderOptions;
                        if (isSelected) {
                          setEditFormData({
                            ...editFormData,
                            reminderOptions: current.filter((o) => o !== option.value),
                          });
                        } else {
                          setEditFormData({
                            ...editFormData,
                            reminderOptions: [...current, option.value],
                          });
                        }
                      }}
                    >
                      <Text style={[
                        styles.reminderOptionChipText,
                        isSelected && styles.reminderOptionChipTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Send Reminder to Spouse</Text>
                <Switch
                  value={editFormData.sendReminderToSpouse}
                  onValueChange={(val) => setEditFormData({ ...editFormData, sendReminderToSpouse: val })}
                  trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                  thumbColor={editFormData.sendReminderToSpouse ? "#2563EB" : "#F3F4F6"}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Share with Family</Text>
                <Switch
                  value={editFormData.isShared}
                  onValueChange={(val) => setEditFormData({ ...editFormData, isShared: val })}
                  trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                  thumbColor={editFormData.isShared ? "#2563EB" : "#F3F4F6"}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Recurring Yearly</Text>
                <Switch
                  value={editFormData.isRecurringYearly}
                  onValueChange={(val) => setEditFormData({ ...editFormData, isRecurringYearly: val })}
                  trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                  thumbColor={editFormData.isRecurringYearly ? "#2563EB" : "#F3F4F6"}
                />
              </View>

              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveEditEvent}
              >
                <Text style={styles.saveButtonText}>Update Event</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Date Calendar Modal */}
      <Calendar
        visible={editShowDateCalendar}
        onClose={() => setEditShowDateCalendar(false)}
        onSelectDate={(date) => {
          let finalDate = date;
          if ((editFormData.type === "Birthday" || editFormData.type === "Anniversary") && editFormData.isRecurringYearly) {
            finalDate = normalizeBirthdayDate(date);
          }
          setEditFormData({ ...editFormData, eventDate: formatDateToInput(finalDate) });
          setEditShowDateCalendar(false);
        }}
        selectedDate={editFormData.eventDate ? new Date(editFormData.eventDate) : undefined}
        minDate={new Date()}
      />

      {/* Edit Time Picker Modal */}
      <Modal visible={editShowTimePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModal}>
            <Text style={styles.modalTitle}>Select Time</Text>
            <View style={styles.timePresetsList}>
              {TIME_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.value}
                  style={[
                    styles.timePresetOption,
                    editFormData.eventTime === preset.value && styles.timePresetOptionActive,
                  ]}
                  onPress={() => {
                    setEditFormData({ ...editFormData, eventTime: preset.value });
                    setEditShowTimePicker(false);
                  }}
                >
                  <Text style={[
                    styles.timePresetOptionText,
                    editFormData.eventTime === preset.value && styles.timePresetOptionTextActive,
                  ]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Or Enter Custom Time</Text>
            <TextInput
              style={styles.input}
              value={editFormData.eventTime}
              onChangeText={(text) => setEditFormData({ ...editFormData, eventTime: text })}
              placeholder="e.g. 3:30 PM"
              placeholderTextColor="#9CA3AF"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={() => setEditShowTimePicker(false)}
              >
                <Text style={styles.buttonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonSave]}
                onPress={() => setEditShowTimePicker(false)}
              >
                <Text style={styles.buttonSaveText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6", // Light gray background matching ToDo module
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
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
  panelsContainer: {
    gap: 12,
    marginBottom: 16,
  },

  // Permanent Cards base styling
  permanentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  voiceCard: {
    backgroundColor: "#FAF5FF", // light purple tint
    borderColor: "#E9D5FF",
  },
  addCard: {
    backgroundColor: "#EFF6FF", // light blue tint
    borderColor: "#DBEAFE",
  },
  permanentCardActiveVoice: {
    borderWidth: 2.5,
    borderColor: "#7C3AED", // active border color for voice templates
  },
  permanentCardActiveAdd: {
    borderWidth: 2.5,
    borderColor: "#2563EB", // active border color for add event
  },
  permanentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  panelTitleIcon: {
    fontSize: 24,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  panelSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  // Voice Templates inline expanded layout
  panelContent: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 14,
  },
  sectionLabelSmall: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  examplesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  exampleChip: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  exampleChipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
  },
  voiceInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingRight: 6,
    marginBottom: 16,
  },
  voiceTextInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1F2937",
  },
  inlineMicrophoneBtn: {
    backgroundColor: "#7C3AED",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  inlineMicrophoneBtnListening: {
    backgroundColor: "#DC2626",
  },
  listeningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    backgroundColor: "#F5F3FF",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  listeningText: {
    fontSize: 13,
    color: "#6D28D9",
    fontWeight: "500",
  },
  voiceErrorContainer: {
    marginBottom: 16,
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  voiceErrorText: {
    fontSize: 13,
    color: "#B91C1C",
    fontWeight: "500",
  },

  // Interpretation Preview Card
  previewCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 12,
    marginBottom: 8,
  },
  previewCardHeader: {
    marginBottom: 8,
  },
  previewCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D97706",
  },
  previewCardBody: {
    gap: 4,
    marginBottom: 12,
  },
  previewTextRow: {
    fontSize: 13,
    color: "#1F2937",
  },
  previewLabel: {
    fontWeight: "700",
    color: "#4B5563",
  },
  confirmCreateBtn: {
    backgroundColor: "#7C3AED",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmCreateBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Add Event manual panel details
  typesScroll: {
    marginBottom: 12,
  },
  typesRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  typeChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  typeChipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "700",
  },
  typeChipTextActive: {
    color: "#FFFFFF",
  },
  sideBySideRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  accordionContent: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  remindersChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 8,
  },
  reminderOptionChip: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  reminderOptionChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  reminderOptionChipText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "700",
  },
  reminderOptionChipTextActive: {
    color: "#FFFFFF",
  },

  // Segmented control style (Matches ToDo screen)
  segmentedContainer: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 24,
    padding: 3,
    marginVertical: 16,
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
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterPillTextActive: {
    color: "#1F2937",
    fontWeight: "700",
  },

  // List Cards styling (Matches ToDo screen)
  timelineContainer: {
    marginBottom: 30,
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
    gap: 10,
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
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  chevron: {
    padding: 4,
  },

  // Expandable details block
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
    marginBottom: 10,
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
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
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

  // Modals & form elements (Matches ToDo modal styles)
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
  placeholder: {
    color: "#9CA3AF",
    fontSize: 14,
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
  switchLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
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

  // Time picker modal styles
  timePickerModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "80%",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginTop: 12,
    marginBottom: 8,
  },
  timePresetsList: {
    gap: 8,
    marginBottom: 12,
  },
  timePresetOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  timePresetOptionActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  timePresetOptionText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  timePresetOptionTextActive: {
    color: "#1D4ED8",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonCancel: {
    backgroundColor: "#F3F4F6",
  },
  buttonSave: {
    backgroundColor: "#2563EB",
  },
  buttonCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  buttonSaveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Empty List placeholder
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

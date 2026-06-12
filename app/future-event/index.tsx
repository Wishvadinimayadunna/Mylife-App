// ============================================
// Future Event Module - Event Management
// Redesigned with ToDo theme, permanent action cards,
// live preview parser, segmented filters, and expandable items.
// v2: Bilingual voice (Sinhala + English), 3-layer finalization gate,
//     Guided Voice Builder (6-step wizard), NLP safety layer, Hybrid mode.
// ============================================

import Calendar from "@/components/ui/calendar";
import { AppCard } from "@/components/ui/AppCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { StatChip } from "@/components/ui/StatChip";
import futureEventService from "@/services/futureEventService";
import { useAppStore } from "@/store/appStore";
import { EventType, FutureEvent, ReminderOption } from "@/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
  Birthday: ["birthday", "birth day", "bday", "b-day", "birthday party", "birth anniversary"],
  Anniversary: ["anniversary", "wedding anniversary", "engagement anniversary", "jubilee"],
  Wedding: ["wedding", "marriage", "matrimony", "engagement", "nuptials", "marriage ceremony"],
  Party: ["party", "celebration", "gathering", "dinner", "lunch", "get-together", "get together", "feast", "bash", "reception"],
  Vacation: ["vacation", "trip", "flight", "travel", "holiday", "tour", "getaway", "journey"],
  Interview: ["interview", "job interview", "assessment", "technical interview", "screening", "audition"],
  Meeting: ["meeting", "sync", "standup", "discussion", "call", "appointment", "review meeting", "project meeting", "conference", "briefing", "sync-up", "one-on-one"],
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
  title: string;          // cleaned, English-normalized title
  titleRaw: string;       // original transcript, preserved as-is (may contain Sinhala)
  type: EventType;
  date: Date;
  time: string;
  location: string;
  isRecurringYearly: boolean;
  isDateSpecified: boolean;
  isTimeSpecified: boolean;
  isLocationSpecified: boolean;
  confidenceScore: number;
  confidenceLevel: "High" | "Medium" | "Needs Review";
}

// Guided Voice Builder data accumulated across wizard steps
interface GuidedEventData {
  title: string;       // raw input as spoken (preserved)
  titleClean: string;  // normalized English title
  date: Date | null;
  time: string;
  location: string;
  type: EventType;
  isRecurringYearly: boolean;
}

// 0=idle,1=title,2=date,3=time,4=location,5=confirm
type GuidedStep = 0 | 1 | 2 | 3 | 4 | 5;

// Recognized voice mode
type VoiceMode = "quick" | "guided";
type VoiceLang = "en-US" | "si-LK";

// Guided trigger phrases that switch to guided mode suggestion
const GUIDED_TRIGGER_PHRASES = [
  "create event", "schedule", "add meeting", "plan", "new event",
];

const GUIDED_STEP_PROMPTS: Record<GuidedStep, string> = {
  0: "Tap the mic or type below to begin",
  1: "🎤 What is the event?",
  2: "📅 When is it? (e.g. next Friday, June 20)",
  3: "⏰ What time? (e.g. 7 PM, morning)",
  4: "📍 Where? (say or type 'skip' to skip)",
  5: "✅ Confirm your event",
};

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

  // ── Voice template state ──────────────────────────────────────────────────
  const [voiceInputText, setVoiceInputText] = useState("");
  const [voicePreview, setVoicePreview] = useState<VoicePreview | null>(null);

  // Target selections for modals (composer vs voice preview vs guided)
  const [calendarTarget, setCalendarTarget] = useState<"composer" | "voice" | "guided" | null>(null);
  const [timePickerTarget, setTimePickerTarget] = useState<"composer" | "voice" | "guided" | null>(null);

  // Real voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [webRecognitionInstance, setWebRecognitionInstance] = useState<any>(null);

  // ── v2: Bilingual & finalization state ───────────────────────────────────
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("quick");
  const [voiceLang, setVoiceLang] = useState<VoiceLang>("en-US");
  const [selectedLangOption, setSelectedLangOption] = useState<"en-US" | "si-LK" | "auto">("en-US");
  const [autoLangLocked, setAutoLangLocked] = useState(false);
  // Raw transcript buffer from mic — parsed only after finalization gate
  const [transcriptBuffer, setTranscriptBuffer] = useState("");
  // useRef for silence timer to avoid stale-closure issues
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── v2: Guided Voice Builder state ───────────────────────────────────────
  const [guidedStep, setGuidedStep] = useState<GuidedStep>(0);
  const [guidedData, setGuidedData] = useState<GuidedEventData>({
    title: "",
    titleClean: "",
    date: null,
    time: "",
    location: "",
    type: "Other",
    isRecurringYearly: false,
  });
  // Hint shown when quick-parse text looks like a guided trigger phrase
  const [showGuidedSuggestion, setShowGuidedSuggestion] = useState(false);

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

  // v2: Speech recognition effect — depends on voiceLang so the Web Speech
  //     instance is recreated when the user changes language.
  useEffect(() => {
    const isNativeModuleAvailable = !!(NativeModules.Voice && NativeModules.Voice.startSpeech);

    if (Platform.OS !== "web" && isNativeModuleAvailable) {
      // ── Native branch (react-native-voice) ──────────────────────────────
      const Voice = require("@react-native-voice/voice").default;

      Voice.onSpeechStart = () => {
        setIsListening(true);
        setVoiceError(null);
        setTranscriptBuffer("");
        setAutoLangLocked(false); // reset lock for new session
      };

      // Layer 1: onSpeechEnd → immediately flush
      Voice.onSpeechEnd = () => handleSpeechEnd();

      Voice.onSpeechError = (e: any) => {
        console.error("Native onSpeechError:", e);
        setVoiceError(e.error?.message || "Speech recognition error");
        setIsListening(false);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      };

      // Layer 2: onSpeechResults → buffer + reset 2.5 s timer
      Voice.onSpeechResults = (e: any) => {
        if (e.value && e.value.length > 0) {
          handleTranscriptUpdate(e.value[0]);
        }
      };

      return () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        Voice.destroy().then(() => Voice.removeAllListeners())
          .catch((err: any) => console.error("Voice destroy error:", err));
      };
    } else if (Platform.OS === "web") {
      // ── Web branch (SpeechRecognition API) ──────────────────────────────
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = voiceLang; // v2: uses active language

      rec.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
        setTranscriptBuffer("");
        setAutoLangLocked(false);
      };

      // Layer 1: onend → flush immediately
      rec.onend = () => handleSpeechEnd();

      rec.onerror = (e: any) => {
        console.error("Web SpeechRecognition error:", e);
        setVoiceError(e.error || "Speech recognition error");
        setIsListening(false);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      };

      // Layer 2: onresult → buffer + reset 2.5 s timer
      rec.onresult = (e: any) => {
        const segments: string[] = [];
        for (let i = 0; i < e.results.length; i++) {
          segments.push(e.results[i][0].transcript.trim());
        }
        const fullTranscript = segments.filter(Boolean).join(" ");
        if (fullTranscript.trim()) handleTranscriptUpdate(fullTranscript);
      };

      setWebRecognitionInstance(rec);

      return () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        try { rec.abort(); } catch (_) {}
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceLang]);

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

  // ============================================
  // v2 Helper Functions
  // ============================================

  /**
   * NLP Safety Gate: returns true only if the text has enough
   * meaningful content to warrant parsing.
   * - If a category keyword is found → always parse
   * - If a date or time token is found → parse
   * - Fallback: at least 3 words (covers "Dinner with Sarah")
   */
  const hasMinimumIntent = (text: string): boolean => {
    const lower = text.toLowerCase().trim();
    if (!lower || lower.length < 5) return false;
    const hasCategoryKeyword = Object.values(TRIGGER_KEYWORDS)
      .flat().some(kw => lower.includes(kw));
    if (hasCategoryKeyword) return true;
    const hasDateOrTime = /(today|tomorrow|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[\/-]\d{1,2}|\bam\b|\bpm\b|noon|morning|afternoon|evening|night|\d{1,2}:\d{2})/.test(lower);
    if (hasDateOrTime) return true;
    // Fallback: meaningful sentence (3+ words)
    return lower.split(/\s+/).length >= 3;
  };

  /**
   * Strips Sinhala Unicode characters to produce a clean English title.
   * The raw text is always preserved separately in titleRaw.
   */
  const normalizeMixedTitle = (rawTitle: string): string => {
    let cleaned = rawTitle
      // remove Sinhala Unicode block
      .replace(/[\u0D80-\u0DFF]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : rawTitle.trim();
  };

  /**
   * Lightweight keyword-based event type detector (used in guided mode
   * step 1 to suggest an event type from the title input).
   */
  const detectEventTypeFromText = (text: string): EventType => {
    const lower = text.toLowerCase().trim();
    for (const key of Object.keys(TRIGGER_KEYWORDS) as EventType[]) {
      const words = TRIGGER_KEYWORDS[key];
      if (words.some(w => lower.includes(w))) return key;
    }
    return "Other";
  };

  /**
   * One-shot language auto-detection.
   * Runs on the first transcript of a session. If Sinhala Unicode
   * is detected the recognition language is locked to si-LK for the
   * rest of the session. Does NOT flip mid-stream.
   */
  const detectAndLockLanguage = (transcript: string) => {
    if (autoLangLocked || selectedLangOption !== "auto") return;
    const hasSinhala = /[\u0D80-\u0DFF]/.test(transcript);
    if (hasSinhala) setVoiceLang("si-LK");
    setAutoLangLocked(true);
  };

  /**
   * Unified parse dispatcher — called after the finalization gate fires.
   * Routes to Quick Parse NLP or Guided step capture.
   */
  const flushAndParse = (text: string) => {
    if (!text.trim()) return;
    if (voiceMode === "quick") {
      setVoiceInputText(text);
      if (hasMinimumIntent(text)) {
        setVoicePreview(parseNaturalLanguageEvent(text));
        setShowGuidedSuggestion(false);
      } else {
        setVoicePreview(null);
      }
    } else {
      // Guided mode: deterministic field capture per step
      storeGuidedField(text);
    }
  };

  /**
   * 3-layer finalization handler for mic transcript updates.
   * Layer 2: resets 2.5 s silence timer on each new chunk.
   * Layer 1 (onSpeechEnd) and Layer 3 (manual stop) call flushAndParse directly.
   */
  const handleTranscriptUpdate = (newTranscript: string) => {
    setTranscriptBuffer(newTranscript);
    detectAndLockLanguage(newTranscript);
    // Reset silence timer
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      flushAndParse(newTranscript);
    }, 2500);
  };

  /**
   * Called by onSpeechEnd (Layer 1). Cancels pending silence timer
   * and immediately flushes the buffered transcript.
   */
  const handleSpeechEnd = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    flushAndParse(transcriptBuffer);
    setIsListening(false);
  };

  // ============================================
  // Enhanced Natural Language Parsers
  // ============================================

  const parseNaturalTime = (text: string): { time: string; isSpecified: boolean } => {
    const lower = text.toLowerCase().trim();
    
    if (lower.includes("noon")) {
      return { time: "12:00 PM", isSpecified: true };
    }
    if (lower.includes("midnight")) {
      return { time: "12:00 AM", isSpecified: true };
    }
    if (lower.includes("morning")) {
      return { time: "09:00 AM", isSpecified: true };
    }
    if (lower.includes("afternoon")) {
      return { time: "02:00 PM", isSpecified: true };
    }
    if (lower.includes("evening")) {
      return { time: "06:00 PM", isSpecified: true };
    }
    if (lower.includes("night")) {
      return { time: "08:00 PM", isSpecified: true };
    }

    const regexFull = /(\d{1,2})[:.](\d{2})\s*(am|pm)/i;
    const matchFull = text.match(regexFull);
    if (matchFull) {
      const hr = matchFull[1];
      const min = matchFull[2];
      const ampm = matchFull[3].toUpperCase();
      return { time: `${hr}:${min} ${ampm}`, isSpecified: true };
    }

    const regexHourOnly = /(\d{1,2})\s*(am|pm)/i;
    const matchHour = text.match(regexHourOnly);
    if (matchHour) {
      const hr = matchHour[1];
      const ampm = matchHour[2].toUpperCase();
      return { time: `${hr}:00 ${ampm}`, isSpecified: true };
    }

    return { time: "", isSpecified: false };
  };

  const parseNaturalLocation = (text: string): { location: string; isSpecified: boolean } => {
    // Non-greedy match that terminates before another preposition or date/time keyword
    const locationMatchesAll = [...text.matchAll(/\b(at|in|near|to)\s+([a-zA-Z0-9\s'&]+?)(?=\b(at|in|on|near|to|for|with|today|tomorrow|next|this)\b|$)/gi)];
    
    for (const match of locationMatchesAll) {
      const prep = match[1].toLowerCase();
      const candidate = match[2].trim();
      const lowerCandidate = candidate.toLowerCase();
      
      const isTimeOrDate = 
        /^\d{1,2}/.test(lowerCandidate) ||
        lowerCandidate.includes("am") || 
        lowerCandidate.includes("pm") ||
        lowerCandidate.includes("today") || 
        lowerCandidate.includes("tomorrow") ||
        lowerCandidate.includes("yesterday") ||
        lowerCandidate.includes("monday") || 
        lowerCandidate.includes("tuesday") || 
        lowerCandidate.includes("wednesday") || 
        lowerCandidate.includes("thursday") || 
        lowerCandidate.includes("friday") || 
        lowerCandidate.includes("saturday") || 
        lowerCandidate.includes("sunday") ||
        lowerCandidate.includes("january") || 
        lowerCandidate.includes("february") || 
        lowerCandidate.includes("march") || 
        lowerCandidate.includes("april") || 
        lowerCandidate.includes("may") || 
        lowerCandidate.includes("june") || 
        lowerCandidate.includes("july") || 
        lowerCandidate.includes("august") || 
        lowerCandidate.includes("september") || 
        lowerCandidate.includes("october") || 
        lowerCandidate.includes("november") || 
        lowerCandidate.includes("december") ||
        lowerCandidate.includes("jan") || 
        lowerCandidate.includes("feb") || 
        lowerCandidate.includes("mar") || 
        lowerCandidate.includes("apr") || 
        lowerCandidate.includes("jun") || 
        lowerCandidate.includes("jul") || 
        lowerCandidate.includes("aug") || 
        lowerCandidate.includes("sep") || 
        lowerCandidate.includes("oct") || 
        lowerCandidate.includes("nov") || 
        lowerCandidate.includes("dec") ||
        lowerCandidate.includes("next") ||
        lowerCandidate.includes("this") ||
        lowerCandidate === "noon" ||
        lowerCandidate === "midnight" ||
        lowerCandidate === "morning" ||
        lowerCandidate === "afternoon" ||
        lowerCandidate === "evening" ||
        lowerCandidate === "night";

      if (isTimeOrDate) continue;

      if (prep === "to") {
        const verbBlacklist = [
          "meet", "discuss", "sync", "celebrate", "visit", "get", "have", "do", "be", 
          "my", "your", "his", "her", "our", "their", "a", "an", "the", "see", "party", 
          "buy", "shop", "eat", "drink", "talk", "go", "work", "play", "share"
        ];
        const firstWord = lowerCandidate.split(/\s+/)[0];
        if (verbBlacklist.includes(firstWord)) {
          continue;
        }
      }

      let cleanedLoc = candidate;
      cleanedLoc = cleanedLoc.replace(/\b(on|at|in|near|to|today|tomorrow|next|this)\b.*$/i, "");
      const location = cleanedLoc.trim();
      if (location) {
        return { location, isSpecified: true };
      }
    }
    
    return { location: "", isSpecified: false };
  };

  const parseNaturalDateWithSpec = (text: string): { date: Date; isSpecified: boolean } => {
    const str = text.toLowerCase().trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (str.includes("day after tomorrow")) {
      const d = new Date(today);
      d.setDate(today.getDate() + 2);
      return { date: d, isSpecified: true };
    }
    if (str.includes("tomorrow")) {
      const d = new Date(today);
      d.setDate(today.getDate() + 1);
      return { date: d, isSpecified: true };
    }
    if (str.includes("today")) {
      return { date: new Date(today), isSpecified: true };
    }
    if (str.includes("next week")) {
      const d = new Date(today);
      d.setDate(today.getDate() + 7);
      return { date: d, isSpecified: true };
    }
    if (str.includes("next month")) {
      const d = new Date(today);
      d.setMonth(today.getMonth() + 1);
      return { date: d, isSpecified: true };
    }
    if (str.includes("next year")) {
      const d = new Date(today);
      d.setFullYear(today.getFullYear() + 1);
      return { date: d, isSpecified: true };
    }

    const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < 7; i++) {
      const dayName = weekdayNames[i];
      if (str.includes(dayName)) {
        const isNext = str.includes(`next ${dayName}`);
        const isThis = str.includes(`this ${dayName}`);
        
        const currentDayOfWeek = today.getDay();
        const targetDayOfWeek = i;
        
        let daysToAdd = 0;
        const diff = targetDayOfWeek - currentDayOfWeek;
        
        if (isNext) {
          daysToAdd = diff + 7;
          if (diff < 0) {
            let upcomingDiff = targetDayOfWeek - currentDayOfWeek;
            if (upcomingDiff <= 0) {
              upcomingDiff += 7;
            }
            daysToAdd = upcomingDiff + 7;
          } else {
            daysToAdd = diff + 7;
          }
        } else if (isThis) {
          let upcomingDiff = targetDayOfWeek - currentDayOfWeek;
          if (upcomingDiff <= 0) {
            upcomingDiff += 7;
          }
          daysToAdd = upcomingDiff;
        } else {
          let upcomingDiff = targetDayOfWeek - currentDayOfWeek;
          if (upcomingDiff <= 0) {
            upcomingDiff += 7;
          }
          daysToAdd = upcomingDiff;
        }
        
        const d = new Date(today);
        d.setDate(today.getDate() + daysToAdd);
        return { date: d, isSpecified: true };
      }
    }

    let cleaned = str.replace(/(\d+)(st|nd|rd|th)/g, "$1");

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

    const monthMatch = cleaned.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
    if (monthMatch) {
      const monthName = monthMatch[1];
      const monthIndex = monthsMap[monthName];
      const numbers = cleaned.match(/\b\d+/g) || [];
      
      let day = today.getDate();
      let year = today.getFullYear();
      
      let dayFound = false;
      for (const numStr of numbers) {
        const num = parseInt(numStr, 10);
        if (numStr.length === 4) {
          year = num;
        } else if (num >= 1 && num <= 31 && !dayFound) {
          day = num;
          dayFound = true;
        }
      }
      
      let parsedDate = new Date(year, monthIndex, day);
      if (parsedDate < today && !cleaned.includes(String(year))) {
        parsedDate.setFullYear(year + 1);
      }
      return { date: parsedDate, isSpecified: true };
    }

    const ymd = cleaned.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
    if (ymd) {
      const parsedDate = new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
      return { date: parsedDate, isSpecified: true };
    }

    const dmyOrMdy = cleaned.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
    if (dmyOrMdy) {
      const p1 = parseInt(dmyOrMdy[1], 10);
      const p2 = parseInt(dmyOrMdy[2], 10);
      const year = parseInt(dmyOrMdy[3], 10);
      if (p1 > 12) {
        return { date: new Date(year, p2 - 1, p1), isSpecified: true };
      } else if (p2 > 12) {
        return { date: new Date(year, p1 - 1, p2), isSpecified: true };
      } else {
        return { date: new Date(year, p2 - 1, p1), isSpecified: true };
      }
    }

    const dmOrMd = cleaned.match(/\b(\d{1,2})[-/](\d{1,2})\b/);
    if (dmOrMd) {
      const p1 = parseInt(dmOrMd[1], 10);
      const p2 = parseInt(dmOrMd[2], 10);
      const year = today.getFullYear();
      let parsedDate: Date;
      if (p1 > 12) {
        parsedDate = new Date(year, p2 - 1, p1);
      } else if (p2 > 12) {
        parsedDate = new Date(year, p1 - 1, p2);
      } else {
        parsedDate = new Date(year, p2 - 1, p1);
      }
      if (parsedDate < today) {
        parsedDate.setFullYear(year + 1);
      }
      return { date: parsedDate, isSpecified: true };
    }

    try {
      const fallback = new Date(cleaned);
      if (!isNaN(fallback.getTime())) {
        return { date: fallback, isSpecified: true };
      }
    } catch (e) {}

    return { date: today, isSpecified: false };
  };

  const parseNaturalLanguageEvent = (text: string): VoicePreview => {
    const lower = text.toLowerCase().trim();
    
    let type: EventType = "Other";
    for (const key of Object.keys(TRIGGER_KEYWORDS) as EventType[]) {
      const words = TRIGGER_KEYWORDS[key];
      if (words.some((word) => lower.includes(word))) {
        type = key;
        break;
      }
    }
    
    const locResult = parseNaturalLocation(text);
    const location = locResult.location;
    const isLocationSpecified = locResult.isSpecified;
    
    const dateResult = parseNaturalDateWithSpec(text);
    let date = dateResult.date;
    const isDateSpecified = dateResult.isSpecified;
    
    const timeResult = parseNaturalTime(text);
    const time = timeResult.time || "10:00 AM";
    const isTimeSpecified = timeResult.isSpecified;
    
    // Build cleaned title (same logic as before, then normalize mixed-script)
    let title = text;
    title = title.replace(/^(i\s+have\s+an?\s+|it's\s+|she\s+has\s+an?\s+|he\s+has\s+an?\s+)/i, "");
    title = title.replace(/\b(day after tomorrow|tomorrow|today|next week|next month|next year)\b/gi, "");
    
    const weekdaysRegex = /\b(next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/gi;
    title = title.replace(weekdaysRegex, "");
    
    const monthNamesRegex = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b\s*\d{1,2}(st|nd|rd|th)?/gi;
    const dayMonthRegex = /\b\d{1,2}(st|nd|rd|th)?\s*(of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi;
    const numDateRegex = /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g;
    const numDateRegex2 = /\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/g;
    title = title.replace(monthNamesRegex, "");
    title = title.replace(dayMonthRegex, "");
    title = title.replace(numDateRegex, "");
    title = title.replace(numDateRegex2, "");
    
    title = title.replace(/(\bat\s+)?\d{1,2}([:.]\d{2})?\s*(am|pm)/gi, "");
    title = title.replace(/\b(noon|midnight|morning|afternoon|evening|night)\b/gi, "");
    
    if (location) {
      if (type === "Vacation" && text.toLowerCase().includes("to " + location.toLowerCase())) {
        // keep vacation destination
      } else {
        const locEscaped = location.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const locRegex = new RegExp(`\\b(in|at|near|to)\\s+${locEscaped}\\b`, 'gi');
        title = title.replace(locRegex, "");
        const locRegex2 = new RegExp(`\\b${locEscaped}\\b`, 'gi');
        title = title.replace(locRegex2, "");
      }
    }
    
    title = title.replace(/\b(on|at|in|near|to|for|with)\s*$/gi, "");
    title = title.replace(/\s+/g, " ").trim();
    
    // v2: Apply mixed-script normalization for the display title;
    //     titleRaw preserves the original transcript unchanged.
    const rawTitle = title ? title.charAt(0).toUpperCase() + title.slice(1) : "";
    const finalTitle = normalizeMixedTitle(rawTitle);
    
    let isRecurringYearly = false;
    if (type === "Birthday" || type === "Anniversary") {
      isRecurringYearly = true;
      date = normalizeBirthdayDate(date);
    }
    
    let confidenceScore = 0;
    if (finalTitle && finalTitle.trim().length > 0) confidenceScore += 30;
    if (isDateSpecified) confidenceScore += 30;
    if (isTimeSpecified) confidenceScore += 20;
    if (isLocationSpecified) confidenceScore += 20;
    
    let confidenceLevel: "High" | "Medium" | "Needs Review" = "Needs Review";
    if (confidenceScore >= 80) confidenceLevel = "High";
    else if (confidenceScore >= 50) confidenceLevel = "Medium";
    
    return { 
      title: finalTitle,
      titleRaw: text,          // always preserve original
      type, 
      date, 
      time, 
      location, 
      isRecurringYearly,
      isDateSpecified,
      isTimeSpecified,
      isLocationSpecified,
      confidenceScore,
      confidenceLevel
    };
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
      if (Platform.OS === "android") {
        try {
          const { PermissionsAndroid } = require("react-native");
          const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
          if (!hasPermission) {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
              {
                title: "Microphone Permission Required",
                message: "This app needs access to your microphone to record voice commands for event creation.",
                buttonNeutral: "Ask Me Later",
                buttonNegative: "Cancel",
                buttonPositive: "OK"
              }
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              Alert.alert("Permission Denied", "Microphone access is required to use the voice assistant.");
              return;
            }
          }
        } catch (err) {
          console.warn("Permission request failed:", err);
        }
      }
      try {
        const Voice = require("@react-native-voice/voice").default;
        await Voice.start(voiceLang); // v2: use selected language
      } catch (e: any) {
        console.error("Voice start error:", e);
        Alert.alert("Error", "Could not start voice recognition: " + (e.message || e));
      }
    }
  };

  const stopVoiceRecognition = async () => {
    // Layer 3: Manual stop — flush buffered transcript immediately
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    flushAndParse(transcriptBuffer);

    if (Platform.OS === "web") {
      if (webRecognitionInstance) {
        try { webRecognitionInstance.stop(); } catch (e) {
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

  // ============================================
  // v2: Guided Voice Builder — Step Field Capture
  // ============================================

  /**
   * Deterministic field store for each guided wizard step.
   * NO full NLP per step — only lightweight date/time parsers for steps 2 & 3.
   */
  const storeGuidedField = (rawText: string) => {
    const lower = rawText.toLowerCase().trim();
    switch (guidedStep) {
      case 1: { // Title — raw capture
        const detectedType = detectEventTypeFromText(rawText);
        const cleanTitle = normalizeMixedTitle(rawText);
        setGuidedData(prev => ({
          ...prev,
          title: rawText,
          titleClean: cleanTitle,
          type: detectedType,
          isRecurringYearly: detectedType === "Birthday" || detectedType === "Anniversary",
        }));
        setGuidedStep(2);
        break;
      }
      case 2: { // Date — lightweight parser only
        const { date } = parseNaturalDateWithSpec(rawText);
        setGuidedData(prev => ({ ...prev, date }));
        setGuidedStep(3);
        break;
      }
      case 3: { // Time — lightweight parser only
        const { time } = parseNaturalTime(rawText);
        setGuidedData(prev => ({ ...prev, time: time || "10:00 AM" }));
        setGuidedStep(4);
        break;
      }
      case 4: { // Location — raw capture; 'skip' = empty
        const loc = lower === "skip" ? "" : rawText.trim();
        setGuidedData(prev => ({ ...prev, location: loc }));
        setGuidedStep(5);
        break;
      }
      default:
        break;
    }
  };

  /** Reset guided wizard to idle state */
  const resetGuidedWizard = () => {
    setGuidedStep(0);
    setGuidedData({ title: "", titleClean: "", date: null, time: "", location: "", type: "Other", isRecurringYearly: false });
    setTranscriptBuffer("");
  };

  /** Save event built by the guided wizard */
  const handleConfirmGuidedEvent = async () => {
    if (!profile) return;
    const title = guidedData.titleClean.trim() || guidedData.title.trim() || `${guidedData.type} Event`;
    const date = guidedData.date || new Date();
    const time = guidedData.time || "10:00 AM";

    const timeRegex = /^\d{1,2}:\d{2}\s*(AM|PM)$/i;
    const hourRegex = /^\d{1,2}\s*(AM|PM)$/i;
    if (!timeRegex.test(time) && !hourRegex.test(time)) {
      Alert.alert("Invalid Time", "Please tap Time above to set a valid time.");
      return;
    }

    try {
      await futureEventService.addEvent({
        profileID: profile.id,
        title,
        type: guidedData.type,
        eventDate: date,
        eventTime: time,
        location: guidedData.location || undefined,
        reminderOptions: guidedData.isRecurringYearly ? ["same_day"] : ["1_day_before"],
        sendReminderToSpouse: false,
        isShared: false,
        isRecurringYearly: guidedData.isRecurringYearly,
      });
      resetGuidedWizard();
      setActivePanel(null);
      loadEvents();
      Alert.alert("Success", "Event created from guided voice session! 🎉");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create event");
    }
  };

  // Submit parsed Voice Template
  const handleConfirmVoiceEvent = async () => {
    if (!profile || !voicePreview) return;

    let title = voicePreview.title.trim();
    if (!title) {
      title = `${voicePreview.type} Event`;
    }

    if (!voicePreview.date || isNaN(voicePreview.date.getTime())) {
      Alert.alert("Invalid Date", "Please select a valid date for the event.");
      return;
    }

    const timeRegex = /^\d{1,2}:\d{2}\s*(AM|PM)$/i;
    const hourRegex = /^\d{1,2}\s*(AM|PM)$/i;
    const isValidTime = timeRegex.test(voicePreview.time) || hourRegex.test(voicePreview.time);
    if (!isValidTime) {
      Alert.alert("Invalid Time", "Please enter or select a valid time (e.g. 3:00 PM or 3 PM)");
      return;
    }

    try {
      await futureEventService.addEvent({
        profileID: profile.id,
        title: title,
        type: voicePreview.type,
        eventDate: voicePreview.date,
        eventTime: voicePreview.time,
        location: voicePreview.location.trim() || undefined,
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
      <AppCard
        key={item.id}
        stripeColor={EVENT_COLORS[item.type]}
        style={isCompleted ? styles.completedCardOpacity : undefined}
      >
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
      </AppCard>
    );
  };


  return (
    <>
      <Stack.Screen options={{ title: "Future Events", headerShown: true }} />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          
          {/* Header Productivity Card */}
          <View style={[styles.headerCard, { backgroundColor: "#2563EB", borderColor: "#2563EB", borderRadius: 16 }]}>
            <View style={styles.headerTopRow}>
              <View style={styles.greetingSection}>
                <Text style={[styles.greetingTitle, { color: "#93C5FD" }]}>Your Future Events</Text>
                <Text style={[styles.greetingSubtitle, { color: "#FFFFFF", fontSize: 13, fontWeight: "500", marginTop: 4 }]}>Stay on top of your schedule!</Text>
              </View>
              
              {/* Dynamic Progress Ring */}
              <View style={[styles.progressCircle, { borderColor: "#60A5FA", backgroundColor: "rgba(255,255,255,0.1)" }]}>
                <Text style={[styles.progressPercentText, { color: "#FFFFFF" }]}>{Math.round(completionRate)}%</Text>
                <Text style={[styles.progressSubtext, { color: "#93C5FD" }]}>Done</Text>
              </View>
            </View>
            
            {/* Quick Stat Chips */}
            <View style={styles.statChipsRow}>
              <StatChip
                count={overdueCount}
                label="Overdue"
                type="danger"
              />
              <StatChip
                count={pendingCount}
                label="Pending"
                type="warning"
              />
              <StatChip
                count={doneCount}
                label="Completed"
                type="success"
              />
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

                  {/* ── v2: Hybrid Mode Toggle ─────────────────────────────── */}
                  <View style={styles.modeSelectorRow}>
                    <TouchableOpacity
                      style={[styles.modePill, voiceMode === "quick" && styles.modePillActive]}
                      onPress={() => {
                        if (voiceMode !== "quick") {
                          setVoiceMode("quick");
                          resetGuidedWizard();
                          setVoiceInputText("");
                          setVoicePreview(null);
                          setShowGuidedSuggestion(false);
                        }
                      }}
                    >
                      <Text style={[styles.modePillText, voiceMode === "quick" && styles.modePillTextActive]}>⚡ Quick Parse</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modePill, voiceMode === "guided" && styles.modePillActive]}
                      onPress={() => {
                        if (voiceMode !== "guided") {
                          setVoiceMode("guided");
                          setVoiceInputText("");
                          setVoicePreview(null);
                          resetGuidedWizard();
                          setShowGuidedSuggestion(false);
                        }
                      }}
                    >
                      <Text style={[styles.modePillText, voiceMode === "guided" && styles.modePillTextActive]}>🧭 Guided</Text>
                    </TouchableOpacity>
                  </View>

                  {/* ── v2: Language Selector ──────────────────────────────── */}
                  <View style={styles.langSelectorRow}>
                    <Text style={styles.langSelectorLabel}>Language:</Text>
                    {(["en-US", "si-LK", "auto"] as const).map((lang) => {
                      const label = lang === "en-US" ? "🇬🇧 EN" : lang === "si-LK" ? "🇱🇰 සිං" : "🔄 Auto";
                      const isActive = selectedLangOption === lang;
                      return (
                        <TouchableOpacity
                          key={lang}
                          style={[styles.langPill, isActive && styles.langPillActive]}
                          onPress={() => {
                            setSelectedLangOption(lang);
                            setAutoLangLocked(false);
                            if (lang === "en-US") setVoiceLang("en-US");
                            else if (lang === "si-LK") setVoiceLang("si-LK");
                            else setVoiceLang("en-US"); // auto starts with en-US
                          }}
                        >
                          <Text style={[styles.langPillText, isActive && styles.langPillTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* ── QUICK PARSE MODE ──────────────────────────────────── */}
                  {voiceMode === "quick" && (
                    <>
                      <View style={styles.voiceInputWrapper}>
                        <TextInput
                          style={styles.voiceTextInput}
                          value={voiceInputText}
                          onChangeText={(txt) => {
                            setVoiceInputText(txt);
                            // Manual typing: live parse with NLP safety gate
                            if (txt.trim()) {
                              if (hasMinimumIntent(txt)) {
                                setVoicePreview(parseNaturalLanguageEvent(txt));
                                setShowGuidedSuggestion(false);
                              } else {
                                setVoicePreview(null);
                              }
                              const lower = txt.toLowerCase();
                              const isGuidedTrigger = GUIDED_TRIGGER_PHRASES.some(p => lower.includes(p));
                              setShowGuidedSuggestion(isGuidedTrigger);
                            } else {
                              setVoicePreview(null);
                              setShowGuidedSuggestion(false);
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
                          <Text style={styles.listeningText}>Listening… parsing after you finish speaking.</Text>
                        </View>
                      )}
                      {voiceError && (
                        <View style={styles.voiceErrorContainer}>
                          <Text style={styles.voiceErrorText}>⚠️ {voiceError}</Text>
                        </View>
                      )}

                      {/* Guided mode suggestion hint */}
                      {showGuidedSuggestion && (
                        <TouchableOpacity
                          style={styles.guidedSuggestionBanner}
                          onPress={() => { setVoiceMode("guided"); setVoiceInputText(""); setVoicePreview(null); resetGuidedWizard(); setShowGuidedSuggestion(false); }}
                        >
                          <Text style={styles.guidedSuggestionText}>💡 Switch to Guided mode for step-by-step help?</Text>
                        </TouchableOpacity>
                      )}

                      {/* NLP safety hint when input is short */}
                      {voiceInputText.trim().length > 0 && !hasMinimumIntent(voiceInputText) && !voicePreview && (
                        <View style={styles.nlpHintBanner}>
                          <Text style={styles.nlpHintText}>🎙 Keep going — say a date, time, or event type to generate a preview.</Text>
                        </View>
                      )}

                      {/* Parsed Preview Card */}
                      {voicePreview && (
                        <View style={styles.previewCard}>
                          <View style={styles.previewCardHeader}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={styles.previewCardTitle}>✨ Interpreted Event Preview</Text>
                              <Text style={styles.detectedTemplateText}>
                                Detected: {EVENT_ICONS[voicePreview.type]} {voicePreview.type} Template
                              </Text>
                              {voicePreview.titleRaw && voicePreview.titleRaw !== voicePreview.title && (
                                <Text style={styles.rawTitleSubtext}>Original: "{voicePreview.titleRaw.substring(0, 60)}{voicePreview.titleRaw.length > 60 ? '…' : ''}"</Text>
                              )}
                            </View>
                            <View style={[
                              styles.confidenceBadge,
                              voicePreview.confidenceLevel === "High" && styles.confidenceHigh,
                              voicePreview.confidenceLevel === "Medium" && styles.confidenceMedium,
                              voicePreview.confidenceLevel === "Needs Review" && styles.confidenceLow,
                            ]}>
                              <Text style={[
                                styles.confidenceBadgeText,
                                voicePreview.confidenceLevel === "High" && styles.confidenceHighText,
                                voicePreview.confidenceLevel === "Medium" && styles.confidenceMediumText,
                                voicePreview.confidenceLevel === "Needs Review" && styles.confidenceLowText,
                              ]}>
                                {voicePreview.confidenceLevel === "High" ? "🟢 High" : voicePreview.confidenceLevel === "Medium" ? "🟡 Medium" : "🔴 Review"} ({voicePreview.confidenceScore}%)
                              </Text>
                            </View>
                          </View>
                          <View style={styles.previewCardBody}>
                            <Text style={styles.previewFieldLabel}>Event Title</Text>
                            <TextInput style={styles.previewInput} value={voicePreview.title} onChangeText={(txt) => setVoicePreview({ ...voicePreview, title: txt })} placeholder="Event Title" placeholderTextColor="#9CA3AF" />
                            <Text style={styles.previewFieldLabel}>Event Type</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewTypesScroll}>
                              <View style={styles.typesRow}>
                                {EVENT_TYPES.map((type) => (
                                  <TouchableOpacity key={type} style={[styles.previewTypeChip, voicePreview.type === type && styles.previewTypeChipActive]}
                                    onPress={() => setVoicePreview({ ...voicePreview, type, isRecurringYearly: (type === "Birthday" || type === "Anniversary") ? true : voicePreview.isRecurringYearly })}>
                                    <Text style={[styles.previewTypeChipText, voicePreview.type === type && styles.previewTypeChipTextActive]}>{EVENT_ICONS[type]} {type}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </ScrollView>
                            <View style={styles.previewSideBySide}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.previewFieldLabel}>Date</Text>
                                <TouchableOpacity style={styles.previewSelectorBtn} onPress={() => { setCalendarTarget("voice"); setShowDateCalendar(true); }}>
                                  <Text style={styles.previewSelectorBtnText}>📅 {formatDate(voicePreview.date)}</Text>
                                </TouchableOpacity>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.previewFieldLabel}>Time</Text>
                                <TouchableOpacity style={styles.previewSelectorBtn} onPress={() => { setTimePickerTarget("voice"); setShowTimePicker(true); }}>
                                  <Text style={styles.previewSelectorBtnText}>⏰ {voicePreview.time || "Select Time"}</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                            {!voicePreview.isTimeSpecified && <View style={styles.missingBadgeWarning}><Text style={styles.missingBadgeWarningText}>⚠️ Missing Time (using 10:00 AM default)</Text></View>}
                            <Text style={styles.previewFieldLabel}>Location</Text>
                            <TextInput style={styles.previewInput} value={voicePreview.location} onChangeText={(txt) => setVoicePreview({ ...voicePreview, location: txt, isLocationSpecified: !!txt.trim() })} placeholder="e.g. Colombo (Optional)" placeholderTextColor="#9CA3AF" />
                            {!voicePreview.isLocationSpecified && <View style={styles.missingBadgeWarning}><Text style={styles.missingBadgeWarningText}>⚠️ Missing Location</Text></View>}
                            <View style={styles.previewSwitchRow}>
                              <Text style={styles.previewSwitchLabel}>Recurring Yearly</Text>
                              <Switch value={voicePreview.isRecurringYearly} onValueChange={(val) => setVoicePreview({ ...voicePreview, isRecurringYearly: val })} trackColor={{ false: "#D1D5DB", true: "#C084FC" }} thumbColor={voicePreview.isRecurringYearly ? "#7C3AED" : "#F3F4F6"} />
                            </View>
                          </View>
                          <View style={styles.previewCardButtonsRow}>
                            <TouchableOpacity style={[styles.previewActionBtn, styles.previewCancelBtn]} onPress={() => { setVoiceInputText(""); setVoicePreview(null); }}>
                              <Text style={styles.previewCancelBtnText}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.previewActionBtn, styles.previewConfirmBtn]} onPress={handleConfirmVoiceEvent}>
                              <Text style={styles.previewConfirmBtnText}>Create Event</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </>
                  )}

                  {/* ── GUIDED MODE ───────────────────────────────────────── */}
                  {voiceMode === "guided" && (
                    <View style={styles.guidedContainer}>
                      {/* Step progress indicator */}
                      {guidedStep > 0 && guidedStep < 5 && (
                        <View style={styles.guidedStepIndicatorRow}>
                          {([1, 2, 3, 4] as const).map((s) => (
                            <View key={s} style={[styles.guidedStepDot, guidedStep >= s && styles.guidedStepDotActive]} />
                          ))}
                          <Text style={styles.guidedStepLabel}>Step {guidedStep} of 4</Text>
                        </View>
                      )}

                      {/* Step prompt card */}
                      <View style={styles.guidedStepCard}>
                        <Text style={styles.guidedPromptText}>{GUIDED_STEP_PROMPTS[guidedStep]}</Text>

                        {/* Steps 0 – 4: input + mic */}
                        {guidedStep < 5 && (
                          <>
                            <View style={[styles.voiceInputWrapper, { marginTop: 12, marginBottom: 0 }]}>
                              <TextInput
                                style={styles.voiceTextInput}
                                value={transcriptBuffer}
                                onChangeText={(txt) => {
                                  setTranscriptBuffer(txt);
                                }}
                                placeholder={guidedStep === 0 ? "Say 'create event' or tap mic…" : guidedStep === 4 ? "Location or type 'skip'" : "Speak or type…"}
                                placeholderTextColor="#9CA3AF"
                                editable={guidedStep > 0}
                              />
                              <TouchableOpacity
                                style={[styles.inlineMicrophoneBtn, isListening && styles.inlineMicrophoneBtnListening]}
                                onPress={guidedStep === 0 ? () => setGuidedStep(1) : startVoiceRecognition}
                              >
                                <MaterialCommunityIcons name={isListening ? "stop" : guidedStep === 0 ? "play" : "microphone"} size={18} color="#FFF" />
                              </TouchableOpacity>
                            </View>
                            {isListening && (
                              <View style={[styles.listeningContainer, { marginTop: 8 }]}>
                                <ActivityIndicator size="small" color="#7C3AED" />
                                <Text style={styles.listeningText}>Listening…</Text>
                              </View>
                            )}
                            {guidedStep > 0 && (
                              <View style={styles.guidedNavRow}>
                                {guidedStep > 1 && (
                                  <TouchableOpacity style={styles.guidedBackBtn} onPress={() => setGuidedStep((guidedStep - 1) as GuidedStep)}>
                                    <Text style={styles.guidedBackBtnText}>← Back</Text>
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                  style={styles.guidedNextBtn}
                                  onPress={() => {
                                    const txt = transcriptBuffer.trim();
                                    if (!txt && guidedStep !== 4) return;
                                    storeGuidedField(txt || "skip");
                                    setTranscriptBuffer("");
                                  }}
                                >
                                  <Text style={styles.guidedNextBtnText}>{guidedStep === 4 ? "Preview →" : "Next →"}</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </>
                        )}

                        {/* Step 5: Confirm card */}
                        {guidedStep === 5 && (
                          <View style={{ marginTop: 12 }}>
                            <View style={styles.guidedConfirmRow}><Text style={styles.guidedConfirmLabel}>Event</Text><Text style={styles.guidedConfirmValue}>{guidedData.titleClean || guidedData.title || "—"}</Text></View>
                            <View style={styles.guidedConfirmRow}><Text style={styles.guidedConfirmLabel}>Type</Text><Text style={styles.guidedConfirmValue}>{EVENT_ICONS[guidedData.type]} {guidedData.type}</Text></View>
                            <View style={styles.guidedConfirmRow}><Text style={styles.guidedConfirmLabel}>Date</Text><Text style={styles.guidedConfirmValue}>{guidedData.date ? formatDate(guidedData.date) : "Not set"}</Text></View>
                            <View style={styles.guidedConfirmRow}><Text style={styles.guidedConfirmLabel}>Time</Text>
                              <TouchableOpacity onPress={() => { setTimePickerTarget("guided"); setShowTimePicker(true); }}>
                                <Text style={[styles.guidedConfirmValue, { color: "#7C3AED", textDecorationLine: "underline" }]}>{guidedData.time || "Tap to set"}</Text>
                              </TouchableOpacity>
                            </View>
                            {guidedData.location ? <View style={styles.guidedConfirmRow}><Text style={styles.guidedConfirmLabel}>Location</Text><Text style={styles.guidedConfirmValue}>{guidedData.location}</Text></View> : null}
                            {guidedData.isRecurringYearly && <View style={styles.guidedConfirmRow}><Text style={styles.guidedConfirmLabel}>Recurring</Text><Text style={styles.guidedConfirmValue}>🔁 Yearly</Text></View>}
                            <View style={styles.previewCardButtonsRow}>
                              <TouchableOpacity style={[styles.previewActionBtn, styles.previewCancelBtn]} onPress={() => setGuidedStep(4)}>
                                <Text style={styles.previewCancelBtnText}>✏️ Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={[styles.previewActionBtn, styles.previewConfirmBtn]} onPress={handleConfirmGuidedEvent}>
                                <Text style={styles.previewConfirmBtnText}>✅ Save Event</Text>
                              </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={{ alignItems: "center", marginTop: 10 }} onPress={resetGuidedWizard}>
                              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>✖ Cancel & Start Over</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
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
                        onPress={() => {
                          setCalendarTarget("composer");
                          setShowDateCalendar(true);
                        }}
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
                        onPress={() => {
                          setTimePickerTarget("composer");
                          setShowTimePicker(true);
                        }}
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
          <SegmentedControl
            tabs={[
              { id: "this_week", label: `This Week (${getThisWeekCount()})` },
              { id: "upcoming", label: `Upcoming (${getUpcomingCount()})` },
              { id: "completed", label: `Completed (${getCompletedCount()})` },
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as any)}
            style={{ marginHorizontal: 16 }}
          />

          {/* Timeline Listing */}
          <View style={styles.timelineContainer}>
            {loading ? (
              <LoadingState />
            ) : getFilteredEvents().length > 0 ? (
              getFilteredEvents().map((item) => (
                <View key={item.id}>
                  {renderEvent({ item })}
                </View>
              ))
            ) : (
              <EmptyState
                emoji="📅"
                title="No events found"
                subtitle="Expand the panels above to schedule a new event."
              />
            )}
          </View>

        </ScrollView>
      </View>

      {/* Date Calendar Modal (Composer / Voice) */}
      <Calendar
        visible={showDateCalendar}
        onClose={() => {
          setShowDateCalendar(false);
          setCalendarTarget(null);
        }}
        onSelectDate={(date) => {
          let finalDate = date;
          if (calendarTarget === "composer" || !calendarTarget) {
            if ((composerType === "Birthday" || composerType === "Anniversary") && composerIsRecurringYearly) {
              finalDate = normalizeBirthdayDate(date);
            }
            setComposerDate(finalDate);
          } else if (calendarTarget === "voice" && voicePreview) {
            if ((voicePreview.type === "Birthday" || voicePreview.type === "Anniversary") && voicePreview.isRecurringYearly) {
              finalDate = normalizeBirthdayDate(date);
            }
            setVoicePreview({ ...voicePreview, date: finalDate, isDateSpecified: true });
          }
          setShowDateCalendar(false);
          setCalendarTarget(null);
        }}
        selectedDate={calendarTarget === "voice" ? voicePreview?.date : composerDate}
        minDate={new Date()}
      />

      {/* Time Picker Modal (Composer / Voice) */}
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
                    (timePickerTarget === "voice" ? voicePreview?.time : timePickerTarget === "guided" ? guidedData.time : composerTime) === preset.value && styles.timePresetOptionActive,
                  ]}
                  onPress={() => {
                    if (timePickerTarget === "voice" && voicePreview) {
                      setVoicePreview({ ...voicePreview, time: preset.value, isTimeSpecified: true });
                    } else if (timePickerTarget === "guided") {
                      setGuidedData(prev => ({ ...prev, time: preset.value }));
                    } else {
                      setComposerTime(preset.value);
                    }
                    setShowTimePicker(false);
                    setTimePickerTarget(null);
                  }}
                >
                  <Text style={[
                    styles.timePresetOptionText,
                    (timePickerTarget === "voice" ? voicePreview?.time : composerTime) === preset.value && styles.timePresetOptionTextActive,
                  ]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Or Enter Custom Time</Text>
            <TextInput
              style={styles.input}
              value={timePickerTarget === "voice" ? (voicePreview?.time || "") : timePickerTarget === "guided" ? guidedData.time : composerTime}
              onChangeText={(txt) => {
                if (timePickerTarget === "voice" && voicePreview) {
                  setVoicePreview({ ...voicePreview, time: txt, isTimeSpecified: !!txt.trim() });
                } else if (timePickerTarget === "guided") {
                  setGuidedData(prev => ({ ...prev, time: txt }));
                } else {
                  setComposerTime(txt);
                }
              }}
              placeholder="e.g. 3:30 PM or 15:30"
              placeholderTextColor="#9CA3AF"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={() => {
                  setShowTimePicker(false);
                  setTimePickerTarget(null);
                }}
              >
                <Text style={styles.buttonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonSave]}
                onPress={() => {
                  setShowTimePicker(false);
                  setTimePickerTarget(null);
                }}
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
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    padding: 14,
    marginBottom: 12,
  },
  previewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FEF3C7",
    paddingBottom: 8,
  },
  previewCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D97706",
  },
  detectedTemplateText: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 2,
    fontWeight: "600",
  },
  confidenceBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  confidenceBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  confidenceHigh: {
    backgroundColor: "#D1FAE5",
  },
  confidenceHighText: {
    color: "#065F46",
  },
  confidenceMedium: {
    backgroundColor: "#FEF3C7",
  },
  confidenceMediumText: {
    color: "#92400E",
  },
  confidenceLow: {
    backgroundColor: "#FEE2E2",
  },
  confidenceLowText: {
    color: "#991B1B",
  },
  previewCardBody: {
    gap: 8,
    marginBottom: 12,
  },
  previewFieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewInput: {
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
  },
  previewTypesScroll: {
    marginBottom: 4,
  },
  previewTypeChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#FCD34D",
    marginRight: 6,
  },
  previewTypeChipActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  previewTypeChipText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "700",
  },
  previewTypeChipTextActive: {
    color: "#FFFFFF",
  },
  previewSideBySide: {
    flexDirection: "row",
    gap: 8,
  },
  previewSelectorBtn: {
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  previewSelectorBtnText: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "500",
  },
  missingBadgeWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 6,
    padding: 6,
    marginTop: 2,
  },
  missingBadgeWarningText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "600",
  },
  previewSwitchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  previewSwitchLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  previewCardButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  previewActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCancelBtn: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  previewCancelBtnText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
  },
  previewConfirmBtn: {
    backgroundColor: "#7C3AED",
  },
  previewConfirmBtnText: {
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

  // ── v2: Mode Toggle ────────────────────────────────────────────────────
  modeSelectorRow: {
    flexDirection: "row",
    backgroundColor: "#EDE9FE",
    borderRadius: 20,
    padding: 3,
    marginBottom: 12,
    gap: 3,
  },
  modePill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 17,
  },
  modePillActive: {
    backgroundColor: "#7C3AED",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
  },
  modePillTextActive: {
    color: "#FFFFFF",
  },

  // ── v2: Language Selector ───────────────────────────────────────────────
  langSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  langSelectorLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  langPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
    backgroundColor: "#F5F3FF",
  },
  langPillActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  langPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED",
  },
  langPillTextActive: {
    color: "#FFFFFF",
  },

  // ── v2: NLP hints ──────────────────────────────────────────────────────
  nlpHintBanner: {
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  nlpHintText: {
    fontSize: 12,
    color: "#6D28D9",
    fontWeight: "500",
  },
  guidedSuggestionBanner: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  guidedSuggestionText: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "600",
  },
  rawTitleSubtext: {
    fontSize: 10,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginTop: 2,
  },

  // ── v2: Guided Wizard ──────────────────────────────────────────────────
  guidedContainer: {
    marginTop: 4,
  },
  guidedStepIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  guidedStepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E9D5FF",
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
  },
  guidedStepDotActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#6D28D9",
  },
  guidedStepLabel: {
    fontSize: 11,
    color: "#7C3AED",
    fontWeight: "700",
    marginLeft: 4,
  },
  guidedStepCard: {
    backgroundColor: "#F5F3FF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  guidedPromptText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5B21B6",
    letterSpacing: -0.3,
  },
  guidedNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  guidedBackBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
    backgroundColor: "#FFFFFF",
  },
  guidedBackBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7C3AED",
  },
  guidedNextBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#7C3AED",
    alignItems: "center",
  },
  guidedNextBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  guidedConfirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE9FE",
  },
  guidedConfirmLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  guidedConfirmValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    flexShrink: 1,
    textAlign: "right",
    maxWidth: "70%",
  },
});

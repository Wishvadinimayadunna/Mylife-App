// ============================================
// MyLife App - TypeScript Interfaces
// Based on Class Diagram and UI Specifications
// ============================================

// ============================================
// PROFILE
// ============================================
export interface Profile {
  id: string; // profileID - primary key
  photoUri?: string;
  fullName: string;
  dateOfBirth: Date;
  email: string;
  phoneNumber: string;
  gender: "Male" | "Female" | "Other";
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// FAMILY
// ============================================
export type RelationshipType =
  | "Wife"
  | "Husband"
  | "Son"
  | "Daughter"
  | "Father"
  | "Mother"
  | "Brother"
  | "Sister"
  | "Grandfather"
  | "Grandmother"
  | "Other";

export interface FamilyMember {
  id: string;
  profileID: string; // Links to Profile
  photoUri?: string;
  fullName: string;
  relationship: RelationshipType;
  dateOfBirth: Date;
  gender: "Male" | "Female" | "Other";
  phoneNumber: string;
  email?: string;
  address?: string;
  birthdayReminderEnabled: boolean;
  notificationIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SHOPPING
// ============================================
export type ShoppingCategory =
  | "Groceries"
  | "Household"
  | "Medicine"
  | "Miscellaneous";

export type ShoppingPriority = "High" | "Medium" | "Low";

export type ShoppingItemType = "urgent" | "monthly";

export interface ShoppingItem {
  id: string;
  profileID: string;
  name: string;
  category: ShoppingCategory;
  type: ShoppingItemType; // urgent or monthly
  priority?: ShoppingPriority;
  isBought: boolean;
  dueDate?: Date; // For urgent items
  reminderTime?: string; // e.g., "18:30" for 6:30 PM
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
  boughtAt?: Date;
  groupId?: string; // For bulk-added items to display together
}

// ============================================
// HEALTH
// ============================================
export interface MedicalAppointment {
  id: string;
  profileID: string;
  doctorName: string;
  appointmentDate: Date;
  appointmentTime: string;
  reason?: string;
  notes?: string;
  reminderEnabled: boolean;
  reminderTime?: Date;
  prescription?: { medicineName: string; dosage?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicineReminder {
  id: string;
  profileID: string;
  medicineName: string;
  dosage?: string;
  reminderTime: string; // e.g., "08:00"
  isEnabled: boolean;
  takenDates?: string[]; // Array of "YYYY-MM-DD" strings for daily compliance
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthRecord {
  id: string;
  profileID: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  bloodSugar?: number; // mg/dL
  weight?: number; // kg
  bmi?: number;
  recordDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyContact {
  id: string;
  profileID: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MoodValue = "Amazing" | "Good" | "Neutral" | "Bad" | "Terrible";
export type SymptomSeverity = "Mild" | "Moderate" | "Severe";
export type PeriodFlow = "Light" | "Medium" | "Heavy";

export interface MoodRecord {
  id: string;
  profileID: string;
  mood: MoodValue;
  notes?: string;
  recordDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SymptomRecord {
  id: string;
  profileID: string;
  symptomName: string;
  severity: SymptomSeverity;
  notes?: string;
  recordDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PeriodRecord {
  id: string;
  profileID: string;
  startDate: Date;
  endDate?: Date;
  flow: PeriodFlow;
  notes?: string;
  isPrivate: true; // Always true — never shared
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// WELLNESS QUICK LOGS
// ============================================

export interface WaterLog {
  id: string;
  profileID: string;
  amountML: number; // ml per entry (default 250)
  recordedAt: Date;
  createdAt: Date;
}

export type SleepQuality = "Poor" | "Fair" | "Good" | "Excellent";

export interface SleepLog {
  id: string;
  profileID: string;
  durationHours: number;
  quality: SleepQuality;
  recordedAt: Date;
  createdAt: Date;
}

// ============================================
// UTILITY
// ============================================
export type UtilityType =
  | "Electricity"
  | "Water"
  | "Wi-Fi"
  | "Mobile"
  | "Gas"
  | "TV"
  | "Rent"
  | "Insurance"
  | "Other";

export interface UtilityBill {
  id: string;
  profileID: string;
  name: string;
  type: UtilityType;
  amount: number;
  dueDay: number; // Day of month (1-31)
  dueDate: Date; // Actual next due date
  isRecurring: boolean;
  reminderEnabled: boolean;
  reminderTime?: string; // e.g., "19:00" for 7:00 PM
  notificationId?: string;
  isShared: boolean;
  isPaid: boolean;
  paidDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// FINANCE
// ============================================
export type TransactionType = "income" | "expense";

export type IncomeCategoryType =
  | "Salary"
  | "Business"
  | "Freelance"
  | "Investment"
  | "Rental"
  | "Bonus"
  | "Gift"
  | "Other";

export type ExpenseCategoryType =
  | "Food"
  | "Transport"
  | "Bills"
  | "Shopping"
  | "Entertainment"
  | "Health"
  | "Education"
  | "Clothing"
  | "Personal Care"
  | "Other";

// Union for backwards compatibility
export type FinanceCategory = IncomeCategoryType | ExpenseCategoryType;

export interface FinanceTransaction {
  id: string;
  profileID: string;
  type: TransactionType;
  amount: number;
  category: FinanceCategory;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  profitLossPercentage: number;
}

export interface MonthlyFinanceSummary {
  month: string; // e.g., "2025-01"
  income: number;
  expense: number;
  balance: number;
}

// ============================================
// TO-DO LIST
// ============================================
export type TaskPriority = "High" | "Medium" | "Low";
export type TaskCategory =
  | "Personal"
  | "Work"
  | "Shopping"
  | "Health"
  | "Family"
  | "Finance"
  | "Other";
export type RecurrencePattern = "Daily" | "Weekly" | "Monthly" | "Yearly";

export interface Subtask {
  _id?: string;
  title: string;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface ToDoTask {
  id: string;
  profileID: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate?: Date;
  dueTime?: string; // Format: "HH:MM"
  isCompleted: boolean;
  completedAt?: Date;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  reminderEnabled: boolean;
  reminderTime?: string; // Format: "HH:MM"
  isShared: boolean;
  tags?: string[];
  subtasks?: Subtask[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// FUTURE EVENTS
// ============================================
export type EventType =
  | "Birthday"
  | "Anniversary"
  | "Wedding"
  | "Party"
  | "Vacation"
  | "Interview"
  | "Meeting"
  | "Other";

export type ReminderOption = "1_week_before" | "1_day_before" | "same_day";

export interface FutureEvent {
  id: string;
  profileID: string;
  title: string;
  type: EventType;
  eventDate: Date | string; // String when from API, Date when processed
  eventTime: string;
  location?: string;
  notes?: string;
  reminderOptions: ReminderOption[];
  sendReminderToSpouse: boolean;
  isShared: boolean;
  isRecurringYearly: boolean; // For birthdays/anniversaries
  /** IDs of scheduled expo-notifications — used for cancellation on edit/delete */
  notificationIds?: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string;
}

// ============================================
// NOTIFICATIONS
// ============================================
export type NotificationType =
  | "birthday"
  | "utility_bill"
  | "medicine"
  | "appointment"
  | "task"
  | "event"
  | "shopping"
  | "finance";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  scheduledFor: Date;
  isDelivered: boolean;
  createdAt: Date;
}

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
  notes?: string;
  reminderEnabled: boolean;
  reminderTime?: Date;
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

export type FinanceCategory =
  | "Salary"
  | "Food"
  | "Transport"
  | "Bills"
  | "Shopping"
  | "Entertainment"
  | "Health"
  | "Education"
  | "Investment"
  | "Other";

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
export type TaskRepeat = "None" | "Daily" | "Weekly" | "Monthly";

export interface ToDoTask {
  id: string;
  profileID: string;
  title: string;
  description?: string;
  isDone: boolean;
  priority?: TaskPriority;
  dueDate?: Date;
  reminderTime?: string;
  reminderEnabled: boolean;
  repeat: TaskRepeat;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
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

// ============================================
// AsyncStorage Utility
// Handles all local data persistence
// ============================================

import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage Keys
export const STORAGE_KEYS = {
  PROFILE: "@mylife_profile",
  FAMILY_MEMBERS: "@mylife_family_members",
  SHOPPING_ITEMS: "@mylife_shopping_items",
  HEALTH_APPOINTMENTS: "@mylife_health_appointments",
  MEDICINE_REMINDERS: "@mylife_medicine_reminders",
  HEALTH_RECORDS: "@mylife_health_records",
  EMERGENCY_CONTACTS: "@mylife_emergency_contacts",
  UTILITY_BILLS: "@mylife_utility_bills",
  FINANCE_TRANSACTIONS: "@mylife_finance_transactions",
  TODO_TASKS: "@mylife_todo_tasks",
  FUTURE_EVENTS: "@mylife_future_events",
};

// ============================================
// GENERIC STORAGE FUNCTIONS
// ============================================

export async function saveData<T>(key: string, data: T): Promise<boolean> {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error(`Error saving data for key ${key}:`, error);
    return false;
  }
}

export async function getData<T>(key: string): Promise<T | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`Error reading data for key ${key}:`, error);
    return null;
  }
}

export async function removeData(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing data for key ${key}:`, error);
    return false;
  }
}

export async function clearAllData(): Promise<boolean> {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.error("Error clearing all data:", error);
    return false;
  }
}

// ============================================
// HELPER FUNCTIONS FOR SPECIFIC DATA TYPES
// ============================================

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Date serialization helpers
export function serializeDate(date: Date): string {
  return date.toISOString();
}

export function deserializeDate(dateString: string): Date {
  return new Date(dateString);
}

// ============================================
// AUTH TOKEN HELPERS
// ============================================

export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem("authToken");
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
}

export async function clearAuthToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("userId");
  } catch (error) {
    console.error("Error clearing auth token:", error);
  }
}

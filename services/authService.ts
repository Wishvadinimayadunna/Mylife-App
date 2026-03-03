// ============================================
// Auth Service - Authentication & Authorization
// Handles user login, registration, and logout
// ============================================

import api from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}

// ============================================
// Login User
// ============================================
export const login = async (
  credentials: LoginCredentials,
): Promise<AuthResponse> => {
  try {
    const response = await api.post("/auth/login", credentials);
    const { token, user } = response.data;

    // Save token and user ID to AsyncStorage
    await AsyncStorage.setItem("authToken", token);
    await AsyncStorage.setItem("userId", user.id);

    return { token, user };
  } catch (error: any) {
    const message = error.response?.data?.message || "Login failed";
    throw new Error(message);
  }
};

// ============================================
// Register New User
// ============================================
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  try {
    const response = await api.post("/auth/register", data);
    const { token, user } = response.data;

    // Save token and user ID to AsyncStorage
    await AsyncStorage.setItem("authToken", token);
    await AsyncStorage.setItem("userId", user.id);

    return { token, user };
  } catch (error: any) {
    const message = error.response?.data?.message || "Registration failed";
    throw new Error(message);
  }
};

// ============================================
// Logout User
// ============================================
export const logout = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("userId");
  } catch (error: any) {
    console.error("Error during logout:", error);
    throw error;
  }
};

// ============================================
// Check if User is Authenticated
// ============================================
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem("authToken");
    return !!token;
  } catch (error) {
    return false;
  }
};

// ============================================
// Get Current User ID
// ============================================
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem("userId");
  } catch (error: any) {
    return null;
  }
};

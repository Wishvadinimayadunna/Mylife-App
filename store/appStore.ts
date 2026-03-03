// ============================================
// Global Store - Zustand State Management
// Manages app-wide state for all modules
// ============================================

import { Profile } from "@/types";
import { create } from "zustand";

interface AppState {
  // Authentication
  isAuthenticated: boolean;
  userId: string | null;
  authToken: string | null;
  setAuth: (token: string, userId: string) => void;
  clearAuth: () => void;

  // Profile
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;

  // App initialization
  isInitialized: boolean;
  setIsInitialized: (initialized: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Authentication
  isAuthenticated: false,
  userId: null,
  authToken: null,
  setAuth: (token, userId) =>
    set({
      authToken: token,
      userId,
      isAuthenticated: true,
    }),
  clearAuth: () =>
    set({
      authToken: null,
      userId: null,
      isAuthenticated: false,
      profile: null,
    }),

  // Profile
  profile: null,
  setProfile: (profile) => set({ profile }),

  // Loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Error
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Initialization
  isInitialized: false,
  setIsInitialized: (initialized) => set({ isInitialized: initialized }),
}));

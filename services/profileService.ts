// ============================================
// Profile Service - API Integration
// Handles profile data with backend API
// ============================================

import { Profile } from "@/types";
import api from "@/utils/api";
import { getCurrentUserId } from "./authService";

class ProfileService {
  // ============================================
  // GET PROFILE
  // ============================================
  async getProfile(): Promise<Profile | null> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.log("No userId found in storage");
        return null;
      }

      // Backend uses auth token, not userId in URL
      const response = await api.get("/profile");
      const profile = response.data;
      // Map MongoDB _id to id
      return {
        ...profile,
        id: profile._id || profile.id,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log("Profile not found (404)");
        return null; // Profile doesn't exist yet
      }
      console.error("Error getting profile:", error);
      console.error("Error details:", error.response?.data);
      return null;
    }
  }

  // ============================================
  // ADD PROFILE
  // ============================================
  async addProfile(
    profileData: Omit<Profile, "id" | "createdAt" | "updatedAt">,
  ): Promise<Profile> {
    try {
      const response = await api.post("/profile", profileData);
      const profile = response.data;
      // Map MongoDB _id to id
      return {
        ...profile,
        id: profile._id || profile.id,
      };
    } catch (error: any) {
      console.error("Error adding profile:", error);
      console.error("Error details:", error.response?.data);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to create profile";
      throw new Error(message);
    }
  }

  // ============================================
  // EDIT PROFILE
  // ============================================
  async editProfile(profileData: Partial<Profile>): Promise<Profile | null> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("User not authenticated");

      // Backend uses auth token, not userId in URL
      const response = await api.put("/profile", profileData);
      const profile = response.data;
      // Map MongoDB _id to id
      return {
        ...profile,
        id: profile._id || profile.id,
      };
    } catch (error: any) {
      console.error("Error editing profile:", error);
      console.error("Error details:", error.response?.data);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update profile";
      throw new Error(message);
    }
  }

  // ============================================
  // VIEW PROFILE (same as get, but explicit)
  // ============================================
  async viewProfile(): Promise<Profile | null> {
    return this.getProfile();
  }
}

export default new ProfileService();

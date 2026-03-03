// ============================================
// Family Service - API Integration
// Handles family member data with backend API
// ============================================

import { FamilyMember } from "@/types";
import api from "@/utils/api";
import {
    cancelNotification,
    scheduleBirthdayReminder,
} from "@/utils/notifications";

class FamilyService {
  // ============================================
  // GET ALL FAMILY MEMBERS
  // ============================================
  async getFamilyMembers(profileID: string): Promise<FamilyMember[]> {
    try {
      // Backend uses userId from auth token, not profileID in query
      const response = await api.get("/family");
      // Map MongoDB _id to id for consistency
      return response.data.map((member: any) => ({
        ...member,
        id: member._id || member.id,
      }));
    } catch (error: any) {
      console.error("Error getting family members:", error);
      console.error("Error details:", error.response?.data);
      return [];
    }
  }

  // ============================================
  // ADD FAMILY MEMBER
  // ============================================
  async addFamilyMember(
    memberData: Omit<FamilyMember, "id" | "createdAt" | "updatedAt">,
  ): Promise<FamilyMember> {
    try {
      // Remove profileID as backend uses userId from auth token
      const { profileID, ...dataToSend } = memberData as any;
      const response = await api.post("/family", dataToSend);
      const newMember = {
        ...response.data,
        id: response.data._id || response.data.id,
      };

      // Schedule birthday reminder if enabled
      if (newMember.birthdayReminderEnabled) {
        await scheduleBirthdayReminder(
          newMember.fullName,
          newMember.dateOfBirth,
          newMember.id,
        );
      }

      return newMember;
    } catch (error: any) {
      console.error("Error adding family member:", error);
      console.error("Error details:", error.response?.data);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to add family member";
      throw new Error(message);
    }
  }

  // ============================================
  // EDIT FAMILY MEMBER
  // ============================================
  async editFamilyMember(
    memberId: string,
    updates: Partial<FamilyMember>,
  ): Promise<FamilyMember | null> {
    try {
      const response = await api.put(`/family/${memberId}`, updates);
      const updatedMember = response.data;

      // Update birthday reminder if changed
      if (updates.birthdayReminderEnabled !== undefined) {
        if (updatedMember.birthdayReminderEnabled) {
          await scheduleBirthdayReminder(
            updatedMember.fullName,
            updatedMember.dateOfBirth,
            updatedMember.id,
          );
        } else {
          await cancelNotification(updatedMember.id);
        }
      }

      return updatedMember;
    } catch (error: any) {
      console.error("Error editing family member:", error);
      const message =
        error.response?.data?.message || "Failed to update family member";
      throw new Error(message);
    }
  }

  // ============================================
  // DELETE FAMILY MEMBER
  // ============================================
  async deleteFamilyMember(memberId: string): Promise<boolean> {
    try {
      await api.delete(`/family/${memberId}`);

      // Cancel any scheduled reminders
      await cancelNotification(memberId);

      return true;
    } catch (error: any) {
      console.error("Error deleting family member:", error);
      return false;
    }
  }

  // ============================================
  // SET BIRTHDAY REMINDER
  // ============================================
  async setBirthdayReminder(
    memberId: string,
    enabled: boolean,
  ): Promise<boolean> {
    try {
      const updates = { birthdayReminderEnabled: enabled };
      const updatedMember = await this.editFamilyMember(memberId, updates);
      return !!updatedMember;
    } catch (error) {
      console.error("Error setting birthday reminder:", error);
      return false;
    }
  }
}

export default new FamilyService();

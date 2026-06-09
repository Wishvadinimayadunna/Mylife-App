// ============================================
// Family Service - API Integration
// Handles family member data with backend API
// ============================================

import { FamilyMember } from "@/types";
import api from "@/utils/api";
import {
    cancelNotifications,
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
      const newMember: FamilyMember = {
        ...response.data,
        id: response.data._id || response.data.id,
      };

      // Schedule birthday reminder if enabled
      if (newMember.birthdayReminderEnabled) {
        const notificationIds = await scheduleBirthdayReminder(
          newMember.fullName,
          newMember.dateOfBirth,
          newMember.id,
        );
        if (notificationIds.length > 0) {
          // Persist the scheduled notification IDs back to the database
          await api.put(`/family/${newMember.id}`, { notificationIds });
          newMember.notificationIds = notificationIds;
        }
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
      // Check if fields affecting the birthday notification are changed
      const shouldReschedule =
        updates.birthdayReminderEnabled !== undefined ||
        updates.dateOfBirth !== undefined ||
        updates.fullName !== undefined;

      let oldNotificationIds: string[] = [];

      if (shouldReschedule) {
        try {
          const existingResponse = await api.get(`/family/${memberId}`);
          oldNotificationIds = existingResponse.data?.notificationIds || [];
        } catch (err) {
          console.warn("[FamilyService] Could not fetch existing member for notification cleanup:", err);
        }
      }

      const response = await api.put(`/family/${memberId}`, updates);
      const updatedMember = response.data;

      // Handle birthday notification updates
      if (shouldReschedule) {
        // 1. Cancel old notifications
        if (oldNotificationIds.length > 0) {
          await cancelNotifications(oldNotificationIds);
        }

        // 2. Schedule new notifications if enabled
        if (updatedMember.birthdayReminderEnabled) {
          const newNotificationIds = await scheduleBirthdayReminder(
            updatedMember.fullName,
            updatedMember.dateOfBirth,
            updatedMember._id || updatedMember.id,
          );
          await api.put(`/family/${memberId}`, { notificationIds: newNotificationIds });
          updatedMember.notificationIds = newNotificationIds;
        } else {
          // Explicitly clear notification IDs from DB
          await api.put(`/family/${memberId}`, { notificationIds: [] });
          updatedMember.notificationIds = [];
        }
      }

      return {
        ...updatedMember,
        id: updatedMember._id || updatedMember.id,
      };
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
      let notificationIds: string[] = [];
      try {
        const existingResponse = await api.get(`/family/${memberId}`);
        notificationIds = existingResponse.data?.notificationIds || [];
      } catch (err) {
        console.warn("[FamilyService] Could not fetch family member to clean notifications before delete:", err);
      }

      await api.delete(`/family/${memberId}`);

      // Cancel any scheduled reminders
      if (notificationIds.length > 0) {
        await cancelNotifications(notificationIds);
      }

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

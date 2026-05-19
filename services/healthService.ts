// ============================================
// Health Service
// Medical appointments, medicine reminders, health records, emergency contacts
// ============================================

import {
    EmergencyContact,
    HealthRecord,
    MedicalAppointment,
    MedicineReminder,
} from "@/types";
import apiClient from "@/utils/api";

const healthService = {
  // ============================================
  // MEDICAL APPOINTMENTS
  // ============================================

  async getAppointments(): Promise<MedicalAppointment[]> {
    try {
      const response = await apiClient.get("/health/appointments");
      return response.data;
    } catch (error) {
      console.error("Get appointments error:", error);
      throw error;
    }
  },

  async addAppointment(
    data: Omit<MedicalAppointment, "id" | "createdAt" | "updatedAt">,
  ): Promise<MedicalAppointment> {
    try {
      const response = await apiClient.post("/health/appointments", data);
      return response.data;
    } catch (error) {
      console.error("Add appointment error:", error);
      throw error;
    }
  },

  async updateAppointment(
    id: string,
    data: Partial<MedicalAppointment>,
  ): Promise<MedicalAppointment> {
    try {
      const response = await apiClient.put(`/health/appointments/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("Update appointment error:", error);
      throw error;
    }
  },

  async deleteAppointment(id: string): Promise<void> {
    try {
      await apiClient.delete(`/health/appointments/${id}`);
    } catch (error) {
      console.error("Delete appointment error:", error);
      throw error;
    }
  },

  // ============================================
  // MEDICINE REMINDERS
  // ============================================

  async getMedicineReminders(): Promise<MedicineReminder[]> {
    try {
      const response = await apiClient.get("/health/medicines");
      return response.data;
    } catch (error) {
      console.error("Get medicine reminders error:", error);
      throw error;
    }
  },

  async addMedicineReminder(
    data: Omit<MedicineReminder, "id" | "createdAt" | "updatedAt">,
  ): Promise<MedicineReminder> {
    try {
      const response = await apiClient.post("/health/medicines", data);
      return response.data;
    } catch (error) {
      console.error("Add medicine reminder error:", error);
      throw error;
    }
  },

  async updateMedicineReminder(
    id: string,
    data: Partial<MedicineReminder>,
  ): Promise<MedicineReminder> {
    try {
      const response = await apiClient.put(`/health/medicines/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("Update medicine reminder error:", error);
      throw error;
    }
  },

  async deleteMedicineReminder(id: string): Promise<void> {
    try {
      await apiClient.delete(`/health/medicines/${id}`);
    } catch (error) {
      console.error("Delete medicine reminder error:", error);
      throw error;
    }
  },

  // ============================================
  // HEALTH RECORDS
  // ============================================

  async getHealthRecords(): Promise<HealthRecord[]> {
    try {
      const response = await apiClient.get("/health/records");
      return response.data;
    } catch (error) {
      console.error("Get health records error:", error);
      throw error;
    }
  },

  async addHealthRecord(
    data: Omit<HealthRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<HealthRecord> {
    try {
      const response = await apiClient.post("/health/records", data);
      return response.data;
    } catch (error) {
      console.error("Add health record error:", error);
      throw error;
    }
  },

  async updateHealthRecord(
    id: string,
    data: Partial<HealthRecord>,
  ): Promise<HealthRecord> {
    try {
      const response = await apiClient.put(`/health/records/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("Update health record error:", error);
      throw error;
    }
  },

  async deleteHealthRecord(id: string): Promise<void> {
    try {
      await apiClient.delete(`/health/records/${id}`);
    } catch (error) {
      console.error("Delete health record error:", error);
      throw error;
    }
  },

  // ============================================
  // EMERGENCY CONTACTS
  // ============================================

  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    try {
      const response = await apiClient.get("/health/emergency-contacts");
      return response.data;
    } catch (error) {
      console.error("Get emergency contacts error:", error);
      throw error;
    }
  },

  async addEmergencyContact(
    data: Omit<EmergencyContact, "id" | "createdAt" | "updatedAt">,
  ): Promise<EmergencyContact> {
    try {
      const response = await apiClient.post("/health/emergency-contacts", data);
      return response.data;
    } catch (error) {
      console.error("Add emergency contact error:", error);
      throw error;
    }
  },

  async updateEmergencyContact(
    id: string,
    data: Partial<EmergencyContact>,
  ): Promise<EmergencyContact> {
    try {
      const response = await apiClient.put(
        `/health/emergency-contacts/${id}`,
        data,
      );
      return response.data;
    } catch (error) {
      console.error("Update emergency contact error:", error);
      throw error;
    }
  },

  async deleteEmergencyContact(id: string): Promise<void> {
    try {
      await apiClient.delete(`/health/emergency-contacts/${id}`);
    } catch (error) {
      console.error("Delete emergency contact error:", error);
      throw error;
    }
  },
};

export default healthService;

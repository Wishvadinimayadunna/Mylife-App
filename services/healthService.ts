// ============================================
// Health Service
// Appointments, Medication, Vitals, Emergency Contacts,
// Mood, Symptoms, Period
// ============================================

import {
    EmergencyContact,
    HealthRecord,
    MedicalAppointment,
    MedicineReminder,
    MoodRecord,
    PeriodRecord,
    SleepLog,
    SleepQuality,
    SymptomRecord,
    WaterLog,
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

  async addAppointment(data: Omit<MedicalAppointment, "id" | "createdAt" | "updatedAt">): Promise<MedicalAppointment> {
    try {
      const response = await apiClient.post("/health/appointments", data);
      return response.data;
    } catch (error) {
      console.error("Add appointment error:", error);
      throw error;
    }
  },

  async updateAppointment(id: string, data: Partial<MedicalAppointment>): Promise<MedicalAppointment> {
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

  async addMedicineReminder(data: Omit<MedicineReminder, "id" | "createdAt" | "updatedAt">): Promise<MedicineReminder> {
    try {
      const response = await apiClient.post("/health/medicines", data);
      return response.data;
    } catch (error) {
      console.error("Add medicine reminder error:", error);
      throw error;
    }
  },

  async updateMedicineReminder(id: string, data: Partial<MedicineReminder>): Promise<MedicineReminder> {
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
  // HEALTH RECORDS (VITALS)
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

  async addHealthRecord(data: Omit<HealthRecord, "id" | "createdAt" | "updatedAt">): Promise<HealthRecord> {
    try {
      const response = await apiClient.post("/health/records", data);
      return response.data;
    } catch (error) {
      console.error("Add health record error:", error);
      throw error;
    }
  },

  async updateHealthRecord(id: string, data: Partial<HealthRecord>): Promise<HealthRecord> {
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

  async addEmergencyContact(data: Omit<EmergencyContact, "id" | "createdAt" | "updatedAt">): Promise<EmergencyContact> {
    try {
      const response = await apiClient.post("/health/emergency-contacts", data);
      return response.data;
    } catch (error) {
      console.error("Add emergency contact error:", error);
      throw error;
    }
  },

  async updateEmergencyContact(id: string, data: Partial<EmergencyContact>): Promise<EmergencyContact> {
    try {
      const response = await apiClient.put(`/health/emergency-contacts/${id}`, data);
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

  // ============================================
  // MOOD RECORDS
  // ============================================

  async getMoods(): Promise<MoodRecord[]> {
    try {
      const response = await apiClient.get("/health/moods");
      return response.data;
    } catch (error) {
      console.error("Get moods error:", error);
      throw error;
    }
  },

  async addMood(data: Omit<MoodRecord, "id" | "createdAt" | "updatedAt">): Promise<MoodRecord> {
    try {
      const response = await apiClient.post("/health/moods", data);
      return response.data;
    } catch (error) {
      console.error("Add mood error:", error);
      throw error;
    }
  },

  async updateMood(id: string, data: Partial<MoodRecord>): Promise<MoodRecord> {
    try {
      const response = await apiClient.put(`/health/moods/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("Update mood error:", error);
      throw error;
    }
  },

  async deleteMood(id: string): Promise<void> {
    try {
      await apiClient.delete(`/health/moods/${id}`);
    } catch (error) {
      console.error("Delete mood error:", error);
      throw error;
    }
  },

  // ============================================
  // SYMPTOM RECORDS
  // ============================================

  async getSymptoms(): Promise<SymptomRecord[]> {
    try {
      const response = await apiClient.get("/health/symptoms");
      return response.data;
    } catch (error) {
      console.error("Get symptoms error:", error);
      throw error;
    }
  },

  async addSymptom(data: Omit<SymptomRecord, "id" | "createdAt" | "updatedAt">): Promise<SymptomRecord> {
    try {
      const response = await apiClient.post("/health/symptoms", data);
      return response.data;
    } catch (error) {
      console.error("Add symptom error:", error);
      throw error;
    }
  },

  async updateSymptom(id: string, data: Partial<SymptomRecord>): Promise<SymptomRecord> {
    try {
      const response = await apiClient.put(`/health/symptoms/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("Update symptom error:", error);
      throw error;
    }
  },

  async deleteSymptom(id: string): Promise<void> {
    try {
      await apiClient.delete(`/health/symptoms/${id}`);
    } catch (error) {
      console.error("Delete symptom error:", error);
      throw error;
    }
  },

  // ============================================
  // PERIOD RECORDS
  // ============================================

  async getPeriods(): Promise<PeriodRecord[]> {
    try {
      const response = await apiClient.get("/health/periods");
      return response.data;
    } catch (error) {
      console.error("Get periods error:", error);
      throw error;
    }
  },

  async addPeriod(data: Omit<PeriodRecord, "id" | "createdAt" | "updatedAt" | "isPrivate">): Promise<PeriodRecord> {
    try {
      const response = await apiClient.post("/health/periods", data);
      return response.data;
    } catch (error) {
      console.error("Add period error:", error);
      throw error;
    }
  },

  async updatePeriod(id: string, data: Partial<Omit<PeriodRecord, "isPrivate">>): Promise<PeriodRecord> {
    try {
      const response = await apiClient.put(`/health/periods/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("Update period error:", error);
      throw error;
    }
  },

  async deletePeriod(id: string): Promise<void> {
    try {
      await apiClient.delete(`/health/periods/${id}`);
    } catch (error) {
      console.error("Delete period error:", error);
      throw error;
    }
  },

  // ============================================
  // MEDICINE COMPLIANCE
  // ============================================

  async logMedicineTaken(id: string, date: string, taken: boolean): Promise<MedicineReminder> {
    try {
      const response = await apiClient.patch(`/health/medicines/${id}/taken`, { date, taken });
      return response.data;
    } catch (error) {
      console.error("Log medicine taken error:", error);
      throw error;
    }
  },

  // ============================================
  // WATER LOG
  // ============================================

  async getWaterLogs(): Promise<WaterLog[]> {
    try {
      const response = await apiClient.get("/health/water");
      return response.data;
    } catch (error) {
      console.error("Get water logs error:", error);
      throw error;
    }
  },

  async addWaterLog(amountML: number = 250): Promise<WaterLog> {
    try {
      const response = await apiClient.post("/health/water", { amountML, recordedAt: new Date() });
      return response.data;
    } catch (error) {
      console.error("Add water log error:", error);
      throw error;
    }
  },

  async deleteWaterLog(id: string): Promise<void> {
    try {
      await apiClient.delete(`/health/water/${id}`);
    } catch (error) {
      console.error("Delete water log error:", error);
      throw error;
    }
  },

  // ============================================
  // SLEEP LOG
  // ============================================

  async getSleepLogs(): Promise<SleepLog[]> {
    try {
      const response = await apiClient.get("/health/sleep");
      return response.data;
    } catch (error) {
      console.error("Get sleep logs error:", error);
      throw error;
    }
  },

  async addSleepLog(durationHours: number, quality: SleepQuality = "Good"): Promise<SleepLog> {
    try {
      const response = await apiClient.post("/health/sleep", { durationHours, quality, recordedAt: new Date() });
      return response.data;
    } catch (error) {
      console.error("Add sleep log error:", error);
      throw error;
    }
  },

  async deleteSleepLog(id: string): Promise<void> {
    try {
      await apiClient.delete(`/health/sleep/${id}`);
    } catch (error) {
      console.error("Delete sleep log error:", error);
      throw error;
    }
  },
};

export default healthService;

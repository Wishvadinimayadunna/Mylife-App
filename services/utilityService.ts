// ============================================
// Utility Bill Service
// Electricity, Water, Wi-Fi, Mobile, Gas, TV, Rent, Insurance bills
// ============================================

import { UtilityBill } from "@/types";
import apiClient from "@/utils/api";

// Helper to map MongoDB _id to id
const mapBill = (bill: any): UtilityBill => ({
  ...bill,
  id: String(bill._id || bill.id),
  _id: undefined,
});

const utilityService = {
  // Get all utility bills
  async getAllBills(): Promise<UtilityBill[]> {
    try {
      const response = await apiClient.get("/utility");
      return (response.data || []).map(mapBill);
    } catch (error) {
      console.error("Get all bills error:", error);
      throw error;
    }
  },

  // Get unpaid bills
  async getUnpaidBills(): Promise<UtilityBill[]> {
    try {
      const response = await apiClient.get("/utility/unpaid");
      return (response.data || []).map(mapBill);
    } catch (error) {
      console.error("Get unpaid bills error:", error);
      throw error;
    }
  },

  // Get paid bills
  async getPaidBills(): Promise<UtilityBill[]> {
    try {
      const response = await apiClient.get("/utility/paid");
      return (response.data || []).map(mapBill);
    } catch (error) {
      console.error("Get paid bills error:", error);
      throw error;
    }
  },

  // Add utility bill
  async addBill(
    data: Omit<UtilityBill, "id" | "createdAt" | "updatedAt">,
  ): Promise<UtilityBill> {
    try {
      const response = await apiClient.post("/utility", data);
      return mapBill(response.data);
    } catch (error) {
      console.error("Add bill error:", error);
      throw error;
    }
  },

  // Update utility bill
  async updateBill(
    id: string,
    data: Partial<UtilityBill>,
  ): Promise<UtilityBill> {
    try {
      const response = await apiClient.put(`/utility/${id}`, data);
      return mapBill(response.data);
    } catch (error) {
      console.error("Update bill error:", error);
      throw error;
    }
  },

  // Mark bill as paid
  async markBillAsPaid(id: string): Promise<UtilityBill> {
    try {
      const response = await apiClient.patch(`/utility/${id}/pay`);
      return mapBill(response.data);
    } catch (error) {
      console.error("Mark bill as paid error:", error);
      throw error;
    }
  },

  // Mark bill as unpaid
  async markBillAsUnpaid(id: string): Promise<UtilityBill> {
    try {
      const response = await apiClient.patch(`/utility/${id}/unpay`);
      return mapBill(response.data);
    } catch (error) {
      console.error("Mark bill as unpaid error:", error);
      throw error;
    }
  },

  // Delete utility bill
  async deleteBill(id: string): Promise<void> {
    try {
      await apiClient.delete(`/utility/${id}`);
    } catch (error) {
      console.error("Delete bill error:", error);
      throw error;
    }
  },
};

export default utilityService;

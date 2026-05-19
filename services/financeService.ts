// ============================================
// Finance Service - Income & Expense Tracking
// ============================================

import { FinanceSummary, FinanceTransaction, MonthlyFinanceSummary } from '@/types';
import apiClient from "@/utils/api";

class FinanceService {
  // ============================================
  // GET ALL TRANSACTIONS
  // ============================================
  async getTransactions(profileID: string): Promise<FinanceTransaction[]> {
    try {
      const response = await apiClient.get("/finance");
      return response.data;
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  // ============================================
  // ADD TRANSACTION
  // ============================================
  async addTransaction(
    transactionData: Omit<FinanceTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<FinanceTransaction> {
    try {
      const response = await apiClient.post("/finance", transactionData);
      return response.data;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  // ============================================
  // UPDATE TRANSACTION
  // ============================================
  async updateTransaction(
    id: string,
    data: Partial<FinanceTransaction>
  ): Promise<FinanceTransaction> {
    try {
      const response = await apiClient.put(`/finance/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  // ============================================
  // DELETE TRANSACTION
  // ============================================
  async deleteTransaction(transactionId: string): Promise<boolean> {
    try {
      await apiClient.delete(`/finance/${transactionId}`);
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  }

  // ============================================
  // GET TODAY'S SUMMARY
  // ============================================
  async getTodaySummary(profileID: string): Promise<FinanceSummary> {
    try {
      const response = await apiClient.get("/finance/summary/today");
      return response.data;
    } catch (error) {
      console.error('Error getting today summary:', error);
      return { totalIncome: 0, totalExpense: 0, balance: 0, profitLossPercentage: 0 };
    }
  }

  // ============================================
  // GET WEEKLY SUMMARY
  // ============================================
  async getWeeklySummary(profileID: string): Promise<FinanceSummary> {
    try {
      const response = await apiClient.get("/finance/summary/week");
      return response.data;
    } catch (error) {
      console.error('Error getting weekly summary:', error);
      return { totalIncome: 0, totalExpense: 0, balance: 0, profitLossPercentage: 0 };
    }
  }

  // ============================================
  // GET MONTHLY SUMMARY
  // ============================================
  async getMonthlySummary(profileID: string, monthYear: string): Promise<MonthlyFinanceSummary> {
    try {
      const response = await apiClient.get(`/finance/summary/month/${monthYear}`);
      return response.data;
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      return { month: monthYear, income: 0, expense: 0, balance: 0 };
    }
  }

  // ============================================
  // GET SUMMARY BY DATE RANGE
  // ============================================
  async getSummaryByDateRange(
    profileID: string,
    startDate: Date,
    endDate: Date
  ): Promise<FinanceSummary> {
    try {
      const response = await apiClient.get("/finance/summary/range", {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error getting summary by date range:', error);
      return { totalIncome: 0, totalExpense: 0, balance: 0, profitLossPercentage: 0 };
    }
  }

  // ============================================
  // GET RECENT TRANSACTIONS
  // ============================================
  async getRecentTransactions(profileID: string, limit: number = 10): Promise<FinanceTransaction[]> {
    try {
      const response = await apiClient.get(`/finance/recent/${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      return [];
    }
  }

  // ============================================
  // GET TRANSACTIONS BY DATE RANGE
  // ============================================
  async getTransactionsByDateRange(
    profileID: string,
    startDate: Date,
    endDate: Date
  ): Promise<FinanceTransaction[]> {
    try {
      const response = await apiClient.get("/finance/range", {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error getting transactions by date range:', error);
      return [];
    }
  }
}

export default new FinanceService();

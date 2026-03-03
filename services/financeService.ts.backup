// ============================================
// Finance Service - Income & Expense Tracking
// ============================================

import { FinanceSummary, FinanceTransaction, MonthlyFinanceSummary } from '@/types';
import { generateId, getData, saveData, STORAGE_KEYS } from '@/utils/storage';

class FinanceService {
  // ============================================
  // GET ALL TRANSACTIONS
  // ============================================
  async getTransactions(profileID: string): Promise<FinanceTransaction[]> {
    try {
      const transactions = await getData<FinanceTransaction[]>(STORAGE_KEYS.FINANCE_TRANSACTIONS);
      if (!transactions) return [];
      return transactions.filter(t => t.profileID === profileID);
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
      const newTransaction: FinanceTransaction = {
        ...transactionData,
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existing = await getData<FinanceTransaction[]>(STORAGE_KEYS.FINANCE_TRANSACTIONS) || [];
      const updated = [...existing, newTransaction];
      await saveData(STORAGE_KEYS.FINANCE_TRANSACTIONS, updated);

      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  // ============================================
  // DELETE TRANSACTION
  // ============================================
  async deleteTransaction(transactionId: string): Promise<boolean> {
    try {
      const transactions = await getData<FinanceTransaction[]>(STORAGE_KEYS.FINANCE_TRANSACTIONS) || [];
      const filtered = transactions.filter(t => t.id !== transactionId);
      await saveData(STORAGE_KEYS.FINANCE_TRANSACTIONS, filtered);
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
      const transactions = await this.getTransactions(profileID);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        tDate.setHours(0, 0, 0, 0);
        return tDate.getTime() === today.getTime();
      });

      const income = todayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = todayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const balance = income - expense;
      const profitLossPercentage = income > 0 ? ((balance / income) * 100) : 0;

      return {
        totalIncome: income,
        totalExpense: expense,
        balance,
        profitLossPercentage,
      };
    } catch (error) {
      console.error('Error getting today summary:', error);
      return { totalIncome: 0, totalExpense: 0, balance: 0, profitLossPercentage: 0 };
    }
  }

  // ============================================
  // GET MONTHLY SUMMARY
  // ============================================
  async getMonthlySummary(profileID: string, monthYear: string): Promise<MonthlyFinanceSummary> {
    try {
      const transactions = await this.getTransactions(profileID);
      const [year, month] = monthYear.split('-').map(Number);

      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getFullYear() === year && tDate.getMonth() === month - 1;
      });

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        month: monthYear,
        income,
        expense,
        balance: income - expense,
      };
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      return { month: monthYear, income: 0, expense: 0, balance: 0 };
    }
  }

  // ============================================
  // GET RECENT TRANSACTIONS
  // ============================================
  async getRecentTransactions(profileID: string, limit: number = 10): Promise<FinanceTransaction[]> {
    try {
      const transactions = await this.getTransactions(profileID);
      return transactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
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
      const transactions = await this.getTransactions(profileID);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      return transactions
        .filter(t => {
          const tDate = new Date(t.date);
          return tDate >= start && tDate <= end;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error getting transactions by date range:', error);
      return [];
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
      const transactions = await this.getTransactionsByDateRange(profileID, startDate, endDate);

      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const balance = income - expense;
      const profitLossPercentage = income > 0 ? ((balance / income) * 100) : 0;

      return {
        totalIncome: income,
        totalExpense: expense,
        balance,
        profitLossPercentage,
      };
    } catch (error) {
      console.error('Error getting summary by date range:', error);
      return { totalIncome: 0, totalExpense: 0, balance: 0, profitLossPercentage: 0 };
    }
  }

  // ============================================
  // GET WEEKLY SUMMARY
  // ============================================
  async getWeeklySummary(profileID: string): Promise<FinanceSummary> {
    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      return await this.getSummaryByDateRange(profileID, weekAgo, today);
    } catch (error) {
      console.error('Error getting weekly summary:', error);
      return { totalIncome: 0, totalExpense: 0, balance: 0, profitLossPercentage: 0 };
    }
  }

  // ============================================
  // BACKEND INTEGRATION NOTES:
  // ============================================
  // When backend is ready, replace with:
  // - GET /api/finance/:profileId
  // - POST /api/finance
  // - DELETE /api/finance/:id
  // - GET /api/finance/summary/today/:profileId
  // - GET /api/finance/summary/month/:profileId/:monthYear
  // - GET /api/finance/summary/daterange/:profileId?start=&end=
}

export default new FinanceService();

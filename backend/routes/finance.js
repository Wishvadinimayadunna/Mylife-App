// ============================================
// Finance Routes
// Income and Expense Management
// ============================================

const express = require("express");
const router = express.Router();
const FinanceTransaction = require("../models/FinanceTransaction");
const auth = require("../middleware/auth");

// Apply auth middleware to all routes
router.use(auth);

// ============================================
// GET ALL TRANSACTIONS
// ============================================
router.get("/", async (req, res) => {
  try {
    const transactions = await FinanceTransaction.find({
      userId: req.userId,
    }).sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// ============================================
// GET TODAY'S SUMMARY
// ============================================
router.get("/summary/today", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const transactions = await FinanceTransaction.find({
      userId: req.userId,
      date: { $gte: today, $lt: tomorrow },
    });

    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;
    const profitLossPercentage =
      totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

    res.json({
      totalIncome,
      totalExpense,
      balance,
      profitLossPercentage,
    });
  } catch (error) {
    console.error("Get today summary error:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// ============================================
// GET WEEKLY SUMMARY
// ============================================
router.get("/summary/week", async (req, res) => {
  try {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const transactions = await FinanceTransaction.find({
      userId: req.userId,
      date: { $gte: weekAgo, $lte: today },
    });

    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;
    const profitLossPercentage =
      totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

    res.json({
      totalIncome,
      totalExpense,
      balance,
      profitLossPercentage,
    });
  } catch (error) {
    console.error("Get week summary error:", error);
    res.status(500).json({ error: "Failed to fetch weekly summary" });
  }
});

// ============================================
// GET MONTHLY SUMMARY
// ============================================
router.get("/summary/month/:monthYear", async (req, res) => {
  try {
    const { monthYear } = req.params; // Format: "2025-01"
    const [year, month] = monthYear.split("-");
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const transactions = await FinanceTransaction.find({
      userId: req.userId,
      date: { $gte: startDate, $lte: endDate },
    });

    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      month: monthYear,
      income,
      expense,
      balance: income - expense,
    });
  } catch (error) {
    console.error("Get month summary error:", error);
    res.status(500).json({ error: "Failed to fetch monthly summary" });
  }
});

// ============================================
// GET SUMMARY BY DATE RANGE
// ============================================
router.get("/summary/range", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start and end dates required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);

    const transactions = await FinanceTransaction.find({
      userId: req.userId,
      date: { $gte: start, $lte: end },
    });

    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;
    const profitLossPercentage =
      totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

    res.json({
      totalIncome,
      totalExpense,
      balance,
      profitLossPercentage,
    });
  } catch (error) {
    console.error("Get range summary error:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// ============================================
// GET TRANSACTIONS BY DATE RANGE
// ============================================
router.get("/range", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start and end dates required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);

    const transactions = await FinanceTransaction.find({
      userId: req.userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    res.json(transactions);
  } catch (error) {
    console.error("Get transactions by range error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// ============================================
// GET RECENT TRANSACTIONS
// ============================================
router.get("/recent/:limit?", async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 20;

    const transactions = await FinanceTransaction.find({
      userId: req.userId,
    })
      .sort({ date: -1 })
      .limit(limit);

    res.json(transactions);
  } catch (error) {
    console.error("Get recent transactions error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// ============================================
// ADD TRANSACTION
// ============================================
router.post("/", async (req, res) => {
  try {
    const transaction = new FinanceTransaction({
      ...req.body,
      userId: req.userId,
    });

    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    console.error("Add transaction error:", error);
    res.status(500).json({ error: "Failed to add transaction" });
  }
});

// ============================================
// UPDATE TRANSACTION
// ============================================
router.put("/:id", async (req, res) => {
  try {
    const transaction = await FinanceTransaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true },
    );

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(transaction);
  } catch (error) {
    console.error("Update transaction error:", error);
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

// ============================================
// DELETE TRANSACTION
// ============================================
router.delete("/:id", async (req, res) => {
  try {
    const transaction = await FinanceTransaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Delete transaction error:", error);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

module.exports = router;

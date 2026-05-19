// ============================================
// Utility Bill Routes
// Electricity, Water, Wi-Fi, Mobile, Gas, TV, Rent, Insurance bills
// ============================================

const express = require("express");
const authMiddleware = require("../middleware/auth");
const UtilityBill = require("../models/UtilityBill");

const router = express.Router();

// ============================================
// UTILITY BILLS CRUD
// ============================================

// Get all utility bills
router.get("/", authMiddleware, async (req, res) => {
  try {
    const bills = await UtilityBill.find({ userId: req.userId }).sort({
      dueDate: 1,
    });
    res.json(bills);
  } catch (error) {
    console.error("Get utility bills error:", error);
    res.status(500).json({ error: "Failed to get utility bills" });
  }
});

// Get unpaid bills
router.get("/unpaid", authMiddleware, async (req, res) => {
  try {
    const bills = await UtilityBill.find({
      userId: req.userId,
      isPaid: false,
    }).sort({ dueDate: 1 });
    res.json(bills);
  } catch (error) {
    console.error("Get unpaid bills error:", error);
    res.status(500).json({ error: "Failed to get unpaid bills" });
  }
});

// Get paid bills
router.get("/paid", authMiddleware, async (req, res) => {
  try {
    const bills = await UtilityBill.find({
      userId: req.userId,
      isPaid: true,
    }).sort({ paidDate: -1 });
    res.json(bills);
  } catch (error) {
    console.error("Get paid bills error:", error);
    res.status(500).json({ error: "Failed to get paid bills" });
  }
});

// Add utility bill
router.post("/", authMiddleware, async (req, res) => {
  try {
    const bill = new UtilityBill({
      userId: req.userId,
      ...req.body,
    });
    await bill.save();
    res.status(201).json(bill);
  } catch (error) {
    console.error("Add utility bill error:", error);
    res.status(500).json({ error: "Failed to add utility bill" });
  }
});

// Update utility bill
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const bill = await UtilityBill.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true },
    );
    if (!bill) {
      return res.status(404).json({ error: "Utility bill not found" });
    }
    res.json(bill);
  } catch (error) {
    console.error("Update utility bill error:", error);
    res.status(500).json({ error: "Failed to update utility bill" });
  }
});

// Mark bill as paid
router.patch("/:id/pay", authMiddleware, async (req, res) => {
  try {
    const bill = await UtilityBill.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!bill) {
      return res.status(404).json({ error: "Utility bill not found" });
    }

    if (bill.isRecurring) {
      // For recurring bills, we create a new bill for the next month
      // and keep the current one as paid
      const nextDueDate = new Date(bill.dueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      const nextBill = new UtilityBill({
        userId: bill.userId,
        name: bill.name,
        type: bill.type,
        amount: bill.amount,
        dueDay: bill.dueDay,
        dueDate: nextDueDate,
        isRecurring: true,
        reminderEnabled: bill.reminderEnabled,
        reminderTime: bill.reminderTime,
        isShared: bill.isShared,
        isPaid: false,
      });

      await nextBill.save();
    }

    bill.isPaid = true;
    bill.paidDate = new Date();
    bill.updatedAt = new Date();

    await bill.save();
    res.json(bill);
  } catch (error) {
    console.error("Mark bill as paid error:", error);
    res.status(500).json({ error: "Failed to mark bill as paid" });
  }
});

// Mark bill as unpaid
router.patch("/:id/unpay", authMiddleware, async (req, res) => {
  try {
    const bill = await UtilityBill.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        isPaid: false,
        paidDate: null,
        updatedAt: new Date(),
      },
      { new: true },
    );
    if (!bill) {
      return res.status(404).json({ error: "Utility bill not found" });
    }
    res.json(bill);
  } catch (error) {
    console.error("Mark bill as unpaid error:", error);
    res.status(500).json({ error: "Failed to mark bill as unpaid" });
  }
});

// Delete utility bill
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const bill = await UtilityBill.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!bill) {
      return res.status(404).json({ error: "Utility bill not found" });
    }
    res.json({ message: "Utility bill deleted successfully" });
  } catch (error) {
    console.error("Delete utility bill error:", error);
    res.status(500).json({ error: "Failed to delete utility bill" });
  }
});

module.exports = router;

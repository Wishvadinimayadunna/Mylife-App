// ============================================
// Finance Transaction Model
// Income and Expense Tracking
// ============================================

const mongoose = require("mongoose");

const financeTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: [
        // Income categories
        "Salary", "Business", "Freelance", "Investment", "Rental", "Bonus", "Gift",
        // Expense categories
        "Food", "Transport", "Bills", "Shopping", "Entertainment", "Health", "Education", "Clothing", "Personal Care",
        // Shared
        "Other",
      ],
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
financeTransactionSchema.index({ userId: 1, date: -1 });
financeTransactionSchema.index({ userId: 1, type: 1, date: -1 });

module.exports = mongoose.model("FinanceTransaction", financeTransactionSchema);

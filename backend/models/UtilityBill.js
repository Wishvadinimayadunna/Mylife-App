// ============================================
// Utility Bill Model
// Electricity, Water, Wi-Fi, Mobile, Gas, TV, Rent, Insurance bills
// ============================================

const mongoose = require("mongoose");

const utilityBillSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      "Electricity",
      "Water",
      "Wi-Fi",
      "Mobile",
      "Gas",
      "TV",
      "Rent",
      "Insurance",
      "Other",
    ],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  dueDay: {
    type: Number,
    required: true,
    min: 1,
    max: 31,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  isRecurring: {
    type: Boolean,
    default: true,
  },
  reminderEnabled: {
    type: Boolean,
    default: true,
  },
  reminderTime: {
    type: String,
  },
  isShared: {
    type: Boolean,
    default: false,
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  paidDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
utilityBillSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster queries
utilityBillSchema.index({ userId: 1, dueDate: 1 });
utilityBillSchema.index({ userId: 1, isPaid: 1 });

module.exports = mongoose.model("UtilityBill", utilityBillSchema);

// ============================================
// Shopping Item Model
// ============================================

const mongoose = require("mongoose");

const shoppingItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["Groceries", "Household", "Medicine", "Miscellaneous"],
    required: true,
  },
  type: {
    type: String,
    enum: ["urgent", "monthly"],
    required: true,
  },
  priority: {
    type: String,
    enum: ["High", "Medium", "Low"],
    default: "Medium",
  },
  isBought: {
    type: Boolean,
    default: false,
  },
  dueDate: {
    type: Date,
  },
  reminderTime: {
    type: String,
  },
  isShared: {
    type: Boolean,
    default: false,
  },
  boughtAt: {
    type: Date,
  },
  groupId: {
    type: String,
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
shoppingItemSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster queries
shoppingItemSchema.index({ userId: 1, isBought: 1 });

module.exports = mongoose.model("ShoppingItem", shoppingItemSchema);

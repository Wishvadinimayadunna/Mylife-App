// ============================================
// ToDo Task Model
// Task management with priority, due dates, recurring
// ============================================

const mongoose = require("mongoose");

const toDoTaskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    category: {
      type: String,
      enum: [
        "Personal",
        "Work",
        "Shopping",
        "Health",
        "Family",
        "Finance",
        "Other",
      ],
      default: "Personal",
    },
    dueDate: {
      type: Date,
    },
    dueTime: {
      type: String, // Format: "HH:MM"
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrencePattern: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly", "Yearly"],
    },
    reminderEnabled: {
      type: Boolean,
      default: false,
    },
    reminderTime: {
      type: String, // Format: "HH:MM"
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    subtasks: [
      {
        title: { type: String, required: true },
        isCompleted: { type: Boolean, default: false },
        completedAt: { type: Date },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
toDoTaskSchema.index({ userId: 1, isCompleted: 1 });
toDoTaskSchema.index({ userId: 1, dueDate: 1 });
toDoTaskSchema.index({ userId: 1, priority: 1 });

// Update completedAt when task is marked as completed
toDoTaskSchema.pre("save", function (next) {
  if (this.isModified("isCompleted")) {
    if (this.isCompleted && !this.completedAt) {
      this.completedAt = new Date();
    } else if (!this.isCompleted) {
      this.completedAt = null;
    }
  }
  next();
});

module.exports = mongoose.model("ToDoTask", toDoTaskSchema);

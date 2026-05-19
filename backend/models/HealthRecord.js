// ============================================
// Health Record Model
// Medical appointments, medicine reminders, health records, emergency contacts
// ============================================

const mongoose = require("mongoose");

// Medical Appointment Schema
const medicalAppointmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  doctorName: {
    type: String,
    required: true,
  },
  appointmentDate: {
    type: Date,
    required: true,
  },
  appointmentTime: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
  },
  reminderEnabled: {
    type: Boolean,
    default: true,
  },
  reminderTime: {
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

// Medicine Reminder Schema
const medicineReminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  medicineName: {
    type: String,
    required: true,
  },
  dosage: {
    type: String,
  },
  reminderTime: {
    type: String,
    required: true,
  },
  isEnabled: {
    type: Boolean,
    default: true,
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

// Health Record Schema (BP, Sugar, Weight, BMI)
const healthRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  bloodPressureSystolic: {
    type: Number,
  },
  bloodPressureDiastolic: {
    type: Number,
  },
  bloodSugar: {
    type: Number,
  },
  weight: {
    type: Number,
  },
  bmi: {
    type: Number,
  },
  recordDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  notes: {
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

// Emergency Contact Schema
const emergencyContactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  relationship: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  email: {
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
medicalAppointmentSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

medicineReminderSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

healthRecordSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

emergencyContactSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for faster queries
medicalAppointmentSchema.index({ userId: 1, appointmentDate: 1 });
medicineReminderSchema.index({ userId: 1 });
healthRecordSchema.index({ userId: 1, recordDate: -1 });
emergencyContactSchema.index({ userId: 1 });

module.exports = {
  MedicalAppointment: mongoose.model(
    "MedicalAppointment",
    medicalAppointmentSchema,
  ),
  MedicineReminder: mongoose.model("MedicineReminder", medicineReminderSchema),
  HealthRecord: mongoose.model("HealthRecord", healthRecordSchema),
  EmergencyContact: mongoose.model("EmergencyContact", emergencyContactSchema),
};

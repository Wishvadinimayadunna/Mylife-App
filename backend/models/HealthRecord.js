// ============================================
// Health Record Model
// Appointments, Medication, Vitals, Emergency Contacts,
// Mood, Symptoms, Period (isPrivate enforced)
// WaterLog, SleepLog (dedicated quick-action collections)
// ============================================

const mongoose = require("mongoose");

// Medical Appointment Schema
const medicalAppointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  doctorName: { type: String, required: true },
  appointmentDate: { type: Date, required: true },
  appointmentTime: { type: String, default: "" },
  reason: { type: String },
  notes: { type: String },
  reminderEnabled: { type: Boolean, default: true },
  reminderTime: { type: Date },
  // Prescription medicines from this visit
  prescription: [
    {
      medicineName: { type: String, required: true },
      dosage: { type: String },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Medicine Reminder Schema
const medicineReminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  medicineName: { type: String, required: true },
  dosage: { type: String },
  reminderTime: { type: String, required: true },
  isEnabled: { type: Boolean, default: true },
  // Array of "YYYY-MM-DD" strings for daily compliance tracking
  takenDates: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Health Record Schema (BP, Sugar, Weight, BMI)
const healthRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bloodPressureSystolic: { type: Number },
  bloodPressureDiastolic: { type: Number },
  bloodSugar: { type: Number },
  weight: { type: Number },
  bmi: { type: Number },
  recordDate: { type: Date, required: true, default: Date.now },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Emergency Contact Schema
const emergencyContactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Mood Record Schema
const moodRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mood: {
    type: String,
    required: true,
    enum: ["Amazing", "Good", "Neutral", "Bad", "Terrible"],
  },
  notes: { type: String },
  recordDate: { type: Date, required: true, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Symptom Record Schema
const symptomRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  symptomName: { type: String, required: true },
  severity: {
    type: String,
    required: true,
    enum: ["Mild", "Moderate", "Severe"],
    default: "Mild",
  },
  notes: { type: String },
  recordDate: { type: Date, required: true, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Period Record Schema — always private at DB level
const periodRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  flow: {
    type: String,
    enum: ["Light", "Medium", "Heavy"],
    default: "Medium",
  },
  notes: { type: String },
  // Always true — period data is never shared
  isPrivate: { type: Boolean, default: true, immutable: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ============================================
// WATER LOG — dedicated quick-action collection
// ============================================
const waterLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amountML: { type: Number, required: true, default: 250 },
  recordedAt: { type: Date, required: true, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

// ============================================
// SLEEP LOG — dedicated quick-action collection
// ============================================
const sleepLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  durationHours: { type: Number, required: true },
  quality: {
    type: String,
    enum: ["Poor", "Fair", "Good", "Excellent"],
    default: "Good",
  },
  recordedAt: { type: Date, required: true, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

// Pre-save timestamp hooks
medicalAppointmentSchema.pre("save", function (next) { this.updatedAt = new Date(); next(); });
medicineReminderSchema.pre("save", function (next) { this.updatedAt = new Date(); next(); });
healthRecordSchema.pre("save", function (next) { this.updatedAt = new Date(); next(); });
emergencyContactSchema.pre("save", function (next) { this.updatedAt = new Date(); next(); });
moodRecordSchema.pre("save", function (next) { this.updatedAt = new Date(); next(); });
symptomRecordSchema.pre("save", function (next) { this.updatedAt = new Date(); next(); });
periodRecordSchema.pre("save", function (next) { this.updatedAt = new Date(); next(); });

// Indexes for faster queries
medicalAppointmentSchema.index({ userId: 1, appointmentDate: 1 });
medicineReminderSchema.index({ userId: 1 });
healthRecordSchema.index({ userId: 1, recordDate: -1 });
emergencyContactSchema.index({ userId: 1 });
moodRecordSchema.index({ userId: 1, recordDate: -1 });
symptomRecordSchema.index({ userId: 1, recordDate: -1 });
periodRecordSchema.index({ userId: 1, startDate: -1 });
waterLogSchema.index({ userId: 1, recordedAt: -1 });
sleepLogSchema.index({ userId: 1, recordedAt: -1 });

module.exports = {
  MedicalAppointment: mongoose.model("MedicalAppointment", medicalAppointmentSchema),
  MedicineReminder: mongoose.model("MedicineReminder", medicineReminderSchema),
  HealthRecord: mongoose.model("HealthRecord", healthRecordSchema),
  EmergencyContact: mongoose.model("EmergencyContact", emergencyContactSchema),
  MoodRecord: mongoose.model("MoodRecord", moodRecordSchema),
  SymptomRecord: mongoose.model("SymptomRecord", symptomRecordSchema),
  PeriodRecord: mongoose.model("PeriodRecord", periodRecordSchema),
  WaterLog: mongoose.model("WaterLog", waterLogSchema),
  SleepLog: mongoose.model("SleepLog", sleepLogSchema),
};

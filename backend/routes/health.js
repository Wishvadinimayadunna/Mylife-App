// ============================================
// Health Routes
// Appointments, Medication, Vitals, Emergency Contacts,
// Mood, Symptoms, Period — all strictly private by userId
// WaterLog, SleepLog — quick-action wellness logs
// ============================================

const express = require("express");
const authMiddleware = require("../middleware/auth");
const {
  MedicalAppointment,
  MedicineReminder,
  HealthRecord,
  EmergencyContact,
  MoodRecord,
  SymptomRecord,
  PeriodRecord,
  WaterLog,
  SleepLog,
} = require("../models/HealthRecord");

const router = express.Router();

// ============================================
// MEDICAL APPOINTMENTS
// ============================================

router.get("/appointments", authMiddleware, async (req, res) => {
  try {
    const appointments = await MedicalAppointment.find({ userId: req.userId }).sort({ appointmentDate: 1 });
    res.json(appointments);
  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json({ error: "Failed to get appointments" });
  }
});

router.post("/appointments", authMiddleware, async (req, res) => {
  try {
    const appointment = new MedicalAppointment({ userId: req.userId, ...req.body });
    await appointment.save();

    // Auto-create a MedicineReminder for each prescription medicine
    const prescription = req.body.prescription || [];
    if (prescription.length > 0) {
      const medDocs = prescription.map(({ medicineName, dosage }) =>
        new MedicineReminder({
          userId: req.userId,
          medicineName,
          dosage: dosage || "",
          reminderTime: "08:00",
          isEnabled: true,
          takenDates: [],
        })
      );
      await Promise.all(medDocs.map((m) => m.save()));
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error("Add appointment error:", error);
    res.status(500).json({ error: "Failed to add appointment" });
  }
});

router.put("/appointments/:id", authMiddleware, async (req, res) => {
  try {
    const appointment = await MedicalAppointment.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });
    res.json(appointment);
  } catch (error) {
    console.error("Update appointment error:", error);
    res.status(500).json({ error: "Failed to update appointment" });
  }
});

router.delete("/appointments/:id", authMiddleware, async (req, res) => {
  try {
    const appointment = await MedicalAppointment.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });
    res.json({ message: "Appointment deleted successfully" });
  } catch (error) {
    console.error("Delete appointment error:", error);
    res.status(500).json({ error: "Failed to delete appointment" });
  }
});

// ============================================
// MEDICINE REMINDERS
// ============================================

router.get("/medicines", authMiddleware, async (req, res) => {
  try {
    const medicines = await MedicineReminder.find({ userId: req.userId }).sort({ reminderTime: 1 });
    res.json(medicines);
  } catch (error) {
    console.error("Get medicines error:", error);
    res.status(500).json({ error: "Failed to get medicine reminders" });
  }
});

router.post("/medicines", authMiddleware, async (req, res) => {
  try {
    const medicine = new MedicineReminder({ userId: req.userId, ...req.body });
    await medicine.save();
    res.status(201).json(medicine);
  } catch (error) {
    console.error("Add medicine error:", error);
    res.status(500).json({ error: "Failed to add medicine reminder" });
  }
});

router.put("/medicines/:id", authMiddleware, async (req, res) => {
  try {
    const medicine = await MedicineReminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!medicine) return res.status(404).json({ error: "Medicine reminder not found" });
    res.json(medicine);
  } catch (error) {
    console.error("Update medicine error:", error);
    res.status(500).json({ error: "Failed to update medicine reminder" });
  }
});

// PATCH /medicines/:id/taken — toggle daily compliance for a date
router.patch("/medicines/:id/taken", authMiddleware, async (req, res) => {
  try {
    const { date, taken } = req.body; // date: "YYYY-MM-DD", taken: boolean
    if (!date) return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });

    const medicine = await MedicineReminder.findOne({ _id: req.params.id, userId: req.userId });
    if (!medicine) return res.status(404).json({ error: "Medicine reminder not found" });

    if (!medicine.takenDates) medicine.takenDates = [];

    if (taken) {
      // Add date if not already present
      if (!medicine.takenDates.includes(date)) {
        medicine.takenDates.push(date);
      }
    } else {
      // Remove the date
      medicine.takenDates = medicine.takenDates.filter((d) => d !== date);
    }

    medicine.updatedAt = new Date();
    await medicine.save();
    res.json(medicine);
  } catch (error) {
    console.error("Toggle medicine taken error:", error);
    res.status(500).json({ error: "Failed to update medicine taken status" });
  }
});

router.delete("/medicines/:id", authMiddleware, async (req, res) => {
  try {
    const medicine = await MedicineReminder.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!medicine) return res.status(404).json({ error: "Medicine reminder not found" });
    res.json({ message: "Medicine reminder deleted successfully" });
  } catch (error) {
    console.error("Delete medicine error:", error);
    res.status(500).json({ error: "Failed to delete medicine reminder" });
  }
});

// ============================================
// HEALTH RECORDS (VITALS)
// ============================================

router.get("/records", authMiddleware, async (req, res) => {
  try {
    const records = await HealthRecord.find({ userId: req.userId }).sort({ recordDate: -1 });
    res.json(records);
  } catch (error) {
    console.error("Get records error:", error);
    res.status(500).json({ error: "Failed to get health records" });
  }
});

router.post("/records", authMiddleware, async (req, res) => {
  try {
    const record = new HealthRecord({ userId: req.userId, ...req.body });
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    console.error("Add record error:", error);
    res.status(500).json({ error: "Failed to add health record" });
  }
});

router.put("/records/:id", authMiddleware, async (req, res) => {
  try {
    const record = await HealthRecord.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: "Health record not found" });
    res.json(record);
  } catch (error) {
    console.error("Update record error:", error);
    res.status(500).json({ error: "Failed to update health record" });
  }
});

router.delete("/records/:id", authMiddleware, async (req, res) => {
  try {
    const record = await HealthRecord.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!record) return res.status(404).json({ error: "Health record not found" });
    res.json({ message: "Health record deleted successfully" });
  } catch (error) {
    console.error("Delete record error:", error);
    res.status(500).json({ error: "Failed to delete health record" });
  }
});

// ============================================
// EMERGENCY CONTACTS
// ============================================

router.get("/emergency-contacts", authMiddleware, async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({ userId: req.userId });
    res.json(contacts);
  } catch (error) {
    console.error("Get emergency contacts error:", error);
    res.status(500).json({ error: "Failed to get emergency contacts" });
  }
});

router.post("/emergency-contacts", authMiddleware, async (req, res) => {
  try {
    const contact = new EmergencyContact({ userId: req.userId, ...req.body });
    await contact.save();
    res.status(201).json(contact);
  } catch (error) {
    console.error("Add emergency contact error:", error);
    res.status(500).json({ error: "Failed to add emergency contact" });
  }
});

router.put("/emergency-contacts/:id", authMiddleware, async (req, res) => {
  try {
    const contact = await EmergencyContact.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!contact) return res.status(404).json({ error: "Emergency contact not found" });
    res.json(contact);
  } catch (error) {
    console.error("Update emergency contact error:", error);
    res.status(500).json({ error: "Failed to update emergency contact" });
  }
});

router.delete("/emergency-contacts/:id", authMiddleware, async (req, res) => {
  try {
    const contact = await EmergencyContact.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!contact) return res.status(404).json({ error: "Emergency contact not found" });
    res.json({ message: "Emergency contact deleted successfully" });
  } catch (error) {
    console.error("Delete emergency contact error:", error);
    res.status(500).json({ error: "Failed to delete emergency contact" });
  }
});

// ============================================
// MOOD RECORDS
// ============================================

router.get("/moods", authMiddleware, async (req, res) => {
  try {
    const moods = await MoodRecord.find({ userId: req.userId }).sort({ recordDate: -1 });
    res.json(moods);
  } catch (error) {
    console.error("Get moods error:", error);
    res.status(500).json({ error: "Failed to get mood records" });
  }
});

router.post("/moods", authMiddleware, async (req, res) => {
  try {
    const mood = new MoodRecord({ userId: req.userId, ...req.body });
    await mood.save();
    res.status(201).json(mood);
  } catch (error) {
    console.error("Add mood error:", error);
    res.status(500).json({ error: "Failed to add mood record" });
  }
});

router.put("/moods/:id", authMiddleware, async (req, res) => {
  try {
    const mood = await MoodRecord.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!mood) return res.status(404).json({ error: "Mood record not found" });
    res.json(mood);
  } catch (error) {
    console.error("Update mood error:", error);
    res.status(500).json({ error: "Failed to update mood record" });
  }
});

router.delete("/moods/:id", authMiddleware, async (req, res) => {
  try {
    const mood = await MoodRecord.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!mood) return res.status(404).json({ error: "Mood record not found" });
    res.json({ message: "Mood record deleted successfully" });
  } catch (error) {
    console.error("Delete mood error:", error);
    res.status(500).json({ error: "Failed to delete mood record" });
  }
});

// ============================================
// SYMPTOM RECORDS
// ============================================

router.get("/symptoms", authMiddleware, async (req, res) => {
  try {
    const symptoms = await SymptomRecord.find({ userId: req.userId }).sort({ recordDate: -1 });
    res.json(symptoms);
  } catch (error) {
    console.error("Get symptoms error:", error);
    res.status(500).json({ error: "Failed to get symptom records" });
  }
});

router.post("/symptoms", authMiddleware, async (req, res) => {
  try {
    const symptom = new SymptomRecord({ userId: req.userId, ...req.body });
    await symptom.save();
    res.status(201).json(symptom);
  } catch (error) {
    console.error("Add symptom error:", error);
    res.status(500).json({ error: "Failed to add symptom record" });
  }
});

router.put("/symptoms/:id", authMiddleware, async (req, res) => {
  try {
    const symptom = await SymptomRecord.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!symptom) return res.status(404).json({ error: "Symptom record not found" });
    res.json(symptom);
  } catch (error) {
    console.error("Update symptom error:", error);
    res.status(500).json({ error: "Failed to update symptom record" });
  }
});

router.delete("/symptoms/:id", authMiddleware, async (req, res) => {
  try {
    const symptom = await SymptomRecord.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!symptom) return res.status(404).json({ error: "Symptom record not found" });
    res.json({ message: "Symptom record deleted successfully" });
  } catch (error) {
    console.error("Delete symptom error:", error);
    res.status(500).json({ error: "Failed to delete symptom record" });
  }
});

// ============================================
// PERIOD RECORDS (isPrivate: true enforced at schema level)
// ============================================

router.get("/periods", authMiddleware, async (req, res) => {
  try {
    const periods = await PeriodRecord.find({ userId: req.userId, isPrivate: true }).sort({ startDate: -1 });
    res.json(periods);
  } catch (error) {
    console.error("Get periods error:", error);
    res.status(500).json({ error: "Failed to get period records" });
  }
});

router.post("/periods", authMiddleware, async (req, res) => {
  try {
    const period = new PeriodRecord({ userId: req.userId, ...req.body, isPrivate: true });
    await period.save();
    res.status(201).json(period);
  } catch (error) {
    console.error("Add period error:", error);
    res.status(500).json({ error: "Failed to add period record" });
  }
});

router.put("/periods/:id", authMiddleware, async (req, res) => {
  try {
    const { isPrivate, ...updateData } = req.body;
    const period = await PeriodRecord.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    if (!period) return res.status(404).json({ error: "Period record not found" });
    res.json(period);
  } catch (error) {
    console.error("Update period error:", error);
    res.status(500).json({ error: "Failed to update period record" });
  }
});

router.delete("/periods/:id", authMiddleware, async (req, res) => {
  try {
    const period = await PeriodRecord.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!period) return res.status(404).json({ error: "Period record not found" });
    res.json({ message: "Period record deleted successfully" });
  } catch (error) {
    console.error("Delete period error:", error);
    res.status(500).json({ error: "Failed to delete period record" });
  }
});

// ============================================
// WATER LOG — quick-action hydration tracking
// ============================================

router.get("/water", authMiddleware, async (req, res) => {
  try {
    const logs = await WaterLog.find({ userId: req.userId }).sort({ recordedAt: -1 });
    res.json(logs);
  } catch (error) {
    console.error("Get water logs error:", error);
    res.status(500).json({ error: "Failed to get water logs" });
  }
});

router.post("/water", authMiddleware, async (req, res) => {
  try {
    const { amountML, recordedAt } = req.body;
    const log = new WaterLog({
      userId: req.userId,
      amountML: amountML || 250,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    });
    await log.save();
    res.status(201).json(log);
  } catch (error) {
    console.error("Add water log error:", error);
    res.status(500).json({ error: "Failed to add water log" });
  }
});

router.delete("/water/:id", authMiddleware, async (req, res) => {
  try {
    const log = await WaterLog.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!log) return res.status(404).json({ error: "Water log not found" });
    res.json({ message: "Water log deleted successfully" });
  } catch (error) {
    console.error("Delete water log error:", error);
    res.status(500).json({ error: "Failed to delete water log" });
  }
});

// ============================================
// SLEEP LOG — quick-action sleep tracking
// ============================================

router.get("/sleep", authMiddleware, async (req, res) => {
  try {
    const logs = await SleepLog.find({ userId: req.userId }).sort({ recordedAt: -1 });
    res.json(logs);
  } catch (error) {
    console.error("Get sleep logs error:", error);
    res.status(500).json({ error: "Failed to get sleep logs" });
  }
});

router.post("/sleep", authMiddleware, async (req, res) => {
  try {
    const { durationHours, quality, recordedAt } = req.body;
    if (!durationHours) return res.status(400).json({ error: "durationHours is required" });
    const log = new SleepLog({
      userId: req.userId,
      durationHours,
      quality: quality || "Good",
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    });
    await log.save();
    res.status(201).json(log);
  } catch (error) {
    console.error("Add sleep log error:", error);
    res.status(500).json({ error: "Failed to add sleep log" });
  }
});

router.delete("/sleep/:id", authMiddleware, async (req, res) => {
  try {
    const log = await SleepLog.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!log) return res.status(404).json({ error: "Sleep log not found" });
    res.json({ message: "Sleep log deleted successfully" });
  } catch (error) {
    console.error("Delete sleep log error:", error);
    res.status(500).json({ error: "Failed to delete sleep log" });
  }
});

module.exports = router;

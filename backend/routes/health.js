// ============================================
// Health Routes
// Medical appointments, medicine reminders, health records, emergency contacts
// ============================================

const express = require("express");
const authMiddleware = require("../middleware/auth");
const {
  MedicalAppointment,
  MedicineReminder,
  HealthRecord,
  EmergencyContact,
} = require("../models/HealthRecord");

const router = express.Router();

// ============================================
// MEDICAL APPOINTMENTS
// ============================================

// Get all appointments
router.get("/appointments", authMiddleware, async (req, res) => {
  try {
    const appointments = await MedicalAppointment.find({
      userId: req.userId,
    }).sort({ appointmentDate: 1 });
    res.json(appointments);
  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json({ error: "Failed to get appointments" });
  }
});

// Add appointment
router.post("/appointments", authMiddleware, async (req, res) => {
  try {
    const appointment = new MedicalAppointment({
      userId: req.userId,
      ...req.body,
    });
    await appointment.save();
    res.status(201).json(appointment);
  } catch (error) {
    console.error("Add appointment error:", error);
    res.status(500).json({ error: "Failed to add appointment" });
  }
});

// Update appointment
router.put("/appointments/:id", authMiddleware, async (req, res) => {
  try {
    const appointment = await MedicalAppointment.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true },
    );
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.json(appointment);
  } catch (error) {
    console.error("Update appointment error:", error);
    res.status(500).json({ error: "Failed to update appointment" });
  }
});

// Delete appointment
router.delete("/appointments/:id", authMiddleware, async (req, res) => {
  try {
    const appointment = await MedicalAppointment.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.json({ message: "Appointment deleted successfully" });
  } catch (error) {
    console.error("Delete appointment error:", error);
    res.status(500).json({ error: "Failed to delete appointment" });
  }
});

// ============================================
// MEDICINE REMINDERS
// ============================================

// Get all medicine reminders
router.get("/medicines", authMiddleware, async (req, res) => {
  try {
    const medicines = await MedicineReminder.find({ userId: req.userId }).sort({
      reminderTime: 1,
    });
    res.json(medicines);
  } catch (error) {
    console.error("Get medicines error:", error);
    res.status(500).json({ error: "Failed to get medicine reminders" });
  }
});

// Add medicine reminder
router.post("/medicines", authMiddleware, async (req, res) => {
  try {
    const medicine = new MedicineReminder({
      userId: req.userId,
      ...req.body,
    });
    await medicine.save();
    res.status(201).json(medicine);
  } catch (error) {
    console.error("Add medicine error:", error);
    res.status(500).json({ error: "Failed to add medicine reminder" });
  }
});

// Update medicine reminder
router.put("/medicines/:id", authMiddleware, async (req, res) => {
  try {
    const medicine = await MedicineReminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true },
    );
    if (!medicine) {
      return res.status(404).json({ error: "Medicine reminder not found" });
    }
    res.json(medicine);
  } catch (error) {
    console.error("Update medicine error:", error);
    res.status(500).json({ error: "Failed to update medicine reminder" });
  }
});

// Delete medicine reminder
router.delete("/medicines/:id", authMiddleware, async (req, res) => {
  try {
    const medicine = await MedicineReminder.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!medicine) {
      return res.status(404).json({ error: "Medicine reminder not found" });
    }
    res.json({ message: "Medicine reminder deleted successfully" });
  } catch (error) {
    console.error("Delete medicine error:", error);
    res.status(500).json({ error: "Failed to delete medicine reminder" });
  }
});

// ============================================
// HEALTH RECORDS
// ============================================

// Get all health records
router.get("/records", authMiddleware, async (req, res) => {
  try {
    const records = await HealthRecord.find({ userId: req.userId }).sort({
      recordDate: -1,
    });
    res.json(records);
  } catch (error) {
    console.error("Get records error:", error);
    res.status(500).json({ error: "Failed to get health records" });
  }
});

// Add health record
router.post("/records", authMiddleware, async (req, res) => {
  try {
    const record = new HealthRecord({
      userId: req.userId,
      ...req.body,
    });
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    console.error("Add record error:", error);
    res.status(500).json({ error: "Failed to add health record" });
  }
});

// Update health record
router.put("/records/:id", authMiddleware, async (req, res) => {
  try {
    const record = await HealthRecord.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true },
    );
    if (!record) {
      return res.status(404).json({ error: "Health record not found" });
    }
    res.json(record);
  } catch (error) {
    console.error("Update record error:", error);
    res.status(500).json({ error: "Failed to update health record" });
  }
});

// Delete health record
router.delete("/records/:id", authMiddleware, async (req, res) => {
  try {
    const record = await HealthRecord.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!record) {
      return res.status(404).json({ error: "Health record not found" });
    }
    res.json({ message: "Health record deleted successfully" });
  } catch (error) {
    console.error("Delete record error:", error);
    res.status(500).json({ error: "Failed to delete health record" });
  }
});

// ============================================
// EMERGENCY CONTACTS
// ============================================

// Get all emergency contacts
router.get("/emergency-contacts", authMiddleware, async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({ userId: req.userId });
    res.json(contacts);
  } catch (error) {
    console.error("Get emergency contacts error:", error);
    res.status(500).json({ error: "Failed to get emergency contacts" });
  }
});

// Add emergency contact
router.post("/emergency-contacts", authMiddleware, async (req, res) => {
  try {
    const contact = new EmergencyContact({
      userId: req.userId,
      ...req.body,
    });
    await contact.save();
    res.status(201).json(contact);
  } catch (error) {
    console.error("Add emergency contact error:", error);
    res.status(500).json({ error: "Failed to add emergency contact" });
  }
});

// Update emergency contact
router.put("/emergency-contacts/:id", authMiddleware, async (req, res) => {
  try {
    const contact = await EmergencyContact.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true },
    );
    if (!contact) {
      return res.status(404).json({ error: "Emergency contact not found" });
    }
    res.json(contact);
  } catch (error) {
    console.error("Update emergency contact error:", error);
    res.status(500).json({ error: "Failed to update emergency contact" });
  }
});

// Delete emergency contact
router.delete("/emergency-contacts/:id", authMiddleware, async (req, res) => {
  try {
    const contact = await EmergencyContact.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!contact) {
      return res.status(404).json({ error: "Emergency contact not found" });
    }
    res.json({ message: "Emergency contact deleted successfully" });
  } catch (error) {
    console.error("Delete emergency contact error:", error);
    res.status(500).json({ error: "Failed to delete emergency contact" });
  }
});

module.exports = router;

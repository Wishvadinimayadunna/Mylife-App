// ============================================
// Future Events Routes
// ============================================

const express = require("express");
const FutureEvent = require("../models/FutureEvent");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Helper — get partner's userId if linked
async function getLinkedUserId(userId) {
  const user = await User.findById(userId).select('linkedUserId');
  return user?.linkedUserId || null;
}

// All routes require authentication
router.use(authMiddleware);

// ============================================
// GET ALL EVENTS
// GET /api/events
// ============================================
router.get("/", async (req, res) => {
  try {
    const { type, upcoming, completed, past } = req.query;
    const linkedUserId = await getLinkedUserId(req.userId);

    // Build $or: own events + partner's shared events
    const orConditions = [{ userId: req.userId }];
    if (linkedUserId) orConditions.push({ userId: linkedUserId, isShared: true });

    const filter = { $or: orConditions };
    if (type) filter.type = type;

    if (upcoming === "true") {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      filter.eventDate = { $gte: now };
      filter.completedAt = null;
    } else if (completed === "true") {
      filter.completedAt = { $ne: null };
    } else if (past === "true") {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      filter.eventDate = { $lt: now };
      filter.completedAt = null;
    }

    const events = await FutureEvent.find(filter).sort({ eventDate: 1 });
    res.json(events);
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({ error: "Failed to get events" });
  }
});

// ============================================
// GET EVENT STATISTICS
// GET /api/events/stats/summary
// ============================================
router.get("/stats/summary", async (req, res) => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const [upcoming, completed, past, total] = await Promise.all([
      FutureEvent.countDocuments({
        userId: req.userId,
        eventDate: { $gte: now },
        completedAt: null,
      }),
      FutureEvent.countDocuments({
        userId: req.userId,
        completedAt: { $ne: null },
      }),
      FutureEvent.countDocuments({
        userId: req.userId,
        eventDate: { $lt: now },
        completedAt: null,
      }),
      FutureEvent.countDocuments({ userId: req.userId }),
    ]);

    res.json({
      upcoming,
      completed,
      past,
      total,
      incomplete: total - completed,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Failed to get statistics" });
  }
});

// ============================================
// GET SINGLE EVENT
// GET /api/events/:id
// ============================================
router.get("/:id", async (req, res) => {
  try {
    const event = await FutureEvent.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({ error: "Failed to get event" });
  }
});

// ============================================
// CREATE EVENT
// POST /api/events
// ============================================
router.post("/", async (req, res) => {
  try {
    console.log(
      "📝 Creating event with data:",
      JSON.stringify(req.body, null, 2),
    );
    console.log("👤 User ID from auth:", req.userId);

    const event = new FutureEvent({
      ...req.body,
      userId: req.userId,
    });

    await event.save();
    console.log("✅ Event created successfully:", event._id);
    res.status(201).json(event);
  } catch (error) {
    console.error("❌ Create event error:", error.message);
    console.error("Error details:", error);
    res.status(500).json({ error: error.message || "Failed to create event" });
  }
});

// ============================================
// UPDATE EVENT
// PUT /api/events/:id
// ============================================
router.put("/:id", async (req, res) => {
  try {
    const event = await FutureEvent.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true },
    );

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// ============================================
// MARK AS COMPLETED
// PATCH /api/events/:id/complete
// ============================================
router.patch("/:id/complete", async (req, res) => {
  try {
    const event = await FutureEvent.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        completedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    console.error("Complete event error:", error);
    res.status(500).json({ error: "Failed to complete event" });
  }
});

// ============================================
// DELETE EVENT
// DELETE /api/events/:id
// ============================================
router.delete("/:id", async (req, res) => {
  try {
    const event = await FutureEvent.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

module.exports = router;

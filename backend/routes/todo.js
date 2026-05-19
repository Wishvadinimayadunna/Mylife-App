// ============================================
// ToDo Routes
// Task management endpoints
// ============================================

const express = require("express");
const router = express.Router();
const ToDoTask = require("../models/ToDoTask");
const auth = require("../middleware/auth");

// Apply auth middleware to all routes
router.use(auth);

// ============================================
// GET ALL TASKS
// ============================================
router.get("/", async (req, res) => {
  try {
    const tasks = await ToDoTask.find({ userId: req.userId }).sort({
      createdAt: -1,
    });
    res.json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// ============================================
// GET PENDING TASKS
// ============================================
router.get("/pending", async (req, res) => {
  try {
    const tasks = await ToDoTask.find({
      userId: req.userId,
      isCompleted: false,
    }).sort({ dueDate: 1, priority: 1 });
    res.json(tasks);
  } catch (error) {
    console.error("Get pending tasks error:", error);
    res.status(500).json({ error: "Failed to fetch pending tasks" });
  }
});

// ============================================
// GET COMPLETED TASKS
// ============================================
router.get("/completed", async (req, res) => {
  try {
    const tasks = await ToDoTask.find({
      userId: req.userId,
      isCompleted: true,
    }).sort({ completedAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error("Get completed tasks error:", error);
    res.status(500).json({ error: "Failed to fetch completed tasks" });
  }
});

// ============================================
// GET TASKS BY PRIORITY
// ============================================
router.get("/priority/:priority", async (req, res) => {
  try {
    const { priority } = req.params;
    const tasks = await ToDoTask.find({
      userId: req.userId,
      priority,
      isCompleted: false,
    }).sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    console.error("Get tasks by priority error:", error);
    res.status(500).json({ error: "Failed to fetch tasks by priority" });
  }
});

// ============================================
// GET TASKS BY CATEGORY
// ============================================
router.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const tasks = await ToDoTask.find({
      userId: req.userId,
      category,
    }).sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    console.error("Get tasks by category error:", error);
    res.status(500).json({ error: "Failed to fetch tasks by category" });
  }
});

// ============================================
// GET OVERDUE TASKS
// ============================================
router.get("/overdue", async (req, res) => {
  try {
    const now = new Date();
    const tasks = await ToDoTask.find({
      userId: req.userId,
      isCompleted: false,
      dueDate: { $lt: now },
    }).sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    console.error("Get overdue tasks error:", error);
    res.status(500).json({ error: "Failed to fetch overdue tasks" });
  }
});

// ============================================
// CREATE TASK
// ============================================
router.post("/", async (req, res) => {
  try {
    const task = new ToDoTask({
      ...req.body,
      userId: req.userId,
    });
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// ============================================
// UPDATE TASK
// ============================================
router.put("/:id", async (req, res) => {
  try {
    const task = await ToDoTask.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true },
    );

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// ============================================
// TOGGLE TASK COMPLETION
// ============================================
router.patch("/:id/toggle", async (req, res) => {
  try {
    const task = await ToDoTask.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    task.isCompleted = !task.isCompleted;
    if (task.isCompleted) {
      task.completedAt = new Date();
    } else {
      task.completedAt = null;
    }

    await task.save();
    res.json(task);
  } catch (error) {
    console.error("Toggle task error:", error);
    res.status(500).json({ error: "Failed to toggle task" });
  }
});

// ============================================
// ADD SUBTASK
// ============================================
router.post("/:id/subtasks", async (req, res) => {
  try {
    const task = await ToDoTask.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    task.subtasks.push({
      title: req.body.title,
      isCompleted: false,
    });

    await task.save();
    res.json(task);
  } catch (error) {
    console.error("Add subtask error:", error);
    res.status(500).json({ error: "Failed to add subtask" });
  }
});

// ============================================
// TOGGLE SUBTASK COMPLETION
// ============================================
router.patch("/:id/subtasks/:subtaskId/toggle", async (req, res) => {
  try {
    const task = await ToDoTask.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ error: "Subtask not found" });
    }

    subtask.isCompleted = !subtask.isCompleted;
    if (subtask.isCompleted) {
      subtask.completedAt = new Date();
    } else {
      subtask.completedAt = null;
    }

    await task.save();
    res.json(task);
  } catch (error) {
    console.error("Toggle subtask error:", error);
    res.status(500).json({ error: "Failed to toggle subtask" });
  }
});

// ============================================
// DELETE SUBTASK
// ============================================
router.delete("/:id/subtasks/:subtaskId", async (req, res) => {
  try {
    const task = await ToDoTask.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    task.subtasks.pull(req.params.subtaskId);
    await task.save();
    res.json(task);
  } catch (error) {
    console.error("Delete subtask error:", error);
    res.status(500).json({ error: "Failed to delete subtask" });
  }
});

// ============================================
// DELETE TASK
// ============================================
router.delete("/:id", async (req, res) => {
  try {
    const task = await ToDoTask.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

module.exports = router;

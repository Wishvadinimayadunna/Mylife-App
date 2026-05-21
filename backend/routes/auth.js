// ============================================
// Authentication Routes
// Login, Register, Token Refresh
// ============================================

const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const mongoose = require("mongoose");

const router = express.Router();

// Helper function to check if database is connected
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

// ============================================
// REGISTER
// POST /api/auth/register
// ============================================
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, fullName } = req.body;

      // Try to use database if connected, otherwise use DEV mode
      if (isDatabaseConnected()) {
        console.log(
          "✅ Database connected - using real database for registration",
        );

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: "Email already registered" });
        }

        // Create user
        const user = new User({ email, password, fullName: fullName || "" });
        await user.save();

        // Generate token
        const token = jwt.sign(
          { userId: user._id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "30d" },
        );

        res.status(201).json({
          message: "User registered successfully",
          token,
          user: {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
          },
        });
      } else {
        // Database not connected - use DEV MODE fallback
        console.log(
          "⚠️ Database not connected - using DEV mode for registration",
        );

        const mockUserId = "dev_" + Date.now();
        const token = jwt.sign(
          { userId: mockUserId, email },
          process.env.JWT_SECRET,
          { expiresIn: "30d" },
        );

        res.status(201).json({
          message: "User registered successfully (DEV MODE)",
          token,
          user: {
            id: mockUserId,
            email,
            fullName: fullName || "",
          },
        });
      }
    } catch (error) {
      console.error("Register error:", error.message);
      console.error("Full error:", error);
      res.status(500).json({
        message: error.message || "Registration failed. Please try again.",
      });
    }
  },
);

// ============================================
// LOGIN
// POST /api/auth/login
// ============================================
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").exists()],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Try to use database if connected, otherwise use DEV mode
      if (isDatabaseConnected()) {
        console.log("✅ Database connected - using real database for login");

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(401).json({ message: "Invalid email or password" });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return res.status(401).json({ message: "Invalid email or password" });
        }

        // Generate token
        const token = jwt.sign(
          { userId: user._id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "30d" },
        );

        res.json({
          message: "Login successful",
          token,
          user: {
            id: user._id,
            email: user.email,
          },
        });
      } else {
        // Database not connected - use DEV MODE fallback
        console.log("⚠️ Database not connected - using DEV mode for login");

        const mockUserId = "dev_" + Date.now();
        const token = jwt.sign(
          { userId: mockUserId, email },
          process.env.JWT_SECRET,
          { expiresIn: "30d" },
        );

        res.json({
          message: "Login successful (DEV MODE)",
          token,
          user: {
            id: mockUserId,
            email,
          },
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed. Please try again." });
    }
  },
);

// ============================================
// GET CURRENT USER
// GET /api/auth/me
// ============================================
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("-password")
      .populate("linkedUserId", "email fullName");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Flatten linkedUser info into response for easy frontend use
    const userData = user.toObject();
    if (userData.linkedUserId && typeof userData.linkedUserId === "object") {
      userData.linkedEmail = userData.linkedUserId.email;
      userData.linkedFullName = userData.linkedUserId.fullName;
      userData.linkedUserId = userData.linkedUserId._id;
    }

    res.json(userData);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});


// ============================================
// LINK PARTNER ACCOUNT
// POST /api/auth/link-partner
// Body: { partnerEmail: "partner@example.com" }
// ============================================
router.post("/link-partner", authMiddleware, async (req, res) => {
  try {
    const { partnerEmail } = req.body;
    if (!partnerEmail) {
      return res.status(400).json({ error: "Partner email is required" });
    }

    // Cannot link to yourself
    const currentUser = await User.findById(req.userId);
    if (!currentUser) return res.status(404).json({ error: "User not found" });
    if (currentUser.email === partnerEmail.toLowerCase().trim()) {
      return res.status(400).json({ error: "You cannot link with yourself" });
    }

    // Find the partner
    const partner = await User.findOne({ email: partnerEmail.toLowerCase().trim() });
    if (!partner) {
      return res.status(404).json({ error: "No account found with that email" });
    }

    // Link both accounts to each other
    currentUser.linkedUserId = partner._id;
    partner.linkedUserId = currentUser._id;

    await currentUser.save();
    await partner.save();

    res.json({
      message: `Successfully linked with ${partner.fullName || partner.email}`,
      linkedUser: {
        id: partner._id,
        email: partner.email,
        fullName: partner.fullName,
      },
    });
  } catch (error) {
    console.error("Link partner error:", error);
    res.status(500).json({ error: "Failed to link partner" });
  }
});

// ============================================
// UNLINK PARTNER ACCOUNT
// POST /api/auth/unlink-partner
// ============================================
router.post("/unlink-partner", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    // Unlink the partner too
    if (currentUser.linkedUserId) {
      await User.findByIdAndUpdate(currentUser.linkedUserId, { linkedUserId: null });
    }

    currentUser.linkedUserId = null;
    await currentUser.save();

    res.json({ message: "Partner unlinked successfully" });
  } catch (error) {
    console.error("Unlink partner error:", error);
    res.status(500).json({ error: "Failed to unlink partner" });
  }
});

module.exports = router;

// ============================================
// MyLife Backend Server
// Node.js + Express + MongoDB
// ============================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, ".env") });

// Import routes
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const familyRoutes = require("./routes/family");
const shoppingRoutes = require("./routes/shopping");
const eventRoutes = require("./routes/events");
const healthRoutes = require("./routes/health");
const utilityRoutes = require("./routes/utility");
const todoRoutes = require("./routes/todo");
const financeRoutes = require("./routes/finance");

// Initialize Express
const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/shopping", shoppingRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/utility", utilityRoutes);
app.use("/api/todo", todoRoutes);
app.use("/api/finance", financeRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "MyLife API is running",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// MongoDB Connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/mylife";
const PORT = process.env.PORT || 5000;

// MongoDB connection options for Atlas with Stable API (fixes Windows SRV DNS issues)
const mongooseOptions = {
  serverApi: {
    version: "1",
    strict: true,
    deprecationErrors: true,
  },
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
};

// Start server first (don't wait for MongoDB)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n Server running on:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  console.log(`   - Network: http://172.25.142.15:${PORT}`);
  console.log(` API endpoints: http://172.25.142.15:${PORT}/api`);
  console.log(` Health check: http://172.25.142.15:${PORT}/api/health\n`);
});

// Connect to MongoDB (non-blocking)
console.log(" Connecting to MongoDB Atlas...");
console.log(" MongoDB URI:", MONGODB_URI.replace(/:[^:@]+@/, ":****@")); // Hide password

// Optional fallback (local) MongoDB URI. Set MONGODB_FALLBACK_URI in backend/.env to override.
const FALLBACK_URI = process.env.MONGODB_FALLBACK_URI || "mongodb://127.0.0.1:27017/mylife";

async function connectWithFallback() {
  try {
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    console.log(" Connected to MongoDB Atlas");
    console.log(` Database: ${mongoose.connection.name}`);
    console.log(` Connection state: ${mongoose.connection.readyState}\n`);
    return;
  } catch (error) {
    console.error(" MongoDB connection failed:", error.name);
    console.error(" Error message:", error.message);
    if (error.reason) {
      console.error(" Reason:", error.reason);
    }
    console.error("\n  Possible causes:");
    console.error("   1. Check your internet connection");
    console.error(
      "   2. Verify MongoDB Atlas IP whitelist (0.0.0.0/0 for allow all)",
    );
    console.error("   3. Verify database username and password");
    console.error("   4. Check if cluster is paused\n");

    if (FALLBACK_URI && FALLBACK_URI !== MONGODB_URI) {
      console.log(` Attempting fallback MongoDB URI: ${FALLBACK_URI}`);
      try {
        await mongoose.connect(FALLBACK_URI, mongooseOptions);
        console.log(" Connected to fallback MongoDB");
        console.log(` Database: ${mongoose.connection.name}`);
        console.log(` Connection state: ${mongoose.connection.readyState}\n`);
        return;
      } catch (err2) {
        console.error(" Fallback MongoDB connection failed:", err2.name || err2);
        console.error(" Error message:", err2.message || err2);
      }
    }

    console.error("\n Unable to connect to any MongoDB instance. Exiting connection setup.\n");
  }
}

connectWithFallback();

// Handle shutdown
process.on("SIGINT", async () => {
  console.log("\n Shutting down server...");
  await mongoose.connection.close();
  process.exit(0);
});

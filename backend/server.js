// ============================================
// MyLife Backend Server
// Node.js + Express + MongoDB
// ============================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const familyRoutes = require("./routes/family");
const shoppingRoutes = require("./routes/shopping");
const eventRoutes = require("./routes/events");

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

// MongoDB connection options to handle DNS issues
const mongooseOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4, // Force IPv4
};

mongoose
  .connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    console.log(`📊 Database: ${mongoose.connection.name}`);

    // Start server - listen on all network interfaces (0.0.0.0) so mobile devices can connect
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n🚀 Server running on:`);
      console.log(`   - Local:   http://localhost:${PORT}`);
      console.log(`   - Network: http://10.239.123.15:${PORT}`);
      console.log(`📡 API endpoints: http://10.239.123.15:${PORT}/api`);
      console.log(`💚 Health check: http://10.239.123.15:${PORT}/api/health\n`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error.message);
    console.error("Please check your MONGODB_URI in .env file");
    process.exit(1);
  });

// Handle shutdown
process.on("SIGINT", async () => {
  console.log("\n⏹️  Shutting down server...");
  await mongoose.connection.close();
  process.exit(0);
});

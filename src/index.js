import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

import statusRoute from "./routes/status.js";
import transcribeRoute from "./routes/transcribe.js";
import { logger } from "./utils/logger.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// CORS with specific origins for production safety
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : "*",
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Accept raw binary audio up to 5MB (reasonable for 2-3 sec @ 44.1kHz 16-bit mono)
app.use(express.raw({ type: "application/octet-stream", limit: "5mb" }));
app.use(express.raw({ type: "audio/wav", limit: "5mb" }));
app.use(express.raw({ type: "audio/raw", limit: "5mb" }));

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "spotify-caption-backend",
    version: "1.1.0"
  });
});

// Routes
app.use("/api/status", statusRoute);
app.use("/api/transcribe", transcribeRoute);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.warn("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.warn("SIGINT received, shutting down gracefully...");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

// Catch unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", reason);
  process.exit(1);
});

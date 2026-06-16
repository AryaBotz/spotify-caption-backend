import express from "express";
import { promises as fs } from "fs";
import os from "os";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * GET /api/status
 * 
 * Returns system health and readiness info
 */
router.get("/", async (req, res) => {
  try {
    // Check required environment variables
    const requiredEnv = {
      GROQ_API_KEY: !!process.env.GROQ_API_KEY
    };

    // Check /tmp directory accessibility
    const tmpDir = process.env.AUDIO_TMP_DIR || "/tmp";
    let tmpWritable = false;
    try {
      await fs.access(tmpDir);
      tmpWritable = true;
    } catch (err) {
      logger.warn(`Cannot access ${tmpDir}: ${err.message}`);
    }

    // Get system memory info
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsagePercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

    // Determine health status
    const isHealthy = requiredEnv.GROQ_API_KEY && tmpWritable;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "healthy" : "degraded",
      service: "spotify-caption-backend",
      version: "1.1.0",
      environment: {
        groqApiKeyConfigured: requiredEnv.GROQ_API_KEY,
        tmpDirWritable: tmpWritable,
        tmpDir
      },
      system: {
        uptime: process.uptime(),
        memoryUsagePercent: memUsagePercent,
        nodeVersion: process.version
      },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    logger.error("Status check error:", err);
    res.status(500).json({
      status: "error",
      error: "Failed to check status"
    });
  }
});

export default router;

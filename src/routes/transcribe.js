import express from "express";
import { promises as fs } from "fs";
import { randomBytes } from "crypto";
import path from "path";
import os from "os";
import { convertToWav, cleanupFile } from "../utils/convertWav.js";
import { runGroq } from "../utils/runGroq.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Request timeout: 45 seconds (should be enough for transcription)
const REQUEST_TIMEOUT = 45000;

// Audio validation
const MIN_AUDIO_SIZE = 8000; // ~0.1 sec at 44.1kHz 16-bit mono
const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/transcribe
 * 
 * Expects raw PCM audio (16-bit signed LE, mono or stereo, 44.1kHz)
 * Returns { text: "transcription" }
 */
router.post("/", async (req, res) => {
  let rawPath = null;
  let wavPath = null;

  // Set timeout for entire request
  const timeoutHandle = setTimeout(() => {
    if (!res.headersSent) {
      logger.warn("Request timeout exceeded 45s");
      res.status(408).json({ error: "Request timeout" });
    }
    // Cleanup will happen in finally block
  }, REQUEST_TIMEOUT);

  try {
    // Validate request body
    if (!req.body || typeof req.body !== "object" || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        error: "Invalid request",
        details: "Body must be raw binary audio data"
      });
    }

    const audioSize = req.body.length;

    if (audioSize < MIN_AUDIO_SIZE) {
      return res.status(400).json({
        error: "Audio too short",
        details: `Minimum ${MIN_AUDIO_SIZE} bytes, got ${audioSize}`
      });
    }

    if (audioSize > MAX_AUDIO_SIZE) {
      return res.status(413).json({
        error: "Audio too large",
        details: `Maximum ${MAX_AUDIO_SIZE} bytes, got ${audioSize}`
      });
    }

    logger.debug(`Received audio: ${audioSize} bytes`);

    // Create unique temp files to avoid race conditions
    const tmpDir = process.env.AUDIO_TMP_DIR || "/tmp";
    const randomId = randomBytes(8).toString("hex");
    rawPath = path.join(tmpDir, `audio_${randomId}.raw`);
    wavPath = path.join(tmpDir, `audio_${randomId}.wav`);

    // Write raw PCM to file
    logger.debug(`Writing to ${rawPath}`);
    await fs.writeFile(rawPath, req.body);

    // Convert to WAV
    logger.debug("Converting to WAV...");
    await convertToWav(rawPath, wavPath);

    // Transcribe with Groq
    logger.debug("Sending to Groq API...");
    const text = await runGroq(wavPath);

    // Success response
    res.json({
      text,
      audioSize,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    logger.error(`Transcription error: ${err.message}`, err);

    // Return appropriate error response
    if (err.message.includes("timeout")) {
      if (!res.headersSent) {
        res.status(408).json({
          error: "Transcription timeout",
          details: "Processing took too long"
        });
      }
    } else if (err.message.includes("Audio")) {
      if (!res.headersSent) {
        res.status(400).json({
          error: "Audio processing failed",
          details: err.message
        });
      }
    } else if (err.message.includes("rate limited")) {
      if (!res.headersSent) {
        res.status(429).json({
          error: "API rate limited",
          details: "Try again in a few seconds"
        });
      }
    } else if (err.message.includes("authentication")) {
      if (!res.headersSent) {
        res.status(503).json({
          error: "Service misconfiguration",
          details: "API key issue"
        });
      }
    } else {
      if (!res.headersSent) {
        res.status(500).json({
          error: "Transcription failed",
          details: process.env.NODE_ENV === "development" ? err.message : undefined
        });
      }
    }

  } finally {
    clearTimeout(timeoutHandle);

    // Always clean up temp files
    if (rawPath) {
      await cleanupFile(rawPath);
    }
    if (wavPath) {
      await cleanupFile(wavPath);
    }
  }
});

export default router;

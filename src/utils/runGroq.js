import axios from "axios";
import { promises as fs } from "fs";
import FormData from "form-data";
import { logger } from "./logger.js";

// 30-second timeout for API call
const GROQ_TIMEOUT = 30000;

/**
 * Call Groq Whisper API with WAV file
 * Returns transcription text or throws error
 */
export async function runGroq(filePath) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set in environment");
  }

  try {
    // Verify file exists and has content
    const stat = await fs.stat(filePath);
    if (stat.size === 0) {
      throw new Error("Audio file is empty");
    }

    logger.debug(`Transcribing with Groq: ${filePath} (${stat.size} bytes)`);

    // Create form data
    const form = new FormData();
    form.append("file", await fs.readFile(filePath), {
      filename: "audio.wav",
      contentType: "audio/wav"
    });
    form.append("model", "whisper-large-v3");
    form.append("language", "en");

    // Make API call with timeout
    const response = await axios.post(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "User-Agent": "spotify-caption-backend/1.1.0"
        },
        timeout: GROQ_TIMEOUT,
        maxContentLength: 50 * 1024 * 1024, // 50MB max response
        maxBodyLength: 50 * 1024 * 1024
      }
    );

    // Validate response structure
    if (!response.data || typeof response.data.text !== "string") {
      logger.error("Invalid Groq response:", response.data);
      throw new Error("Invalid Groq API response");
    }

    const transcription = response.data.text.trim();
    logger.debug(`Transcription result: "${transcription.substring(0, 100)}..."`);

    return transcription;

  } catch (err) {
    // Handle specific error types
    if (err.code === "ENOENT") {
      throw new Error("Audio file not found");
    }

    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const message = err.response?.data?.error?.message || err.message;

      if (status === 401) {
        throw new Error("Groq API authentication failed (invalid key)");
      } else if (status === 429) {
        throw new Error("Groq API rate limited");
      } else if (status === 400) {
        throw new Error(`Groq API validation error: ${message}`);
      } else if (err.code === "ECONNABORTED") {
        throw new Error("Groq API request timeout (30s)");
      } else {
        throw new Error(`Groq API error: ${status || "unknown"} - ${message}`);
      }
    }

    throw err;
  }
}

import { exec } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { logger } from "./logger.js";

// Timeout for ffmpeg conversion (15 seconds max)
const FFMPEG_TIMEOUT = 15000;

/**
 * Convert raw PCM to WAV using ffmpeg
 * Input: 16-bit signed LE PCM, mono or stereo
 * Output: WAV file with same format
 */
export async function convertToWav(inputPath, outputPath, options = {}) {
  const {
    sampleRate = 44100,
    channels = 1,
    bitDepth = 16
  } = options;

  return new Promise((resolve, reject) => {
    // Sanitize paths by using only basename (ffmpeg can't escape properly)
    const inputBasename = path.basename(inputPath);
    const outputBasename = path.basename(outputPath);
    const inputDir = path.dirname(inputPath);
    const outputDir = path.dirname(outputPath);

    // Build ffmpeg command with proper quoting
    const cmd = [
      "ffmpeg",
      "-y", // overwrite output
      "-f", "s16le", // signed 16-bit little-endian PCM
      "-ar", sampleRate.toString(), // sample rate
      "-ac", channels.toString(), // channels
      "-i", `"${inputBasename}"`, // input (quoted)
      `"${outputBasename}"` // output (quoted)
    ].join(" ");

    logger.debug(`Converting WAV: ${cmd}`);

    const proc = exec(cmd, {
      cwd: inputDir,
      timeout: FFMPEG_TIMEOUT,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    }, (err, stdout, stderr) => {
      if (err) {
        // Check if file was created despite error
        fs.access(outputPath)
          .then(() => {
            logger.warn(`ffmpeg had error but output exists: ${err.message}`);
            resolve();
          })
          .catch(() => {
            logger.error(`ffmpeg failed: ${err.message}`, err);
            reject(new Error(`WAV conversion failed: ${err.message}`));
          });
      } else {
        logger.debug("WAV conversion succeeded");
        resolve();
      }
    });

    // Handle timeout explicitly
    proc.on("error", (err) => {
      reject(new Error(`ffmpeg process error: ${err.message}`));
    });
  });
}

/**
 * Clean up temporary file
 */
export async function cleanupFile(filePath) {
  try {
    await fs.unlink(filePath);
    logger.debug(`Cleaned up: ${filePath}`);
  } catch (err) {
    // File may not exist, that's okay
    if (err.code !== "ENOENT") {
      logger.warn(`Failed to cleanup ${filePath}: ${err.message}`);
    }
  }
}

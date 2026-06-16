import express from "express";
import { writeFileSync } from "fs";
import { convertToWav } from "../utils/convertWav.js";
import { runWhisper } from "../utils/runWhisper.js";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const rawPath = "/tmp/audio.raw";
        const wavPath = "/tmp/audio.wav";

        // ESP32 kirim PCM raw
        writeFileSync(rawPath, req.body);

        // convert ke WAV
        await convertToWav(rawPath, wavPath);

        // STT
        const text = await runWhisper(wavPath);

        res.json({ text });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "STT failed" });
    }
});

export default router;

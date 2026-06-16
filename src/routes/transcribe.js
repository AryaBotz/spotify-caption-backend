import express from "express";
import { writeFileSync } from "fs";
import { convertToWav } from "../utils/convertWav.js";
import { runGroq } from "../utils/runGroq.js";

const router = express.Router();

router.post("/", async (req, res) => {
    try {

        const rawPath = "/tmp/audio.raw";
        const wavPath = "/tmp/audio.wav";

        writeFileSync(rawPath, req.body);

        await convertToWav(rawPath, wavPath);

        const text = await runGroq(wavPath);

        res.json({ text });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "STT failed" });
    }
});

export default router;

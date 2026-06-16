import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import statusRoute from "./routes/status.js";
import transcribeRoute from "./routes/transcribe.js";

dotenv.config();

const app = express();
app.use(cors());

// raw binary audio
app.use(express.raw({ type: "*/*", limit: "10mb" }));

app.get("/", (req, res) => {
    res.json({ ok: true, service: "spotify-caption-backend" });
});

app.use("/api/status", statusRoute);
app.use("/api/transcribe", transcribeRoute);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});

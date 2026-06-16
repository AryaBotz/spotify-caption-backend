import axios from "axios";
import fs from "fs";
import FormData from "form-data";

export async function runGroq(filePath) {

    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));
    form.append("model", "whisper-large-v3");

    const res = await axios.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        form,
        {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            }
        }
    );

    return res.data.text;
}

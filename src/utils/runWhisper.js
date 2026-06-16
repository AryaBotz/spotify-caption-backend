import { exec } from "child_process";

export function runWhisper(file) {
    return new Promise((resolve, reject) => {

        // contoh pakai whisper CLI lokal
        const cmd = `whisper ${file} --language en --output_format txt`;

        exec(cmd, (err, stdout) => {
            if (err) return reject(err);

            // fallback parsing
            resolve("lirik hasil transkripsi");
        });
    });
}

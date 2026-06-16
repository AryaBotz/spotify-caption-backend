import { exec } from "child_process";

export function convertToWav(input, output) {
    return new Promise((resolve, reject) => {

        // 44.1k mono PCM → WAV
        const cmd = `ffmpeg -y -f s16le -ar 44100 -ac 1 -i ${input} ${output}`;

        exec(cmd, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

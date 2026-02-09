import { spawn } from "child_process";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AI_DIR = path.resolve(__dirname, "../../ai");

/**
 * Run Whisper transcription via Python script.
 *
 * Uses ai/transcribe.py
 * Command:
 *   <PYTHON_PATH> transcribe.py <audio_path>
 *
 * @param {string} audioPath - absolute path to uploaded audio
 * @param {string} [outputPath] - optional output txt file path
 * @returns {Promise<{ text: string }>}
 */
export async function transcribeWithWhisper(audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    const python = process.env.PYTHON_PATH;

    if (!python) {
      return reject(
        new Error(
          "PYTHON_PATH is not set. Set it to whisper-env/bin/python3 in backend/.env"
        )
      );
    }

    const scriptName = "transcribe.py";

    console.log("────────────────────────────────────");
    console.log("[Whisper] Starting transcription");
    console.log("[Whisper] Python binary:", python);
    console.log("[Whisper] Script:", scriptName);
    console.log("[Whisper] Audio path:", audioPath);
    console.log("[Whisper] Working dir:", AI_DIR);
    console.log("────────────────────────────────────");

    const args = [scriptName, audioPath];
    if (outputPath) args.push(outputPath);

    const proc = spawn(python, args, {
      cwd: AI_DIR,
      env: {
        ...process.env,
        // IMPORTANT: ensure ffmpeg is visible
        PATH: process.env.PATH || "/usr/bin:/bin:/usr/local/bin",
      },
      stdio: outputPath ? "inherit" : ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    if (!outputPath) {
      proc.stdout.on("data", (data) => {
        const text = data.toString();
        stdout += text;
        console.log("[Whisper stdout]", text.slice(0, 200));
      });

      proc.stderr.on("data", (data) => {
        const text = data.toString();
        stderr += text;
        console.error("[Whisper stderr]", text.slice(0, 500));
      });
    }

    proc.on("close", async (code) => {
      console.log("[Whisper] Process exited with code:", code);

      if (code !== 0) {
        return reject(
          new Error(
            stderr ||
              `Whisper failed with exit code ${code}. Check logs above.`
          )
        );
      }

      try {
        if (outputPath) {
          const text = (await readFile(outputPath, "utf-8")).trim();
          if (!text) {
            return reject(new Error("Whisper produced empty transcript"));
          }
          console.log("[Whisper] Transcription completed (file)");
          return resolve({ text });
        } else {
          const text = stdout.trim();
          if (!text) {
            return reject(new Error("Whisper produced empty transcript"));
          }
          console.log("[Whisper] Transcription completed (stdout)");
          return resolve({ text });
        }
      } catch (err) {
        console.error("[Whisper] Failed to read transcript:", err);
        reject(err);
      }
    });

    proc.on("error", (err) => {
      console.error("[Whisper] Failed to spawn process:", err);
      reject(err);
    });
  });
}

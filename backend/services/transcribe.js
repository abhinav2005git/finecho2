import { spawn } from "child_process";
import { readFile } from "fs/promises";
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AI_DIR = path.resolve(__dirname, "../../ai");

/**
 * Run Whisper transcription via Python script.
 * @param {string} audioPath - Absolute path to audio file
 * @param {string} [outputPath] - Optional path to write transcript; if not set, returns from stdout
 * @returns {Promise<{ text: string, language?: string }>}
 */
export async function transcribeWithWhisper(audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(AI_DIR, "transcribe.py");
    const args = [scriptPath, audioPath];
    if (outputPath) args.push(outputPath);
    const proc = spawn(process.env.PYTHON_PATH || "python3", args, {
      cwd: AI_DIR,
      stdio: outputPath ? "inherit" : ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    if (!outputPath) {
      proc.stdout?.on("data", (d) => { stdout += d.toString(); });
      proc.stderr?.on("data", (d) => { stderr += d.toString(); });
    }

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Transcription failed with code ${code}`));
        return;
      }
      if (outputPath) {
        readFile(outputPath, "utf-8").then((text) => resolve({ text: text.trim() })).catch(reject);
      } else {
        resolve({ text: stdout.trim() });
      }
    });
    proc.on("error", (err) => reject(err));
  });
}

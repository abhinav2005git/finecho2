import { spawn } from "child_process";
import path from "path";

/**
 * Get audio duration in seconds using ffprobe.
 *
 * Uses FFPROBE_PATH from env if set, otherwise falls back to "ffprobe" on PATH.
 *
 * @param {string} audioPath - absolute path to audio file
 * @returns {Promise<number>} duration in whole seconds (rounded)
 */
export function getAudioDurationSeconds(audioPath) {
  return new Promise((resolve, reject) => {
    const ffprobe = process.env.FFPROBE_PATH || "ffprobe";

    console.log("────────────────────────────────────");
    console.log("[ffprobe] Probing duration");
    console.log("[ffprobe] Binary:", ffprobe);
    console.log("[ffprobe] Audio path:", audioPath);
    console.log("────────────────────────────────────");

    const args = [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      audioPath,
    ];

    const proc = spawn(ffprobe, args, {
      env: {
        ...process.env,
        PATH: process.env.PATH || "/usr/bin:/bin:/usr/local/bin",
      },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      console.log("[ffprobe] Exit code:", code);
      if (code !== 0) {
        console.error("[ffprobe stderr]", stderr.trim());
        return reject(
          new Error(
            stderr.trim() || `ffprobe failed with exit code ${code}. Check logs above.`
          )
        );
      }

      const raw = stdout.trim();
      const seconds = Number.parseFloat(raw);
      if (!Number.isFinite(seconds)) {
        console.error("[ffprobe] Could not parse duration from output:", raw);
        return reject(new Error("Failed to parse duration from ffprobe output"));
      }

      const rounded = Math.max(0, Math.round(seconds));
      console.log("[ffprobe] Duration (s):", rounded);
      resolve(rounded);
    });

    proc.on("error", (err) => {
      console.error("[ffprobe] Failed to spawn process:", err);
      reject(err);
    });
  });
}


import { supabaseAdmin } from "../supabase.js";
import { transcribeWithWhisper } from "./transcribe.js";
import { extractSummaryAndGoals } from "./summary.js";
import { analyzeCompliance } from "./compliance.js";
import { analyseTranscriptWithBackboard } from "./backboard.js";
import { unlink } from "fs/promises";

/**
 * Run full pipeline for a call: transcribe → summary + goals → compliance.
 * Updates call row in Supabase; does not throw (logs errors).
 * @param {string} callId - UUID of the call
 * @param {string} audioPath - Absolute path to uploaded audio file
 */
export async function runCallPipeline(callId, audioPath) {
  try {
    // 1) Transcription phase
    await supabaseAdmin.from("calls").update({ status: "transcribing" }).eq("id", callId);

    let transcript;
    try {
      const res = await transcribeWithWhisper(audioPath);
      transcript = res.text;
    } catch (err) {
      console.error("Transcription failed for", callId, err);
      await supabaseAdmin
        .from("calls")
        .update({
          status: "failed_transcription",
          summary: "Transcription failed: " + (err.message || "Unknown error"),
        })
        .eq("id", callId);
      return;
    }

    await supabaseAdmin
      .from("calls")
      .update({
        transcript,
        status: "transcribed",
      })
      .eq("id", callId);

    // 2) Summarisation / compliance phase – prefer Backboard, fall back to heuristics
    try {
      let summary;
      let goals;
      let language;
      let compliance_flags;
      let compliance_status;

      try {
        const backboard = await analyseTranscriptWithBackboard(transcript);
        summary = backboard.summary;
        goals = backboard.goals;
        language = backboard.language;
        compliance_flags = backboard.compliance_flags;
        compliance_status = backboard.compliance_status;
      } catch (bbErr) {
        console.warn("Backboard analysis failed, falling back to heuristic summary:", bbErr?.message || bbErr);
        const basic = extractSummaryAndGoals(transcript);
        const compliance = analyzeCompliance(transcript);
        summary = basic.summary;
        goals = basic.goals;
        language = basic.language;
        compliance_flags = compliance.compliance_flags;
        compliance_status = compliance.compliance_status;
      }

      await supabaseAdmin
        .from("calls")
        .update({
          summary,
          goals,
          language,
          compliance_flags,
          compliance_status,
          status: "completed",
        })
        .eq("id", callId);
    } catch (err) {
      console.error("Summary/compliance step failed for", callId, err);
      await supabaseAdmin
        .from("calls")
        .update({
          status: "failed_summary",
          summary: "Summary generation failed: " + (err.message || "Unknown error"),
        })
        .eq("id", callId);
    }
  } catch (err) {
    console.error("Call pipeline unexpected error for", callId, err);
    await supabaseAdmin
      .from("calls")
      .update({
        status: "failed_summary",
        summary: "Processing failed: " + (err.message || "Unknown error"),
      })
      .eq("id", callId);
  } finally {
    // Best-effort cleanup of uploaded audio; ignore errors.
    if (audioPath) {
      unlink(audioPath).catch(() => {});
    }
  }
}

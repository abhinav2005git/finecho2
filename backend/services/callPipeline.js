import { supabaseAdmin } from "../supabase.js";
import { transcribeWithWhisper } from "./transcribe.js";
import { extractSummaryAndGoals } from "./summary.js";
import { analyzeCompliance } from "./compliance.js";

/**
 * Run full pipeline for a call: transcribe → summary + goals → compliance.
 * Updates call row in Supabase; does not throw (logs errors).
 * @param {string} callId - UUID of the call
 * @param {string} audioPath - Absolute path to uploaded audio file
 */
export async function runCallPipeline(callId, audioPath) {
  try {
    await supabaseAdmin.from("calls").update({ status: "transcribing" }).eq("id", callId);

    const { text: transcript } = await transcribeWithWhisper(audioPath);
    await supabaseAdmin.from("calls").update({
      transcript,
      status: "transcribed",
    }).eq("id", callId);

    const { summary, goals, language } = extractSummaryAndGoals(transcript);
    const { compliance_flags, compliance_status } = analyzeCompliance(transcript);

    await supabaseAdmin.from("calls").update({
      summary,
      goals,
      language,
      compliance_flags,
      compliance_status,
      status: "completed",
    }).eq("id", callId);
  } catch (err) {
    console.error("Call pipeline error for", callId, err);
    await supabaseAdmin.from("calls").update({
      status: "transcribed",
      summary: "Processing failed: " + (err.message || "Unknown error"),
    }).eq("id", callId);
  }
}

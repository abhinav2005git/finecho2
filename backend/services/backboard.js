import axios from "axios";

/**
 * Call Backboard IO to analyse a transcript.
 *
 * Expects environment variables:
 * - BACKBOARD_BASE_URL
 * - BACKBOARD_API_KEY
 *
 * Returns a normalised object the rest of the pipeline can use.
 * If Backboard is not configured or returns an unexpected shape, this
 * function throws so the caller can fall back to a heuristic summary.
 *
 * @param {string} transcript
 * @returns {Promise<{ summary: string; goals: string[]; language: string; compliance_flags: string[]; compliance_status: 'clear' | 'warning' | 'risk'; }>}
 */
export async function analyseTranscriptWithBackboard(transcript) {
  const baseUrl = process.env.BACKBOARD_BASE_URL;
  const apiKey = process.env.BACKBOARD_API_KEY;

  if (!baseUrl || !apiKey) {
    console.warn("[Backboard] Skipping: BACKBOARD_BASE_URL or BACKBOARD_API_KEY not set");
    throw new Error("Backboard is not configured");
  }

  console.log("[Backboard] Analysing transcript");
  console.log("[Backboard] Base URL:", baseUrl);
  console.log("[Backboard] Transcript length:", (transcript || "").length);

  const prompt = `
You are a financial advisory documentation engine.

Given the full transcript of an advisor–client call, analyse it and respond with STRICT JSON only, no prose.

JSON schema:
{
  "summary": string,                      // 3–8 sentence business-friendly summary of the conversation
  "goals": string[],                      // list of concise client financial goals
  "language": string,                     // ISO language code like "en"
  "compliance_flags": string[],           // any potential compliance concerns, empty if none
  "compliance_status": "clear" | "warning" | "risk"
}

Transcript:
"""${transcript}"""
`.trim();

  const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat`;

  let res;
  try {
    res = await axios.post(
      url,
      {
        model_name: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        // Let Backboard handle memory & web search defaults; we just need a single-shot analysis
        memory: "off",
        web_search: "off",
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 60_000,
      }
    );
  } catch (err) {
    console.error("[Backboard] Request failed");
    if (axios.isAxiosError(err)) {
      console.error("[Backboard] Status:", err.response?.status);
      console.error("[Backboard] Response data:", err.response?.data);
      throw new Error(
        `Backboard request failed: ${err.response?.status} ${
          (err.response?.data && JSON.stringify(err.response.data).slice(0, 300)) || ""
        }`
      );
    }
    console.error("[Backboard] Error:", err);
    throw new Error("Backboard request failed");
  }

  // Backboard chat APIs usually wrap the model output; we expect the final text
  // to be JSON as instructed above.
  const raw =
    res.data?.output_text ??
    res.data?.output ??
    res.data?.choices?.[0]?.message?.content ??
    res.data?.choices?.[0]?.text;

  console.log("[Backboard] Raw model output (truncated):", typeof raw === "string" ? raw.slice(0, 300) : typeof raw);

  if (!raw || typeof raw !== "string") {
    throw new Error("Backboard response missing text output");
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("[Backboard] Failed to parse JSON:", err);
    throw new Error("Backboard did not return valid JSON");
  }

  const summary = String(parsed.summary || "").trim();
  const goals = Array.isArray(parsed.goals)
    ? parsed.goals.map((g) => String(g)).filter(Boolean)
    : [];
  const language = String(parsed.language || "en");
  const compliance_flags = Array.isArray(parsed.compliance_flags)
    ? parsed.compliance_flags.map((f) => String(f)).filter(Boolean)
    : [];
  const status = parsed.compliance_status;
  const compliance_status =
    status === "risk" || status === "warning" || status === "clear"
      ? status
      : compliance_flags.length > 0
      ? "warning"
      : "clear";

  return {
    summary: summary || "No summary available.",
    goals,
    language,
    compliance_flags,
    compliance_status,
  };
}


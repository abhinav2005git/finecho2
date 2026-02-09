/**
 * Extract short summary and financial goals from transcript text.
 * Uses keyword extraction; can be extended with OpenAI when OPENAI_API_KEY is set.
 */

const GOAL_KEYWORDS = {
  retirement: ["retirement", "retire", "pension", "corpus", "nest egg"],
  "tax saving": ["tax", "80c", "elss", "tax saving", "deduction"],
  education: ["education", "child", "school", "college", "fees"],
  "wealth creation": ["wealth", "growth", "invest", "sip", "mutual fund"],
  emergency: ["emergency", "liquid", "short term", "safety"],
};

/**
 * @param {string} transcript
 * @returns {{ summary: string, goals: string[], language: string }}
 */
export function extractSummaryAndGoals(transcript) {
  const t = (transcript || "").trim().toLowerCase();
  const goals = [];
  for (const [goal, keywords] of Object.entries(GOAL_KEYWORDS)) {
    if (keywords.some((k) => t.includes(k))) goals.push(goal);
  }
  if (goals.length === 0) goals.push("General advice");

  const summary =
    t.length > 400 ? t.slice(0, 397) + "..." : t || "No transcript available.";
  return {
    summary,
    goals,
    language: "en",
  };
}

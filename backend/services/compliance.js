/**
 * Basic compliance check: risky phrases and missing disclaimers.
 * Returns flags and overall status.
 */

const RISKY_PHRASES = [
  { pattern: /guaranteed\s+returns?/gi, message: "Mentions guaranteed returns" },
  { pattern: /no\s+risk/gi, message: "Claims no risk" },
  { pattern: /double\s+your\s+money/gi, message: "Promises specific returns" },
  { pattern: /100%\s+safe/gi, message: "Claims 100% safety" },
  { pattern: /can't\s+lose/gi, message: "Suggests no possibility of loss" },
];

const DISCLAIMER_PHRASES = [
  /past\s+performance/gi,
  /not\s+(a\s+)?guarantee/gi,
  /market\s+risk/gi,
  /please\s+read\s+(the\s+)?scheme\s+document/gi,
];

/**
 * @param {string} transcript
 * @returns {{ compliance_flags: string[], compliance_status: 'clear' | 'warning' | 'risk' }}
 */
export function analyzeCompliance(transcript) {
  const text = (transcript || "").trim();
  const compliance_flags = [];

  for (const { pattern, message } of RISKY_PHRASES) {
    if (pattern.test(text)) compliance_flags.push(message);
  }

  const hasDisclaimer = DISCLAIMER_PHRASES.some((p) => p.test(text));
  if (!hasDisclaimer && text.length > 100) {
    compliance_flags.push("No standard disclaimer detected");
  }

  let compliance_status = "clear";
  if (compliance_flags.some((f) => f.includes("guaranteed") || f.includes("double") || f.includes("100%"))) {
    compliance_status = "risk";
  } else if (compliance_flags.length > 0) {
    compliance_status = "warning";
  }

  return { compliance_flags, compliance_status };
}

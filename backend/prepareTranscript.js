import fs from "fs";

export function prepareTranscript() {
  const text = fs.readFileSync("transcript.txt", "utf-8");

  // basic cleanup
  const cleaned = text.replace(/\s+/g, " ").trim();

  // chunking (800 words)
  const words = cleaned.split(" ");
  const chunks = [];

  for (let i = 0; i < words.length; i += 800) {
    chunks.push(words.slice(i, i + 800).join(" "));
  }

  return chunks;
}

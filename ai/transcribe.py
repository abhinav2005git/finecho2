"""
Usage: python transcribe.py <input_audio_path> [output_txt_path]
If output_txt_path is omitted, writes to stdout.
"""
import sys
from pathlib import Path


def main() -> None:
  if len(sys.argv) < 2:
    print(
      "Usage: python transcribe.py <input_audio_path> [output_txt_path]",
      file=sys.stderr,
    )
    sys.exit(1)

  input_path = sys.argv[1]
  output_path = sys.argv[2] if len(sys.argv) > 2 else None

  if not Path(input_path).exists():
    print(f"File not found: {input_path}", file=sys.stderr)
    sys.exit(1)

  try:
    from faster_whisper import WhisperModel
  except Exception as exc:  # pragma: no cover
    print(f"Failed to import faster_whisper: {exc}", file=sys.stderr)
    sys.exit(1)

  try:
    # Model name and device can be tuned via env in future if needed
    model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, info = model.transcribe(input_path)

    # segments is an iterator of Segment objects; we want their .text
    texts = []
    for seg in segments:
      try:
        if seg and getattr(seg, "text", None):
          texts.append(seg.text.strip())
      except Exception:
        # Defensive: ignore any weird segment objects
        continue

    text = " ".join(t for t in texts if t).strip()

    if not text:
      print("Transcription produced empty text", file=sys.stderr)
      sys.exit(1)

    if output_path:
      with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
      # For file mode we still write a short confirmation to stdout
      print(f"Transcript saved to {output_path}")
    else:
      # Primary mode used by Node integration: print transcript to stdout
      print(text)

    sys.exit(0)
  except Exception as exc:
    print(f"Transcription error: {exc}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
  main()

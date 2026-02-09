"""
Usage: python transcribe.py <input_audio_path> [output_txt_path]
If output_txt_path is omitted, writes to stdout.
"""
import sys
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print("Usage: python transcribe.py <input_audio_path> [output_txt_path]", file=sys.stderr)
        sys.exit(1)
    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    if not Path(input_path).exists():
        print(f"File not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    from faster_whisper import WhisperModel
    model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, info = model.transcribe(input_path)
    text = " ".join(s.strip() for s in segments if s and s.text).strip()

    if output_path:
        with open(output_path, "w") as f:
            f.write(text)
        print(f"Transcript saved to {output_path}")
    else:
        print(text)

if __name__ == "__main__":
    main()

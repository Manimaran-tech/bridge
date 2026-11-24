import asyncio
import json
import math
import os
import subprocess
import edge_tts
from mutagen.mp3 import MP3

FPS = 30
TRANS = 12
VOICE = "en-US-AndrewNeural"
RATE = "+6%"
TEMPO = 1.24
MANIFEST_PATH = os.path.join("bridge-video", "src", "audio-manifest.json")
OUT_MP3 = os.path.join("bridge-video", "public", "audio", "scene5_connect.mp3")
RAW_MP3 = os.path.join("bridge-video", "public", "audio", "scene5_connect_raw.mp3")

NEW_TEXT = (
    "Now swap back to your web chat. Open Connectors, hit Connect MCP, "
    "create a custom connector named Bridge, paste your live URL, and click connect. "
    "Twenty-four sandboxed local tools come online immediately."
)


async def synth():
    last_err = None
    for attempt in range(6):
        try:
            comm = edge_tts.Communicate(
                text=NEW_TEXT,
                voice=VOICE,
                rate=RATE,
                pitch="+0Hz",
                boundary="WordBoundary",
            )
            words = []
            buf = bytearray()
            async for ch in comm.stream():
                if ch["type"] == "audio":
                    buf.extend(ch["data"])
                elif ch["type"] == "WordBoundary":
                    s_ms = ch["offset"] / 10000.0
                    d_ms = ch["duration"] / 10000.0
                    words.append({
                        "text": ch["text"],
                        "startMs": round(s_ms, 1),
                        "endMs": round(s_ms + d_ms, 1),
                    })
            if len(buf) < 1024:
                raise RuntimeError("Empty audio buffer")
            with open(RAW_MP3, "wb") as f:
                f.write(buf)
            return words
        except Exception as exc:
            last_err = exc
            await asyncio.sleep(1.5 + attempt)
    raise last_err


async def main():
    words = await synth()
    raw_dur_ms = round(MP3(RAW_MP3).info.length * 1000.0, 1)

    af = (
        "highpass=f=80,"
        "equalizer=f=2800:t=q:w=1.2:g=2.2,"
        "equalizer=f=180:t=q:w=1.0:g=1.5,"
        f"atempo={TEMPO},"
        "loudnorm=I=-14:TP=-1.5:LRA=8"
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", RAW_MP3,
            "-af", af,
            "-ar", "44100",
            "-b:a", "192k",
            OUT_MP3,
        ],
        check=True,
    )
    if os.path.exists(RAW_MP3):
        os.remove(RAW_MP3)

    final_dur_ms = round(MP3(OUT_MP3).info.length * 1000.0, 1)
    scale = final_dur_ms / raw_dur_ms

    # Clean "Twenty-four" -> "24" in captions while preserving exact timestamps
    cleaned = []
    for w in words:
        txt = "24" if w["text"].lower() == "twenty-four" else w["text"]
        cleaned.append({
            "text": txt,
            "startMs": round(w["startMs"] * scale, 1),
            "endMs": round(w["endMs"] * scale, 1),
        })

    with open(MANIFEST_PATH, encoding="utf-8") as f:
        data = json.load(f)

    cursor = 0
    for idx, s in enumerate(data["scenes"]):
        if s["id"] == "scene5_connect":
            s["text"] = NEW_TEXT
            s["speechDurationMs"] = final_dur_ms
            s["leadPadFrames"] = 4
            s["durationFrames"] = 4 + math.ceil((final_dur_ms / 1000.0) * FPS) + 10
            s["words"] = cleaned
        s["startFrame"] = cursor
        if idx < len(data["scenes"]) - 1:
            cursor += s["durationFrames"] - TRANS
        else:
            cursor += s["durationFrames"]

    data["totalFrames"] = cursor
    data["totalSeconds"] = round(cursor / FPS, 2)
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(
        f"Updated scene5_connect -> {final_dur_ms/1000:.2f}s | "
        f"NEW TOTAL: {cursor} frames ({data['totalSeconds']}s)"
    )


if __name__ == "__main__":
    if os.name == "nt":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())

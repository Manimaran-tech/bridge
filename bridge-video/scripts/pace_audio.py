import json
import math
import os
import subprocess
from mutagen.mp3 import MP3

TEMPO = 1.24
FPS = 30
TRANS = 12
MANIFEST_PATH = os.path.join("bridge-video", "src", "audio-manifest.json")

with open(MANIFEST_PATH, encoding="utf-8") as f:
    data = json.load(f)

cursor = 0
for idx, scene in enumerate(data["scenes"]):
    src = os.path.join("bridge-video", "public", scene["audioFile"])
    tmp = src + ".tmp.mp3"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-i",
            src,
            "-af",
            f"atempo={TEMPO},loudnorm=I=-14:TP=-1.5:LRA=8",
            "-ar",
            "44100",
            "-b:a",
            "192k",
            tmp,
        ],
        check=True,
    )
    os.replace(tmp, src)
    dur_ms = round(MP3(src).info.length * 1000.0, 1)
    scale = dur_ms / scene["speechDurationMs"]
    scene["speechDurationMs"] = dur_ms
    scene["leadPadFrames"] = 4
    tail = 34 if idx == len(data["scenes"]) - 1 else 10
    scene["durationFrames"] = 4 + math.ceil((dur_ms / 1000.0) * FPS) + tail
    scene["startFrame"] = cursor
    for w in scene["words"]:
        w["startMs"] = round(w["startMs"] * scale, 1)
        w["endMs"] = round(w["endMs"] * scale, 1)
    if idx < len(data["scenes"]) - 1:
        cursor += scene["durationFrames"] - TRANS
    else:
        cursor += scene["durationFrames"]
    print(
        f"{scene['id']}: start={scene['startFrame']} dur={scene['durationFrames']}f "
        f"({scene['durationFrames']/FPS:.2f}s, speech={dur_ms/1000:.2f}s)"
    )

data["fps"] = FPS
data["transitionFrames"] = TRANS
data["totalFrames"] = cursor
data["totalSeconds"] = round(cursor / FPS, 2)
data["voice"] = "en-US-AndrewNeural (1.30x reel-paced)"

with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"FINAL TOTAL: {cursor} frames ({data['totalSeconds']}s)")

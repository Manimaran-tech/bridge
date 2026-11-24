import asyncio
import json
import math
import os
import random
import re
import struct
import subprocess
import wave
import edge_tts
from mutagen.mp3 import MP3

FPS = 30
TRANSITION_FRAMES = 12  # Must match Composition.tsx TransitionSeries overlap
VOICE = "en-US-AndrewNeural"
RATE = "+15%"
PITCH = "+0Hz"

SCENES = [
    {
        "id": "scene1_pain",
        "title": "Hook & Copy-Paste Error Loop",
        "lead_pad_frames": 5,
        "tail_pad_frames": 14,
        "text": (
            "Still zipping your project and uploading it to web chat just to fix one bug? "
            "You copy the fix, paste it into VS Code, run tests, and boom — broken import. "
            "So you paste that error back into chat, copy the new fix, paste it again. Still failing. "
            "Upload, copy, paste, crash, repeat. Stuck in copy-paste hell."
        ),
    },
    {
        "id": "scene2_reveal",
        "title": "Meet Bridge",
        "lead_pad_frames": 6,
        "tail_pad_frames": 14,
        "text": (
            "Stop acting like a human clipboard. Meet Bridge — the open-source local-to-web AI harness "
            "connecting your codebase straight to Gemini, ChatGPT, Claude, and DeepSeek."
        ),
    },
    {
        "id": "scene3_install",
        "title": "10-Second Installation Guide",
        "lead_pad_frames": 5,
        "tail_pad_frames": 14,
        "text": (
            "Setup takes ten seconds. Install globally with npm install dash g, "
            "at markmayandi slash bridge, or run instantly with zero install using npx."
        ),
    },
    {
        "id": "scene4_terminal",
        "title": "Terminal cd & Instant Tunnel",
        "lead_pad_frames": 5,
        "tail_pad_frames": 14,
        "text": (
            "Open your terminal, c d into your project folder, and run bridge dot. "
            "In two seconds, Bridge jails that directory, opens a Cloudflare Anycast tunnel, "
            "and copies your live MCP link to your clipboard."
        ),
    },
    {
        "id": "scene5_connect",
        "title": "Connect Custom MCP",
        "lead_pad_frames": 5,
        "tail_pad_frames": 14,
        "text": (
            "Swap back to your web chat. Open Connectors, hit Connect MCP, "
            "create a custom server named Bridge, paste your URL, and click connect. "
            "Eight local tools come online instantly."
        ),
    },
    {
        "id": "scene6_mention",
        "title": "@Bridge Call & Permission Control",
        "lead_pad_frames": 5,
        "tail_pad_frames": 16,
        "text": (
            "Now type at Bridge in chat and give your command. "
            "Before touching a single file, the model asks for your permission. "
            "Review the exact tool call, stay in control, and click allow."
        ),
    },
    {
        "id": "scene7_execution",
        "title": "Live Read, Write & Local Tests",
        "lead_pad_frames": 5,
        "tail_pad_frames": 14,
        "text": (
            "Watch it work live. Bridge reads todo logic dot j s, "
            "writes a clean patch straight to disk, and runs node test on your machine. "
            "Seven of seven passing, zero copy-paste."
        ),
    },
    {
        "id": "scene8_outro",
        "title": "Launch CTA",
        "lead_pad_frames": 6,
        "tail_pad_frames": 44,
        "text": (
            "Stop copy-pasting code in twenty twenty-six. "
            "Try Bridge now with one npx command. "
            "Free, jailed, and open source on GitHub."
        ),
    },
]

OUT_AUDIO_DIR = os.path.join("bridge-video", "public", "audio")
MANIFEST_PATH = os.path.join("bridge-video", "src", "audio-manifest.json")


def write_wav(path, samples, sample_rate=44100):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        data = bytearray()
        for s in samples:
            clamped = max(-1.0, min(1.0, s))
            data.extend(struct.pack("<h", int(clamped * 32767)))
        wf.writeframes(bytes(data))


def generate_sfx():
    sr = 44100
    rng = random.Random(42)

    # 1. Crisp UI click
    dur = 0.055
    samples = []
    for i in range(int(sr * dur)):
        t = i / sr
        env = math.exp(-t * 115)
        s = (
            math.sin(2 * math.pi * 1900 * t) * 0.55
            + math.sin(2 * math.pi * 940 * t) * 0.35
            + (rng.uniform(-1, 1) * 0.22 * math.exp(-t * 280))
        ) * env * 0.65
        samples.append(s)
    write_wav(os.path.join(OUT_AUDIO_DIR, "sfx_click.wav"), samples, sr)

    # 2. Mechanical key tap
    dur = 0.032
    samples = []
    for i in range(int(sr * dur)):
        t = i / sr
        env = math.exp(-t * 170)
        s = (
            math.sin(2 * math.pi * 2450 * t) * 0.35
            + math.sin(2 * math.pi * 430 * t) * 0.38
            + rng.uniform(-1, 1) * 0.42
        ) * env * 0.42
        samples.append(s)
    write_wav(os.path.join(OUT_AUDIO_DIR, "sfx_type.wav"), samples, sr)

    # 3. Clean UI pop
    dur = 0.14
    samples = []
    for i in range(int(sr * dur)):
        t = i / sr
        env = math.exp(-t * 28)
        freq = 540 + 660 * (1 - math.exp(-t * 36))
        s = math.sin(2 * math.pi * freq * t) * env * 0.48
        samples.append(s)
    write_wav(os.path.join(OUT_AUDIO_DIR, "sfx_pop.wav"), samples, sr)

    # 4. Punchy error buzz
    dur = 0.32
    samples = []
    for i in range(int(sr * dur)):
        t = i / sr
        env = math.exp(-t * 10.5)
        freq = 148 - 42 * (t / dur)
        s = (
            math.sin(2 * math.pi * freq * t) * 0.6
            + math.sin(2 * math.pi * (freq * 1.49) * t) * 0.3
            + math.sin(2 * math.pi * (freq * 0.5) * t) * 0.4
        ) * env * 0.62
        samples.append(s)
    write_wav(os.path.join(OUT_AUDIO_DIR, "sfx_error.wav"), samples, sr)

    # 5. Fast glitch snap-cut
    dur = 0.16
    samples = []
    for i in range(int(sr * dur)):
        t = i / sr
        env = math.sin(math.pi * (t / dur)) ** 0.8
        freq = 240 + 920 * ((t * 18) % 1.0)
        s = (
            math.sin(2 * math.pi * freq * t) * 0.34
            + rng.uniform(-1, 1) * 0.34 * math.exp(-t * 15)
        ) * env * 0.48
        samples.append(s)
    write_wav(os.path.join(OUT_AUDIO_DIR, "sfx_glitch.wav"), samples, sr)

    # 6. Smooth whip whoosh
    dur = 0.36
    samples = []
    lp = 0.0
    for i in range(int(sr * dur)):
        t = i / sr
        env = math.sin(math.pi * (t / dur)) ** 1.35
        noise = rng.uniform(-1, 1)
        alpha = 0.05 + 0.36 * (t / dur)
        lp = lp + alpha * (noise - lp)
        freq = 110 + 420 * (t / dur)
        s = (
            lp * 0.55
            + math.sin(2 * math.pi * freq * t) * 0.35
            + math.sin(2 * math.pi * 62 * t) * math.exp(-t * 9) * 0.45
        ) * env * 0.55
        samples.append(s)
    write_wav(os.path.join(OUT_AUDIO_DIR, "sfx_whoosh.wav"), samples, sr)

    # 7. Crisp bright 3-note success chord
    dur = 0.52
    samples = []
    notes = [(0.0, 587.33), (0.07, 880.0), (0.14, 1174.66)]
    for i in range(int(sr * dur)):
        t = i / sr
        s = 0.0
        for onset, f in notes:
            if t >= onset:
                dt = t - onset
                e = math.exp(-dt * 8.5)
                s += (
                    math.sin(2 * math.pi * f * dt) * 0.65
                    + math.sin(2 * math.pi * (f * 2.0) * dt) * 0.18
                ) * e
        samples.append(s * 0.34)
    write_wav(os.path.join(OUT_AUDIO_DIR, "sfx_success.wav"), samples, sr)

    # 8. Modern driving tech-reel synth bed (loopable 8.0s at 120 BPM)
    dur = 8.0
    samples = []
    chords = [
        (110.0, 164.81, 220.0, 329.63),   # Am
        (87.31, 130.81, 174.61, 261.63),  # F
        (130.81, 196.00, 261.63, 329.63), # C
        (98.00, 146.83, 196.00, 293.66),  # G
    ]
    arp = [220.0, 261.63, 329.63, 392.0, 329.63, 261.63, 220.0, 196.0]
    for i in range(int(sr * dur)):
        t = i / sr
        chord_idx = int(t / 2.0) % len(chords)
        local_t = t % 2.0
        chord_env = min(1.0, local_t / 0.08) * min(1.0, (2.0 - local_t) / 0.08)

        beat_t = t % 0.5
        half_beat_t = t % 0.25

        kick_freq = 128 * math.exp(-beat_t * 32) + 46
        kick = math.sin(2 * math.pi * kick_freq * beat_t) * math.exp(-beat_t * 14) * 0.42

        hat = 0.0
        if beat_t >= 0.25:
            ht = beat_t - 0.25
            hat = rng.uniform(-1, 1) * math.exp(-ht * 85) * 0.055

        sidechain = 0.35 + 0.65 * min(1.0, beat_t / 0.18)
        pad = 0.0
        for f in chords[chord_idx]:
            pad += math.sin(2 * math.pi * f * t) * 0.15

        step = int(t / 0.25) % len(arp)
        arp_f = arp[step] * (1.0 if chord_idx != 1 else 0.89)
        pluck = math.sin(2 * math.pi * arp_f * t) * math.exp(-half_beat_t * 16) * 0.10

        bass = math.sin(2 * math.pi * (chords[chord_idx][0] * 0.5) * t) * sidechain * 0.25

        samples.append((kick + hat + pad * chord_env * sidechain + pluck + bass) * 0.30)
    write_wav(os.path.join(OUT_AUDIO_DIR, "bg_bed.wav"), samples, sr)


def estimate_word_timings(text, total_duration_ms):
    raw_tokens = text.split()
    weights = []
    pauses = []
    for idx, tok in enumerate(raw_tokens):
        clean = re.sub(r"[^A-Za-z0-9\-]", "", tok)
        w = max(2.2, len(clean) * 0.85 + 1.6)
        weights.append(w)
        p = 0.35
        if idx == len(raw_tokens) - 1:
            p = 0.0
        elif tok.endswith((".", "?", "!")):
            p = 3.2
        elif tok.endswith(","):
            p = 1.6
        pauses.append(p)

    lead_ms = 50.0
    tail_ms = 80.0
    usable_ms = max(400.0, total_duration_ms - lead_ms - tail_ms)
    total_units = sum(weights) + sum(pauses)

    words = []
    cursor_ms = lead_ms
    for tok, w, p in zip(raw_tokens, weights, pauses):
        dur_ms = (w / total_units) * usable_ms
        pause_ms = (p / total_units) * usable_ms
        words.append({
            "text": tok,
            "startMs": round(cursor_ms, 1),
            "endMs": round(cursor_ms + dur_ms, 1),
        })
        cursor_ms += dur_ms + pause_ms
    return words


def clean_caption_words(raw_words):
    """Make spoken technical tokens look razor-sharp in visual captions while keeping exact timestamps."""
    cleaned = []
    i = 0
    while i < len(raw_words):
        w = raw_words[i]
        t_low = w["text"].lower().strip(".,?!")

        # "c" + "d" -> "cd"
        if t_low == "c" and i + 1 < len(raw_words) and raw_words[i + 1]["text"].lower().strip(".,?!") == "d":
            cleaned.append({
                "text": "cd",
                "startMs": w["startMs"],
                "endMs": raw_words[i + 1]["endMs"],
            })
            i += 2
            continue

        # "dash" + "g" -> "-g"
        if t_low == "dash" and i + 1 < len(raw_words) and raw_words[i + 1]["text"].lower().strip(".,?!") == "g":
            cleaned.append({
                "text": "-g",
                "startMs": w["startMs"],
                "endMs": raw_words[i + 1]["endMs"],
            })
            i += 2
            continue

        # "at" + "markmayandi" + "slash" + "bridge" -> "@markmayandi/bridge"
        if (
            t_low == "at"
            and i + 3 < len(raw_words)
            and "markmayandi" in raw_words[i + 1]["text"].lower()
            and raw_words[i + 2]["text"].lower().strip(".,?!") == "slash"
        ):
            cleaned.append({
                "text": "@markmayandi/bridge",
                "startMs": w["startMs"],
                "endMs": raw_words[i + 3]["endMs"],
            })
            i += 4
            continue

        # "at" + "Bridge" -> "@Bridge"
        if t_low == "at" and i + 1 < len(raw_words) and raw_words[i + 1]["text"].lower().strip(".,?!") == "bridge":
            cleaned.append({
                "text": "@Bridge",
                "startMs": w["startMs"],
                "endMs": raw_words[i + 1]["endMs"],
            })
            i += 2
            continue

        # "bridge" + "dot" -> "bridge ."
        if t_low == "bridge" and i + 1 < len(raw_words) and raw_words[i + 1]["text"].lower().strip(".,?!") == "dot":
            cleaned.append({
                "text": "bridge .",
                "startMs": w["startMs"],
                "endMs": raw_words[i + 1]["endMs"],
            })
            i += 2
            continue

        # "todo" + "logic" + "dot" + "j" + "s" -> "todo-logic.js"
        if (
            t_low == "todo"
            and i + 4 < len(raw_words)
            and raw_words[i + 1]["text"].lower().strip(".,?!") == "logic"
            and raw_words[i + 2]["text"].lower().strip(".,?!") == "dot"
            and raw_words[i + 3]["text"].lower().strip(".,?!") == "j"
            and raw_words[i + 4]["text"].lower().strip(".,?!") == "s"
        ):
            cleaned.append({
                "text": "todo-logic.js,",
                "startMs": w["startMs"],
                "endMs": raw_words[i + 4]["endMs"],
            })
            i += 5
            continue

        # "twenty" + "twenty-six" -> "2026."
        if t_low == "twenty" and i + 1 < len(raw_words) and "twenty" in raw_words[i + 1]["text"].lower():
            cleaned.append({
                "text": "2026.",
                "startMs": w["startMs"],
                "endMs": raw_words[i + 1]["endMs"],
            })
            i += 2
            continue

        cleaned.append(w)
        i += 1
    return cleaned


async def synthesize_edge_tts(text, raw_mp3):
    last_err = None
    for attempt in range(5):
        try:
            communicate = edge_tts.Communicate(
                text=text,
                voice=VOICE,
                rate=RATE,
                pitch=PITCH,
                boundary="WordBoundary",
            )
            words = []
            audio_bytes = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_bytes.extend(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    start_ms = chunk["offset"] / 10000.0
                    dur_ms = chunk["duration"] / 10000.0
                    words.append({
                        "text": chunk["text"],
                        "startMs": round(start_ms, 1),
                        "endMs": round(start_ms + dur_ms, 1),
                    })
            if len(audio_bytes) < 1024:
                raise RuntimeError("Empty audio received from edge_tts")
            with open(raw_mp3, "wb") as f:
                f.write(audio_bytes)
            return words
        except Exception as exc:
            last_err = exc
            await asyncio.sleep(1.5 + attempt)
    raise last_err


async def generate_scene_audio(scene):
    raw_mp3 = os.path.join(OUT_AUDIO_DIR, f"{scene['id']}_raw.mp3")
    out_mp3 = os.path.join(OUT_AUDIO_DIR, f"{scene['id']}.mp3")

    words = await synthesize_edge_tts(scene["text"], raw_mp3)

    # Broadcast vocal EQ + loudness polish WITHOUT trimming start so WordBoundary stays 100% synced
    af = (
        "highpass=f=80,"
        "equalizer=f=2800:t=q:w=1.2:g=2.2,"
        "equalizer=f=180:t=q:w=1.0:g=1.5,"
        "loudnorm=I=-14:TP=-1.5:LRA=8"
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-i",
            raw_mp3,
            "-af",
            af,
            "-ar",
            "44100",
            "-b:a",
            "192k",
            out_mp3,
        ],
        check=True,
    )

    if os.path.exists(raw_mp3):
        os.remove(raw_mp3)

    audio_info = MP3(out_mp3)
    duration_ms = round(audio_info.info.length * 1000.0, 1)

    if not words:
        words = estimate_word_timings(scene["text"], duration_ms)
    else:
        words = clean_caption_words(words)

    speech_frames = math.ceil((duration_ms / 1000.0) * FPS)
    duration_frames = scene["lead_pad_frames"] + speech_frames + scene["tail_pad_frames"]

    return {
        "id": scene["id"],
        "title": scene["title"],
        "audioFile": f"audio/{scene['id']}.mp3",
        "leadPadFrames": scene["lead_pad_frames"],
        "speechDurationMs": duration_ms,
        "durationFrames": duration_frames,
        "text": scene["text"],
        "words": words,
    }


async def main():
    os.makedirs(OUT_AUDIO_DIR, exist_ok=True)
    generate_sfx()
    manifest_scenes = []
    cursor_frame = 0

    for idx, scene in enumerate(SCENES):
        info = await generate_scene_audio(scene)
        await asyncio.sleep(0.8)
        info["startFrame"] = cursor_frame
        if idx < len(SCENES) - 1:
            cursor_frame += info["durationFrames"] - TRANSITION_FRAMES
        else:
            cursor_frame += info["durationFrames"]
        manifest_scenes.append(info)
        print(
            f"{info['id']}: start={info['startFrame']} dur={info['durationFrames']}f "
            f"({info['durationFrames']/FPS:.2f}s, speech={info['speechDurationMs']/1000:.2f}s), "
            f"words={len(info['words'])}"
        )

    manifest = {
        "fps": FPS,
        "transitionFrames": TRANSITION_FRAMES,
        "totalFrames": cursor_frame,
        "totalSeconds": round(cursor_frame / FPS, 2),
        "voice": f"{VOICE} ({RATE})",
        "scenes": manifest_scenes,
    }

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"TOTAL: {cursor_frame} frames ({cursor_frame / FPS:.2f}s) -> {MANIFEST_PATH}")


if __name__ == "__main__":
    if os.name == "nt":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())

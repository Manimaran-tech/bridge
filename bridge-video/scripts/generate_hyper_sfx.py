import math
import os
import random
import struct
import wave

SR = 44100
OUT_DIR = os.path.join("bridge-video", "public", "audio")


def write_wav(name, samples):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        clipped = [max(-0.98, min(0.98, s)) for s in samples]
        wf.writeframes(
            struct.pack("<" + "h" * len(clipped), *[int(s * 32767) for s in clipped])
        )
    print(f"Generated {name} ({len(samples)/SR:.2f}s)")


def gen_whip_pan():
    """Ultra-fast directional whip-pan swoosh for rapid camera jump-cuts (0.16s)."""
    dur = 0.16
    n = int(SR * dur)
    out = []
    lp = 0.0
    bp = 0.0
    phase = 0.0
    random.seed(501)
    for i in range(n):
        t = i / SR
        p = t / dur
        env = math.sin(math.pi * p) ** 1.3
        noise = random.uniform(-1, 1)
        cutoff = 0.08 + 0.55 * math.sin(math.pi * p)
        lp += cutoff * (noise - lp)
        bp += 0.25 * (lp - bp)
        freq = 220 + 1100 * (p ** 1.5)
        phase += 2 * math.pi * freq / SR
        tone = math.sin(phase) * 0.28
        out.append(((lp - bp * 0.6) * 0.85 + tone) * env * 0.92)
    write_wav("sfx_whip_pan.wav", out)


def gen_laser_lock():
    """Crisp high-tech double-pip reticle lock-on for SpotlightFocusVfx (0.15s)."""
    dur = 0.15
    n = int(SR * dur)
    out = [0.0] * n
    pips = [(0.0, 1320.0, 0.045), (0.055, 1980.0, 0.085)]
    for start, freq, plen in pips:
        s_idx = int(start * SR)
        m = int(plen * SR)
        for j in range(m):
            if s_idx + j >= n:
                break
            lt = j / SR
            env = min(1.0, lt * 500) * math.exp(-lt * 42.0)
            sig = math.sin(2 * math.pi * freq * lt) * 0.65 + math.sin(2 * math.pi * freq * 1.5 * lt) * 0.22
            out[s_idx + j] += sig * env * 0.72
    write_wav("sfx_laser_lock.wav", out)


def gen_bass_punch():
    """Tight 808-style kinetic bass thump for KineticBeatBanner slams (0.24s)."""
    dur = 0.24
    n = int(SR * dur)
    out = []
    phase = 0.0
    random.seed(502)
    for i in range(n):
        t = i / SR
        freq = 165 * math.exp(-t * 15.0) + 48
        phase += 2 * math.pi * freq / SR
        env = min(1.0, t * 400) * math.exp(-t * 11.5)
        sub = math.tanh(math.sin(phase) * 1.6) * 0.85
        click = random.uniform(-1, 1) * math.exp(-t * 90.0) * 0.35
        out.append((sub + click) * env * 0.92)
    write_wav("sfx_bass_punch.wav", out)


def gen_sparkle_chime():
    """Bright crystalline two-note shimmer for info badges & floating assets (0.22s)."""
    dur = 0.22
    n = int(SR * dur)
    out = [0.0] * n
    notes = [(0.0, 1567.98), (0.045, 2093.0), (0.09, 2637.02)]
    for start, freq in notes:
        s_idx = int(start * SR)
        for i in range(s_idx, n):
            lt = (i - s_idx) / SR
            env = min(1.0, lt * 350) * math.exp(-lt * 18.0)
            out[i] += (math.sin(2 * math.pi * freq * lt) * 0.5 + math.sin(2 * math.pi * freq * 2 * lt) * 0.15) * env * 0.42
    write_wav("sfx_sparkle_chime.wav", out)


def gen_glitch_stutter():
    """Aggressive rapid digital stutter burst for errors & montage cuts (0.18s)."""
    dur = 0.18
    n = int(SR * dur)
    out = []
    random.seed(503)
    for i in range(n):
        t = i / SR
        gate = 1.0 if (int(t * 48) % 2 == 0) else 0.15
        env = math.exp(-t * 12.0) * gate
        bit = 1.0 if math.sin(2 * math.pi * (340 + 420 * (int(t * 32) % 3)) * t) > 0 else -1.0
        noise = random.uniform(-1, 1) * 0.45
        out.append((bit * 0.45 + noise) * env * 0.72)
    write_wav("sfx_glitch_stutter.wav", out)


def gen_ui_slide():
    """Silky mechanical UI slide for popovers, modals, and diff panels (0.14s)."""
    dur = 0.14
    n = int(SR * dur)
    out = []
    phase = 0.0
    lp = 0.0
    random.seed(504)
    for i in range(n):
        t = i / SR
        p = t / dur
        freq = 320 + 540 * (p ** 0.85)
        phase += 2 * math.pi * freq / SR
        env = math.sin(math.pi * p) ** 0.9 * math.exp(-t * 8.0)
        noise = random.uniform(-1, 1)
        lp += 0.22 * (noise - lp)
        out.append((math.sin(phase) * 0.48 + lp * 0.42) * env * 0.82)
    write_wav("sfx_ui_slide.wav", out)


def gen_tick_fast():
    """Ultra-crisp 0.06s mechanical micro-tick for rapid tool grid & counter beats."""
    dur = 0.06
    n = int(SR * dur)
    out = []
    for i in range(n):
        t = i / SR
        env = min(1.0, t * 700) * math.exp(-t * 85.0)
        sig = math.sin(2 * math.pi * 1650 * t) * 0.65 + math.sin(2 * math.pi * 620 * t) * 0.35
        out.append(sig * env * 0.85)
    write_wav("sfx_tick_fast.wav", out)


def gen_swoosh_reverse():
    """Reverse-reverb suction whoosh building into scene transitions (0.28s)."""
    dur = 0.28
    n = int(SR * dur)
    out = []
    lp = 0.0
    phase = 0.0
    random.seed(505)
    for i in range(n):
        t = i / SR
        p = t / dur
        env = (p ** 2.4) * (1.0 - max(0.0, (p - 0.94) / 0.06))
        noise = random.uniform(-1, 1)
        lp += (0.04 + 0.48 * p) * (noise - lp)
        freq = 180 + 760 * (p ** 2.0)
        phase += 2 * math.pi * freq / SR
        out.append((lp * 0.72 + math.sin(phase) * 0.32) * env * 0.88)
    write_wav("sfx_swoosh_reverse.wav", out)


if __name__ == "__main__":
    gen_whip_pan()
    gen_laser_lock()
    gen_bass_punch()
    gen_sparkle_chime()
    gen_glitch_stutter()
    gen_ui_slide()
    gen_tick_fast()
    gen_swoosh_reverse()

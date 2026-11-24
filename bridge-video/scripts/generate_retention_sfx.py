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


def gen_cut_snap():
    """Ultra-crisp whip-cut camera snap for rapid frame jumps (0.14s)."""
    dur = 0.14
    n = int(SR * dur)
    out = []
    lp = 0.0
    random.seed(101)
    for i in range(n):
        t = i / SR
        p = t / dur
        env = math.exp(-t * 38.0) * min(1.0, t * 400)
        noise = random.uniform(-1, 1)
        cutoff = 0.18 + 0.45 * (1.0 - p)
        lp += cutoff * (noise - lp)
        click = math.sin(2 * math.pi * (1400 * math.exp(-t * 28) + 260) * t) * 0.55
        out.append((lp * 0.65 + click) * env * 0.9)
    write_wav("sfx_cut_snap.wav", out)


def gen_zoom_punch():
    """Tight bass-mid kinetic punch-in for macro camera zooms (0.18s)."""
    dur = 0.18
    n = int(SR * dur)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / SR
        freq = 240 * math.exp(-t * 16.0) + 65
        phase += 2 * math.pi * freq / SR
        env = min(1.0, t * 280) * math.exp(-t * 18.0)
        body = math.sin(phase) * 0.85
        snap = math.sin(2 * math.pi * 880 * t) * math.exp(-t * 65.0) * 0.35
        out.append((body + snap) * env)
    write_wav("sfx_zoom_punch.wav", out)


def gen_shutter_flash():
    """Sharp kinetic flash / camera shutter click for VFX flashes & badges (0.12s)."""
    dur = 0.12
    n = int(SR * dur)
    out = []
    random.seed(202)
    for i in range(n):
        t = i / SR
        env = min(1.0, t * 500) * math.exp(-t * 44.0)
        hi = math.sin(2 * math.pi * 2400 * t) * 0.4
        mid = math.sin(2 * math.pi * 960 * t) * 0.35
        air = random.uniform(-1, 1) * 0.45 * math.exp(-t * 55.0)
        out.append((hi + mid + air) * env)
    write_wav("sfx_shutter_flash.wav", out)


def gen_riser_short():
    """Fast 0.45s synth tension riser leading into reveals and drops."""
    dur = 0.45
    n = int(SR * dur)
    out = []
    phase = 0.0
    lp = 0.0
    random.seed(303)
    for i in range(n):
        t = i / SR
        p = t / dur
        freq = 160 + 980 * (p ** 2.2)
        phase += 2 * math.pi * freq / SR
        env = (p ** 1.6) * (1.0 - max(0.0, (p - 0.92) / 0.08))
        noise = random.uniform(-1, 1)
        lp += (0.04 + 0.35 * p) * (noise - lp)
        tone = math.sin(phase) * 0.55 + math.sin(phase * 2.0) * 0.2
        out.append((tone + lp * 0.5) * env * 0.72)
    write_wav("sfx_riser_short.wav", out)


def gen_impact_hit():
    """Punchy cinematic boom + crisp transient crack for major text/logo slams (0.48s)."""
    dur = 0.48
    n = int(SR * dur)
    out = []
    phase = 0.0
    random.seed(404)
    for i in range(n):
        t = i / SR
        freq = 175 * math.exp(-t * 8.5) + 46
        phase += 2 * math.pi * freq / SR
        sub = math.sin(phase) * math.exp(-t * 5.8) * 0.85
        crack = random.uniform(-1, 1) * math.exp(-t * 68.0) * 0.55
        metal = math.sin(2 * math.pi * 540 * t) * math.exp(-t * 32.0) * 0.3
        out.append((sub + crack + metal) * min(1.0, t * 300))
    write_wav("sfx_impact_hit.wav", out)


def gen_pop_bright():
    """Sparkling crisp UI pop for every badge, icon, and card entrance (0.11s)."""
    dur = 0.11
    n = int(SR * dur)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / SR
        p = t / dur
        freq = 420 + 620 * (p ** 0.7)
        phase += 2 * math.pi * freq / SR
        env = min(1.0, t * 320) * math.exp(-t * 36.0)
        out.append((math.sin(phase) * 0.75 + math.sin(phase * 2.0) * 0.25) * env * 0.82)
    write_wav("sfx_pop_bright.wav", out)


def gen_data_stream():
    """High-tech subtle digital pulse burst for tunnel & JSON-RPC logs (0.55s)."""
    dur = 0.55
    n = int(SR * dur)
    out = [0.0] * n
    freqs = [880, 1174.66, 1318.51, 1567.98, 1760, 2093]
    for step in range(8):
        s_t = step * 0.062
        s_idx = int(s_t * SR)
        f = freqs[step % len(freqs)]
        pulse_len = int(0.048 * SR)
        for j in range(pulse_len):
            if s_idx + j >= n:
                break
            lt = j / SR
            env = min(1.0, lt * 350) * math.exp(-lt * 55.0)
            out[s_idx + j] += math.sin(2 * math.pi * f * lt) * env * 0.38
    write_wav("sfx_data_stream.wav", out)


def gen_code_patch():
    """Crisp digital lock-in swipe for surgical diff patching (0.28s)."""
    dur = 0.28
    n = int(SR * dur)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / SR
        p = t / dur
        freq = 520 + 780 * p
        phase += 2 * math.pi * freq / SR
        env = math.sin(math.pi * p) ** 0.8 * math.exp(-t * 6.0)
        lock = math.sin(2 * math.pi * 1046.5 * max(0.0, t - 0.14)) * (1.0 if t >= 0.14 else 0.0) * math.exp(-max(0.0, t - 0.14) * 24.0) * 0.5
        out.append((math.sin(phase) * 0.45 + lock) * 0.85 * (env + 0.35))
    write_wav("sfx_code_patch.wav", out)


def gen_victory_fanfare():
    """Modern tech harmonic chord hit for 7/7 pass & CTA launch (0.85s)."""
    dur = 0.85
    n = int(SR * dur)
    out = [0.0] * n
    chord = [(0.0, 523.25), (0.045, 659.25), (0.09, 783.99), (0.135, 1046.5), (0.18, 1318.51)]
    for start, freq in chord:
        s_idx = int(start * SR)
        for i in range(s_idx, n):
            lt = (i - s_idx) / SR
            env = min(1.0, lt * 180) * math.exp(-lt * 4.2)
            sig = (
                math.sin(2 * math.pi * freq * lt) * 0.65
                + math.sin(2 * math.pi * freq * 2.0 * lt) * 0.22 * math.exp(-lt * 7.5)
            )
            out[i] += sig * env * 0.28
    write_wav("sfx_victory_fanfare.wav", out)


if __name__ == "__main__":
    gen_cut_snap()
    gen_zoom_punch()
    gen_shutter_flash()
    gen_riser_short()
    gen_impact_hit()
    gen_pop_bright()
    gen_data_stream()
    gen_code_patch()
    gen_victory_fanfare()

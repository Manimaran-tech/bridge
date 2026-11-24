import math
import os
import random
import struct
import wave

SR = 44100
OUT_DIR = os.path.join("bridge-video", "public", "audio")


def write_wav(name, samples):
    path = os.path.join(OUT_DIR, name)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        clipped = [max(-0.98, min(0.98, s)) for s in samples]
        wf.writeframes(struct.pack("<" + "h" * len(clipped), *[int(s * 32767) for s in clipped]))
    print(f"Generated {name} ({len(samples)/SR:.2f}s)")


def gen_swoosh_fast():
    """Sleek filtered air whoosh with subtle tonal pitch glide (0.42s)."""
    dur = 0.42
    n = int(SR * dur)
    out = []
    lp = 0.0
    bp = 0.0
    random.seed(42)
    for i in range(n):
        t = i / SR
        p = t / dur
        env = math.sin(math.pi * p) ** 1.6
        noise = random.uniform(-1, 1)
        # Sweep cutoff up then down
        cutoff = 0.04 + 0.24 * math.sin(math.pi * p)
        lp += cutoff * (noise - lp)
        bp += 0.12 * (lp - bp)
        filtered = lp - bp
        # Subtle airy sine shimmer
        freq = 180 + 520 * (p ** 1.3)
        tone = 0.14 * math.sin(2 * math.pi * freq * t) * math.sin(math.pi * p) ** 2
        out.append((filtered * 0.72 + tone) * env)
    write_wav("sfx_swoosh_fast.wav", out)


def gen_sub_drop():
    """Tight studio sub-bass impact + crisp transient for logo/hook slams (0.70s)."""
    dur = 0.70
    n = int(SR * dur)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / SR
        freq = 135 * math.exp(-t * 5.2) + 42
        phase += 2 * math.pi * freq / SR
        sub = math.sin(phase) * math.exp(-t * 4.0)
        # Crisp initial punch
        punch = math.sin(2 * math.pi * 420 * t) * math.exp(-t * 48.0) * 0.35
        out.append((sub * 0.78 + punch) * min(1.0, t * 180))
    write_wav("sfx_sub_drop.wav", out)


def gen_typing_burst():
    """Realistic soft mechanical keyboard typing cadence (1.6s)."""
    dur = 1.6
    n = int(SR * dur)
    out = [0.0] * n
    random.seed(7)
    t_cur = 0.04
    while t_cur < dur - 0.08:
        idx = int(t_cur * SR)
        click_len = int(0.022 * SR)
        pitch = random.uniform(1600, 2600)
        amp = random.uniform(0.24, 0.42)
        for j in range(click_len):
            if idx + j >= n:
                break
            lt = j / SR
            env = math.exp(-lt * 220)
            body = math.sin(2 * math.pi * pitch * lt) * 0.45
            thock = math.sin(2 * math.pi * 240 * lt) * 0.55
            noise = random.uniform(-1, 1) * 0.35
            out[idx + j] += (body + thock + noise) * env * amp
        t_cur += random.uniform(0.055, 0.115)
    write_wav("sfx_typing_burst.wav", out)


def gen_chime_connect():
    """Modern glass harmonic chord (C5 -> E5 -> G5 -> B5) for connect/success (0.95s)."""
    dur = 0.95
    n = int(SR * dur)
    out = [0.0] * n
    notes = [(0.0, 523.25), (0.07, 659.25), (0.14, 783.99), (0.21, 987.77)]
    for start, freq in notes:
        s_idx = int(start * SR)
        for i in range(s_idx, n):
            lt = (i - s_idx) / SR
            attack = min(1.0, lt * 120)
            decay = math.exp(-lt * 4.4)
            sig = (
                math.sin(2 * math.pi * freq * lt) * 0.7
                + math.sin(2 * math.pi * freq * 2.0 * lt) * 0.22 * math.exp(-lt * 7.0)
                + math.sin(2 * math.pi * freq * 3.0 * lt) * 0.08 * math.exp(-lt * 11.0)
            )
            out[i] += sig * attack * decay * 0.34
    write_wav("sfx_chime_connect.wav", out)


def gen_notif_soft():
    """Clean two-tone glass OS notification chime (0.34s)."""
    dur = 0.34
    n = int(SR * dur)
    out = [0.0] * n
    tones = [(0.0, 698.46, 0.36), (0.085, 1046.5, 0.42)]
    for start, freq, amp in tones:
        s_idx = int(start * SR)
        for i in range(s_idx, n):
            lt = (i - s_idx) / SR
            env = min(1.0, lt * 160) * math.exp(-lt * 14.0)
            out[i] += math.sin(2 * math.pi * freq * lt) * env * amp
    write_wav("sfx_notif_soft.wav", out)


def gen_hover_tick():
    """Ultra-crisp subtle UI switch tick (0.08s)."""
    dur = 0.08
    n = int(SR * dur)
    out = []
    for i in range(n):
        t = i / SR
        env = math.exp(-t * 95)
        sig = math.sin(2 * math.pi * 1250 * t) * 0.5 + math.sin(2 * math.pi * 620 * t) * 0.5
        out.append(sig * env * 0.45)
    write_wav("sfx_hover_tick.wav", out)


if __name__ == "__main__":
    gen_swoosh_fast()
    gen_sub_drop()
    gen_typing_burst()
    gen_chime_connect()
    gen_notif_soft()
    gen_hover_tick()

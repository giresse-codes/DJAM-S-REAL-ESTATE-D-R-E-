# Final soundtrack: voice-over re-timed with tactical pauses + synthesized music bed + HyperFrames SFX.
import json, subprocess, wave, numpy as np
SR = 44100
T = json.load(open('timeline.json')); D = T['duration']; N = int(D * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(3)

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').reshape(-1, 2).astype(float) / 32768

def place(buf, sig, at, gain=1.0):
    i = int(at * SR); n = min(len(sig), N - i)
    if n > 0: buf[i:i + n] += sig[:n] * gain

# ---------------- voice-over ----------------
vo_src = load('assets/voix.mp3'); vo = np.zeros((N, 2))
for c in T['vo_clips']:
    seg = vo_src[int(c['from'] * SR):int(c['to'] * SR)].copy()
    f = int(0.015 * SR); ramp = np.linspace(0, 1, f)[:, None]
    seg[:f] *= ramp; seg[-f:] *= ramp[::-1]
    place(vo, seg, c['at'])
vo *= 0.89 / np.abs(vo).max()

# ---------------- music bed ----------------
def note(m): return 440 * 2 ** ((m - 69) / 12)
mus = np.zeros(N)
def tone(freq, dur, decay=0.0, harm=(1, .35, .12), att=0.01):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * freq * (k + 1) * tt) for k, a in enumerate(harm))
    return s * np.minimum(1, tt / att) * (np.exp(-tt * decay) if decay else 1) * np.minimum(1, (dur - tt) / 0.3)
def pad(chord, at, dur, g):
    for m in chord:
        for d in (-0.003, 0.003): place1(tone(note(m) * (1 + d), dur + 1.0, att=0.8, harm=(1, .2)), at, g)
def place1(sig, at, g):
    i = int(at * SR); n = min(len(sig), N - i)
    if n > 0: mus[i:i + n] += sig[:n] * g
def kick(at, g=1.0):
    n = int(0.45 * SR); tt = np.arange(n) / SR
    place1(np.sin(2 * np.pi * (45 * tt + 90 * (1 - np.exp(-tt * 30)) / 30)) * np.exp(-tt * 7), at, g)
def snare(at, g=.35):
    n = int(0.25 * SR); tt = np.arange(n) / SR
    place1(rng.standard_normal(n) * np.exp(-tt * 18) + 0.4 * np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 25), at, g)
def hat(at, g=.08):
    n = int(0.06 * SR); tt = np.arange(n) / SR
    x = rng.standard_normal(n); x = np.diff(np.concatenate([[0], x]))
    place1(x * np.exp(-tt * 70), at, g)
def pluck(m, at, g):
    place1(tone(note(m), 0.7, decay=8, harm=(1, .4, .15)), at, g)

B = 0.5  # 120 bpm
UP = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]          # C G Am F
DOWN = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]]        # Am F C G
TENSE = [[50, 53, 57], [46, 50, 53], [50, 53, 56], [46, 49, 53]]       # Dm Bb Ddim Bbm
# intro drone + rumble
dr = tone(note(33), 5.2, att=1.5, harm=(1, .5, .2)); place1(dr, 0, .35)
nz = rng.standard_normal(int(5 * SR)); nz = np.convolve(nz, np.ones(400) / 400, 'same'); place1(nz * np.linspace(0, 1, len(nz)) ** 2 * 6, 0, .5)
def section(a, b, prog, kick_on=True, arp=True, drums=False, g_pad=.05, g_arp=.07):
    bar = 4 * B; k = 0; x = a
    while x < b - 0.01:
        ch = prog[k % len(prog)]; dur = min(bar, b - x)
        pad(ch, x, dur, g_pad)
        place1(tone(note(ch[0] - 24), dur, att=.05, harm=(1, .3)), x, .16)
        for j in range(int(dur / (B / 2))):
            tb = x + j * B / 2
            if arp: pluck(ch[[0, 1, 2, 1][j % 4]] + 12 + (12 if j % 8 == 6 else 0), tb, g_arp)
            if kick_on and j % 2 == 0: kick(tb, .55 if drums else .35)
            if drums:
                if j % 4 == 2: snare(tb)
                hat(tb + B / 4)
        x += bar; k += 1
section(5.0, 12.4, DOWN, kick_on=True, arp=True)
section(12.4, 17.1, TENSE, kick_on=True, arp=False, g_pad=.06)
# tactical pause 17.1-18.7: silence + two heartbeat thumps
kick(17.55, .5); kick(17.8, .35); kick(18.25, .5); kick(18.5, .35)
section(18.7, 30.0, UP, drums=True)
section(30.0, 33.0, UP, kick_on=False, arp=False, g_pad=.06)
section(33.0, 41.0, UP, drums=True)
section(41.0, 45.0, UP, drums=True, g_arp=.08)
for j in range(8): kick(44.0 + j * B / 4, .3)          # build roll
pad([48, 55, 60, 64, 67], 45.3, 8.0, .06); place1(tone(note(24), 8.5, att=.05, harm=(1, .4)), 45.3, .3)
for j in range(16): pluck([72, 76, 79, 84][j % 4], 45.6 + j * .5, .04 * (1 - j / 16))
mus /= np.abs(mus).max()
# reverb-ish smear (cheap FFT convolution)
def fftconv(a, b):
    n = len(a) + len(b) - 1; m = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(a, m) * np.fft.rfft(b, m), m)[:n]
irn = int(1.8 * SR); it = np.arange(irn) / SR
music = np.zeros((N, 2))
for ch in range(2):
    ir = rng.standard_normal(irn) * np.exp(-it * 3.2); ir /= np.sqrt((ir ** 2).sum())
    music[:, ch] = mus + 0.3 * fftconv(mus, ir)[:N]
# ducking under the voice
env = np.abs(vo).mean(1); k = int(0.12 * SR)
env = np.convolve(env, np.ones(k) / k, 'same'); env = np.clip(env / (env.max() * 0.25), 0, 1)
music *= (0.55 - 0.32 * env)[:, None]
music *= (np.clip(t / 0.5, 0, 1) * np.clip((D - t) / 1.2, 0, 1))[:, None]

# ---------------- SFX (HyperFrames / Pixabay library) ----------------
SFX = [
 (0.3, 'whoosh-cinematic', .45), (1.25, 'impact-bass-2', .7), (2.9, 'impact-bass-1', .85), (3.0, 'sparkle', .35),
 (4.6, 'whoosh', .55), (5.5, 'whoosh-short', .35), (6.06, 'pop', .5), (6.78, 'pop', .5), (7.56, 'pop', .5), (7.95, 'ping', .35),
 (8.35, 'whoosh-short', .35), (9.7, 'whoosh', .5), (9.85, 'impact-bass-1', .35), (10.3, 'click-soft', .5), (10.9, 'click-soft', .5), (11.05, 'pop', .4),
 (12.3, 'whoosh', .5), (13.7, 'glitch-1', .35), (14.5, 'pop', .4), (15.85, 'glitch-3', .25), (16.33, 'error', .25), (16.45, 'pop', .4),
 (17.1, 'whoosh-short', .3), (18.55, 'whoosh-short', .4), (18.72, 'impact-bass-1', .9), (18.8, 'chime', .45), (18.85, 'sparkle', .4),
 (19.65, 'notification', .45), (19.9, 'pop', .35), (21.6, 'whoosh-short', .35), (22.75, 'sparkle', .5), (22.8, 'impact-bass-2', .4),
 (23.8, 'whoosh-cinematic', .35), (24.55, 'whoosh-short', .4), (24.6, 'pop', .4), (25.5, 'pop', .4), (27.4, 'pop', .4), (28.6, 'pop', .35),
 (29.6, 'whoosh', .5), (30.4, 'ping', .35), (30.9, 'whoosh-short', .35), (32.95, 'click', .45), (34.55, 'whoosh-short', .35),
 (34.85, 'notification', .4), (35.55, 'pop', .35), (35.35, 'ping', .3), (36.48, 'key-press', .7), (37.5, 'key-press', .7),
 (38.58, 'key-press', .7), (39.62, 'key-press', .7), (39.65, 'sparkle', .4), (40.5, 'whoosh-cinematic', .45), (42.45, 'whoosh-short', .35),
 (43.1, 'whoosh-short', .3), (43.5, 'pop', .45), (43.6, 'pop', .3), (44.0, 'pop', .4), (44.27, 'click', .6),
 (45.3, 'impact-bass-1', .95), (45.32, 'sparkle', .45), (46.9, 'chime', .3), (49.6, 'pop', .4), (49.7, 'notification', .25),
]
fx = np.zeros((N, 2)); cache = {}
for at, name, g in SFX:
    if name not in cache: cache[name] = load(f'assets/sfx/{name}.mp3')
    place(fx, cache[name], at, g)
riser = load('assets/sfx/riser.mp3'); place(fx, riser[-int(4.3 * SR):], 41.0, .35)
typing = load('assets/sfx/typing.mp3'); place(fx, typing, 35.1, .25)
fx *= 0.6 / max(1e-9, np.percentile(np.abs(fx), 99.9))
# keep effects under the voice too (lighter duck)
fx *= (1 - 0.35 * env)[:, None]

out = vo * 1.0 + music * 0.75 + fx * 0.8
out = np.tanh(out * 1.1) / np.tanh(1.1)
out *= 0.95 / np.abs(out).max()
with wave.open('out/mix.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
print('ok', D, 's')

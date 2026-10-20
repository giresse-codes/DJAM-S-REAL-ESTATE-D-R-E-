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
# intro drone
dr = tone(note(33), 1.4, att=.6, harm=(1, .5, .2)); place1(dr, 0, .3)
def section(a, b, prog, kick_on=True, arp=True, drums=False, g_pad=.05, g_arp=.07, hat16=False):
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
                if hat16: hat(tb + B / 8, .05); kick(tb + B / 4, .25) if j % 2 else None
        x += bar; k += 1
pad([45, 52, 57], 0.0, 2.75, .05)
section(2.75, 19.3, UP, kick_on=True, arp=True, g_arp=.06)
section(19.3, 26.0, UP, drums=True, g_arp=.06)
section(26.0, 37.6, UP, drums=True, g_arp=.08)
kick(37.8, .4); kick(38.05, .28)
section(38.3, 41.4, UP, drums=True, hat16=True, g_arp=.07)
section(41.4, 52.7, UP, drums=True, g_arp=.07)
section(52.7, 59.5, DOWN, drums=True, g_arp=.06)
pad([48, 55, 60, 64, 67], 59.8, 8.2, .06); place1(tone(note(24), 8.2, att=.05, harm=(1, .4)), 59.8, .3)
for j in range(14): pluck([72, 76, 79, 84][j % 4], 60.1 + j * .5, .035 * (1 - j / 14))
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
 (0.2,'whoosh-cinematic',.3),(0.6,'click-soft',.25),(1.0,'whoosh-short',.35),(2.25,'sparkle',.3),(2.7,'whoosh',.45),(2.95,'typing',.35),(4.4,'click',.5),
 (4.84,'whoosh-short',.35),(5.0,'pop',.4),(5.4,'pop',.3),(5.9,'pop',.35),(6.1,'pop',.4),(8.4,'pop',.4),(8.45,'typing',.2),(9.9,'pop',.4),
 (10.6,'whoosh',.45),(12.16,'pop',.4),(12.3,'pop',.3),(13.76,'pop',.4),(14.9,'whoosh-short',.3),(15.74,'pop',.4),(17.36,'pop',.4),(18.52,'pop',.4),
 (19.3,'whoosh',.45),(20.62,'ping',.35),(21.95,'ping',.35),(22.1,'pop',.3),(22.85,'whoosh-short',.3),(24.75,'glitch-1',.2),(25.26,'impact-bass-1',.7),
 (26.0,'whoosh',.45),(27.93,'pop',.4),(28.40,'pop',.4),(29.83,'pop',.4),(31.16,'pop',.4),(32.14,'pop',.4),(33.53,'pop',.4),(35.19,'pop',.4),(36.36,'pop',.4),(36.5,'pop',.3),
 (38.3,'whoosh-short',.35),(38.35,'typing',.3),(39.0,'impact-bass-2',.6),(39.05,'pop',.45),(39.14,'typing',.2),(39.8,'chime',.4),(39.85,'pop',.3),
 (41.4,'whoosh',.45),(41.9,'whoosh-short',.3),(44.3,'whoosh-short',.3),(45.4,'sparkle',.3),
 (46.7,'whoosh',.45),(46.85,'pop',.4),(47.3,'pop',.3),(49.1,'notification',.45),(49.7,'pop',.3),(50.0,'pop',.3),(51.45,'pop',.35),
 (52.7,'whoosh',.45),(53.56,'click',.5),(54.56,'click',.5),(55.3,'pop',.4),(56.1,'whoosh-short',.3),(57.2,'pop',.3),
 (59.6,'whoosh-cinematic',.45),(59.95,'impact-bass-1',.9),(60.0,'chime',.4),(61.4,'sparkle',.3),(64.0,'pop',.3),
]
fx = np.zeros((N, 2)); cache = {}
for at, name, g in SFX:
    if name not in cache: cache[name] = load(f'assets/sfx/{name}.mp3')
    place(fx, cache[name], at, g)
riser = load('assets/sfx/riser.mp3'); place(fx, riser[-int(3.0 * SR):], 56.95, .25)
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

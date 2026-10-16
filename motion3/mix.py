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
section(1.0, 6.6, UP, kick_on=True, arp=True)
section(6.6, 22.1, UP, drums=True)
kick(22.25, .45); kick(22.5, .3)                      # tactical pause heartbeat
section(22.6, 25.3, TENSE, kick_on=False, arp=False, g_pad=.06)
section(25.3, 37.45, UP, drums=True, g_arp=.08)
section(37.9, 42.4, DOWN, drums=True, hat16=True, g_arp=.06)
section(42.4, 47.9, UP, drums=True, g_arp=.07)
pad([48, 55, 60, 64, 67], 48.2, 7.6, .06); place1(tone(note(24), 7.8, att=.05, harm=(1, .4)), 48.2, .3)
for j in range(14): pluck([72, 76, 79, 84][j % 4], 48.5 + j * .5, .04 * (1 - j / 14))
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
 (0.1,'whoosh-cinematic',.4),(0.95,'impact-bass-1',.8),(1.0,'sparkle',.35),(3.0,'pop',.5),(3.05,'chime',.4),(3.12,'pop',.3),(3.66,'whoosh-short',.35),(3.95,'pop',.45),(4.6,'click-soft',.3),
 (6.5,'whoosh',.5),(6.85,'ping',.3),(8.05,'whoosh-short',.3),(8.8,'click-soft',.4),(9.55,'whoosh',.45),(9.95,'sparkle',.3),(11.9,'whoosh',.45),(13.1,'pop',.3),(13.2,'pop',.3),
 (14.16,'pop',.45),(16.06,'pop',.45),(17.42,'pop',.45),(18.46,'pop',.45),(19.8,'whoosh-short',.3),(21.0,'impact-bass-2',.35),(22.0,'whoosh-short',.3),
 (22.6,'whoosh',.4),(23.62,'impact-bass-1',.9),(23.7,'click',.5),(23.75,'pop',.3),(25.3,'whoosh',.45),(26.3,'whoosh-short',.35),(26.46,'typing',.25),(26.84,'pop',.4),
 (28.2,'whoosh-short',.3),(28.24,'typing',.25),(28.6,'pop',.3),(28.85,'chime',.4),(29.45,'pop',.35),(30.9,'whoosh',.45),
 (32.48,'pop',.45),(32.7,'click-soft',.3),(33.52,'pop',.45),(33.7,'click-soft',.3),(34.7,'pop',.45),(34.9,'click-soft',.3),(36.54,'pop',.45),(36.7,'click-soft',.3),
 (37.4,'whoosh-short',.3),(37.9,'glitch-1',.3),(38.2,'impact-bass-2',.7),(38.3,'pop',.3),(39.5,'whoosh-short',.3),(40.0,'pop',.3),(40.62,'impact-bass-1',.8),(40.65,'glitch-3',.25),
 (42.3,'whoosh',.45),(42.45,'notification',.4),(42.6,'ping',.3),(43.55,'pop',.3),(43.78,'key-press',.7),(44.98,'key-press',.7),(45.8,'key-press',.7),(46.74,'key-press',.7),
 (46.8,'sparkle',.4),(46.9,'pop',.3),(47.05,'pop',.35),(47.8,'whoosh-cinematic',.4),(48.2,'impact-bass-1',.9),(48.3,'chime',.4),(49.1,'pop',.3),(49.2,'sparkle',.35),(52.3,'pop',.4),(52.8,'notification',.25),
]
fx = np.zeros((N, 2)); cache = {}
for at, name, g in SFX:
    if name not in cache: cache[name] = load(f'assets/sfx/{name}.mp3')
    place(fx, cache[name], at, g)
riser = load('assets/sfx/riser.mp3'); place(fx, riser[-int(3.9 * SR):], 44.3, .3)
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

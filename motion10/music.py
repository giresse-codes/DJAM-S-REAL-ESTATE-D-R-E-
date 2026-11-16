# Calm corporate bed, synthesized here (royalty-free), set ~25 dB under the voice-over RMS.
import numpy as np, wave, subprocess
SR=48000; D=55.5; N=int(SR*D); t=np.arange(N)/SR
def note(m): return 440*2**((m-69)/12)
def tone(f,dur,att=.6,dec=0,h=(1,.25,.08)):
    n=int(dur*SR); tt=np.arange(n)/SR
    x=sum(a*np.sin(2*np.pi*f*(k+1)*tt) for k,a in enumerate(h))
    env=np.minimum(1,tt/att)*np.minimum(1,(dur-tt)/0.8)*(np.exp(-tt*dec) if dec else 1)
    return x*env
mus=np.zeros(N)
def put(x,at,g):
    i=int(at*SR); n=min(len(x),N-i); mus[i:i+n]+=x[:n]*g
prog=[[57,60,64,67],[53,57,60,64],[48,55,60,64],[55,59,62,67]]   # Am7 Fmaj7 C G
bar=4.0
for k in range(int(D/bar)+1):
    ch=prog[k%4]
    for m in ch:
        for d in (-.002,.002): put(tone(note(m)*(1+d),bar+1.2,att=1.2,h=(1,.15)),k*bar,.05)
    put(tone(note(ch[0]-24),bar+.5,att=.4,h=(1,.3)),k*bar,.12)
    for j in range(8):  # soft piano-like arpeggio
        m=ch[[0,2,1,3,2,1,3,2][j]]+12
        put(tone(note(m),1.6,att=.005,dec=3.2,h=(1,.35,.12)),k*bar+j*.5,.06)
mus*=np.clip(t/2.5,0,1)*np.clip((D-t)/2.5,0,1)
# reverb-ish smear
ir=np.random.default_rng(1).standard_normal(int(1.6*SR))*np.exp(-np.arange(int(1.6*SR))/SR*3.5)
m=1<<(N+len(ir)).bit_length(); wet=np.fft.irfft(np.fft.rfft(mus,m)*np.fft.rfft(ir,m),m)[:N]
mus=mus+0.25*wet/np.abs(wet).max()*np.abs(mus).max()
raw=subprocess.run(['ffmpeg','-v','error','-i','public/voix-off.wav','-ac','1','-ar',str(SR),'-f','s16le','-'],capture_output=True).stdout
v=np.frombuffer(raw,'<i2').astype(float)/32768
def rms(x): x=x[np.abs(x)>1e-3]; return np.sqrt((x**2).mean())
target=rms(v)*10**(-25/20)
mus*=target/np.sqrt((mus[int(3*SR):int(50*SR)]**2).mean())
print('voice rms dB %.1f  music rms dB %.1f'%(20*np.log10(rms(v)),20*np.log10(np.sqrt((mus**2).mean()))))
with wave.open('public/music.wav','wb') as w:
    w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.clip(mus,-1,1)*32767).astype('<i2').tobytes())

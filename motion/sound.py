# Synthesised soundtrack (pad + pluck arpeggio + whooshes/clicks/impact), synced to scene.html timings.
import numpy as np, wave, sys
SR=44100; D=28.0; N=int(SR*D); t=np.arange(N)/SR
rng=np.random.default_rng(7)
L=np.zeros(N); R=np.zeros(N)
def add(sig,start,gain=1.0,pan=0.0):
    i=int(start*SR); sig=sig[:max(0,N-i)]
    L[i:i+len(sig)]+=sig*gain*(1-pan)/1; R[i:i+len(sig)]+=sig*gain*(1+pan)/1
def note(f): return 440*2**((f-69)/12)
# chords (midi) per 3.5s: Am, F, C, G, Am, F, C, Csus
prog=[[57,60,64],[53,57,60],[48,55,64],[55,59,62],[57,60,64],[53,57,65],[48,55,64],[48,55,60]]
seg=3.5
pad=np.zeros(N)
for k,ch in enumerate(prog):
    s=k*seg; n=int((seg+1.5)*SR); tt=np.arange(n)/SR
    envl=np.minimum(1,tt/1.2)*np.minimum(1,np.maximum(0,(seg+1.5-tt)/1.5))
    sig=sum(np.sin(2*np.pi*note(m)*tt*(1+d))+0.5*np.sin(2*np.pi*note(m-12)*tt) for m in ch for d in (-0.002,0.002))
    i=int(s*SR); m=min(n,N-i); pad[i:i+m]+=(sig*envl)[:m]
pad/=np.abs(pad).max()
add(pad*0.22,0)
# sub bass from 10.2
bass=np.zeros(N)
for k,ch in enumerate(prog):
    s=k*seg; n=int(seg*SR); tt=np.arange(n)/SR
    sig=np.sin(2*np.pi*note(ch[0]-24)*tt)*np.minimum(1,tt/0.05)*np.exp(-tt*0.6)
    i=int(s*SR); m=min(n,N-i); bass[i:i+m]+=sig[:m]
bass*=np.clip((t-10.0)/0.5,0,1)*(t<27.7)
add(bass*0.32,0)
# pluck arpeggio (8th notes at 120bpm) from 3.4s
step=0.25
for j in range(int((27.5-3.4)/step)):
    s=3.4+j*step; k=int(s//seg)%len(prog); ch=prog[k]
    m=ch[[0,1,2,1][j%4]]+12+(12 if j%8==6 else 0)
    n=int(0.6*SR); tt=np.arange(n)/SR
    sig=(np.sin(2*np.pi*note(m)*tt)+0.3*np.sin(4*np.pi*note(m)*tt))*np.exp(-tt*9)
    g=0.10 if s<10.2 else 0.13
    if 19.4<s<23.0: g*=0.6
    add(sig,s,g,pan=0.35*np.sin(j*0.9))
# whoosh
def whoosh(dur=0.9,up=True):
    n=int(dur*SR); x=rng.standard_normal(n); tt=np.arange(n)/SR
    a=np.linspace(0.02,0.35,n) if up else np.linspace(0.35,0.02,n)
    y=np.zeros(n); v=0
    for i in range(n): v+=a[i]*(x[i]-v); y[i]=v
    e=np.sin(np.pi*tt/dur)**2; return y*e/np.abs(y).max()
for s in (3.1,6.9,9.9,14.9,19.0,22.6): add(whoosh(),s,0.30,pan=rng.uniform(-.3,.3))
# riser into logo
n=int(2.0*SR); tt=np.arange(n)/SR
riser=(np.sin(2*np.pi*(200*tt+300*tt**2))*0.4+rng.standard_normal(n)*0.15)*(tt/2.0)**2
add(riser,21.05,0.18)
# clicks
def click():
    n=int(0.05*SR); tt=np.arange(n)/SR; return (np.sin(2*np.pi*2200*tt)+rng.standard_normal(n)*.5)*np.exp(-tt*120)
for s in (5.8,9.8,11.95): add(click(),s,0.35)
# typing ticks
for j in range(len("Je cherche un terrain au Cameroun.")):
    s=7.8+j*1.15/34+rng.uniform(0,0.01); n=int(0.025*SR); tt=np.arange(n)/SR
    add(rng.standard_normal(n)*np.exp(-tt*300),s,0.10,pan=rng.uniform(-.2,.2))
# impact + shimmer at logo
n=int(3.5*SR); tt=np.arange(n)/SR
boom=np.sin(2*np.pi*(50*tt+40*np.exp(-tt*8)/8*-1))*np.exp(-tt*1.6)+rng.standard_normal(n)*np.exp(-tt*25)*0.6
add(boom,23.05,0.55)
shim=sum(np.sin(2*np.pi*note(m)*tt)*np.exp(-tt*(0.9+0.2*i)) for i,m in enumerate([81,84,88,93]))
add(shim,23.1,0.06)
# stereo reverb
def fftconvolve(a,b):
    n=len(a)+len(b)-1; m=1<<(n-1).bit_length()
    return np.fft.irfft(np.fft.rfft(a,m)*np.fft.rfft(b,m),m)[:n]
ir_n=int(2.2*SR); it=np.arange(ir_n)/SR
irL=rng.standard_normal(ir_n)*np.exp(-it*3); irR=rng.standard_normal(ir_n)*np.exp(-it*3)
irL/=np.sqrt((irL**2).sum()); irR/=np.sqrt((irR**2).sum())
wl=fftconvolve(L,irL)[:N]; wr=fftconvolve(R,irR)[:N]
L2=L+0.35*wl; R2=R+0.35*wr
fade=np.clip((t)/0.8,0,1)*np.clip((D-t)/0.9,0,1)
out=np.stack([L2*fade,R2*fade],1); out=np.tanh(out/np.abs(out).max()*1.3)*0.89
with wave.open(sys.argv[1],'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out*32767).astype('<i2').tobytes())

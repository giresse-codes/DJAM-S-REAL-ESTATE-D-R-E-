# Rate-consistent forced alignment: split the word sequence across detected speech segments so that the
# syllable rate is as uniform as possible, preferring cuts at punctuation. No ASR needed.
import re, json, subprocess, numpy as np, sys
SR=16000
raw=subprocess.run(['ffmpeg','-v','error','-i','assets/voix.mp3','-ac','1','-ar',str(SR),'-f','s16le','-'],capture_output=True).stdout
a=np.frombuffer(raw,'<i2').astype(float)/32768
hop=int(.01*SR); env=np.array([np.sqrt((a[i:i+hop]**2).mean()) for i in range(0,len(a)-hop,hop)])
on=20*np.log10(env+1e-9)>-30
segs=[];s=None
for i,v in enumerate(on):
    if v and s is None: s=i
    if not v and s is not None: segs.append([s,i]); s=None
if s is not None: segs.append([s,len(on)])
m=[]
for s0,e0 in segs:
    if m and s0-m[-1][1]<20: m[-1][1]=e0
    else: m.append([s0,e0])
SP=[(s0/100,e0/100) for s0,e0 in m if e0-s0>=6]
toks=open('script.txt').read().split(); W=[]
for t in toks:
    if re.search(r'\w',t): W.append(t)
    else: W[-1]+=' '+t
def syl(w):
    w=re.sub(r"[^a-zàâäéèêëîïôöùûüç']",'',w.lower()); n=len(re.findall(r"[aeiouyàâäéèêëîïôöùûü]+",w))
    if w.endswith('e') and n>1 and not w.endswith('ée'): n-=1
    return max(1,n)
sy=np.array([syl(w) for w in W],float); cs=np.concatenate([[0],np.cumsum(sy)])
punct=[bool(re.search(r'[.,:;?!]$',w)) for w in W]
nS,nW=len(SP),len(W); D=[s1-s0 for s0,s1 in SP]
r0=cs[-1]/sum(D)
INF=1e18; C=np.full((nS+1,nW+1),INF); B=np.zeros((nS+1,nW+1),int); C[0,0]=0
for j in range(1,nS+1):
    for i in range(1,nW+1):
        best=INF;bi=0
        for k in range(max(0,i-40),i):
            if C[j-1,k]>=INF: continue
            n=cs[i]-cs[k]; r=n/D[j-1]
            c=C[j-1,k]+(np.log(r/r0))**2*(1+n/10)+(0 if punct[i-1] or i==nW else 1.5)
            if c<best: best=c;bi=k
        C[j,i]=best;B[j,i]=bi
# backtrack
cuts=[];i=nW
for j in range(nS,0,-1): k=B[j,i]; cuts.append((k,i,j-1)); i=k
cuts.reverse(); out=[]
for k,i,j in cuts:
    s0,s1=SP[j]; tot=cs[i]-cs[k]
    for w in range(k,i):
        a0=s0+(cs[w]-cs[k])/tot*(s1-s0); a1=s0+(cs[w+1]-cs[k])/tot*(s1-s0)
        out.append([W[w],round(a0,3),round(a1-0.02,3)])
    print(f"{s0:6.2f}-{s1:6.2f} {tot/(s1-s0):5.2f} syl/s | {' '.join(W[k:i])[:80]}")
rates=[(cs[i]-cs[k])/(SP[j][1]-SP[j][0]) for k,i,j in cuts]; print('CV',np.std(rates)/np.mean(rates))
json.dump(out,open('aligned_raw.json','w'),ensure_ascii=False)

# Forced alignment without ASR: speech/silence detection + syllable-weighted DP matching of pauses to punctuation.
import re, json, subprocess, numpy as np
SR=16000
raw=subprocess.run(['ffmpeg','-v','error','-i','assets/voix.mp3','-ac','1','-ar',str(SR),'-f','s16le','-'],capture_output=True).stdout
a=np.frombuffer(raw,'<i2').astype(float)/32768
hop=int(.01*SR); env=np.array([np.sqrt((a[i:i+hop]**2).mean()) for i in range(0,len(a)-hop,hop)])
db=20*np.log10(env+1e-9); thr=-30
on=db>thr
# smooth: fill gaps < 0.2 s, drop blips < 0.06 s
def runs(mask):
    r=[];s=None
    for i,v in enumerate(mask):
        if v and s is None: s=i
        if not v and s is not None: r.append([s,i]); s=None
    if s is not None: r.append([s,len(mask)])
    return r
sp=runs(on); m=[]
for s,e in sp:
    if m and s-m[-1][1]<20: m[-1][1]=e
    else: m.append([s,e])
sp=[(s/100,e/100) for s,e in m if e-s>=6]
sil=[(sp[i][1],sp[i+1][0]) for i in range(len(sp)-1)]
t0,t1=sp[0][0],sp[-1][1]
print('speech %.2f-%.2f, %d pauses'%(t0,t1,len(sil)))
text=open('script.txt').read().replace('\n',' ')
toks=text.split()
def syl(w):
    w=w.lower(); w=re.sub(r"[^a-zàâäéèêëîïôöùûüç']",'',w)
    n=len(re.findall(r"[aeiouyàâäéèêëîïôöùûü]+",w)); 
    if w.endswith('e') and n>1 and not w.endswith('ée'): n-=1
    return max(1,n)+0.0
words=[t for t in toks if re.search(r'\w',t)]
# attach standalone punctuation tokens (":" "?") to previous word
W=[];
for t in toks:
    if re.search(r'\w',t): W.append(t)
    else: W[-1]+=' '+t
wt=np.array([syl(w)+0.35 for w in W])
cum=np.concatenate([[0],np.cumsum(wt)])
bounds=[i+1 for i,w in enumerate(W[:-1]) if re.search(r'[.,:;?!]$',w)]
# speech-time axis
def to_speech(t):
    s=0
    for a_,b_ in sp:
        if t>=b_: s+=b_-a_
        elif t>a_: s+=t-a_
    return s
S=to_speech(t1)
sil_sp=[to_speech(s) for s,e in sil]
bpred=[cum[b]/cum[-1]*S for b in bounds]
# DP: match silences (in order) to boundaries (in order); silence may be skipped (penalty), boundary may be unmatched (free)
nS,nB=len(sil),len(bounds); INF=1e9
skip_pen=lambda j:3.0*(sil[j][1]-sil[j][0])+0.6
D=np.full((nS+1,nB+1),INF); D[0,:]=0; bk={}
for j in range(1,nS+1):
    for k in range(0,nB+1):
        best=D[j-1,k]+skip_pen(j-1); arg=('skip',k)
        if k>0:
            # match silence j-1 with boundary k-1; previous state any k'<k
            prev=min(range(k),key=lambda kk:D[j-1,kk]); c=D[j-1,prev]+(bpred[k-1]-sil_sp[j-1])**2
            if c<best: best=c; arg=('match',prev)
        if k>0 and D[j,k-1]<best: best=D[j,k-1]; arg=('carry',k-1)
        D[j,k]=best; bk[(j,k)]=arg
j,k=nS,int(np.argmin(D[nS])); anchors={}
while j>0:
    typ,kk=bk[(j,k)]
    if typ=='match': anchors[bounds[k-1]]=j-1; j-=1; k=kk
    elif typ=='skip': j-=1
    else: k=kk
# piecewise placement in speech-time between anchors
A=sorted(anchors.items())   # (word_index_boundary, silence_idx)
pts=[(0,0.0)]+[(b,to_speech(sil[s][0])) for b,s in A]+[(len(W),S)]
ws=np.zeros(len(W)); we=np.zeros(len(W))
for (b0,s0),(b1,s1) in zip(pts,pts[1:]):
    tot=cum[b1]-cum[b0]
    for i in range(b0,b1):
        ws[i]=s0+(cum[i]-cum[b0])/tot*(s1-s0); we[i]=s0+(cum[i+1]-cum[b0]-0.35)/tot*(s1-s0)
def from_speech(x):
    for a_,b_ in sp:
        d=b_-a_
        if x<=d: return a_+x
        x-=d
    return sp[-1][1]
out=[[W[i],round(from_speech(ws[i]+1e-4),3),round(from_speech(we[i]),3)] for i in range(len(W))]
json.dump(out,open('aligned_raw.json','w'),ensure_ascii=False)
for b,s in A: print('%5.2f | %s'%(sil[s][1],' '.join(W[max(0,b-3):b])))
print('unmatched pauses:',[('%.2f'%sil[j][0]) for j in range(nS) if j not in anchors.values()])

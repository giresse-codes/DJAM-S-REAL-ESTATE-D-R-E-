# Maps original VO word times onto the edited timeline (with tactical pauses) -> words.js + subtitles .srt
import json,sys
T=json.load(open('timeline.json'))
def remap(x):
    for c in T['vo_clips']:
        if c['from']-1e-6<=x<=c['to']+1e-6: return round(x-c['from']+c['at'],3)
    raise ValueError(x)
W=[[w,remap(a),remap(b)] for w,a,b in T['words']]
# subtitle groups (hand-tuned reading units)
SIZES=[3,4,2,2,4,3,5,5,4,4,2,3,4,3,3,5,3,5,3,4,2,3,2,3,2,5,4,3,4,2,3,2,4]
assert sum(SIZES)==len(W)
groups=[];i=0
for n in SIZES: groups.append(list(range(i,i+n))); i+=n
open('words.js','w').write('window.WORDS='+json.dumps(W,ensure_ascii=False)+';\nwindow.GROUPS='+json.dumps(groups)+';\nwindow.DURATION='+str(T['duration'])+';\n')
def ts(x):
    h=int(x//3600);m=int(x%3600//60);s=x%60;return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s-int(s))*1000)):03d}"
with open('out/DRE_v2_soustitres.srt','w') as f:
    for k,g in enumerate(groups):
        a=W[g[0]][1];b=W[g[-1]][2]+0.25
        if k+1<len(groups): b=min(b,W[groups[k+1][0]][1]-0.02)
        f.write(f"{k+1}\n{ts(a)} --> {ts(b)}\n{' '.join(W[i][0] for i in g)}\n\n")
print(len(W),'words',len(groups),'groups'); [print(round(W[g[0]][1],2),' '.join(W[i][0] for i in g)) for g in groups]

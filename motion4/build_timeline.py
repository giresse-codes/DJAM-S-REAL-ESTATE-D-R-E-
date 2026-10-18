import json
T=json.load(open('timeline.json'))
def remap(x):
    for c in T['vo_clips']:
        if c['from']-1e-6<=x<=c['to']+1e-6: return round(x-c['from']+c['at'],3)
    raise ValueError(x)
W=[[w,remap(a),remap(b)] for w,a,b in T['words']]
# TikTok-style chunks: max 3 words, break on punctuation or pauses
groups=[];cur=[]
for i,w in enumerate(W):
    cur.append(i)
    nxt=W[i+1] if i+1<len(W) else None
    if nxt and nxt[0] in ('m²,','m².','FCFA','2,','chinoise.','Douala','attention.'): pass
    elif w[0][-1] in '.,!:…?' or len(cur)>=3 or (nxt and nxt[1]-w[2]>0.3) or not nxt: groups.append(cur);cur=[]
open('words.js','w').write('window.WORDS='+json.dumps(W,ensure_ascii=False)+';\nwindow.GROUPS='+json.dumps(groups)+';\nwindow.DURATION='+str(T['duration'])+';\n')
def ts(x): return f"{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(round((x%1)*1000))%1000:03d}"
with open('out/DRE_v4_soustitres.srt','w') as f:
    for k,g in enumerate(groups):
        a=W[g[0]][1];b=W[g[-1]][2]+.2
        if k+1<len(groups): b=min(b,W[groups[k+1][0]][1]-.02)
        f.write(f"{k+1}\n{ts(a)} --> {ts(b)}\n{' '.join(W[i][0] for i in g)}\n\n")
print(len(W),'mots',len(groups),'groupes')
print(' | '.join(f"{W[g[0]][1]:.2f} "+' '.join(W[i][0] for i in g) for g in groups))

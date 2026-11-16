# Choix des plans : fenêtres stables (route goudronnée / façade / étendue), sans main ni rétroviseur.
import subprocess, json
W=[[2,15.5],[20.6,23],[33.6,40],[44.5,47.5],[48.8,52.0],[62.5,67]]
cuts=[0,4.6,8.2,12.2,17.0,22.7,26.8,31.4,35.0,38.6,42.4,45.4,48.6,52.6,56.4,62.0,67.5,74.5,78.75]
order=[5,0,0,2,0,4,2,5,4,0,2,0,5,4,0,2,0,5]
frac=[0,0,.35,0,.75,0,1,1,0,.15,.3,.6,1,0,.9,.2,.45,.5]   # position du plan dans la fenêtre (0=début,1=fin)
G="eq=contrast=1.1:saturation=1.06:brightness=0.005,colorbalance=rs=0.035:gs=0.01:bs=-0.04:rm=0.03:bm=-0.03,unsharp=5:5:0.6"
shots=[]
for k in range(len(cuts)-1):
    a,b=W[order[k]]; dur=min(cuts[k+1]-cuts[k]+0.45,b-a); src=round(a+frac[k]*(b-a-dur),2)
    out=f'public/shot{k+1:02d}.mp4'
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(src),'-t',str(dur),'-i','assets/terrain-missole2.mp4','-an','-vf',f'fps=30,scale=1210:2152:flags=lanczos,crop=1080:1920:130:100,{G}','-c:v','libx264','-preset','veryfast','-crf','17','-pix_fmt','yuv420p',out],check=True)
    shots.append([f'shot{k+1:02d}.mp4',cuts[k],cuts[k+1],src,round(dur,2)])
json.dump(shots,open('shots.json','w'))
for s in shots: print(s)

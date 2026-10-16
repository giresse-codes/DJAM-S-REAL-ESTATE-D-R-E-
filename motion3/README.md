# D.R.E – Offre spéciale Missolé 2 (Dibamba) · Motion design TikTok

**Fichier : `out/DRE_Missole2_TikTok_9x16.mp4`** — 1080×1920 (9:16), 56 s, 30 i/s, voix off ElevenLabs + musique + effets sonores.
Sous-titres : incrustés style TikTok (mot actif en jaune) + `out/DRE_v3_soustitres.srt`.

## Déroulé (calé sur la voix off)
| Temps | Chapitre | Contenu |
|---|---|---|
| 0–6,6 s | INTRO | Logo qui se révèle · badge OFFRE SPÉCIALE (confettis) · MISSOLÉ 2 + épingle · Arrondissement de la Dibamba |
| 6,6–12 s | TERRAIN | Vidéo du terrain · LOTS DISPONIBLES · compteur 0→2 KM du goudron · graphique « en plein essor » |
| 12–22,4 s | PROJETS | Cartes : Parc Oriental Douala–Dibamba, hôpital, lycée bilingue, marché moderne, habitations qui sortent de terre |
| 22,4–25,3 s | OFFRE | Pause tactique → document TITRE FONCIER + tampon INDIVIDUEL |
| 25,3–31 s | OFFRE | Lot (vidéo terrain dans le cadre) 0→500 m² · prix 0→4 000 FCFA / m² |
| 31–37,7 s | OFFRE | Idéal pour : maison familiale · investir · projet locatif · réserve foncière |
| 37,9–42,4 s | CONTACT | Pause tactique → FAITES VITE ! · tampon RARES |
| 42,4–48 s | CONTACT | Téléphone qui sonne · (+237) 690 54 61 11 composé chiffre par chiffre · email |
| 48–56 s | — | Logo qui sort de terre · slogan · contacts |

Effets : grain, light leaks, flare, aberration chromatique sur les coupes, éclats lumineux, réactions émojis, tremblements sur les tampons.
Sources : SFX HyperFrames (Pixabay License), émojis Twemoji (CC-BY 4.0), transcription ElevenLabs Scribe, musique générée (`mix.py`).

## Re-générer
```bash
cd assets && for a in "t1 0 6" "t2 12 5" "t3 18 6" "t4 26 6" "t5 34 6"; do set -- $a; mkdir -p clips/$1; ffmpeg -ss $2 -t $3 -i terrain.mp4 -vf "fps=30,scale=1280:720:flags=lanczos,eq=contrast=1.08:saturation=1.2:brightness=0.01,unsharp=5:5:0.5" -q:v 3 clips/$1/%03d.jpg; done; cd ..
python3 build_timeline.py
export NODE_PATH=$(npm root -g) VW=1080 VH=1920; node render.js video out/silent.mp4 60
python3 mix.py
ffmpeg -i out/silent.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -profile:v high -level 4.1 -pix_fmt yuv420p -b:v 3.9M -maxrate 4.5M -bufsize 8M -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 160k -ar 44100 -movflags +faststart out/DRE_Missole2_TikTok_9x16.mp4
```

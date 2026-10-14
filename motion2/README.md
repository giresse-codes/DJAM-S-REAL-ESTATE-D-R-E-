# D.R.E – Djam's Real Estate · Spot publicitaire v2 (voix off)

**Fichiers finaux** — 54 s, 30 i/s, son AAC normalisé à −14 LUFS :
- `out/DRE_v2_1080p.mp4` — 16:9, 1920×1080 (YouTube, Facebook, WhatsApp)
- `out/DRE_v2_tiktok_shorts_1080x1920.mp4` — 9:16, 1080×1920 (TikTok, YouTube Shorts, Reels, statuts)

Contact affiché : (+237) 690 546 111 · dreigsarl@gmail.com. Effets : grain, light leaks, flare anamorphique, aberration chromatique sur les transitions, éclats lumineux.
Sous-titres séparés : `out/DRE_v2_soustitres.srt` (ils sont aussi incrustés dans la vidéo, en karaoké mot par mot).

## Déroulé (synchronisé sur la voix off)
| Temps | Scène |
|---|---|
| 0–5 s | Drone sur le terrain → la terre se fissure, le logo **sort du sol** (poussière, impact) — « Djam's Real Estate » |
| 5–12 s | « Vous recherchez un terrain, un logement, une maison ? » (cartes) · « vendre » + panneau À VENDRE |
| 12–17 s | « Un problème aussi fâcheux » (glitch, ambiance rouge) · « OÙ ? QUI ? contacter » |
| 17–18,7 s | **Pause tactique** : noir, silence, battement de cœur |
| 18,7–24 s | « BONNE NOUVELLE » (flash, confettis) · notification · « avec LA SOLUTION » ✓ |
| 24–30 s | Nos services : terrains bâtis / non bâtis (plans drone) · gestion de biens |
| 30–33 s | « Comment nous contacter ? » + **pause tactique** |
| 33–41 s | « C'est simple » · WhatsApp · appel direct · numéro qui se compose |
| 41–45 s | Drone large : « Réservez votre terrain dès maintenant » (épingle, clic) |
| 45–54 s | Logo, slogan mot par mot, (+237) 690 54 61 11 |

## Sources / crédits
- Voix off : ElevenLabs (fournie). Transcription : ElevenLabs Scribe, horodatage par mot.
- Effets sonores : bibliothèque HyperFrames (Pixabay Content License, `assets/sfx/CREDITS.md`).
- Émojis de réaction : Twemoji (CC-BY 4.0, © Twitter/X et contributeurs).
- Musique : composée par programme (`mix.py`), sans droits.

## Re-générer
```bash
# plans du terrain -> séquences d'images (ignorées par git)
cd assets && for a in "intro 21 4.8" "bati 45 3.4" "nonbati 12 3.4" "cta 54.5 5.0"; do set -- $a; mkdir -p clips/$1; \
  ffmpeg -ss $2 -t $3 -i terrain.mp4 -vf "fps=30,scale=1280:720:flags=lanczos,eq=contrast=1.1:saturation=1.18:brightness=-0.01,unsharp=5:5:0.6" -q:v 3 clips/$1/%03d.jpg; done; cd ..
python3 build_timeline.py           # timeline.json -> words.js + .srt (pauses tactiques = champ "at" des vo_clips)
export NODE_PATH=$(npm root -g); node render.js video out/silent.mp4 60
VW=1080 VH=1920 HASH='#v' node render.js video out/silent_v.mp4 60   # version verticale
python3 mix.py
ffmpeg -i out/silent.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart out/DRE_v2_1080p.mp4
```

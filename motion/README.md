# D.R.E – Djam's Real Estate · Motion design publicitaire

Vidéo publicitaire 28 s, 1920×1080, 30 fps, avec bande son.
Fichier final : `out/DRE_motion_1080p.mp4`

## Storyboard
| Temps | Scène |
|---|---|
| 0–3,6 s | Révélation du logo (maison + coche) dans une aurore bleue lumineuse |
| 3,4–7,5 s | Pastilles en verre : Terrains bâtis · Terrains non bâtis · Achat · Vente · Gestion — clic sur « Terrains non bâtis » |
| 7,2–10,6 s | Barre de recherche : « Je cherche un **terrain** au Cameroun. » tapé puis envoyé |
| 10,2–15,6 s | Carte 3D façon site web : « Terrains bâtis & non bâtis » — Achat · Vente · Gestion immobilière |
| 15,3–19,7 s | Nos services : 01 Achat · 02 Vente · 03 Gestion |
| 19,4–23,1 s | Slogan : « Bâtir aujourd'hui, *impacter pour l'éternité.* » |
| 23–28 s | Logo complet + « Appelez-nous (+237) 690 54 61 11 » |

## Re-générer
```bash
export NODE_PATH=$(npm root -g)
node render.js video out/silent.mp4 60      # 60 i/s fusionnées en 30 i/s (flou de mouvement)
python3 sound.py out/music.wav
ffmpeg -i out/silent.mp4 -i out/music.wav -c:v copy -c:a aac -b:a 192k -shortest out/DRE_motion_1080p.mp4
```
Aperçu d'images fixes : `node render.js preview <dossier> 1.2 12 25`.
Textes et timings modifiables dans `scene.html` (fonction `render(t)`).

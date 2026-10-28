# Reels quotidiens @SkyElite

Chaque jour : 3 reels verticaux (1080×1920) d'empty legs **réels**, publiés sur la page
« SkyElite Reels » : https://claude.ai/artifact/QzP9Y8iKy3nSy7AZpmfeKE

Application SkyElite (catalogue des vols) : https://claude.ai/artifact/E3uurAWMhsGwNg3wjDeVLm

## Règles
- **Destinations européennes uniquement** : l'aéroport d'arrivée est en Europe (Suisse, UE, Royaume-Uni, Norvège, Balkans, Turquie européenne…). Le départ peut être ailleurs.
- **Date de départ du vol ≥ jour de publication + 7 jours** (heure de Suisse).
- Uniquement des vols **avec prix publié** par l'opérateur.
- Jamais deux fois le même vol (vérifier les reels déjà publiés dans la base `reels`).
- Varier les destinations : éviter une ville d'arrivée déjà utilisée dans les 7 derniers jours, et mélanger les régions.
- Prix : avion entier converti en euros (1 USD ≈ 0,86 €, 1 CAD ≈ 0,62 €, comme l'application) ; prix par personne = total ÷ nombre de places, arrondi à l'euro.
- Ne jamais inventer un vol : chaque reel cite la page source de l'opérateur.

## Étapes
1. `git fetch origin emptyleg-reel && git checkout emptyleg-reel`, puis `npm ci`.
2. Lire l'application (Artifact `read`) et extraire `REAL_ROWS` (départ, arrivée, date, heure, fin de fenêtre, appareil, places, prix, devise, prix catalogue, source).
3. Lire la base de la page Reels (`ArtifactData list`, collection `reels`) pour connaître les vols et villes déjà utilisés.
4. Garder les vols éligibles (règles ci-dessus). **S'il en reste moins de 6** : chercher de nouveaux empty legs réels vers l'Europe sur les pages publiques des opérateurs listés dans `SRC` de l'application et d'autres opérateurs européens (WebFetch), puis les ajouter à `REAL_ROWS` (et à `AP` si l'aéroport manque : nom, région, latitude, longitude). Vérifier le script avec `node --check` avant de republier l'application. Ne rien supprimer d'autre.
5. Choisir 3 vols selon les règles. S'il n'existe pas 3 vols européens éligibles même après recherche, en faire moins et le dire dans le résumé (jamais de vol hors Europe pour compléter).
6. Extraits vidéo de la **destination** : `node scripts/fetch-footage.mjs "<ville d'arrivée> <pays>" <slug>` télécharge depuis Pexels (licence gratuite, usage commercial autorisé ; variable `PEXELS_API_KEY`) un plan vertical de la destination dans `public/footage/pexels/`. Si le résultat est hors sujet, réessayer avec un autre terme (monument, "<ville> aerial", "<ville> old town", plage…). En option, un 2e plan du lieu de départ. Compléter avec les plans jet / cabine de `public/footage/manifest.json` s'il y en a. Montage : 3 à 5 extraits, ~12 à 18 s, en commençant par la destination. Mentions : disclaimer « Images d'illustration · prix estimé HT, sous réserve de disponibilité » et, dans la légende, « 🎥 Vidéo : <auteur> / Pexels ». Sans clé Pexels ni extrait adapté : `clips: []` (fond animé, « Animation d'illustration ») et le signaler dans le résumé.
7. Écrire `reels/batches/AAAA-MM-JJ.json` au même format que `reels/batches/2026-10-28.json` (props du modèle `EmptyLegReel` : villes, codes pays ISO, date en français, prix, places, total, appareil, durée de vol estimée, mention, légende Instagram avec emojis, hashtags et « 📩 Plus d'infos en DM @SkyElite »).
8. `node scripts/render-reels.mjs reels/batches/AAAA-MM-JJ.json`, puis vérifier une image de chaque vidéo (`npx remotion still EmptyLegReel … --props=…`) : textes lisibles, rien qui déborde.
9. Envoyer les 3 MP4 dans les assets de la page Reels (Artifact publish, `asset: true`, `file_paths`), puis écrire 3 documents dans la collection `reels` (id `AAAA-MM-JJ-<id>`) avec : `day`, `order`, `route`, `flightDate` (AAAA-MM-JJ), `title`, `caption`, `videoUrl` (url renvoyée par l'upload), `source`, `sourceUrl`, `price`.
10. Commiter le fichier du lot (pas les MP4) et pousser sur `emptyleg-reel`.

## Bibliothèque d'extraits (`public/footage/`)
`manifest.json` liste les extraits fournis par SkyElite :
```json
[{ "file": "footage/nice-promenade.mp4", "duration": 12.4, "tags": ["nice", "FR", "mer", "ville"] },
 { "file": "footage/jet-tarmac-1.mp4", "duration": 8.0, "tags": ["jet", "tarmac"] }]
```
Tags utiles : code IATA ou nom de ville, code pays, thème (`mer`, `montagne`, `ville`, `desert`, `neige`), et `jet`, `cabine`, `tarmac` pour les plans génériques.
Dans les props, un extrait s'écrit `{ "src": "footage/xxx.mp4", "from": 2, "seconds": 3.5 }`.

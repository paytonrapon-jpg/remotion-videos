# Vidéos Remotion

Vidéos animées avec [Remotion](https://www.remotion.dev).

## Installation (une seule fois, sur Mac)

1. Installe [Node.js](https://nodejs.org) (version LTS) et [Google Drive pour ordinateur](https://www.google.com/drive/download/).
2. Place ce projet dans **Documents** (pas dans Google Drive).
3. Dans le Terminal, depuis le dossier du projet : `npm install`

## Exporter une vidéo dans Google Drive

```
npm run drive -- EmptyLegGvaMpl
```

La vidéo arrive dans **Mon Drive › Vidéos Remotion**, nommée avec la date du jour
(ex. `EmptyLegGvaMpl-2026-10-30.mp4`). Le dossier est créé automatiquement.

- Plusieurs vidéos d'un coup : `npm run drive -- EmptyLegGvaMpl RdvClient`
- Voir le dossier utilisé et les vidéos disponibles : `npm run drive`
- Choisir un autre dossier : `npm run drive -- --dossier "/chemin/du/dossier"`
  (astuce : tape la commande jusqu'à `--dossier `, puis glisse le dossier dans le Terminal)

## Vidéos disponibles

| Nom | Vidéo |
|---|---|
| `EmptyLegGvaMpl` | Reel du vol Genève → Montpellier |
| `RdvClient` | Vidéo face caméra « RDV client » (nécessite `public/rdv.mp4`, non inclus dans le dépôt) |
| `TalkingHead` | Démo du modèle face caméra |
| `HelloWorld` | Exemple de départ |

## Prévisualiser et modifier

```
npm run dev
```

Ouvre Remotion Studio dans le navigateur.

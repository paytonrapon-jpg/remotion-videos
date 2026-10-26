import { TalkingHeadProps } from "./types";

// Exemple : remplace par ta vidéo et ton propre texte.
export const demo: TalkingHeadProps = {
  videoSrc: null,
  durationInSeconds: 12,
  overlays: [
    { type: "keyword", start: 0.4, end: 3, text: "CLAUDE", icon: "arrow-up" },
    { type: "illustration", start: 3.2, end: 6, name: "chart", label: "+300 % de vues" },
    { type: "keyword", start: 6.2, end: 8.5, text: "GRATUIT", icon: "check" },
    { type: "illustration", start: 8.7, end: 11.6, name: "lightbulb", label: "Des idées en 1 clic" },
  ],
  captions: [
    { start: 0, end: 3, text: "Tu connais Claude ?" },
    { start: 3, end: 6, text: "Mes vues ont explosé grâce à lui" },
    { start: 6, end: 8.6, text: "Et en plus c'est gratuit" },
    { start: 8.6, end: 12, text: "Il me trouve toutes mes idées de vidéos" },
  ],
};

import { buildCaptions } from "./buildCaptions";
import words from "./rdv-words.json";
import { Overlay, TalkingHeadProps } from "./types";

// Vidéo « Préparer un rendez-vous client avec Claude » (23/10/2026).
// Écran Claude : de « Je copie ce prompt » jusqu'à « j'ai un plan clair ».
const screen = { start: 14.2, end: 32.0 };
// Pendant la dictée du prompt, le texte est déjà à l'écran : pas de sous-titres.
const dictation = { start: 15.8, end: 28.7 };

const overlays: Overlay[] = [
  { type: "illustration", start: 0.1, end: 2.9, name: "calendar", label: "Stress avant le RDV ?" },
  { type: "keyword", start: 3.0, end: 5.4, text: "PRÊTE", icon: "check" },
  { type: "illustration", start: 5.7, end: 7.6, name: "warning", label: "Le problème" },
  { type: "illustration", start: 7.7, end: 11.7, name: "question", label: "Questions oubliées" },
  { type: "keyword", start: 11.9, end: 14.0, text: "CLAUDE", icon: "arrow-up" },
  {
    type: "screen",
    ...screen,
    title: "Claude",
    // Temps relatifs au début de l'écran (14,2 s), calés sur la voix.
    typing: [
      {
        text: "Je suis coach et j'ai un rendez-vous demain avec une cliente qui veut lancer son activité. ",
        start: 1.7,
        end: 6.8,
      },
      {
        text: "Prépare-moi 10 questions de découverte, 3 objections possibles avec mes réponses et une proposition d'étape suivante.",
        start: 7.2,
        end: 14.3,
      },
    ],
    sendAt: 14.7,
    response: {
      intro: "Voici ta préparation pour demain :",
      sections: [
        {
          heading: "10 questions de découverte",
          items: ["Où en est ton projet aujourd'hui ?", "Qu'est-ce qui te bloque le plus ?", "Quel résultat veux-tu dans 3 mois ?"],
        },
        {
          heading: "3 objections",
          items: ["« C'est trop cher » → parler du retour sur investissement"],
        },
        { heading: "Étape suivante", items: ["Proposer une séance de lancement"] },
      ],
      start: 15.0,
      end: 17.0,
    },
  },
  { type: "illustration", start: 32.2, end: 34.5, name: "lightbulb", label: "Je relis, j'ajuste" },
  { type: "keyword", start: 34.6, end: 36.6, text: "SEREINE", icon: "check" },
  { type: "illustration", start: 36.8, end: 39.2, name: "chart", label: "RDV efficaces" },
  { type: "keyword", start: 39.4, end: 41.4, text: "OUI !", icon: "thumbs-up" },
  { type: "illustration", start: 41.7, end: 46.1, name: "comment", label: "Écris « RDV » en commentaire" },
];

export const rdv: TalkingHeadProps = {
  videoSrc: "rdv.mp4",
  durationInSeconds: 46.1,
  overlays,
  captions: buildCaptions(words, { hide: [dictation] }),
};

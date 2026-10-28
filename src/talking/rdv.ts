import { buildCaptions } from "./buildCaptions";
import words from "./rdv-words.json";
import { Overlay, TalkingHeadProps } from "./types";

// Vidéo « Préparer un rendez-vous client avec Claude » (23/10/2026).
const prompt = { start: 14.2, end: 21.2 };

const overlays: Overlay[] = [
  { type: "illustration", start: 0.1, end: 2.9, name: "calendar", label: "Stress avant le RDV ?" },
  { type: "keyword", start: 3.0, end: 5.4, text: "PRÊTE", icon: "check" },
  { type: "illustration", start: 5.7, end: 7.6, name: "warning", label: "Le problème" },
  { type: "illustration", start: 7.7, end: 11.7, name: "question", label: "Questions oubliées" },
  { type: "keyword", start: 11.9, end: 14.0, text: "CLAUDE", icon: "arrow-up" },
  {
    type: "prompt",
    ...prompt,
    title: "Mon prompt",
    text: "Je suis coach et j'ai un rendez-vous demain avec une cliente qui veut lancer son activité.",
  },
  { type: "keyword", start: 21.4, end: 23.7, text: "10 QUESTIONS", icon: "list" },
  { type: "keyword", start: 23.8, end: 26.3, text: "3 OBJECTIONS", icon: "chat" },
  { type: "keyword", start: 26.4, end: 28.7, text: "ÉTAPE SUIVANTE", icon: "arrow-up" },
  { type: "illustration", start: 28.8, end: 31.8, name: "stopwatch", label: "30 secondes" },
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
  captions: buildCaptions(words, { hide: [prompt] }),
};

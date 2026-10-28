import { EmptyLegReelProps } from "./EmptyLegReel";

// Offre relevée le 28 oct. 2026 (Callajet Europe, liste du 23 oct.) : HondaJet Elite, 4 places, 2 500 € l'avion.
export const genevaMontpellier: EmptyLegReelProps = {
  videoSrc: "emptyleg/source.mp4",
  // Zoom fort et décentré : sort le filigrane de la vidéo source du cadre.
  clips: [
    { from: 0, seconds: 3.5, zoom: [1.22, 1.28], origin: "75% 50%" },
    { from: 4.2, seconds: 2.6, zoom: [1.22, 1.28], origin: "75% 50%" },
    { from: 14, seconds: 4, zoom: [1.22, 1.28], origin: "75% 50%" },
    { from: 12, seconds: 2, zoom: [1.22, 1.28], origin: "75% 50%" },
    { from: 18, seconds: 5, zoom: [1.22, 1.28], origin: "75% 50%" },
  ],
  fromCity: "Genève",
  toCity: "Montpellier",
  fromFlag: "CH",
  toFlag: "FR",
  date: "3 nov. 2026",
  pricePerSeat: "625 €",
  seats: 4,
  total: "2 500 €",
  aircraft: "HondaJet Elite",
  flightTime: "≈ 50 min de vol",
  disclaimer: "Images d'illustration · prix estimé HT, sous réserve de disponibilité",
};

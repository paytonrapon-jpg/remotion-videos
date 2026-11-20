import type { LookbookProps } from "./Lookbook";

// Les étiquettes (x, y) sont en % de la zone de l'image.
export const mesMannequins: LookbookProps = {
  hook: "Du sport\nà la soirée…\n2 looks 👀",
  looks: [
    {
      title: "Sport chic",
      image: "mannequins/sport-cutout.png",
      mode: "cutout",
      pieces: [
        { name: "Brassière rose pastel", shop: "ola", x: 34, y: 66 },
        { name: "Legging taille haute", shop: "ola", x: 66, y: 94 },
        { name: "Gourde assortie", x: 28, y: 82 },
      ],
      caption: "Ensemble rose pastel, parfait pour la salle comme pour le brunch",
    },
    {
      title: "Soirée glam",
      image: "mannequins/chic.jpg",
      mode: "photo",
      pieces: [
        { name: "Chemise satin crème", x: 60, y: 25 },
        { name: "Jupe effet croco", x: 66, y: 42 },
        { name: "Pochette dorée", x: 32, y: 58 },
        { name: "Sandales à talons", x: 60, y: 82 },
      ],
      caption: "Satin, croco et touches dorées pour sortir le soir",
    },
  ],
  cta: "Ton préféré ? 1 ou 2 👇",
};

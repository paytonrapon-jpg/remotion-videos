import { EmptyLegProps } from "./EmptyLeg";

// Vol Genève → Montpellier du mardi 3 novembre.
export const gvaMpl: EmptyLegProps = {
  from: { code: "GVA", city: "Genève" },
  to: { code: "MPL", city: "Montpellier" },
  date: "Mardi 3 novembre",
  time: "Horaire à confirmer",
  aircraft: "HondaJet Elite",
  category: "Jet léger",
  seats: 4,
  threshold: 2,
  booked: 0,
  seatPrice: 625,
  fullPrice: 2500,
  duration: "52 min",
  distance: "184 NM",
  cta: "Réserve ta place",
};

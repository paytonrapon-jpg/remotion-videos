// Score de compatibilité profil ↔ offre, avec les raisons affichées à l'utilisateur.
import { CANTONS, CANTONS_VOISINS } from "./referentiel.js";

const LANGUES = { fr: "français", de: "allemand", it: "italien", en: "anglais" };

export function scorer(offre, profil) {
  let score = 0;
  const raisons = [];
  const alertes = [];

  if (!profil.metiers.length) {
    score += 25;
  } else if (profil.metiers.includes(offre.metier)) {
    score += 30;
    raisons.push("Métier recherché");
  } else {
    alertes.push("Métier hors de vos recherches");
  }

  const requis = offre.diplomesCites ?? [];
  if (requis.length === 0) {
    score += 15;
  } else {
    const communs = requis.filter((d) => profil.diplomes.includes(d));
    if (communs.length) {
      score += 25;
      raisons.push(`Diplôme demandé : ${communs.join(", ")}`);
    } else if (profil.diplomes.length) {
      alertes.push(`Diplôme cité : ${requis.join(", ")}`);
    }
  }

  if (!profil.canton || !offre.canton) {
    score += 10;
  } else if (offre.canton === profil.canton) {
    score += 20;
    raisons.push(`Canton de ${CANTONS.find((c) => c.code === offre.canton)?.nom ?? offre.canton}`);
  } else if (CANTONS_VOISINS[profil.canton]?.includes(offre.canton)) {
    score += 12;
    raisons.push("Canton voisin");
  } else {
    alertes.push(`Canton ${offre.canton}`);
  }

  const min = offre.tauxMin ?? offre.tauxMax;
  const max = offre.tauxMax ?? offre.tauxMin;
  if (min == null) {
    score += 10;
  } else if (max >= profil.tauxMin && min <= profil.tauxMax) {
    score += 15;
    raisons.push(`Taux ${offre.taux}`);
  } else {
    alertes.push(`Taux ${offre.taux}`);
  }

  if (!offre.langue || profil.langues.includes(offre.langue)) {
    score += 10;
  } else {
    alertes.push(`Annonce en ${LANGUES[offre.langue] ?? offre.langue}`);
  }

  const texte = `${offre.description}`.toLowerCase();
  if (/permis (de conduire|b)\b.{0,30}(exigé|indispensable|obligatoire|requis)|véhicule (exigé|indispensable)|führerausweis/.test(texte) && !profil.permisConduire) {
    score -= 15;
    alertes.push("Permis de conduire exigé");
  }

  return { score: Math.max(0, Math.min(100, score)), raisons, alertes };
}

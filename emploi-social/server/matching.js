// Score de compatibilité profil ↔ offre, avec les raisons affichées à l'utilisateur.
import { DIPLOMES } from "./referentiel.js";

const DEPARTEMENTS_VOISINS = {
  // Voisinage simplifié pour les départements les plus fréquents ; à défaut, seul le même département compte.
  "13": ["04", "83", "84", "30"], "30": ["07", "13", "34", "48", "84", "12"], "31": ["09", "11", "32", "65", "81", "82"],
  "33": ["17", "24", "40", "47"], "34": ["11", "12", "30", "81"], "44": ["35", "49", "56", "85"],
  "59": ["02", "62", "80"], "67": ["57", "68", "88"], "69": ["01", "38", "42", "71"], "75": ["92", "93", "94"],
  "92": ["75", "78", "91", "93", "94", "95"], "93": ["75", "77", "92", "94", "95"], "94": ["75", "77", "91", "92", "93"],
};

export function scorer(offre, profil) {
  let score = 0;
  const raisons = [];
  const alertes = [];

  if (!profil.metiers.length || profil.metiers.includes(offre.rome)) {
    score += 35;
    if (profil.metiers.length) raisons.push("Métier recherché");
  } else {
    alertes.push("Métier hors de vos recherches");
  }

  const requis = offre.diplomesCites ?? [];
  if (requis.length === 0) {
    score += 20;
  } else {
    const communs = requis.filter((d) => profil.diplomes.includes(d));
    if (communs.length) {
      score += 35;
      raisons.push(`Diplôme demandé : ${communs.map((c) => DIPLOMES.find((d) => d.code === c)?.code ?? c).join(", ")}`);
    } else if (profil.diplomes.length) {
      alertes.push(`Diplôme cité : ${requis.join(", ")}`);
    }
  }

  if (!profil.departement || !offre.departement) {
    score += 10;
  } else if (offre.departement === profil.departement) {
    score += 20;
    raisons.push("Dans votre département");
  } else if (DEPARTEMENTS_VOISINS[profil.departement]?.includes(offre.departement)) {
    score += 10;
    raisons.push("Département voisin");
  } else {
    alertes.push("Éloigné de chez vous");
  }

  if (!profil.contrats.length || profil.contrats.includes(offre.contrat)) {
    score += 10;
    if (profil.contrats.length) raisons.push(`Contrat ${offre.contrat}`);
  } else {
    alertes.push(`Contrat ${offre.contrat}`);
  }

  const texte = `${offre.description}`.toLowerCase();
  if (/permis b?\s*(exigé|indispensable|obligatoire)|véhicule (exigé|indispensable)/.test(texte) && !profil.permis) {
    score -= 15;
    alertes.push("Permis exigé");
  }

  return { score: Math.max(0, Math.min(100, score)), raisons, alertes };
}

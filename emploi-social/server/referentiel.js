// Référentiel du secteur social : métiers (codes ROME France Travail) et diplômes d'État.

export const METIERS = [
  { rome: "K1207", libelle: "Éducateur·rice spécialisé·e / moniteur·rice-éducateur·rice", famille: "educatif" },
  { rome: "K1202", libelle: "Éducateur·rice de jeunes enfants", famille: "petite-enfance" },
  { rome: "K1201", libelle: "Assistant·e de service social / travailleur·se social·e", famille: "social" },
  { rome: "K1301", libelle: "Accompagnant·e éducatif·ve et social·e (AES, AMP, AVS)", famille: "medico-social" },
  { rome: "K1302", libelle: "Aide à domicile / assistance auprès d'adultes", famille: "medico-social" },
  { rome: "K1305", libelle: "Technicien·ne de l'intervention sociale et familiale (TISF)", famille: "social" },
  { rome: "K1205", libelle: "Conseiller·ère en économie sociale et familiale (CESF)", famille: "social" },
  { rome: "K1204", libelle: "Médiateur·rice social·e", famille: "social" },
  { rome: "K1206", libelle: "Animateur·rice socioculturel·le", famille: "animation" },
  { rome: "K1203", libelle: "Encadrant·e technique d'insertion", famille: "insertion" },
  { rome: "K1801", libelle: "Conseiller·ère en insertion professionnelle", famille: "insertion" },
  { rome: "K1101", libelle: "Médiateur·rice familial·e", famille: "social" },
  { rome: "K1403", libelle: "Chef·fe de service / direction d'établissement social", famille: "encadrement" },
];

export const DIPLOMES = [
  { code: "DEES", libelle: "DE Éducateur spécialisé", mots: ["éducateur spécialisé", "educateur specialise", "dees", "de es"] },
  { code: "DEME", libelle: "DE Moniteur-éducateur", mots: ["moniteur éducateur", "moniteur-éducateur", "moniteur educateur", "deme"] },
  { code: "DEEJE", libelle: "DE Éducateur de jeunes enfants", mots: ["éducateur de jeunes enfants", "educateur de jeunes enfants", "deeje", "eje"] },
  { code: "DEASS", libelle: "DE Assistant de service social", mots: ["assistant de service social", "assistante de service social", "deass", "assistant social", "assistante sociale"] },
  { code: "DECESF", libelle: "DE Conseiller en économie sociale familiale", mots: ["économie sociale familiale", "economie sociale familiale", "decesf", "cesf"] },
  { code: "DEAES", libelle: "DE Accompagnant éducatif et social", mots: ["accompagnant éducatif et social", "accompagnant educatif et social", "deaes", "aes", "amp", "aide médico-psychologique", "avs"] },
  { code: "DETISF", libelle: "DE Technicien de l'intervention sociale et familiale", mots: ["tisf", "detisf", "intervention sociale et familiale"] },
  { code: "DEETS", libelle: "DE Éducateur technique spécialisé", mots: ["éducateur technique spécialisé", "educateur technique specialise", "deets", "ets"] },
  { code: "CAFERUIS", libelle: "CAFERUIS", mots: ["caferuis", "chef de service"] },
  { code: "CAFDES", libelle: "CAFDES", mots: ["cafdes"] },
  { code: "DEIS", libelle: "DE Ingénierie sociale", mots: ["deis", "ingénierie sociale"] },
  { code: "DEMF", libelle: "DE Médiateur familial", mots: ["médiateur familial", "mediateur familial", "demf"] },
  { code: "CNC-MJPM", libelle: "CNC Mandataire judiciaire (MJPM)", mots: ["mjpm", "mandataire judiciaire"] },
  { code: "BPJEPS", libelle: "BPJEPS Animation sociale", mots: ["bpjeps", "animation sociale"] },
  { code: "TP-CIP", libelle: "Titre pro Conseiller en insertion professionnelle", mots: ["cip", "conseiller en insertion professionnelle", "conseillère en insertion professionnelle"] },
  { code: "ADVF", libelle: "Titre pro ADVF", mots: ["advf", "assistant de vie aux familles", "assistante de vie"] },
];

export const CONTRATS = [
  { code: "CDI", libelle: "CDI" },
  { code: "CDD", libelle: "CDD" },
  { code: "MIS", libelle: "Intérim" },
  { code: "LIB", libelle: "Libéral / indépendant" },
  { code: "SAI", libelle: "Saisonnier" },
];

export const familleDe = (rome) => METIERS.find((m) => m.rome === rome)?.famille ?? "social";

const normalise = (s) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Diplômes mentionnés dans un texte d'offre. */
export function diplomesCites(texte) {
  const t = ` ${normalise(texte).replace(/[^a-z0-9]+/g, " ")} `;
  return DIPLOMES.filter((d) =>
    d.mots.some((m) => t.includes(` ${normalise(m).replace(/[^a-z0-9]+/g, " ").trim()} `)),
  ).map((d) => d.code);
}

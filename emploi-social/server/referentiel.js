// Référentiel du secteur social en Suisse : métiers, cantons, diplômes.

// `recherche` : mots-clés envoyés à la bourse de l'emploi (français et allemand ; ils se cumulent en OU).
// `titre` : motifs reconnus dans l'intitulé, pour écarter les annonces hors sujet.
export const METIERS = [
  {
    id: "educ-social", libelle: "Éducateur·rice social·e (ES/HES)", famille: "educatif",
    recherche: ["éducateur social", "éducatrice sociale", "éducateur spécialisé", "éducatrice spécialisée", "Sozialpädagoge", "Sozialpädagogin"],
    titre: /([ée]ducat(eur|rice|eurs|rices)(?!.{0,15}(de l.enfance|petite enfance|enfance))|sozialp[äa]dagog)/i,
  },
  {
    id: "ede", libelle: "Éducateur·rice de l'enfance (EDE)", famille: "petite-enfance",
    recherche: ["éducateur de l'enfance", "éducatrice de l'enfance", "petite enfance", "UAPE", "Kindheitspädagogin", "Kindheitspädagoge"],
    titre: /(de l.enfance|petite enfance|\bEDE\b|\bUAPE\b|cr[èe]che|garderie|parascolaire|kindheitsp[äa]dagog|\bKita\b)/i,
  },
  {
    id: "ase", libelle: "Assistant·e socio-éducatif·ve (ASE, CFC)", famille: "medico-social",
    recherche: ["assistant socio-éducatif", "assistante socio-éducative", "Fachperson Betreuung"],
    titre: /(socio-?[ée]ducati|\bASE\b|fachperson betreuung|\bFaBe\b)/i,
  },
  {
    id: "as", libelle: "Assistant·e social·e (HES)", famille: "social",
    recherche: ["assistant social", "assistante sociale", "Sozialarbeiter", "Sozialarbeiterin"],
    titre: /(assistant[·.\-/]?e?s?[·.\-/]?\s+soci|assistante?s? soci|travailleu(r|se)s? soci|sozialarbeit)/i,
  },
  {
    id: "curateur", libelle: "Curateur·rice / mandataire de protection", famille: "social",
    recherche: ["curateur", "curatrice", "Berufsbeistand", "Berufsbeiständin"],
    titre: /(curat(eur|rice)|beist[äa]nd|curatelle)/i,
  },
  {
    id: "msp", libelle: "Maître·sse socioprofessionnel·le (MSP)", famille: "insertion",
    recherche: ["maître socioprofessionnel", "maîtresse socioprofessionnelle", "Arbeitsagoge", "Arbeitsagogin"],
    titre: /(socioprofessionnel|\bMSP\b|arbeitsagog)/i,
  },
  {
    id: "anim", libelle: "Animateur·rice socioculturel·le", famille: "animation",
    recherche: ["animateur socioculturel", "animatrice socioculturelle", "travailleur social hors murs", "soziokulturelle Animation", "Jugendarbeiter"],
    titre: /(animat(eur|rice|ion).{0,20}socio|hors.murs|soziokultur|jugendarbeit)/i,
  },
  {
    id: "insertion", libelle: "Conseiller·ère en insertion / job coach", famille: "insertion",
    recherche: ["conseiller en insertion", "conseillère en insertion", "job coach", "Job Coach", "Integrationsfachperson"],
    titre: /(insertion|job.?coach|int[ée]gration|integrationsfach)/i,
  },
  {
    id: "asa", libelle: "Accompagnant·e, aide en soins (ASA, AFP)", famille: "medico-social",
    recherche: ["aide en soins et accompagnement", "accompagnant", "accompagnante", "Assistent Gesundheit und Soziales"],
    titre: /(accompagnant|aide en soins|\bASA\b|gesundheit und soziales|\bAGS\b)/i,
  },
  {
    id: "encadrement", libelle: "Responsable d'unité / chef·fe de service", famille: "encadrement",
    recherche: ["responsable d'unité éducative", "chef de service éducatif", "responsable socio-éducatif", "Teamleitung Sozialpädagogik"],
    titre: /(responsable.{0,30}(unit[ée]|[ée]ducati|secteur|socio)|chef.{0,10}de service|teamleit|bereichsleit)/i,
  },
];

export const CANTONS = [
  { code: "GE", nom: "Genève", langue: "fr" }, { code: "VD", nom: "Vaud", langue: "fr" },
  { code: "VS", nom: "Valais", langue: "fr" }, { code: "FR", nom: "Fribourg", langue: "fr" },
  { code: "NE", nom: "Neuchâtel", langue: "fr" }, { code: "JU", nom: "Jura", langue: "fr" },
  { code: "BE", nom: "Berne", langue: "de" }, { code: "TI", nom: "Tessin", langue: "it" },
  { code: "ZH", nom: "Zurich", langue: "de" }, { code: "BS", nom: "Bâle-Ville", langue: "de" },
  { code: "BL", nom: "Bâle-Campagne", langue: "de" }, { code: "SO", nom: "Soleure", langue: "de" },
  { code: "AG", nom: "Argovie", langue: "de" }, { code: "LU", nom: "Lucerne", langue: "de" },
  { code: "ZG", nom: "Zoug", langue: "de" }, { code: "SZ", nom: "Schwytz", langue: "de" },
  { code: "UR", nom: "Uri", langue: "de" }, { code: "OW", nom: "Obwald", langue: "de" },
  { code: "NW", nom: "Nidwald", langue: "de" }, { code: "GL", nom: "Glaris", langue: "de" },
  { code: "SG", nom: "Saint-Gall", langue: "de" }, { code: "AR", nom: "Appenzell RE", langue: "de" },
  { code: "AI", nom: "Appenzell RI", langue: "de" }, { code: "TG", nom: "Thurgovie", langue: "de" },
  { code: "SH", nom: "Schaffhouse", langue: "de" }, { code: "GR", nom: "Grisons", langue: "de" },
];

export const CANTONS_VOISINS = {
  GE: ["VD"], VD: ["GE", "FR", "VS", "NE", "BE"], VS: ["VD", "BE", "TI", "UR"], FR: ["VD", "BE", "NE"],
  NE: ["VD", "FR", "BE", "JU"], JU: ["NE", "BE", "SO", "BL"], BE: ["VD", "FR", "NE", "JU", "SO", "LU", "VS", "AG", "OW", "NW", "UR"],
  TI: ["VS", "UR", "GR"], ZH: ["AG", "ZG", "SZ", "SG", "TG", "SH"], BS: ["BL"], BL: ["BS", "SO", "AG", "JU"],
  SO: ["BE", "JU", "BL", "AG"], AG: ["SO", "BL", "ZH", "LU", "ZG", "BE"], LU: ["BE", "AG", "ZG", "SZ", "OW", "NW"],
  ZG: ["ZH", "LU", "SZ", "AG"], SZ: ["ZH", "ZG", "LU", "NW", "UR", "GL", "SG"], UR: ["SZ", "NW", "OW", "BE", "VS", "TI", "GR", "GL"],
  OW: ["NW", "LU", "BE", "UR"], NW: ["OW", "LU", "SZ", "UR", "BE"], GL: ["SZ", "UR", "GR", "SG"], SG: ["ZH", "TG", "AR", "AI", "GL", "SZ", "GR"],
  AR: ["SG", "AI"], AI: ["AR", "SG"], TG: ["ZH", "SH", "SG"], SH: ["ZH", "TG"], GR: ["UR", "GL", "SG", "TI"],
};

export const DIPLOMES = [
  // Suisse
  { code: "ES-EDUC", libelle: "Éducateur·rice social·e ES", mots: ["éducateur social es", "éducatrice sociale es", "es/hes", "es ou hes", "es-hes", "es / hes", "sozialpädagogin hf", "sozialpädagoge hf", "hf"] },
  { code: "HES-TS", libelle: "Bachelor HES en travail social", mots: ["hes", "bachelor en travail social", "bachelor hes", "travail social hes", "es/hes", "es ou hes", "es-hes", "es / hes", "fh", "bachelor in sozialer arbeit"] },
  { code: "ES-EDE", libelle: "Éducateur·rice de l'enfance ES (EDE)", mots: ["éducateur de l'enfance", "éducatrice de l'enfance", "ede", "kindheitspädagogin hf", "kindheitspädagoge hf"] },
  { code: "CFC-ASE", libelle: "CFC Assistant·e socio-éducatif·ve (ASE)", mots: ["ase", "cfc d'assistant socio-éducatif", "assistant socio-éducatif", "assistante socio-éducative", "fachperson betreuung", "fabe"] },
  { code: "ES-MSP", libelle: "Maître·sse socioprofessionnel·le ES (MSP)", mots: ["msp", "maître socioprofessionnel", "maîtresse socioprofessionnelle", "arbeitsagoge", "arbeitsagogin"] },
  { code: "AFP-ASA", libelle: "AFP Aide en soins et accompagnement (ASA)", mots: ["asa", "afp", "aide en soins et accompagnement", "ags", "eba"] },
  { code: "CFC-ASSC", libelle: "CFC Assistant·e en soins et santé communautaire (ASSC)", mots: ["assc", "assistant en soins et santé communautaire", "fage", "fachperson gesundheit"] },
  { code: "BF-ACCOMP", libelle: "Brevet fédéral (spécialiste de l'accompagnement…)", mots: ["brevet fédéral", "eidgenössischer fachausweis"] },
  { code: "CAS-DAS", libelle: "CAS / DAS / MAS (formation continue)", mots: ["certificate of advanced studies", "diploma of advanced studies"] },
  { code: "EMS-CAD", libelle: "Diplôme de cadre (responsable d'équipe, gestion d'institution)", mots: ["diplôme de cadre", "management", "gestion d'équipe"] },
  // France (reconnaissance SEFRI nécessaire pour certains postes)
  { code: "FR-DEES", libelle: "DE Éducateur spécialisé (France)", mots: ["dees", "éducateur spécialisé", "éducatrice spécialisée"] },
  { code: "FR-DEME", libelle: "DE Moniteur-éducateur (France)", mots: ["moniteur éducateur", "moniteur-éducateur", "deme"] },
  { code: "FR-DEEJE", libelle: "DE Éducateur de jeunes enfants (France)", mots: ["éducateur de jeunes enfants", "deeje", "eje"] },
  { code: "FR-DEASS", libelle: "DE Assistant de service social (France)", mots: ["deass", "assistant de service social"] },
  { code: "FR-DEAES", libelle: "DE Accompagnant éducatif et social (France)", mots: ["deaes", "accompagnant éducatif et social"] },
];

export const CONTRATS = [
  { code: "indetermine", libelle: "Durée indéterminée" },
  { code: "determine", libelle: "Durée déterminée" },
];

export const PERMIS_TRAVAIL = [
  { code: "CH", libelle: "Nationalité suisse" },
  { code: "C", libelle: "Permis C" },
  { code: "B", libelle: "Permis B" },
  { code: "G", libelle: "Permis G (frontalier)" },
  { code: "UE", libelle: "Ressortissant·e UE/AELE, permis à obtenir" },
  { code: "autre", libelle: "Autre / à préciser" },
];

export const familleDe = (metierId) => METIERS.find((m) => m.id === metierId)?.famille ?? "social";

/** Métier reconnu dans un intitulé d'annonce. */
// Les métiers les plus spécifiques sont testés en premier (« éducateur de l'enfance » avant « éducateur »).
const PRIORITE = ["ede", "ase", "curateur", "msp", "anim", "insertion", "asa", "encadrement", "as", "educ-social"];
export const metierDuTitre = (titre) =>
  PRIORITE.map((id) => METIERS.find((m) => m.id === id)).find((m) => m.titre.test(titre ?? ""))?.id ?? "";

const normalise = (s) =>
  ` ${(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ")} `;

/** Diplômes mentionnés dans un texte d'annonce. */
export function diplomesCites(texte) {
  const t = normalise(texte);
  return DIPLOMES.filter((d) => d.mots.some((m) => t.includes(normalise(m)))).map((d) => d.code);
}

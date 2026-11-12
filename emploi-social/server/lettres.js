// Rédaction d'un brouillon de candidature (objet + lettre) adapté au métier, au format suisse.
// Le texte est toujours modifiable par l'utilisateur avant autorisation.
import { DIPLOMES, familleDe } from "./referentiel.js";

const ANGLES = {
  educatif: {
    valeurs: "la construction d'une relation éducative de confiance, le respect du projet de chaque personne accompagnée et le travail en équipe pluridisciplinaire",
    apport: "observer, analyser les situations et proposer des actions éducatives individuelles et collectives adaptées, en lien avec les familles et le réseau",
  },
  "petite-enfance": {
    valeurs: "le respect du rythme de chaque enfant, la qualité de l'accueil et le partenariat avec les familles",
    apport: "accompagner les enfants au quotidien, contribuer au projet pédagogique de la structure et soutenir les parents",
  },
  social: {
    valeurs: "l'accès aux prestations, l'écoute sans jugement et le respect de l'autonomie et de la dignité des personnes",
    apport: "évaluer les situations de manière globale, accompagner les démarches administratives et sociales et mobiliser le réseau",
  },
  "medico-social": {
    valeurs: "la bientraitance, l'attention portée aux habitudes de vie de chaque personne et le respect de son intimité",
    apport: "accompagner les actes du quotidien tout en favorisant l'autonomie, la communication et la participation sociale",
  },
  animation: {
    valeurs: "la participation des habitant·e·s, le lien social et la valorisation des initiatives collectives",
    apport: "concevoir et animer des actions collectives, aller à la rencontre des publics et accompagner leurs projets",
  },
  insertion: {
    valeurs: "la conviction que chacun·e peut construire un parcours professionnel, et une attention aux compétences de chaque personne",
    apport: "accompagner individuellement les parcours, encadrer en situation de travail et développer les liens avec les employeurs",
  },
  famille: {
    valeurs: "le soutien à la parentalité, l'intérêt de l'enfant et le respect de la place de chaque membre de la famille",
    apport: "accompagner les familles dans leur quotidien, évaluer les situations, soutenir les compétences parentales et travailler en réseau avec les services de protection de l'enfance",
  },
  encadrement: {
    valeurs: "la qualité de l'accompagnement, le soutien aux équipes et l'éthique de l'intervention sociale",
    apport: "conduire une équipe pluridisciplinaire, garantir la qualité des prestations et entretenir le travail en réseau",
  },
};

const AUTORISATION = {
  C: "Je suis titulaire d'un permis C.",
  B: "Je suis titulaire d'un permis B.",
  G: "Je suis titulaire d'un permis G (frontalier·ère).",
  UE: "Je suis ressortissant·e de l'UE/AELE.",
};

// Formulation des diplômes dans une phrase « Au bénéfice … ».
const EN_PHRASE = {
  "ES-EDUC": "d'un diplôme d'éducateur·rice social·e ES",
  "HES-TS": "d'un Bachelor HES en travail social",
  "ES-EDE": "d'un diplôme d'éducateur·rice de l'enfance ES",
  "CFC-ASE": "d'un CFC d'assistant·e socio-éducatif·ve",
  "ES-MSP": "d'un diplôme de maître·sse socioprofessionnel·le ES",
  "AFP-ASA": "d'une AFP d'aide en soins et accompagnement",
  "CFC-ASSC": "d'un CFC d'assistant·e en soins et santé communautaire",
  "BF-ACCOMP": "d'un brevet fédéral",
  "CAS-DAS": "d'une formation postgrade (CAS/DAS)",
  "EMS-CAD": "d'une formation de cadre",
  "FR-DEES": "d'un diplôme d'État français d'éducateur·rice spécialisé·e",
  "FR-DEME": "d'un diplôme d'État français de moniteur·rice-éducateur·rice",
  "FR-DEEJE": "d'un diplôme d'État français d'éducateur·rice de jeunes enfants",
  "FR-DEASS": "d'un diplôme d'État français d'assistant·e de service social",
  "FR-DEAES": "d'un diplôme d'État français d'accompagnant·e éducatif·ve et social·e",
};

const nettoyerIntitule = (s) =>
  s
    .replace(/\s*\(?\b(H\/F(\/D)?|F\/H(\/D)?|m\/w(\/d)?|w\/m(\/d)?)\b\)?/gi, "")
    .replace(/\s*(à|a)?\s*\d{2,3}\s*(-|–|à)?\s*(\d{2,3})?\s*%/g, "")
    .replace(/\s*[-–]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

// « de » → « d' » devant une voyelle ou un h muet.
const de = (mot) => (/^[aeiouyhéèêàâîôûAEIOUYHÉÈÊÀÂÎÔÛ]/.test(mot) ? `d'${mot}` : `de ${mot}`);

function formuleAppel(contactNom) {
  const nom = (contactNom ?? "").split(",")[0].trim();
  const m = nom.match(/^(Mme|Madame)\s+(.+)$/i) ?? nom.match(/^(M\.|Mr|Monsieur)\s+(.+)$/i);
  if (!m) return "Madame, Monsieur,";
  return /^(Mme|Madame)$/i.test(m[1]) ? `Madame ${m[2].split(" ").at(-1)},` : `Monsieur ${m[2].split(" ").at(-1)},`;
}

export function rediger(offre, profil) {
  const angle = ANGLES[familleDe(offre.metier)] ?? ANGLES.social;
  const nomComplet = [profil.prenom, profil.nom].filter(Boolean).join(" ") || "[Prénom Nom]";
  const poste = nettoyerIntitule(offre.intitule);
  const libelle = (c) => EN_PHRASE[c] ?? `d'un titre « ${DIPLOMES.find((d) => d.code === c)?.libelle ?? c} »`;
  const pertinents = profil.diplomes.filter((c) => (offre.diplomesCites ?? []).includes(c));
  const diplomes = (pertinents.length ? pertinents : profil.diplomes).slice(0, 2).map(libelle);
  const reference = offre.reference ? ` (réf. ${offre.reference})` : "";
  const ville = offre.lieu.replace(/^\d{4}\s*/, "");
  const taux = offre.taux ? ` à ${offre.taux}` : "";

  const paragrapheProfil = [
    diplomes.length ? `Au bénéfice ${diplomes.join(" et ")}` : "Professionnel·le de l'accompagnement",
    profil.experiences.trim()
      ? `, je m'appuie sur les expériences suivantes : ${profil.experiences.trim().replace(/\.$/, "")}.`
      : ", je souhaite mettre mes compétences au service de vos missions.",
  ].join("");

  const competences = profil.competences.trim() ? `\n\nParmi mes atouts : ${profil.competences.trim().replace(/\.$/, "")}.` : "";

  const motivation = profil.motivations.trim()
    ? profil.motivations.trim()
    : `Je suis particulièrement attaché·e à ${angle.valeurs}, des valeurs que je sais au cœur de votre institution.`;

  const pratique = [
    AUTORISATION[profil.permisTravail] ?? "",
    profil.permisConduire ? `Je dispose du permis de conduire${profil.vehicule ? " et d'un véhicule" : ""}.` : "",
  ].filter(Boolean);
  const phrasePratique = pratique.length ? ` ${pratique.join(" ")}` : "";

  const annexes = ["mon CV", ...(profil.annexes?.length ? ["mes certificats de travail et diplômes"] : [])].join(" ainsi que ");

  const lettre = `${salutation(offre)}

C'est avec un vif intérêt que je vous adresse ma candidature pour le poste ${de(poste)}${taux}${reference}${ville ? `, à ${ville}` : ""}.

${paragrapheProfil}${competences}

${motivation}

Au sein de votre équipe, je souhaite ${angle.apport}.${phrasePratique}

Je me tiens volontiers à votre disposition pour un entretien afin de vous présenter plus en détail mon parcours et ma motivation. Vous trouverez en annexe ${annexes}.

Dans l'attente de votre réponse, je vous prie d'agréer, ${civilite(offre)}, mes salutations distinguées.

${nomComplet}${profil.telephone ? `\n${profil.telephone}` : ""}${profil.email ? `\n${profil.email}` : ""}`;

  return {
    objet: `Candidature – ${poste}${taux}${reference} – ${nomComplet}`,
    message: lettre,
  };
}

const salutation = (offre) => formuleAppel(offre.contactNom);
const civilite = (offre) => {
  const f = formuleAppel(offre.contactNom);
  return f.startsWith("Madame,") ? "Madame, Monsieur" : f.split(" ")[0];
};

export function redigerRelance(candidature, profil) {
  const nomComplet = [profil.prenom, profil.nom].filter(Boolean).join(" ");
  const date = new Date(candidature.envoi.at).toLocaleDateString("fr-CH");
  return {
    objet: `Suivi de ma candidature – ${nettoyerIntitule(candidature.offre.intitule)}`,
    message: `${salutation(candidature.offre)}

Le ${date}, je vous ai adressé ma candidature pour le poste ${de(nettoyerIntitule(candidature.offre.intitule))}. Je me permets de revenir vers vous afin de savoir si mon dossier a retenu votre attention.

Ce poste m'intéresse toujours vivement et je reste à votre disposition pour un entretien à votre convenance.

Je vous prie d'agréer, ${civilite(candidature.offre)}, mes salutations distinguées.

${nomComplet}${profil.telephone ? `\n${profil.telephone}` : ""}`,
  };
}

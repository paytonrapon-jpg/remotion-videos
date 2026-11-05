// Rédaction d'un brouillon de candidature (objet + message + lettre) adapté au métier.
// Le texte est toujours modifiable par l'utilisateur avant autorisation.
import { DIPLOMES, familleDe } from "./referentiel.js";

const ANGLES = {
  educatif: {
    valeurs: "la construction d'une relation éducative de confiance, le respect du projet personnalisé de chaque personne accompagnée et le travail en équipe pluridisciplinaire",
    apport: "observer, analyser les situations et proposer des actions éducatives individuelles et collectives adaptées, en lien avec les familles et les partenaires",
  },
  "petite-enfance": {
    valeurs: "la bientraitance, le respect du rythme de chaque enfant et la co-éducation avec les familles",
    apport: "concevoir des temps d'éveil, accompagner l'équipe dans la mise en œuvre du projet pédagogique et soutenir la parentalité",
  },
  social: {
    valeurs: "l'accès aux droits, l'écoute sans jugement et le respect de l'autonomie et de la dignité des personnes",
    apport: "évaluer les situations de manière globale, accompagner les démarches et mobiliser le réseau partenarial",
  },
  "medico-social": {
    valeurs: "la bientraitance, l'attention portée au confort et aux habitudes de vie de chaque personne, et le respect de son intimité",
    apport: "accompagner les gestes essentiels du quotidien tout en favorisant l'autonomie, la communication et la participation sociale",
  },
  animation: {
    valeurs: "la participation des habitants, le lien social et l'éducation populaire",
    apport: "concevoir et animer des actions collectives et accompagner les initiatives des publics",
  },
  insertion: {
    valeurs: "la conviction que chacun peut construire un parcours professionnel, et la levée progressive des freins périphériques",
    apport: "accompagner individuellement les parcours, mobiliser les entreprises du territoire et les dispositifs d'insertion",
  },
  encadrement: {
    valeurs: "la qualité de l'accompagnement, le soutien aux équipes et l'éthique de l'intervention sociale",
    apport: "animer une équipe pluridisciplinaire, garantir la mise en œuvre des projets personnalisés et piloter le travail partenarial",
  },
};

const nettoyerIntitule = (s) => s.replace(/\s*[-–]\s*(H\/F|F\/H)\s*/gi, " ").replace(/\s*\((H\/F|F\/H)\)/gi, "").replace(/\s+(H\/F|F\/H)\b/gi, "").trim();

// « de » → « d' » devant une voyelle ou un h muet.
const de = (mot) => (/^[aeiouyhéèêàâîôûAEIOUYHÉÈÊÀÂÎÔÛ]/.test(mot) ? `d'${mot}` : `de ${mot}`);

function formuleAppel(contactNom) {
  const nom = (contactNom ?? "").split(",")[0].trim();
  const m = nom.match(/^(Mme|Madame)\s+(.+)$/i) ?? nom.match(/^(M\.|Mr|Monsieur)\s+(.+)$/i);
  if (!m) return "Madame, Monsieur,";
  return /^(Mme|Madame)$/i.test(m[1]) ? `Madame ${m[2]},` : `Monsieur ${m[2]},`;
}

export function rediger(offre, profil) {
  const angle = ANGLES[familleDe(offre.rome)] ?? ANGLES.social;
  const nomComplet = [profil.prenom, profil.nom].filter(Boolean).join(" ") || "[Prénom Nom]";
  const poste = nettoyerIntitule(offre.intitule);
  const libelle = (c) => DIPLOMES.find((d) => d.code === c)?.libelle ?? c;
  const pertinents = profil.diplomes.filter((c) => (offre.diplomesCites ?? []).includes(c));
  const diplomeMis = (pertinents.length ? pertinents : profil.diplomes).map(libelle).join(" et ");

  const salutation = formuleAppel(offre.contactNom);
  const reference = offre.externalId && offre.source === "france-travail" ? ` (offre France Travail n° ${offre.externalId})` : "";

  const paragrapheProfil = [
    diplomeMis ? `Titulaire du ${diplomeMis}` : "Professionnel·le de l'accompagnement",
    profil.experiences.trim()
      ? `, je m'appuie sur les expériences suivantes : ${profil.experiences.trim().replace(/\.$/, "")}.`
      : ", je souhaite mettre mes compétences au service de vos missions.",
  ].join("");

  const competences = profil.competences.trim()
    ? `\n\nParmi mes atouts : ${profil.competences.trim().replace(/\.$/, "")}.`
    : "";

  const mobilite = profil.permis ? ` Je suis titulaire du permis B${profil.vehicule ? " et véhiculé·e" : ""}.` : "";

  const motivation = profil.motivations.trim()
    ? profil.motivations.trim()
    : `Je suis particulièrement attaché·e à ${angle.valeurs}, des valeurs que je sais au cœur de votre projet d'établissement.`;

  const lettre = `${salutation}

Je vous adresse ma candidature au poste ${de(poste)}${reference}, à ${offre.lieu.replace(/^\d+\s*-\s*/, "")}.

${paragrapheProfil}${competences}

${motivation}

Au sein de votre structure, je souhaite ${angle.apport}.${mobilite}

Je serais heureux·se de vous présenter plus en détail mon parcours et ma motivation lors d'un entretien. Vous trouverez mon CV en pièce jointe.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${nomComplet}${profil.telephone ? `\n${profil.telephone}` : ""}${profil.email ? `\n${profil.email}` : ""}`;

  return {
    objet: `Candidature – ${poste}${reference ? ` – réf. ${offre.externalId}` : ""} – ${nomComplet}`,
    message: lettre,
  };
}

export function redigerRelance(candidature, profil) {
  const nomComplet = [profil.prenom, profil.nom].filter(Boolean).join(" ");
  const date = new Date(candidature.envoi.at).toLocaleDateString("fr-FR");
  return {
    objet: `Relance – ${candidature.objet}`,
    message: `Madame, Monsieur,

Le ${date}, je vous ai adressé ma candidature au poste ${de(nettoyerIntitule(candidature.offre.intitule))}. Je me permets de revenir vers vous afin de savoir si elle a retenu votre attention.

Je reste très motivé·e par ce poste et disponible pour un entretien à votre convenance.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${nomComplet}${profil.telephone ? `\n${profil.telephone}` : ""}`,
  };
}

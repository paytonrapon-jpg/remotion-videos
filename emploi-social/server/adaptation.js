// Adaptation du CV et de la lettre à une offre précise.
//
// Avec une clé ANTHROPIC_API_KEY, Claude réécrit le titre, le profil, l'ordre des
// compétences et des missions, et rédige la lettre. Sans clé, des règles simples
// font le même travail plus sommairement. Dans les deux cas, rien n'est inventé :
// seules les informations du CV de l'utilisateur sont reprises, et le résultat
// reste un brouillon à relire et autoriser.
import Anthropic from "@anthropic-ai/sdk";
import { cvVide, normaliserCv } from "./cv.js";
import { rediger } from "./lettres.js";
import { DIPLOMES, METIERS, PERMIS_TRAVAIL } from "./referentiel.js";

const MODELE = "claude-opus-5-5";

export const iaDisponible = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client = null;
const claude = () => (client ??= new Anthropic());

/** Appel à Claude avec réponse JSON conforme au schéma. */
async function demanderJson({ systeme, contenu, schema, effort = "medium" }) {
  const reponse = await claude().beta.messages.create({
    model: MODELE,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort, format: { type: "json_schema", schema } },
    system: systeme,
    messages: [{ role: "user", content: contenu }],
  });
  if (reponse.stop_reason === "refusal") throw new Error("Claude a refusé la demande.");
  if (reponse.stop_reason === "max_tokens") throw new Error("Réponse de Claude incomplète.");
  const texte = reponse.content.find((b) => b.type === "text")?.text;
  if (!texte) throw new Error("Réponse vide de Claude.");
  return JSON.parse(texte);
}

// ---- Schémas -------------------------------------------------------------------

const S = (properties) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const str = { type: "string" };
const strs = { type: "array", items: str };

const SCHEMA_CV = S({
  titre: str,
  accroche: str,
  dateNaissance: str,
  nationalite: str,
  etatCivil: str,
  experiences: { type: "array", items: S({ poste: str, employeur: str, lieu: str, debut: str, fin: str, taux: str, missions: strs }) },
  formations: { type: "array", items: S({ titre: str, ecole: str, lieu: str, debut: str, fin: str }) },
  competences: strs,
  langues: { type: "array", items: S({ langue: str, niveau: str }) },
  informatique: str,
  interets: str,
  referencesSurDemande: { type: "boolean" },
  references: { type: "array", items: S({ nom: str, fonction: str, structure: str, telephone: str, email: str }) },
  identite: S({ prenom: str, nom: str, email: str, telephone: str, adresse: str, npa: str, ville: str }),
});

const SCHEMA_ADAPTATION = S({
  titre: str,
  accroche: str,
  competences: strs,
  experiences: { type: "array", items: S({ index: { type: "integer" }, missions: strs }) },
  objet: str,
  lettre: str,
  changements: strs,
  pointsAttention: strs,
});

// ---- Import de CV par Claude ------------------------------------------------------

export async function structurerCvIa(texte) {
  const r = await demanderJson({
    systeme:
      "Tu convertis le texte brut d'un CV en données structurées pour un CV au format suisse. Reprends uniquement ce qui figure dans le texte, sans rien inventer ni reformuler les faits ; laisse vide ce qui manque. Dates au format MM.AAAA ou AAAA ; poste en cours : fin = « aujourd'hui ». Missions : une puce par élément. Niveaux de langue : CECR (A1 à C2) ou « Langue maternelle » quand c'est indiqué. Taux d'activité sous la forme « 80 % ».",
    contenu: `Texte du CV :\n\n${texte.slice(0, 60000)}`,
    schema: SCHEMA_CV,
    effort: "low",
  });
  const { identite, ...cv } = r;
  cv.experiences = cv.experiences.map((e) => ({ ...e, missions: e.missions.join("\n") }));
  return { cv: normaliserCv(cv), identite };
}

// ---- Adaptation à une offre ----------------------------------------------------------

const mots = (s) =>
  new Set(
    String(s ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((m) => m.length > 3 && !VIDES.has(m)),
  );
const VIDES = new Set(["avec", "pour", "dans", "vous", "nous", "votre", "notre", "leurs", "sont", "etre", "avoir", "plus", "tres", "cette", "ainsi", "tout", "tous", "toute", "toutes", "entre", "selon", "lors", "afin", "chez", "aussi", "dont", "elle", "elles", "ils", "mais", "comme", "sous", "depuis", "poste", "travail", "equipe"]);

const pertinence = (texte, motsOffre) => [...mots(texte)].filter((m) => motsOffre.has(m)).length;

/** Adaptation sans IA : réordonne selon les mots de l'annonce, titre et profil ciblés. */
function adapterParRegles(offre, profil, cv) {
  const motsOffre = mots(`${offre.intitule} ${offre.description}`);
  const metier = METIERS.find((m) => m.id === offre.metier);
  const poste = offre.intitule.replace(/\s*\(?\b(H\/F(\/D)?|F\/H|m\/w(\/d)?)\b\)?/gi, "").replace(/\s*(à|a)?\s*\d{2,3}\s*(-|–|à)?\s*(\d{2,3})?\s*%/g, "").trim();
  const competences = [...cv.competences].sort((a, b) => pertinence(b, motsOffre) - pertinence(a, motsOffre));
  const experiences = cv.experiences.map((e) => ({
    ...e,
    missions: e.missions
      .split(/\n+/)
      .filter(Boolean)
      .sort((a, b) => pertinence(b, motsOffre) - pertinence(a, motsOffre))
      .join("\n"),
  }));
  const diplome = profil.diplomes.map((c) => DIPLOMES.find((d) => d.code === c)?.libelle).filter(Boolean)[0];
  const annees = cv.experiences.length ? anneesExperience(cv.experiences) : 0;
  const accroche =
    cv.accroche ||
    `${diplome ? `${diplome}, ` : ""}${annees ? `fort·e de ${annees} an${annees > 1 ? "s" : ""} d'expérience dans l'accompagnement, ` : ""}je souhaite mettre mes compétences au service de ${offre.employeur} en tant que ${poste.toLowerCase()}.`;
  const lettre = rediger(offre, profil);
  const misesEnAvant = competences.filter((c) => pertinence(c, motsOffre) > 0).slice(0, 3);
  return {
    cv: { ...cv, titre: poste || metier?.libelle || cv.titre, accroche, competences, experiences },
    objet: lettre.objet,
    message: lettre.message,
    changements: [
      `Titre du CV : « ${poste} »`,
      misesEnAvant.length ? `Compétences mises en avant : ${misesEnAvant.join(", ")}` : "Compétences : ordre inchangé (peu de mots communs avec l'annonce)",
      "Missions réordonnées selon les mots-clés de l'annonce",
    ],
    pointsAttention: [],
    mode: "regles",
  };
}

function anneesExperience(experiences) {
  const an = (s) => Number(String(s).match(/\d{4}/)?.[0]) || null;
  const debuts = experiences.map((e) => an(e.debut)).filter(Boolean);
  if (!debuts.length) return 0;
  return Math.max(0, new Date().getFullYear() - Math.min(...debuts));
}

/** Adaptation par Claude : contenu ciblé sur l'offre, sans invention. */
async function adapterParIa(offre, profil, cv) {
  const permis = PERMIS_TRAVAIL.find((p) => p.code === profil.permisTravail)?.libelle ?? "";
  const diplomes = profil.diplomes.map((c) => DIPLOMES.find((d) => d.code === c)?.libelle ?? c);
  const r = await demanderJson({
    systeme: `Tu aides une personne du secteur social en Suisse romande à postuler. Tu adaptes son CV et rédiges sa lettre de motivation pour une offre précise.

Règles impératives :
- N'invente rien : aucun diplôme, employeur, expérience, compétence, chiffre ou date absent du CV ou du profil. Tu peux reformuler, sélectionner, réordonner et mettre en valeur ce qui existe.
- Si l'offre exige quelque chose que la personne n'a pas (diplôme, langue, permis), ne le prétends pas : signale-le dans « pointsAttention ».
- Français de Suisse, ton professionnel et chaleureux, écriture inclusive avec le point médian seulement si le profil l'utilise déjà ; sinon reste neutre.
- titre : intitulé de CV ciblé sur le poste (court).
- accroche : profil de 2 à 4 phrases ciblé sur l'offre.
- competences : les compétences du CV, réordonnées (les plus pertinentes d'abord), reformulées au plus près du vocabulaire de l'annonce sans en ajouter.
- experiences : pour chaque expérience du CV (index à partir de 0), ses missions réordonnées et éventuellement reformulées, en gardant le même sens.
- objet : objet de l'e-mail de candidature.
- lettre : lettre de motivation complète au format suisse (formule d'appel, 3 à 4 paragraphes : intérêt pour la structure et le poste, adéquation du parcours avec les exigences, apport concret, disponibilité et demande d'entretien ; formule de politesse « Je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées. » ; signature avec nom, téléphone et e-mail). Utilise le nom du contact s'il est connu. Mentionne le taux et la référence si connus. Pas de date ni d'adresse en tête (elles sont ajoutées à la mise en page).
- changements : liste courte de ce que tu as adapté dans le CV.
- pointsAttention : écarts entre l'offre et le profil, à vérifier par la personne.`,
    contenu: JSON.stringify(
      {
        offre: {
          intitule: offre.intitule, employeur: offre.employeur, lieu: offre.lieu, taux: offre.taux, contrat: offre.contratLibelle,
          reference: offre.reference, contact: offre.contactNom, description: offre.description.slice(0, 15000),
        },
        profil: {
          prenom: profil.prenom, nom: profil.nom, telephone: profil.telephone, email: profil.email, ville: profil.ville,
          diplomes, permisTravail: permis, permisConduire: profil.permisConduire, vehicule: profil.vehicule,
          tauxSouhaite: `${profil.tauxMin}–${profil.tauxMax} %`, experiencesResumees: profil.experiences, competences: profil.competences, motivations: profil.motivations,
        },
        cv: { ...cv, photo: undefined },
      },
      null,
      1,
    ),
    schema: SCHEMA_ADAPTATION,
    effort: "medium",
  });
  const experiences = cv.experiences.map((e, i) => {
    const a = r.experiences.find((x) => x.index === i);
    return a?.missions?.length ? { ...e, missions: a.missions.join("\n") } : e;
  });
  return {
    cv: { ...cv, titre: r.titre || cv.titre, accroche: r.accroche || cv.accroche, competences: r.competences.length ? r.competences : cv.competences, experiences },
    objet: r.objet,
    message: r.lettre,
    changements: r.changements,
    pointsAttention: r.pointsAttention,
    mode: "ia",
  };
}

/**
 * Adapte CV + lettre à l'offre. Bascule sur les règles si Claude n'est pas
 * configuré ou ne répond pas (le message d'erreur est alors renvoyé).
 */
export async function adapter(offre, profil, cv = cvVide()) {
  if (!iaDisponible()) return adapterParRegles(offre, profil, cv);
  try {
    return await adapterParIa(offre, profil, cv);
  } catch (e) {
    const r = adapterParRegles(offre, profil, cv);
    r.pointsAttention.unshift(`Adaptation par Claude indisponible (${e.message}) : version simplifiée utilisée.`);
    return r;
  }
}

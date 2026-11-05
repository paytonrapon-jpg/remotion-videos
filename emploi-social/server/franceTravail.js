// Client de l'API officielle « Offres d'emploi v2 » de France Travail.
// Identifiants gratuits sur https://francetravail.io (application > API Offres d'emploi).
import { DEMO_OFFRES } from "./demoOffres.js";
import { diplomesCites, METIERS } from "./referentiel.js";

const TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";
const SCOPE = "api_offresdemploiv2 o2dsoffre";

let token = null; // { value, expiresAt }

export const apiConfiguree = () =>
  Boolean(process.env.FRANCE_TRAVAIL_CLIENT_ID && process.env.FRANCE_TRAVAIL_CLIENT_SECRET);

async function getToken() {
  if (token && token.expiresAt > Date.now() + 30_000) return token.value;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.FRANCE_TRAVAIL_CLIENT_ID,
      client_secret: process.env.FRANCE_TRAVAIL_CLIENT_SECRET,
      scope: SCOPE,
    }),
  });
  if (!res.ok) throw new Error(`Authentification France Travail refusée (${res.status}). Vérifiez vos identifiants.`);
  const json = await res.json();
  token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return token.value;
}

/** Convertit une offre France Travail dans le format de l'application. */
export function depuisFranceTravail(o) {
  const texte = [o.intitule, o.description, ...(o.formations ?? []).map((f) => `${f.domaineLibelle ?? ""} ${f.commentaire ?? ""}`)].join(" ");
  const departement = o.lieuTravail?.libelle?.match(/^(\d{2,3}|2[AB])\s*-/)?.[1] ?? o.lieuTravail?.codePostal?.slice(0, 2) ?? "";
  return {
    source: "france-travail",
    externalId: o.id,
    intitule: o.intitule,
    employeur: o.entreprise?.nom ?? "Employeur non communiqué",
    lieu: o.lieuTravail?.libelle ?? "",
    departement,
    latitude: o.lieuTravail?.latitude ?? null,
    longitude: o.lieuTravail?.longitude ?? null,
    contrat: o.typeContrat ?? "",
    contratLibelle: o.typeContratLibelle ?? o.typeContrat ?? "",
    dureeTravail: o.dureeTravailLibelle ?? "",
    salaire: o.salaire?.libelle ?? "",
    experience: o.experienceLibelle ?? "",
    description: o.description ?? "",
    rome: o.romeCode ?? "",
    romeLibelle: o.romeLibelle ?? "",
    diplomesCites: diplomesCites(texte),
    contactNom: o.contact?.nom ?? "",
    contactEmail: o.contact?.courriel ?? "",
    urlCandidature: o.contact?.urlPostulation ?? o.origineOffre?.urlOrigine ?? `https://candidat.francetravail.fr/offres/recherche/detail/${o.id}`,
    datePublication: o.dateCreation ?? null,
  };
}

/**
 * Recherche d'offres. Sans identifiants, renvoie des offres d'exemple filtrées
 * pour que l'application reste utilisable immédiatement.
 */
export async function rechercher({ metiers = [], departement = "", motsCles = "", contrats = [], page = 0 }) {
  const romes = metiers.length ? metiers : METIERS.map((m) => m.rome);

  if (!apiConfiguree()) {
    const mc = motsCles.toLowerCase();
    const resultats = DEMO_OFFRES.filter(
      (o) =>
        romes.includes(o.rome) &&
        (!departement || o.departement === departement) &&
        (!contrats.length || contrats.includes(o.contrat)) &&
        (!mc || `${o.intitule} ${o.description} ${o.employeur}`.toLowerCase().includes(mc)),
    );
    return { mode: "demo", total: resultats.length, resultats };
  }

  const params = new URLSearchParams();
  // L'API accepte au plus 3 codes ROME par requête : on interroge par lots.
  const lots = [];
  for (let i = 0; i < romes.length; i += 3) lots.push(romes.slice(i, i + 3));
  const parPage = 50;
  const range = `${page * parPage}-${page * parPage + parPage - 1}`;
  if (departement) params.set("departement", departement);
  if (motsCles) params.set("motsCles", motsCles);
  if (contrats.length) params.set("typeContrat", contrats.join(","));
  params.set("range", range);
  params.set("sort", "1"); // tri par date de création

  const jeton = await getToken();
  const reponses = await Promise.all(
    lots.map(async (lot) => {
      const p = new URLSearchParams(params);
      p.set("codeROME", lot.join(","));
      const res = await fetch(`${SEARCH_URL}?${p}`, {
        headers: { Authorization: `Bearer ${jeton}`, Accept: "application/json" },
      });
      if (res.status === 204) return { resultats: [], total: 0 };
      if (!res.ok) throw new Error(`France Travail a répondu ${res.status} : ${(await res.text()).slice(0, 200)}`);
      const json = await res.json();
      const total = Number(res.headers.get("content-range")?.split("/")[1]) || json.resultats?.length || 0;
      return { resultats: json.resultats ?? [], total };
    }),
  );

  const vus = new Set();
  const resultats = reponses
    .flatMap((r) => r.resultats)
    .filter((o) => !vus.has(o.id) && vus.add(o.id))
    .map(depuisFranceTravail)
    .sort((a, b) => (b.datePublication ?? "").localeCompare(a.datePublication ?? ""));
  return { mode: "api", total: reponses.reduce((s, r) => s + r.total, 0), resultats };
}

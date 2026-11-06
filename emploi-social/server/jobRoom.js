// Offres d'emploi suisses via job-room.ch, la bourse de l'emploi publique de la
// Confédération (SECO / Service public de l'emploi). Aucune clé n'est nécessaire.
// Il s'agit de l'interface de recherche utilisée par le site lui-même : elle n'est
// pas documentée officiellement et pourrait changer.
import { DEMO_OFFRES } from "./demoOffres.js";
import { CANTONS, diplomesCites, METIERS, metierDuTitre } from "./referentiel.js";

const SEARCH_URL = "https://www.job-room.ch/jobadservice/api/jobAdvertisements/_search";
const PAR_PAGE = 100;

export const modeDemo = () => process.env.OFFRES_DEMO === "1";

const sansBalises = (s) =>
  (s ?? "")
    .replace(/<\/?em>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

/** Nettoie la description (Markdown converti depuis le HTML des annonces). */
function nettoyerDescription(s) {
  return sansBalises(s)
    .replace(/^---[\s\S]*?---\s*/, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\\([-.()*_#!+[\]])/g, "$1")
    .replace(/^[=\-]{3,}\s*$/gm, "")
    .replace(/\*\*|__/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// La langue déclarée par les annonceurs est souvent fausse : on la déduit du texte.
const MOTS = {
  fr: /\b(le|la|les|des|et|vous|nous|une|pour|avec|dans)\b/gi,
  de: /\b(der|die|das|und|sie|wir|mit|für|ein|eine|ist)\b/gi,
  it: /\b(il|gli|della|con|per|una|siamo|nostro)\b/gi,
};
function detecterLangue(texte, declaree) {
  const scores = Object.entries(MOTS).map(([l, re]) => [l, (texte.match(re) ?? []).length]);
  const [meilleure, n] = scores.sort((a, b) => b[1] - a[1])[0];
  return n >= 3 ? meilleure : declaree;
}

const url = (u) => (!u ? "" : /^https?:\/\//i.test(u) ? u : `https://${u}`);

const taux = (min, max) => {
  const a = Number(min) || 0;
  const b = Number(max) || a;
  return a && b && a !== b ? `${a}–${b} %` : b ? `${b} %` : "";
};

/** Convertit une annonce job-room dans le format de l'application. */
export function depuisJobRoom(item) {
  const ad = item.jobAdvertisement;
  const c = ad.jobContent;
  const desc = c.jobDescriptions.find((d) => d.languageIsoCode === "fr") ?? c.jobDescriptions[0] ?? {};
  const intitule = sansBalises(desc.title).replace(/\s+/g, " ").trim();
  const description = nettoyerDescription(desc.description);
  const loc = c.location ?? {};
  const emp = c.employment ?? {};
  const contact = c.publicContact ?? {};
  const apply = c.applyChannel ?? {};
  const nomContact = [contact.salutation === "MRS" ? "Mme" : contact.salutation === "MR" ? "M." : "", contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");
  return {
    source: "job-room",
    externalId: ad.id,
    reference: ad.stellennummerEgov ?? "",
    intitule,
    employeur: sansBalises(c.company?.name) || "Employeur non communiqué",
    lieu: [loc.postalCode, loc.city].filter(Boolean).join(" "),
    canton: loc.cantonCode ?? "",
    contrat: emp.permanent ? "indetermine" : "determine",
    contratLibelle: emp.permanent ? "Durée indéterminée" : emp.shortEmployment ? "Mission de courte durée" : "Durée déterminée",
    tauxMin: Number(emp.workloadPercentageMin) || null,
    tauxMax: Number(emp.workloadPercentageMax) || null,
    taux: taux(emp.workloadPercentageMin, emp.workloadPercentageMax),
    entree: emp.immediately ? "Dès que possible" : emp.startDate ? new Date(emp.startDate).toLocaleDateString("fr-CH") : "",
    langue: detecterLangue(`${intitule} ${description}`, desc.languageIsoCode ?? ""),
    description,
    metier: metierDuTitre(intitule),
    diplomesCites: diplomesCites(`${intitule} ${description}`),
    contactNom: nomContact,
    contactEmail: apply.emailAddress || contact.email || "",
    contactTelephone: apply.phoneNumber || contact.phone || "",
    urlCandidature: url(apply.formUrl) || url(c.externalUrl) || `https://www.job-room.ch/job-search/${ad.id}`,
    urlAnnonce: `https://www.job-room.ch/job-search/${ad.id}`,
    datePublication: ad.publication?.startDate ? `${ad.publication.startDate}T00:00:00Z` : ad.createdTime,
  };
}

/** Une même annonce est souvent publiée plusieurs fois (langues, plateformes). */
function dedoublonner(offres) {
  const vus = new Map();
  for (const o of offres) {
    const cle = `${o.employeur}|${o.intitule}`.toLowerCase().normalize("NFD").replace(/[^a-z0-9|]/g, "");
    const deja = vus.get(cle);
    if (!deja || (deja.langue !== "fr" && o.langue === "fr")) vus.set(cle, o);
  }
  return [...vus.values()];
}

/**
 * Recherche d'offres en Suisse.
 * @param {{ metiers?: string[], cantons?: string[], motsCles?: string, contrat?: string,
 *           tauxMin?: number, tauxMax?: number, depuisJours?: number, page?: number,
 *           titreStrict?: boolean }} criteres
 */
export async function rechercher({ metiers = [], cantons = [], motsCles = "", contrat = "", tauxMin = 0, tauxMax = 100, depuisJours = 30, page = 0, titreStrict = true }) {
  const choisis = metiers.length ? METIERS.filter((m) => metiers.includes(m.id)) : METIERS;
  const motsLibres = motsCles.split(",").map((s) => s.trim()).filter(Boolean);

  if (modeDemo()) {
    const mc = motsCles.toLowerCase();
    const resultats = DEMO_OFFRES.filter(
      (o) =>
        choisis.some((m) => m.id === o.metier) &&
        (!cantons.length || cantons.includes(o.canton)) &&
        (!contrat || o.contrat === contrat) &&
        (o.tauxMax ?? 100) >= tauxMin && (o.tauxMin ?? 0) <= tauxMax &&
        (!mc || `${o.intitule} ${o.description} ${o.employeur}`.toLowerCase().includes(mc)),
    );
    return { mode: "demo", total: resultats.length, ecartees: 0, resultats };
  }

  const corps = {
    workloadPercentageMin: tauxMin,
    workloadPercentageMax: tauxMax,
    permanent: contrat === "indetermine" ? true : contrat === "determine" ? false : null,
    onlineSince: depuisJours,
    displayRestricted: false,
    // Les mots-clés se cumulent en OU. Des mots-clés libres remplacent ceux des métiers.
    keywords: motsLibres.length ? motsLibres : choisis.flatMap((m) => m.recherche),
    cantonCodes: cantons.filter((c) => CANTONS.some((x) => x.code === c)),
    communalCodes: [],
    professionCodes: [],
  };

  const res = await fetch(`${SEARCH_URL}?page=${page}&size=${PAR_PAGE}&sort=date_desc`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Language": "fr" },
    body: JSON.stringify(corps),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`job-room.ch a répondu ${res.status}. Réessayez dans un instant.`);
  const brut = await res.json();
  const total = Number(res.headers.get("x-total-count")) || brut.length;

  let resultats = dedoublonner(brut.map(depuisJobRoom));
  const avant = resultats.length;
  // Les mots-clés trouvent aussi des postes voisins (soins, administration…) : on ne garde
  // que les intitulés qui correspondent aux métiers choisis, sauf recherche libre.
  if (titreStrict && !motsLibres.length) {
    resultats = resultats.filter((o) => choisis.some((m) => m.titre.test(o.intitule)));
  }
  return {
    mode: "job-room",
    total,
    ecartees: avant - resultats.length,
    pageSuivante: (page + 1) * PAR_PAGE < total ? page + 1 : null,
    resultats,
  };
}

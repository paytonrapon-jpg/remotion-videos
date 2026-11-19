// Lecture d'une offre d'emploi à partir de son lien (jobup.ch, jobs.ch, job-room.ch,
// sites d'employeurs…) ou d'un texte collé.
import { geocoder } from "./geo.js";
import { depuisJobRoom } from "./jobRoom.js";
import { diplomesCites, metierDuTitre } from "./referentiel.js";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const ENTITES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", ecirc: "ê", ocirc: "ô", ucirc: "û" };
const decoder = (s) =>
  String(s ?? "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITES[n.toLowerCase()] ?? m);

/** HTML → texte lisible (paragraphes et listes conservés). */
export function htmlEnTexte(html) {
  return decoder(
    String(html ?? "")
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, "")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<(br|\/p|\/div|\/h\d|\/li|\/ul|\/ol|\/tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function jsonLdJobPosting(html) {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let d;
    try {
      d = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const candidats = [d, ...(Array.isArray(d) ? d : []), ...(d?.["@graph"] ?? [])];
    const jp = candidats.find((x) => x && (x["@type"] === "JobPosting" || (Array.isArray(x["@type"]) && x["@type"].includes("JobPosting"))));
    if (jp) return jp;
  }
  return null;
}

const meta = (html, nom) =>
  decoder(html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${nom}["'][^>]+content=["']([^"']*)["']`, "i"))?.[1] ?? "");

const taux = (texte) => {
  const m = texte.match(/(\d{2,3})\s*(?:%|-|–|à)\s*(?:(\d{2,3})\s*%)?/);
  if (!m || !/%/.test(m[0])) return { taux: "", tauxMin: null, tauxMax: null };
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  return { taux: a === b ? `${a} %` : `${a}–${b} %`, tauxMin: a, tauxMax: b };
};

/** « 25.2 - 42 hours/week » → 60–100 % (semaine de 42 h). */
function tauxDepuisHeures(heures, titre) {
  if (/%/.test(titre ?? "")) return {};
  const n = String(heures ?? "").match(/(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?/);
  if (!n) return {};
  const pct = (h) => Math.min(100, Math.round((Number(h.replace(",", ".")) / 42) * 10) * 10);
  const a = pct(n[1]);
  const b = n[2] ? pct(n[2]) : a;
  return a ? { taux: a === b ? `${a} %` : `${a}–${b} %`, tauxMin: a, tauxMax: b } : {};
}

async function completer(offre) {
  const npa = offre.lieu.match(/\b(\d{4})\b/)?.[1];
  const ville = offre.lieu.replace(/\b\d{4}\b/, "").trim();
  const coords = npa || ville ? await geocoder(npa, ville) : null;
  const texte = `${offre.intitule} ${offre.description}`;
  return {
    reference: "",
    contrat: /indétermin|permanent|cdi|unbefrist/i.test(offre.contratLibelle) ? "indetermine" : offre.contratLibelle ? "determine" : "",
    entree: "",
    langue: /\b(und|wir|sie|der|die)\b/i.test(offre.description.slice(0, 600)) && !/\b(nous|vous|les)\b/i.test(offre.description.slice(0, 600)) ? "de" : "fr",
    contactNom: "",
    contactTelephone: "",
    urlAnnonce: "",
    datePublication: null,
    ...taux(offre.intitule),
    ...offre,
    canton: offre.canton || coords?.canton || "",
    lat: offre.lat ?? coords?.lat ?? null,
    lon: offre.lon ?? coords?.lon ?? null,
    metier: offre.metier || metierDuTitre(offre.intitule),
    diplomesCites: diplomesCites(texte),
    contactEmail: offre.contactEmail || (offre.description.match(/[\w.+-]+@[\w-]+\.[\w.-]+[a-z]/i)?.[0] ?? ""),
  };
}

/**
 * Lit une annonce depuis un lien.
 * @returns {Promise<object>} offre au format de l'application (source "lien")
 */
export async function lireAnnonce(url) {
  let u;
  try {
    u = new URL(url.trim());
  } catch {
    throw new Error("Lien invalide : copiez l'adresse complète de l'annonce (https://…).");
  }
  if (!/^https?:$/.test(u.protocol)) throw new Error("Seuls les liens http(s) sont acceptés.");

  // job-room.ch : interface de la bourse de l'emploi, plus fiable que la page.
  const idJobRoom = u.hostname.endsWith("job-room.ch") && u.pathname.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0];
  if (idJobRoom) {
    const res = await fetch(`https://www.job-room.ch/jobadservice/api/jobAdvertisements/${idJobRoom}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Annonce job-room.ch introuvable (${res.status}).`);
    return { ...depuisJobRoom({ jobAdvertisement: await res.json() }), source: "lien", urlAnnonce: u.href };
  }

  const res = await fetch(u.href, { headers: { "User-Agent": UA, "Accept-Language": "fr-CH,fr;q=0.9,de;q=0.6", Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Le site a refusé la lecture de l'annonce (${res.status}). Collez plutôt le texte de l'annonce.`);
  const html = (await res.text()).slice(0, 3_000_000);
  const jp = jsonLdJobPosting(html);

  if (jp) {
    const adr = [jp.jobLocation].flat()[0]?.address ?? {};
    const lieu = [adr.postalCode, adr.addressLocality || adr.addressRegion].filter(Boolean).join(" ").trim();
    const org = jp.hiringOrganization ?? {};
    return completer({
      source: "lien",
      externalId: `lien-${u.hostname}${u.pathname}`.slice(0, 200),
      intitule: decoder(jp.title).trim(),
      employeur: decoder(typeof org === "string" ? org : org.name) || "Employeur non communiqué",
      lieu,
      contratLibelle: [jp.employmentType].flat().join(", "),
      ...tauxDepuisHeures(jp.workHours, jp.title),
      description: htmlEnTexte(jp.description),
      urlCandidature: u.href,
      urlAnnonce: u.href,
      siteEmployeur: org.sameAs ?? "",
      datePublication: jp.datePosted ?? null,
    });
  }

  // Sans données structurées : titre de la page et texte principal.
  const titre = meta(html, "og:title") || decoder(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "");
  const corps = htmlEnTexte(html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html);
  if (corps.length < 200) throw new Error("Impossible de lire cette page (contenu chargé par le navigateur). Collez le texte de l'annonce.");
  return completer({
    source: "lien",
    externalId: `lien-${u.hostname}${u.pathname}`.slice(0, 200),
    intitule: titre.split(/\s[-|–]\s/)[0].trim() || "Offre d'emploi",
    employeur: meta(html, "og:site_name") || u.hostname.replace(/^www\./, ""),
    lieu: "",
    contratLibelle: "",
    description: corps.slice(0, 12000),
    urlCandidature: u.href,
    urlAnnonce: u.href,
  });
}

/** Offre à partir d'un texte d'annonce collé. */
export function annonceDepuisTexte(texte, { intitule = "", employeur = "", lieu = "", url = "" } = {}) {
  const lignes = texte.split(/\n/).map((l) => l.trim()).filter(Boolean);
  return completer({
    source: "lien",
    externalId: `texte-${Date.now()}`,
    intitule: intitule || lignes[0]?.slice(0, 150) || "Offre d'emploi",
    employeur: employeur || "Employeur à préciser",
    lieu,
    contratLibelle: "",
    description: texte.slice(0, 12000),
    urlCandidature: url,
    urlAnnonce: url,
  });
}

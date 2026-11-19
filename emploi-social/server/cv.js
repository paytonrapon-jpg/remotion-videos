// CV au format suisse : modèle de données, génération PDF (A4) et import depuis un fichier.
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { PERMIS_TRAVAIL } from "./referentiel.js";
import { UPLOAD_DIR } from "./store.js";

export const cvVide = () => ({
  titre: "",
  accroche: "",
  dateNaissance: "",
  nationalite: "",
  etatCivil: "",
  photo: null,
  experiences: [],
  formations: [],
  competences: [],
  langues: [{ langue: "Français", niveau: "Langue maternelle" }],
  informatique: "",
  interets: "",
  referencesSurDemande: true,
  references: [],
});

const txt = (v, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
const liste = (v, f, max = 30) => (Array.isArray(v) ? v.slice(0, max).map(f) : []);

/** Nettoie un CV reçu du navigateur ou d'un import. */
export function normaliserCv(b = {}, photoActuelle = null) {
  const base = cvVide();
  return {
    titre: txt(b.titre, 200),
    accroche: txt(b.accroche, 1500),
    dateNaissance: txt(b.dateNaissance, 40),
    nationalite: txt(b.nationalite, 80),
    etatCivil: txt(b.etatCivil, 80),
    photo: photoActuelle,
    experiences: liste(b.experiences, (e) => ({
      poste: txt(e?.poste, 200), employeur: txt(e?.employeur, 200), lieu: txt(e?.lieu, 120),
      debut: txt(e?.debut, 30), fin: txt(e?.fin, 30), taux: txt(e?.taux, 30), missions: txt(e?.missions, 3000),
    })),
    formations: liste(b.formations, (f) => ({
      titre: txt(f?.titre, 250), ecole: txt(f?.ecole, 200), lieu: txt(f?.lieu, 120), debut: txt(f?.debut, 30), fin: txt(f?.fin, 30),
    })),
    competences: liste(b.competences, (c) => txt(c, 200)).filter(Boolean),
    langues: Array.isArray(b.langues) ? liste(b.langues, (l) => ({ langue: txt(l?.langue, 60), niveau: txt(l?.niveau, 60) })).filter((l) => l.langue) : base.langues,
    informatique: txt(b.informatique, 500),
    interets: txt(b.interets, 500),
    referencesSurDemande: b.referencesSurDemande !== false,
    references: liste(b.references, (r) => ({
      nom: txt(r?.nom, 120), fonction: txt(r?.fonction, 160), structure: txt(r?.structure, 160), telephone: txt(r?.telephone, 40), email: txt(r?.email, 160),
    }), 6),
  };
}

// ---- PDF --------------------------------------------------------------------

// Les polices standard du PDF ne couvrent que l'alphabet latin occidental.
const pdfTexte = (s) =>
  String(s ?? "")
    .replace(/[‐-‒]/g, "-")
    .replace(/[•●▪]/g, "•")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFFŒœŠšŸŽž–—‘’‚“”„†‡…‰€™]/g, "");

const ACCENT = "#0f6e6a";
const GRIS = "#555555";

/**
 * Génère le PDF du CV (format suisse : données personnelles, photo facultative,
 * expériences antichronologiques avec taux, formations, langues avec niveau).
 * @returns {Promise<Buffer>}
 */
export function genererPdf(cv, profil) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 48, bottom: 48, left: 54, right: 54 }, info: { Title: `CV ${profil.prenom} ${profil.nom}`, Author: `${profil.prenom} ${profil.nom}` } });
    const morceaux = [];
    doc.on("data", (c) => morceaux.push(c));
    doc.on("end", () => resolve(Buffer.concat(morceaux)));
    doc.on("error", reject);

    const largeur = doc.page.width - 108;
    const colDates = 110;
    const x0 = 54;
    const t = (s) => pdfTexte(s);

    // En-tête : nom, titre, coordonnées, photo à droite.
    const photo = cv.photo ? path.join(UPLOAD_DIR, cv.photo.fichier) : null;
    const avecPhoto = photo && fs.existsSync(photo);
    const largeurTete = avecPhoto ? largeur - 110 : largeur;
    if (avecPhoto) {
      try {
        doc.image(photo, x0 + largeur - 92, 44, { fit: [92, 118], align: "right" });
      } catch {
        // Image illisible : on l'ignore.
      }
    }
    doc.font("Helvetica-Bold").fontSize(22).fillColor("#111").text(t(`${profil.prenom} ${profil.nom}`), x0, 50, { width: largeurTete });
    if (cv.titre) doc.font("Helvetica").fontSize(12.5).fillColor(ACCENT).text(t(cv.titre), { width: largeurTete });
    doc.moveDown(0.5).font("Helvetica").fontSize(9.5).fillColor(GRIS);
    const adresse = [profil.adresse, [profil.npa, profil.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    for (const ligne of [adresse, [profil.telephone, profil.email].filter(Boolean).join("   ·   ")]) if (ligne) doc.text(t(ligne), { width: largeurTete });

    // Données personnelles (usage suisse).
    const permis = PERMIS_TRAVAIL.find((p) => p.code === profil.permisTravail);
    const perso = [
      cv.dateNaissance && ["Date de naissance", cv.dateNaissance],
      cv.nationalite && ["Nationalité", cv.nationalite],
      permis && profil.permisTravail !== "CH" && ["Permis de séjour", permis.libelle],
      cv.etatCivil && ["État civil", cv.etatCivil],
      profil.permisConduire && ["Permis de conduire", `Oui${profil.vehicule ? ", véhicule" : ""}`],
    ].filter(Boolean);
    doc.y = Math.max(doc.y, avecPhoto ? 170 : doc.y) + 8;

    const titreSection = (titre) => {
      if (doc.y > doc.page.height - 120) doc.addPage();
      doc.moveDown(0.8);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(ACCENT).text(t(titre.toUpperCase()), x0, doc.y, { characterSpacing: 0.6 });
      const y = doc.y + 2;
      doc.moveTo(x0, y).lineTo(x0 + largeur, y).lineWidth(0.6).strokeColor(ACCENT).stroke();
      doc.y = y + 6;
      doc.fillColor("#111");
    };

    // Puce dessinée (le caractère « • » n'existe pas dans les polices standard du PDF).
    const puce = (texte, x) => {
      const y = doc.y + 1;
      doc.circle(x + 3, y + 5, 1.3).fillColor(ACCENT).fill();
      doc.fillColor("#222").text(t(texte), x + 10, y, { width: x0 + largeur - x - 10 });
    };

    const ligneDatee = (date, titre, sousTitre, corps) => {
      if (doc.y > doc.page.height - 100) doc.addPage();
      const y = doc.y;
      doc.font("Helvetica").fontSize(9.5).fillColor(GRIS).text(t(date), x0, y, { width: colDates - 10 });
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#111").text(t(titre), x0 + colDates, y, { width: largeur - colDates });
      if (sousTitre) doc.font("Helvetica-Oblique").fontSize(9.5).fillColor(GRIS).text(t(sousTitre), x0 + colDates, doc.y, { width: largeur - colDates });
      if (corps?.length) {
        doc.font("Helvetica").fontSize(9.5).fillColor("#222");
        for (const m of corps) puce(m, x0 + colDates);
      }
      doc.y += 7;
    };

    if (perso.length) {
      titreSection("Données personnelles");
      doc.fontSize(9.5);
      for (const [k, v] of perso) {
        const y = doc.y;
        doc.font("Helvetica").fillColor(GRIS).text(t(k), x0, y, { width: colDates - 10 });
        doc.font("Helvetica").fillColor("#111").text(t(v), x0 + colDates, y, { width: largeur - colDates });
      }
    }

    if (cv.accroche) {
      titreSection("Profil");
      doc.font("Helvetica").fontSize(10).fillColor("#222").text(t(cv.accroche), x0, doc.y, { width: largeur, align: "justify" });
    }

    if (cv.experiences.length) {
      titreSection("Expérience professionnelle");
      for (const e of cv.experiences) {
        const date = periode(e.debut, e.fin);
        const sous = [e.employeur, e.lieu, e.taux && (/%/.test(e.taux) ? e.taux : `${e.taux} %`)].filter(Boolean).join(", ");
        ligneDatee(date, e.poste, sous, missions(e.missions));
      }
    }

    if (cv.formations.length) {
      titreSection("Formation");
      for (const f of cv.formations) ligneDatee(periode(f.debut, f.fin), f.titre, [f.ecole, f.lieu].filter(Boolean).join(", "), []);
    }

    if (cv.competences.length) {
      titreSection("Compétences");
      doc.font("Helvetica").fontSize(9.5).fillColor("#222");
      for (const c of cv.competences) puce(c, x0);
    }

    if (cv.langues.length) {
      titreSection("Langues");
      for (const l of cv.langues) {
        const y = doc.y;
        doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#111").text(t(l.langue), x0, y, { width: colDates - 10 });
        doc.font("Helvetica").fillColor("#222").text(t(l.niveau), x0 + colDates, y, { width: largeur - colDates });
      }
    }

    if (cv.informatique) {
      titreSection("Informatique");
      doc.font("Helvetica").fontSize(9.5).fillColor("#222").text(t(cv.informatique), x0, doc.y, { width: largeur });
    }
    if (cv.interets) {
      titreSection("Centres d'intérêt");
      doc.font("Helvetica").fontSize(9.5).fillColor("#222").text(t(cv.interets), x0, doc.y, { width: largeur });
    }

    titreSection("Références");
    if (cv.referencesSurDemande || !cv.references.length) {
      doc.font("Helvetica").fontSize(9.5).fillColor("#222").text("Disponibles sur demande.", x0, doc.y, { width: largeur });
    } else {
      for (const r of cv.references) {
        doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#111").text(t(r.nom), x0, doc.y + 2, { continued: Boolean(r.fonction || r.structure) });
        if (r.fonction || r.structure) doc.font("Helvetica").text(t(`, ${[r.fonction, r.structure].filter(Boolean).join(", ")}`));
        const c = [r.telephone, r.email].filter(Boolean).join("   ·   ");
        if (c) doc.font("Helvetica").fillColor(GRIS).text(t(c), x0, doc.y);
      }
    }
    doc.end();
  });
}

const missions = (texte) =>
  String(texte ?? "")
    .split(/\n+/)
    .map((m) => m.replace(/^[\s•\-–*·]+/, "").trim())
    .filter(Boolean);

function periode(debut, fin) {
  if (!debut && !fin) return "";
  if (!fin) return debut;
  return `${debut} – ${fin}`;
}

/** Enregistre le PDF dans les documents de l'utilisateur. */
export async function ecrirePdf(cv, profil, nomFichier) {
  const buffer = await genererPdf(cv, profil);
  const fichier = `cv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fichier), buffer);
  const { createHash } = await import("node:crypto");
  return {
    nom: nomFichier,
    fichier,
    taille: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    ajouteLe: new Date().toISOString(),
  };
}

// ---- Import -------------------------------------------------------------------

/** Texte brut d'un CV (PDF, Word .docx, texte). */
export async function extraireTexte(chemin, nomOriginal) {
  const ext = path.extname(nomOriginal).toLowerCase();
  if (ext === ".pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(fs.readFileSync(chemin)));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }
  if (ext === ".docx") {
    const mammoth = (await import("mammoth")).default;
    return (await mammoth.extractRawText({ path: chemin })).value;
  }
  if (ext === ".txt" || ext === ".md") return fs.readFileSync(chemin, "utf8");
  throw new Error("Format non pris en charge : utilisez un PDF, un Word (.docx) ou un fichier texte.");
}

const SECTIONS = [
  ["experiences", /^(exp[ée]riences?( professionnelles?)?|parcours professionnel|activit[ée]s? professionnelles?|emplois?|berufserfahrung)\b/i],
  ["formations", /^(formations?|[ée]tudes|dipl[ôo]mes?( et formations?)?|formation et dipl[ôo]mes|cursus|ausbildung)\b/i],
  ["langues", /^(langues?|connaissances linguistiques|sprachen|sprachkenntnisse)\b/i],
  ["informatique", /^(informatique|outils informatiques|connaissances informatiques|it)\b/i],
  ["competences", /^(comp[ée]tences|aptitudes|savoir-faire|points forts|qualit[ée]s|kompetenzen)\b/i],
  ["interets", /^(centres? d.int[ée]r[êe]ts?|loisirs|hobbies|int[ée]r[êe]ts|activit[ée]s extra)/i],
  ["references", /^(r[ée]f[ée]rences?)\b/i],
  ["accroche", /^(profil|[àa] propos|r[ée]sum[ée]|objectif professionnel|pr[ée]sentation)\b/i],
  ["perso", /^(donn[ée]es personnelles|informations personnelles|personalien)\b/i],
];

const MOIS = "janv|févr|fevr|mars|avr|mai|juin|juil|août|aout|sept|oct|nov|déc|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";
const DATE = `(?:\\d{1,2}[./]\\d{4}|(?:${MOIS})[a-zéû.]*\\s+\\d{4}|\\d{4})`;
const RE_PLAGE = new RegExp(`^\\s*(?:(?:depuis|dès|des)\\s+)?(${DATE})(?:\\s*(?:-|–|—|à|au|bis)\\s*(${DATE}|aujourd'hui|aujourd’hui|ce jour|à ce jour|actuel(?:lement)?|en cours|heute))?\\s*[:,|-]?\\s*(.*)$`, "i");

/**
 * Découpe un CV en sections par reconnaissance des titres usuels.
 * Imparfait par nature : le résultat est toujours présenté pour vérification.
 */
export function analyserTexte(texte) {
  const cv = cvVide();
  cv.langues = [];
  const lignes = texte.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const identite = {
    email: texte.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? "",
    telephone: texte.match(/(\+41|0041|0)\s?\d{2}[\s.]?\d{3}[\s.]?\d{2}[\s.]?\d{2}/)?.[0] ?? "",
  };
  const naissance = texte.match(/(?:n[ée]e? le|date de naissance\s*:?)\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{1,2} \w+ \d{4})/i);
  if (naissance) cv.dateNaissance = naissance[1];
  const nationalite = texte.match(/nationalit[ée]\s*:?\s*([A-Za-zÀ-ÿ\- ]{3,40})/i);
  if (nationalite) cv.nationalite = nationalite[1].trim();

  let section = "entete";
  let courant = null;
  const blocs = { accroche: [], competences: [], informatique: [], interets: [], references: [] };
  const fermer = () => {
    if (!courant) return;
    if (section === "experiences") cv.experiences.push(courant);
    if (section === "formations") cv.formations.push(courant);
    courant = null;
  };

  lignes.forEach((ligne, i) => {
    const titre = SECTIONS.find(([, re]) => re.test(ligne) && ligne.length < 45);
    if (titre) {
      fermer();
      section = titre[0];
      return;
    }
    if (section === "entete" && i < 3 && !cv.titre && !/@|\d{3}/.test(ligne) && i > 0) {
      cv.titre = ligne;
      return;
    }
    if (section === "experiences" || section === "formations") {
      const m = ligne.match(RE_PLAGE);
      if (m && (m[1].length > 4 || m[2] || /^\d{4}\b/.test(ligne))) {
        fermer();
        const reste = m[3] ?? "";
        courant =
          section === "experiences"
            ? { poste: reste, employeur: "", lieu: "", debut: m[1], fin: m[2] ? normaliserFin(m[2]) : "", taux: "", missions: "" }
            : { titre: reste, ecole: "", lieu: "", debut: m[2] ? m[1] : "", fin: m[2] ? normaliserFin(m[2]) : m[1] };
        return;
      }
      if (!courant) return;
      const puce = /^[•\-–*·▪●]/.test(ligne);
      const taux = ligne.match(/(\d{2,3})\s?%/);
      if (section === "experiences") {
        if (taux && !courant.taux) courant.taux = `${taux[1]} %`;
        if (!courant.poste) courant.poste = ligne;
        else if (!courant.employeur && !puce) [courant.employeur, courant.lieu = ""] = ligne.replace(/\s*\d{2,3}\s?%/, "").replace(/[\s,|–-]+$/, "").split(/\s*[,|–-]\s*(?=[^,|–-]+$)/);
        else courant.missions += `${courant.missions ? "\n" : ""}${ligne.replace(/^[•\-–*·▪●]\s*/, "")}`;
      } else {
        if (!courant.titre) courant.titre = ligne;
        else if (!courant.ecole) [courant.ecole, courant.lieu = ""] = ligne.split(/\s*[,|–-]\s*(?=[^,|–-]+$)/);
      }
      return;
    }
    if (section === "langues") {
      const m = ligne.replace(/^[•\-–*·]\s*/, "").match(/^([A-Za-zÀ-ÿ]+)\s*[:\-–(]?\s*(.*?)\)?$/);
      if (m) cv.langues.push({ langue: m[1], niveau: m[2] || "" });
      return;
    }
    if (blocs[section]) blocs[section].push(ligne.replace(/^[•\-–*·▪●]\s*/, ""));
  });
  fermer();

  cv.accroche = blocs.accroche.join(" ");
  cv.competences = blocs.competences.flatMap((l) => (l.length > 90 ? l.split(/\s*[;,]\s*/) : [l])).filter(Boolean).slice(0, 20);
  cv.informatique = blocs.informatique.join(", ");
  cv.interets = blocs.interets.join(", ");
  if (blocs.references.length && !blocs.references.some((l) => /sur demande/i.test(l))) {
    cv.referencesSurDemande = false;
    cv.references = [{ nom: blocs.references.join(" ").slice(0, 120), fonction: "", structure: "", telephone: "", email: "" }];
  }
  if (!cv.langues.length) cv.langues = cvVide().langues;
  return { cv, identite };
}

const normaliserFin = (s) => (/aujourd|ce jour|actuel|en cours|heute/i.test(s) ? "aujourd'hui" : s);

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import multer from "multer";
import { contenuEnvoi, empreinte, envoyerEmail, piecesJointes, smtpConfigure, verifier } from "./envoi.js";
import { employeursQuiRecrutent, modeDemo, rechercher } from "./jobRoom.js";
import { rediger, redigerRelance, redigerSpontanee } from "./lettres.js";
import { distanceKm, geocoder } from "./geo.js";
import { scorer } from "./matching.js";
import { CANTONS, CANTONS_VOISINS, CONTRATS, DIPLOMES, diplomesCites, METIERS, metierDuTitre, PERMIS_TRAVAIL } from "./referentiel.js";
import { db, logEvent, newId, UPLOAD_DIR } from "./store.js";

const envoisEnCours = new Set();

const cleEmployeur = (nom) => String(nom).toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

/** Cantons à interroger pour une recherche dans un rayon autour du domicile. */
function cantonsAutour(profil, rayon) {
  if (rayon >= 120 || !profil.canton) return [];
  return [profil.canton, ...(rayon > 15 ? CANTONS_VOISINS[profil.canton] ?? [] : [])];
}
const STATUTS_SUIVI = ["entretien", "refusee", "acceptee", "abandonnee", "envoyee"];

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function trouverCandidature(data, id) {
  const c = data.candidatures.find((x) => x.id === id);
  if (!c) throw new HttpError(404, "Candidature introuvable.");
  return c;
}

function changerStatut(c, statut) {
  c.statut = statut;
  c.majLe = new Date().toISOString();
  c.historique.push({ at: c.majLe, statut });
}

const aujourdHui = () => new Date().toISOString().slice(0, 10);

function envoisDuJour(data) {
  return data.journal.filter((e) => (e.type === "envoi" || e.type === "relance") && e.at.startsWith(aujourdHui())).length;
}

function verifierLimite(data) {
  const limite = data.reglages.limiteJournaliere;
  if (limite > 0 && envoisDuJour(data) >= limite) {
    throw new HttpError(429, `Limite de ${limite} envois par jour atteinte. Modifiable dans les réglages.`);
  }
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // ---- Configuration -------------------------------------------------------
  app.get("/api/config", (_req, res) => {
    const data = db.get();
    res.json({
      sourceOffres: modeDemo() ? "demo" : "job-room",
      smtp: smtpConfigure(),
      referentiel: {
        metiers: METIERS.map(({ id, libelle, famille }) => ({ id, libelle, famille })),
        diplomes: DIPLOMES.map(({ code, libelle }) => ({ code, libelle })),
        contrats: CONTRATS,
        cantons: CANTONS,
        permisTravail: PERMIS_TRAVAIL,
      },
      envoisDuJour: envoisDuJour(data),
      reglages: data.reglages,
    });
  });

  app.put("/api/reglages", (req, res) => {
    const r = db.update((data) => {
      const limite = Number(req.body.limiteJournaliere);
      const delai = Number(req.body.delaiRelanceJours);
      if (Number.isInteger(limite) && limite >= 0 && limite <= 100) data.reglages.limiteJournaliere = limite;
      if (Number.isInteger(delai) && delai >= 1 && delai <= 60) data.reglages.delaiRelanceJours = delai;
      const objectif = Number(req.body.objectifHebdo);
      if (Number.isInteger(objectif) && objectif >= 1 && objectif <= 200) data.reglages.objectifHebdo = objectif;
      return data.reglages;
    });
    res.json(r);
  });

  // ---- Profil ---------------------------------------------------------------
  app.get("/api/profil", (_req, res) => res.json(db.get().profil));

  app.put("/api/profil", asyncRoute(async (req, res) => {
    const champs = ["prenom", "nom", "email", "telephone", "adresse", "npa", "ville", "canton", "permisTravail", "situation", "experiences", "competences", "motivations"];
    const avant = db.get().profil;
    const lieuChange = (req.body.npa ?? avant.npa) !== avant.npa || (req.body.ville ?? avant.ville) !== avant.ville || !avant.lat;
    const coords = lieuChange ? await geocoder(req.body.npa ?? avant.npa, req.body.ville ?? avant.ville) : undefined;
    const profil = db.update((data) => {
      if (coords !== undefined) {
        data.profil.lat = coords?.lat ?? null;
        data.profil.lon = coords?.lon ?? null;
        data.profil.lieuReconnu = coords?.libelle ?? "";
        if (coords?.canton && (!req.body.canton || lieuChange)) req.body.canton = coords.canton;
      }
      if (typeof req.body.onboardingFait === "boolean") data.profil.onboardingFait = req.body.onboardingFait;
      const rayon = Number(req.body.rayonKm);
      if (Number.isInteger(rayon) && rayon >= 0 && rayon <= 300) data.profil.rayonKm = rayon;
      for (const k of champs) if (typeof req.body[k] === "string") data.profil[k] = req.body[k].slice(0, 5000);
      for (const k of ["permisConduire", "vehicule"]) if (typeof req.body[k] === "boolean") data.profil[k] = req.body[k];
      for (const k of ["tauxMin", "tauxMax"]) {
        const v = Number(req.body[k]);
        if (Number.isInteger(v) && v >= 0 && v <= 100) data.profil[k] = v;
      }
      if (data.profil.tauxMin > data.profil.tauxMax) [data.profil.tauxMin, data.profil.tauxMax] = [data.profil.tauxMax, data.profil.tauxMin];
      if (Array.isArray(req.body.diplomes)) data.profil.diplomes = req.body.diplomes.filter((d) => DIPLOMES.some((x) => x.code === d));
      if (Array.isArray(req.body.metiers)) data.profil.metiers = req.body.metiers.filter((m) => METIERS.some((x) => x.id === m));
      if (Array.isArray(req.body.langues)) data.profil.langues = req.body.langues.filter((l) => ["fr", "de", "it", "en"].includes(l));
      data.profil.canton = CANTONS.some((c) => c.code === data.profil.canton.trim().toUpperCase()) ? data.profil.canton.trim().toUpperCase() : "";
      return data.profil;
    });
    res.json(profil);
  }));

  const upload = multer({
    dest: UPLOAD_DIR,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) =>
      cb(null, /\.(pdf|docx?|odt)$/i.test(file.originalname)),
  });

  const document = (f) => ({
    nom: Buffer.from(f.originalname, "latin1").toString("utf8"),
    fichier: f.filename,
    taille: f.size,
    sha256: createHash("sha256").update(fs.readFileSync(f.path)).digest("hex"),
    ajouteLe: new Date().toISOString(),
  });

  app.post("/api/profil/annexes", upload.array("documents", 10), (req, res) => {
    if (!req.files?.length) throw new HttpError(400, "Fichiers refusés : PDF, Word ou ODT de 5 Mo maximum.");
    const profil = db.update((data) => {
      data.profil.annexes = [...(data.profil.annexes ?? []), ...req.files.map(document)].slice(0, 20);
      logEvent(data, "cv", { message: `${req.files.length} certificat(s)/diplôme(s) ajouté(s)` });
      return data.profil;
    });
    res.json(profil);
  });

  app.get("/api/profil/annexes/:fichier", (req, res) => {
    const doc = db.get().profil.annexes.find((d) => d.fichier === req.params.fichier);
    if (!doc) throw new HttpError(404, "Document introuvable.");
    res.download(path.join(UPLOAD_DIR, doc.fichier), doc.nom);
  });

  app.delete("/api/profil/annexes/:fichier", (req, res) => {
    const profil = db.update((data) => {
      const doc = data.profil.annexes.find((d) => d.fichier === req.params.fichier);
      if (doc) fs.rmSync(path.join(UPLOAD_DIR, doc.fichier), { force: true });
      data.profil.annexes = data.profil.annexes.filter((d) => d !== doc);
      return data.profil;
    });
    res.json(profil);
  });

  app.post("/api/profil/cv", upload.single("cv"), (req, res) => {
    if (!req.file) throw new HttpError(400, "Fichier refusé : PDF, Word ou ODT de 5 Mo maximum.");
    const profil = db.update((data) => {
      if (data.profil.cv) fs.rmSync(path.join(UPLOAD_DIR, data.profil.cv.fichier), { force: true });
      data.profil.cv = document(req.file);
      logEvent(data, "cv", { message: `CV ajouté : ${data.profil.cv.nom}` });
      return data.profil;
    });
    res.json(profil);
  });

  app.get("/api/profil/cv", (_req, res) => {
    const cv = db.get().profil.cv;
    if (!cv) throw new HttpError(404, "Aucun CV.");
    res.download(path.join(UPLOAD_DIR, cv.fichier), cv.nom);
  });

  app.delete("/api/profil/cv", (_req, res) => {
    const profil = db.update((data) => {
      if (data.profil.cv) fs.rmSync(path.join(UPLOAD_DIR, data.profil.cv.fichier), { force: true });
      data.profil.cv = null;
      return data.profil;
    });
    res.json(profil);
  });

  // ---- Offres ---------------------------------------------------------------
  const liste = (v) => (typeof v === "string" && v ? v.split(",") : []);

  app.get(
    "/api/offres/recherche",
    asyncRoute(async (req, res) => {
      const data = db.get();
      const borne = (v, def) => (Number.isInteger(Number(v)) && v !== "" && v != null ? Math.max(0, Math.min(100, Number(v))) : def);
      const rayon = Number(req.query.rayon) || 0;
      const autour = rayon > 0 && data.profil.lat;
      const r = await rechercher({
        metiers: liste(req.query.metiers),
        cantons: autour ? cantonsAutour(data.profil, rayon) : liste(req.query.cantons),
        motsCles: String(req.query.motsCles ?? "").trim(),
        contrat: ["indetermine", "determine"].includes(req.query.contrat) ? req.query.contrat : "",
        tauxMin: borne(req.query.tauxMin, 0),
        tauxMax: borne(req.query.tauxMax, 100),
        depuisJours: [3, 7, 14, 30, 60].includes(Number(req.query.depuis)) ? Number(req.query.depuis) : 30,
        page: Number(req.query.page) || 0,
        titreStrict: req.query.strict !== "0",
      });
      const sauvees = new Map(data.offres.map((o) => [o.externalId, o.id]));
      const postulees = new Set(data.candidatures.map((c) => c.offre.externalId));
      const resultats = r.resultats
        .map((o) => ({ ...o, distanceKm: distanceKm(data.profil, o), compat: scorer(o, data.profil), offreId: sauvees.get(o.externalId) ?? null, dejaPostule: postulees.has(o.externalId) }))
        .filter((o) => !autour || (o.distanceKm == null ? cantonsAutour(data.profil, rayon).includes(o.canton) : o.distanceKm <= rayon))
        .sort((a, b) => (req.query.tri === "date" ? 0 : b.compat.score - a.compat.score));
      res.json({ ...r, resultats });
    }),
  );

  app.get("/api/offres", (_req, res) => {
    const data = db.get();
    res.json(data.offres.map((o) => ({ ...o, distanceKm: distanceKm(data.profil, o), compat: scorer(o, data.profil) })));
  });

  const champsOffre = ["source", "externalId", "reference", "intitule", "employeur", "lieu", "canton", "contrat", "contratLibelle", "taux", "entree", "langue", "description", "metier", "contactNom", "contactEmail", "contactTelephone", "urlCandidature", "urlAnnonce", "datePublication"];

  app.post("/api/offres", (req, res) => {
    const b = req.body ?? {};
    if (!b.intitule?.trim() || !b.employeur?.trim()) throw new HttpError(400, "Intitulé et employeur sont obligatoires.");
    const offre = db.update((data) => {
      const existante = b.externalId && data.offres.find((o) => o.externalId === b.externalId);
      if (existante) return existante;
      const o = { id: newId(), sauveeLe: new Date().toISOString() };
      for (const k of champsOffre) o[k] = typeof b[k] === "string" ? b[k].trim() : "";
      o.source ||= "manuel";
      o.externalId ||= `manuel-${o.id}`;
      o.contratLibelle ||= CONTRATS.find((c) => c.code === o.contrat)?.libelle ?? o.contrat;
      for (const k of ["tauxMin", "tauxMax", "lat", "lon"]) o[k] = Number.isFinite(b[k]) ? b[k] : null;
      if (!o.taux && o.tauxMax) o.taux = o.tauxMin && o.tauxMin !== o.tauxMax ? `${o.tauxMin}–${o.tauxMax} %` : `${o.tauxMax} %`;
      o.metier ||= metierDuTitre(o.intitule);
      o.diplomesCites = diplomesCites(`${o.intitule} ${o.description}`);
      data.offres.unshift(o);
      return o;
    });
    res.status(201).json(offre);
  });

  app.delete("/api/offres/:id", (req, res) => {
    db.update((data) => {
      data.offres = data.offres.filter((o) => o.id !== req.params.id);
    });
    res.status(204).end();
  });

  // ---- Candidatures -----------------------------------------------------------
  const vue = (c, data) => {
    const contenu = contenuEnvoi(c, data.profil);
    const emp = empreinte(contenu);
    const autorisationValide = Boolean(c.autorisation && c.autorisation.empreinte === emp);
    const relanceDue =
      c.statut === "envoyee" &&
      Date.now() - new Date(c.relances.at(-1)?.at ?? c.envoi?.at ?? Date.now()).getTime() > data.reglages.delaiRelanceJours * 86_400_000;
    return { ...c, autorisationValide, relanceDue };
  };

  app.get("/api/candidatures", (_req, res) => {
    const data = db.get();
    res.json(data.candidatures.map((c) => vue(c, data)));
  });

  app.post("/api/candidatures", (req, res) => {
    const c = db.update((data) => {
      const offre = data.offres.find((o) => o.id === req.body.offreId);
      if (!offre) throw new HttpError(404, "Offre introuvable : enregistrez-la d'abord.");
      const existante = data.candidatures.find((x) => x.offre.externalId === offre.externalId);
      if (existante) return existante;
      const { objet, message } = rediger(offre, data.profil);
      const now = new Date().toISOString();
      const nouvelle = {
        id: newId(),
        offre: { ...offre },
        statut: "brouillon",
        canal: offre.contactEmail ? "email" : offre.urlCandidature ? "site" : "email",
        destinataire: offre.contactEmail ?? "",
        objet,
        message,
        joindreCV: true,
        joindreAnnexes: true,
        notes: "",
        autorisation: null,
        envoi: null,
        relances: [],
        creeLe: now,
        majLe: now,
        historique: [{ at: now, statut: "brouillon" }],
      };
      data.candidatures.unshift(nouvelle);
      logEvent(data, "creation", { candidatureId: nouvelle.id, message: `Brouillon créé : ${offre.intitule} – ${offre.employeur}` });
      return nouvelle;
    });
    res.status(201).json(vue(c, db.get()));
  });

  app.put("/api/candidatures/:id", (req, res) => {
    const c = db.update((data) => {
      const c = trouverCandidature(data, req.params.id);
      if (["envoyee", "entretien", "refusee", "acceptee"].includes(c.statut)) {
        if (typeof req.body.notes === "string") c.notes = req.body.notes.slice(0, 5000);
        return c;
      }
      const avant = empreinte(contenuEnvoi(c, data.profil));
      for (const k of ["destinataire", "objet", "message", "notes"]) if (typeof req.body[k] === "string") c[k] = req.body[k].slice(0, 20000);
      for (const k of ["joindreCV", "joindreAnnexes"]) if (typeof req.body[k] === "boolean") c[k] = req.body[k];
      if (["email", "site"].includes(req.body.canal)) c.canal = req.body.canal;
      if (c.autorisation && empreinte(contenuEnvoi(c, data.profil)) !== avant) {
        // Toute modification du contenu annule l'autorisation.
        c.autorisation = null;
        changerStatut(c, "a_autoriser");
        logEvent(data, "autorisation-annulee", { candidatureId: c.id, message: "Contenu modifié après autorisation : nouvelle autorisation requise." });
      }
      c.majLe = new Date().toISOString();
      return c;
    });
    res.json(vue(c, db.get()));
  });

  app.post("/api/candidatures/:id/regenerer", (req, res) => {
    const c = db.update((data) => {
      const c = trouverCandidature(data, req.params.id);
      if (c.envoi) throw new HttpError(409, "Candidature déjà envoyée.");
      const emp = data.employeurs.find((e) => e.id === c.employeurId) ?? { nom: c.offre.employeur, contactNom: c.offre.contactNom };
      Object.assign(c, c.type === "spontanee" ? redigerSpontanee(emp, c.offre.metier, data.profil) : rediger(c.offre, data.profil), { autorisation: null });
      if (c.statut === "autorisee") changerStatut(c, "a_autoriser");
      return c;
    });
    res.json(vue(c, db.get()));
  });

  app.post("/api/candidatures/:id/soumettre", (req, res) => {
    const c = db.update((data) => {
      const c = trouverCandidature(data, req.params.id);
      if (c.statut !== "brouillon") throw new HttpError(409, "Seul un brouillon peut être mis en attente d'autorisation.");
      changerStatut(c, "a_autoriser");
      return c;
    });
    res.json(vue(c, db.get()));
  });

  app.post("/api/candidatures/:id/brouillon", (req, res) => {
    const c = db.update((data) => {
      const c = trouverCandidature(data, req.params.id);
      if (!["a_autoriser", "autorisee"].includes(c.statut)) throw new HttpError(409, "Impossible à ce stade.");
      c.autorisation = null;
      changerStatut(c, "brouillon");
      return c;
    });
    res.json(vue(c, db.get()));
  });

  /** Aperçu exact de ce qui sera envoyé, avec son empreinte. */
  app.get("/api/candidatures/:id/apercu", (req, res) => {
    const data = db.get();
    const c = trouverCandidature(data, req.params.id);
    const contenu = contenuEnvoi(c, data.profil);
    res.json({ contenu, empreinte: empreinte(contenu), erreurs: verifier(c, data.profil), smtp: smtpConfigure() });
  });

  app.post("/api/candidatures/:id/autoriser", (req, res) => {
    const c = db.update((data) => {
      const c = trouverCandidature(data, req.params.id);
      if (req.body.confirmation !== true) throw new HttpError(400, "Confirmation explicite requise.");
      if (!["brouillon", "a_autoriser", "autorisee"].includes(c.statut)) throw new HttpError(409, "Cette candidature n'est plus modifiable.");
      const erreurs = verifier(c, data.profil);
      if (erreurs.length) throw new HttpError(422, "Candidature incomplète.", erreurs);
      const contenu = contenuEnvoi(c, data.profil);
      const emp = empreinte(contenu);
      if (req.body.empreinte !== emp) throw new HttpError(409, "Le contenu a changé depuis l'aperçu : relisez-le avant d'autoriser.");
      c.autorisation = { at: new Date().toISOString(), empreinte: emp };
      changerStatut(c, "autorisee");
      logEvent(data, "autorisation", { candidatureId: c.id, empreinte: emp, message: `Envoi autorisé : ${c.offre.intitule} – ${c.offre.employeur}` });
      return c;
    });
    res.json(vue(c, db.get()));
  });

  app.post("/api/candidatures/:id/revoquer", (req, res) => {
    const c = db.update((data) => {
      const c = trouverCandidature(data, req.params.id);
      if (c.statut !== "autorisee") throw new HttpError(409, "Aucune autorisation en cours.");
      c.autorisation = null;
      changerStatut(c, "a_autoriser");
      logEvent(data, "revocation", { candidatureId: c.id, message: `Autorisation retirée : ${c.offre.intitule}` });
      return c;
    });
    res.json(vue(c, db.get()));
  });

  app.post(
    "/api/candidatures/:id/envoyer",
    asyncRoute(async (req, res) => {
      const data = db.get();
      const c = trouverCandidature(data, req.params.id);
      if (c.statut !== "autorisee" || !c.autorisation) throw new HttpError(403, "Envoi refusé : candidature non autorisée.");
      const contenu = contenuEnvoi(c, data.profil);
      if (empreinte(contenu) !== c.autorisation.empreinte) {
        throw new HttpError(403, "Envoi refusé : le contenu (ou votre CV) a changé depuis l'autorisation.");
      }
      if (c.canal !== "email") throw new HttpError(400, "Candidature sur site : utilisez « J'ai déposé ma candidature ».");
      verifierLimite(data);
      if (envoisEnCours.has(c.id)) throw new HttpError(409, "Envoi déjà en cours.");
      envoisEnCours.add(c.id);
      try {
        const r = await envoyerEmail(contenu, data.profil, { documents: piecesJointes(c, data.profil) });
        db.update((d) => {
          const c2 = trouverCandidature(d, c.id);
          c2.envoi = { at: new Date().toISOString(), ...r, empreinte: c.autorisation.empreinte };
          changerStatut(c2, "envoyee");
          logEvent(d, "envoi", {
            candidatureId: c.id,
            mode: r.mode,
            empreinte: c.autorisation.empreinte,
            message: `${r.mode === "simulation" ? "[Simulation] " : ""}Candidature envoyée à ${contenu.a} : ${c.offre.intitule}`,
          });
        });
      } catch (e) {
        db.update((d) => logEvent(d, "erreur", { candidatureId: c.id, message: `Échec d'envoi : ${e.message}` }));
        throw new HttpError(502, `Échec de l'envoi : ${e.message}`);
      } finally {
        envoisEnCours.delete(c.id);
      }
      res.json(vue(trouverCandidature(db.get(), c.id), db.get()));
    }),
  );

  app.post("/api/candidatures/:id/depot-confirme", (req, res) => {
    const c = db.update((data) => {
      const c = trouverCandidature(data, req.params.id);
      if (c.canal !== "site") throw new HttpError(400, "Réservé aux candidatures déposées sur un site.");
      if (c.statut !== "autorisee" || c.autorisation?.empreinte !== empreinte(contenuEnvoi(c, data.profil)))
        throw new HttpError(403, "Autorisez d'abord cette candidature.");
      c.envoi = { at: new Date().toISOString(), mode: "site", empreinte: c.autorisation.empreinte };
      changerStatut(c, "envoyee");
      logEvent(data, "depot", { candidatureId: c.id, message: `Candidature déposée sur le site de l'employeur : ${c.offre.intitule}` });
      return c;
    });
    res.json(vue(c, db.get()));
  });

  app.post("/api/candidatures/:id/statut", (req, res) => {
    const c = db.update((data) => {
      const c = trouverCandidature(data, req.params.id);
      if (!STATUTS_SUIVI.includes(req.body.statut)) throw new HttpError(400, "Statut inconnu.");
      if (req.body.statut !== "abandonnee" && !c.envoi) throw new HttpError(409, "La candidature n'a pas encore été envoyée.");
      if (req.body.statut === "abandonnee") c.autorisation = null;
      changerStatut(c, req.body.statut);
      logEvent(data, "statut", { candidatureId: c.id, message: `${c.offre.intitule} → ${req.body.statut}` });
      return c;
    });
    res.json(vue(c, db.get()));
  });

  // Relance : même principe d'autorisation, sur le contenu exact de la relance.
  app.get("/api/candidatures/:id/relance", (req, res) => {
    const data = db.get();
    const c = trouverCandidature(data, req.params.id);
    if (!c.envoi || c.canal !== "email") throw new HttpError(409, "Relance possible uniquement après un envoi par e-mail.");
    res.json(redigerRelance(c, data.profil));
  });

  app.post(
    "/api/candidatures/:id/relance",
    asyncRoute(async (req, res) => {
      const data = db.get();
      const c = trouverCandidature(data, req.params.id);
      if (!c.envoi || c.canal !== "email" || c.statut !== "envoyee") throw new HttpError(409, "Relance impossible à ce stade.");
      if (req.body.confirmation !== true) throw new HttpError(400, "Confirmation explicite requise.");
      const objet = String(req.body.objet ?? "").trim();
      const message = String(req.body.message ?? "").trim();
      if (!objet || message.length < 40) throw new HttpError(422, "Relance incomplète.");
      const contenu = { canal: "email", de: data.profil.email, a: c.destinataire.trim(), url: "", objet, message, piecesJointes: [] };
      const emp = empreinte(contenu);
      if (req.body.empreinte !== emp) throw new HttpError(409, "Le contenu ne correspond pas à l'aperçu autorisé.");
      verifierLimite(data);
      const r = await envoyerEmail(contenu, data.profil, { relance: true });
      db.update((d) => {
        const c2 = trouverCandidature(d, c.id);
        c2.relances.push({ at: new Date().toISOString(), objet, ...r, empreinte: emp });
        c2.majLe = new Date().toISOString();
        logEvent(d, "relance", { candidatureId: c.id, mode: r.mode, empreinte: emp, message: `${r.mode === "simulation" ? "[Simulation] " : ""}Relance envoyée à ${contenu.a}` });
      });
      res.json(vue(trouverCandidature(db.get(), c.id), db.get()));
    }),
  );

  app.post("/api/candidatures/:id/relance/apercu", (req, res) => {
    // Calcule l'empreinte d'un contenu de relance tel qu'affiché, pour l'autoriser.
    const data = db.get();
    const c = trouverCandidature(data, req.params.id);
    const contenu = { canal: "email", de: data.profil.email, a: c.destinataire.trim(), url: "", objet: String(req.body.objet ?? "").trim(), message: String(req.body.message ?? "").trim(), piecesJointes: [] };
    res.json({ contenu, empreinte: empreinte(contenu) });
  });

  app.delete("/api/candidatures/:id", (req, res) => {
    db.update((data) => {
      const c = trouverCandidature(data, req.params.id);
      data.candidatures = data.candidatures.filter((x) => x.id !== c.id);
      logEvent(data, "suppression", { message: `Candidature supprimée : ${c.offre.intitule}` });
    });
    res.status(204).end();
  });

  // ---- Employeurs et candidatures spontanées ---------------------------------
  const vueEmployeur = (e, data) => ({
    ...e,
    distanceKm: distanceKm(data.profil, e),
    candidatures: data.candidatures.filter((c) => c.employeurId === e.id || c.offre.employeur === e.nom).map((c) => ({ id: c.id, statut: c.statut, type: c.type ?? "offre" })),
  });

  app.get("/api/employeurs", (_req, res) => {
    const data = db.get();
    res.json(data.employeurs.map((e) => vueEmployeur(e, data)).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999)));
  });

  app.get(
    "/api/employeurs/decouvrir",
    asyncRoute(async (req, res) => {
      const data = db.get();
      const rayon = Number(req.query.rayon) || 0;
      const autour = rayon > 0 && data.profil.lat;
      const trouves = await employeursQuiRecrutent({
        metiers: liste(req.query.metiers),
        cantons: autour ? cantonsAutour(data.profil, rayon) : liste(req.query.cantons),
      });
      const connus = new Set(data.employeurs.map((e) => cleEmployeur(e.nom)));
      res.json(
        trouves
          .map((e) => ({ ...e, distanceKm: distanceKm(data.profil, e), dejaAjoute: connus.has(e.cle) }))
          .filter((e) => !autour || (e.distanceKm == null ? cantonsAutour(data.profil, rayon).includes(e.canton) : e.distanceKm <= rayon))
          .sort((a, b) => b.annonces.length - a.annonces.length || (a.distanceKm ?? 999) - (b.distanceKm ?? 999)),
      );
    }),
  );

  const champsEmployeur = ["nom", "contactNom", "contactFonction", "email", "telephone", "site", "lieu", "canton", "notes"];
  const ajouterEmployeur = (data, b, source) => {
    const nom = String(b.nom ?? "").trim();
    if (!nom) throw new HttpError(400, "Le nom de la structure est obligatoire.");
    const existant = data.employeurs.find((e) => cleEmployeur(e.nom) === cleEmployeur(nom));
    if (existant) {
      // Complète sans écraser ce que l'utilisateur a déjà saisi.
      for (const k of champsEmployeur) if (!existant[k] && typeof b[k] === "string") existant[k] = b[k].trim();
      return existant;
    }
    const e = { id: newId(), source, ajouteLe: new Date().toISOString(), lat: Number.isFinite(b.lat) ? b.lat : null, lon: Number.isFinite(b.lon) ? b.lon : null };
    for (const k of champsEmployeur) e[k] = typeof b[k] === "string" ? b[k].trim().slice(0, 2000) : "";
    e.nom = nom;
    e.annonces = Array.isArray(b.annonces) ? b.annonces.slice(0, 10) : [];
    data.employeurs.unshift(e);
    return e;
  };

  app.post("/api/employeurs", (req, res) => {
    const list = Array.isArray(req.body) ? req.body : [req.body];
    const ajoutes = db.update((data) => list.map((b) => ajouterEmployeur(data, b, b.annonces?.length ? "job-room" : "manuel")));
    const data = db.get();
    res.status(201).json(ajoutes.map((e) => vueEmployeur(e, data)));
  });

  /** Import d'une liste collée (une structure par ligne : nom ; e-mail ; contact ; lieu). */
  app.post("/api/employeurs/import", (req, res) => {
    const lignes = String(req.body.texte ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const ajoutes = db.update((data) =>
      lignes
        .map((l) => l.split(/\s*[;\t]\s*/))
        .filter(([nom]) => nom && !/^nom$/i.test(nom))
        .map(([nom, email = "", contactNom = "", lieu = ""]) => ajouterEmployeur(data, { nom, email, contactNom, lieu }, "import")),
    );
    res.status(201).json({ ajoutes: ajoutes.length });
  });

  app.put("/api/employeurs/:id", (req, res) => {
    const e = db.update((data) => {
      const e = data.employeurs.find((x) => x.id === req.params.id);
      if (!e) throw new HttpError(404, "Structure introuvable.");
      for (const k of champsEmployeur) if (typeof req.body[k] === "string") e[k] = req.body[k].trim().slice(0, 2000);
      // Reporte l'e-mail et le contact dans les brouillons pas encore autorisés.
      for (const c of data.candidatures.filter((c) => c.employeurId === e.id && ["brouillon", "a_autoriser"].includes(c.statut))) {
        if (!c.destinataire && e.email) c.destinataire = e.email;
        c.offre.contactEmail = e.email;
      }
      return e;
    });
    res.json(vueEmployeur(e, db.get()));
  });

  app.delete("/api/employeurs/:id", (req, res) => {
    db.update((data) => {
      data.employeurs = data.employeurs.filter((e) => e.id !== req.params.id);
    });
    res.status(204).end();
  });

  /** Prépare des candidatures spontanées (brouillons à relire et autoriser une par une). */
  app.post("/api/candidatures/spontanees", (req, res) => {
    const metier = METIERS.find((m) => m.id === req.body.metier);
    if (!metier) throw new HttpError(400, "Choisissez le métier visé.");
    const ids = Array.isArray(req.body.employeurIds) ? req.body.employeurIds : [];
    const creees = db.update((data) => {
      const out = [];
      for (const id of ids) {
        const e = data.employeurs.find((x) => x.id === id);
        if (!e) continue;
        const externalId = `spont-${e.id}-${metier.id}`;
        if (data.candidatures.some((c) => c.offre.externalId === externalId)) continue;
        const { objet, message } = redigerSpontanee(e, metier.id, data.profil);
        const now = new Date().toISOString();
        const c = {
          id: newId(),
          type: "spontanee",
          employeurId: e.id,
          offre: {
            source: "spontanee", externalId, reference: "", intitule: `Candidature spontanée – ${metier.libelle.replace(/\s*\(.*\)$/, "")}`,
            employeur: e.nom, lieu: e.lieu, canton: e.canton, lat: e.lat, lon: e.lon, metier: metier.id, contrat: "", contratLibelle: "",
            taux: "", entree: "", langue: "fr", description: "", diplomesCites: [], contactNom: e.contactNom, contactEmail: e.email,
            contactTelephone: e.telephone, urlCandidature: e.site, urlAnnonce: "", datePublication: null,
          },
          statut: "a_autoriser",
          canal: "email",
          destinataire: e.email,
          objet,
          message,
          joindreCV: true,
          joindreAnnexes: true,
          notes: "",
          autorisation: null,
          envoi: null,
          relances: [],
          creeLe: now,
          majLe: now,
          historique: [{ at: now, statut: "a_autoriser" }],
        };
        data.candidatures.unshift(c);
        out.push(c);
      }
      if (out.length) logEvent(data, "creation", { message: `${out.length} candidature(s) spontanée(s) préparée(s) – en attente de votre autorisation` });
      return out;
    });
    res.status(201).json({ creees: creees.length });
  });

  app.get("/api/journal", (_req, res) => res.json(db.get().journal.slice(0, 500)));

  // ---- Interface compilée -------------------------------------------------------
  const dist = path.resolve(import.meta.dirname, "..", "dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  app.use((err, _req, res, _next) => {
    const status = err.status ?? (err.code === "LIMIT_FILE_SIZE" ? 413 : 500);
    if (status >= 500 && !(err instanceof HttpError)) console.error(err);
    res.status(status).json({ erreur: err.message ?? "Erreur interne", details: err.details });
  });

  return app;
}

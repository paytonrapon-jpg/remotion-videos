import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import multer from "multer";
import { contenuEnvoi, empreinte, envoyerEmail, smtpConfigure, verifier } from "./envoi.js";
import { apiConfiguree, rechercher } from "./franceTravail.js";
import { rediger, redigerRelance } from "./lettres.js";
import { scorer } from "./matching.js";
import { CONTRATS, DIPLOMES, diplomesCites, METIERS } from "./referentiel.js";
import { db, logEvent, newId, UPLOAD_DIR } from "./store.js";

const envoisEnCours = new Set();
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
      apiFranceTravail: apiConfiguree(),
      smtp: smtpConfigure(),
      referentiel: { metiers: METIERS, diplomes: DIPLOMES.map(({ code, libelle }) => ({ code, libelle })), contrats: CONTRATS },
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
      return data.reglages;
    });
    res.json(r);
  });

  // ---- Profil ---------------------------------------------------------------
  app.get("/api/profil", (_req, res) => res.json(db.get().profil));

  app.put("/api/profil", (req, res) => {
    const champs = ["prenom", "nom", "email", "telephone", "adresse", "codePostal", "ville", "departement", "experiences", "competences", "motivations"];
    const profil = db.update((data) => {
      for (const k of champs) if (typeof req.body[k] === "string") data.profil[k] = req.body[k].slice(0, 5000);
      for (const k of ["permis", "vehicule"]) if (typeof req.body[k] === "boolean") data.profil[k] = req.body[k];
      if (Number.isFinite(req.body.rayonKm)) data.profil.rayonKm = req.body.rayonKm;
      if (Array.isArray(req.body.diplomes)) data.profil.diplomes = req.body.diplomes.filter((d) => DIPLOMES.some((x) => x.code === d));
      if (Array.isArray(req.body.metiers)) data.profil.metiers = req.body.metiers.filter((m) => METIERS.some((x) => x.rome === m));
      if (Array.isArray(req.body.contrats)) data.profil.contrats = req.body.contrats.filter((c) => CONTRATS.some((x) => x.code === c));
      data.profil.departement = data.profil.departement.trim().toUpperCase();
      return data.profil;
    });
    res.json(profil);
  });

  const upload = multer({
    dest: UPLOAD_DIR,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) =>
      cb(null, /\.(pdf|docx?|odt)$/i.test(file.originalname)),
  });

  app.post("/api/profil/cv", upload.single("cv"), (req, res) => {
    if (!req.file) throw new HttpError(400, "Fichier refusé : PDF, Word ou ODT de 5 Mo maximum.");
    const sha256 = createHash("sha256").update(fs.readFileSync(req.file.path)).digest("hex");
    const profil = db.update((data) => {
      if (data.profil.cv) fs.rmSync(path.join(UPLOAD_DIR, data.profil.cv.fichier), { force: true });
      data.profil.cv = { nom: req.file.originalname, fichier: req.file.filename, taille: req.file.size, sha256, ajouteLe: new Date().toISOString() };
      logEvent(data, "cv", { message: `CV ajouté : ${req.file.originalname}` });
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
      const r = await rechercher({
        metiers: liste(req.query.metiers),
        departement: String(req.query.departement ?? "").trim().toUpperCase(),
        motsCles: String(req.query.motsCles ?? "").trim(),
        contrats: liste(req.query.contrats),
        page: Number(req.query.page) || 0,
      });
      const sauvees = new Map(data.offres.map((o) => [o.externalId, o.id]));
      const postulees = new Set(data.candidatures.map((c) => c.offre.externalId));
      const resultats = r.resultats
        .map((o) => ({ ...o, compat: scorer(o, data.profil), offreId: sauvees.get(o.externalId) ?? null, dejaPostule: postulees.has(o.externalId) }))
        .sort((a, b) => (req.query.tri === "date" ? 0 : b.compat.score - a.compat.score));
      res.json({ ...r, resultats });
    }),
  );

  app.get("/api/offres", (_req, res) => {
    const data = db.get();
    res.json(data.offres.map((o) => ({ ...o, compat: scorer(o, data.profil) })));
  });

  const champsOffre = ["source", "externalId", "intitule", "employeur", "lieu", "departement", "contrat", "contratLibelle", "dureeTravail", "salaire", "experience", "description", "rome", "romeLibelle", "contactNom", "contactEmail", "urlCandidature", "datePublication"];

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
      o.contratLibelle ||= o.contrat;
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
      if (typeof req.body.joindreCV === "boolean") c.joindreCV = req.body.joindreCV;
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
      Object.assign(c, rediger(c.offre, data.profil), { autorisation: null });
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
        const r = await envoyerEmail(contenu, data.profil);
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
      const contenu = { canal: "email", de: data.profil.email, a: c.destinataire.trim(), url: "", objet, message, pieceJointe: null };
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
    const contenu = { canal: "email", de: data.profil.email, a: c.destinataire.trim(), url: "", objet: String(req.body.objet ?? "").trim(), message: String(req.body.message ?? "").trim(), pieceJointe: null };
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

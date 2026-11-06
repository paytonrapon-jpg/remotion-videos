// Stockage local en JSON : les données personnelles restent sur votre ordinateur.
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(import.meta.dirname, "..", "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const OUTBOX_DIR = path.join(DATA_DIR, "outbox");
const DB_FILE = path.join(DATA_DIR, "db.json");

const defaults = () => ({
  profil: {
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    adresse: "",
    npa: "",
    ville: "",
    canton: "",
    tauxMin: 80,
    tauxMax: 100,
    diplomes: [],
    metiers: [],
    langues: ["fr"],
    permisTravail: "",
    permisConduire: false,
    vehicule: false,
    experiences: "",
    competences: "",
    motivations: "",
    cv: null,
    annexes: [],
  },
  reglages: {
    limiteJournaliere: 10,
    delaiRelanceJours: 10,
  },
  offres: [],
  candidatures: [],
  journal: [],
});

let cache = null;

function load() {
  if (cache) return cache;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(OUTBOX_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    const base = defaults();
    cache = {
      ...base,
      ...raw,
      profil: { ...base.profil, ...raw.profil },
      reglages: { ...base.reglages, ...raw.reglages },
    };
  } else {
    cache = defaults();
  }
  return cache;
}

function persist() {
  // Écriture atomique : fichier temporaire puis renommage.
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export const db = {
  get: () => load(),
  /** Applique une modification puis enregistre. */
  update(fn) {
    const data = load();
    const result = fn(data);
    persist();
    return result;
  },
  /** Réinitialise le cache (tests). */
  reset() {
    cache = null;
  },
};

export const newId = () => randomUUID();

export function logEvent(data, type, details = {}) {
  data.journal.unshift({ id: newId(), at: new Date().toISOString(), type, ...details });
  if (data.journal.length > 2000) data.journal.length = 2000;
}

export type Compat = { score: number; raisons: string[]; alertes: string[] };

export type Offre = {
  id?: string;
  offreId?: string | null;
  dejaPostule?: boolean;
  source: "job-room" | "demo" | "manuel";
  externalId: string;
  reference: string;
  intitule: string;
  employeur: string;
  lieu: string;
  canton: string;
  contrat: string;
  contratLibelle: string;
  taux: string;
  tauxMin: number | null;
  tauxMax: number | null;
  entree: string;
  langue: string;
  description: string;
  metier: string;
  diplomesCites: string[];
  contactNom: string;
  contactEmail: string;
  contactTelephone: string;
  urlCandidature: string;
  urlAnnonce: string;
  datePublication: string | null;
  compat?: Compat;
};

export type Statut = "brouillon" | "a_autoriser" | "autorisee" | "envoyee" | "entretien" | "refusee" | "acceptee" | "abandonnee";

export type Candidature = {
  id: string;
  offre: Offre;
  statut: Statut;
  canal: "email" | "site";
  destinataire: string;
  objet: string;
  message: string;
  joindreCV: boolean;
  joindreAnnexes: boolean;
  notes: string;
  autorisation: { at: string; empreinte: string } | null;
  autorisationValide: boolean;
  envoi: { at: string; mode: "smtp" | "simulation" | "site"; fichier?: string } | null;
  relances: { at: string; objet: string; mode: string }[];
  relanceDue: boolean;
  creeLe: string;
  majLe: string;
  historique: { at: string; statut: Statut }[];
};

export type Document = { nom: string; fichier: string; taille: number; ajouteLe: string };

export type Profil = {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  npa: string;
  ville: string;
  canton: string;
  tauxMin: number;
  tauxMax: number;
  diplomes: string[];
  metiers: string[];
  langues: string[];
  permisTravail: string;
  permisConduire: boolean;
  vehicule: boolean;
  experiences: string;
  competences: string;
  motivations: string;
  cv: Document | null;
  annexes: Document[];
};

export type Config = {
  sourceOffres: "job-room" | "demo";
  smtp: boolean;
  envoisDuJour: number;
  reglages: { limiteJournaliere: number; delaiRelanceJours: number };
  referentiel: {
    metiers: { id: string; libelle: string; famille: string }[];
    diplomes: { code: string; libelle: string }[];
    contrats: { code: string; libelle: string }[];
    cantons: { code: string; nom: string; langue: string }[];
    permisTravail: { code: string; libelle: string }[];
  };
};

export type Apercu = {
  contenu: {
    canal: "email" | "site";
    de: string;
    a: string;
    url: string;
    objet: string;
    message: string;
    piecesJointes: { nom: string; taille: number }[];
  };
  empreinte: string;
  erreurs: string[];
  smtp: boolean;
};

export type EvenementJournal = { id: string; at: string; type: string; message: string; mode?: string; empreinte?: string };

export class ApiError extends Error {
  details: string[];
  constructor(message: string, details: string[] = []) {
    super(message);
    this.details = details;
  }
}

export async function api<T>(method: string, url: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(`/api${url}`, {
    method,
    headers: body && !isForm ? { "Content-Type": "application/json" } : undefined,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({ erreur: `Erreur ${res.status}` }));
  if (!res.ok) throw new ApiError(json.erreur ?? `Erreur ${res.status}`, json.details ?? []);
  return json as T;
}

export const STATUTS: Record<Statut, { libelle: string; ton: string }> = {
  brouillon: { libelle: "Brouillon", ton: "neutre" },
  a_autoriser: { libelle: "À autoriser", ton: "attention" },
  autorisee: { libelle: "Autorisée", ton: "info" },
  envoyee: { libelle: "Envoyée", ton: "succes" },
  entretien: { libelle: "Entretien", ton: "accent" },
  refusee: { libelle: "Refusée", ton: "neutre" },
  acceptee: { libelle: "Acceptée", ton: "succes" },
  abandonnee: { libelle: "Abandonnée", ton: "neutre" },
};

export const dateCourte = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-CH", { day: "numeric", month: "short" }) : "";

export const ko = (octets: number) => `${Math.max(1, Math.round(octets / 1024))} Ko`;

export const depuis = (iso: string | null) => {
  if (!iso) return "";
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return j <= 0 ? "aujourd'hui" : j === 1 ? "hier" : `il y a ${j} j`;
};

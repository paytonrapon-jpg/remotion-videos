export type Compat = { score: number; raisons: string[]; alertes: string[] };

export type Offre = {
  id?: string;
  offreId?: string | null;
  dejaPostule?: boolean;
  source: "france-travail" | "demo" | "manuel";
  externalId: string;
  intitule: string;
  employeur: string;
  lieu: string;
  departement: string;
  contrat: string;
  contratLibelle: string;
  dureeTravail: string;
  salaire: string;
  experience: string;
  description: string;
  rome: string;
  diplomesCites: string[];
  contactNom: string;
  contactEmail: string;
  urlCandidature: string;
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

export type Profil = {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  codePostal: string;
  ville: string;
  departement: string;
  rayonKm: number;
  diplomes: string[];
  metiers: string[];
  contrats: string[];
  experiences: string;
  competences: string;
  motivations: string;
  permis: boolean;
  vehicule: boolean;
  cv: { nom: string; taille: number; ajouteLe: string } | null;
};

export type Config = {
  apiFranceTravail: boolean;
  smtp: boolean;
  envoisDuJour: number;
  reglages: { limiteJournaliere: number; delaiRelanceJours: number };
  referentiel: {
    metiers: { rome: string; libelle: string; famille: string }[];
    diplomes: { code: string; libelle: string }[];
    contrats: { code: string; libelle: string }[];
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
    pieceJointe: { nom: string; taille: number } | null;
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
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "";

export const depuis = (iso: string | null) => {
  if (!iso) return "";
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return j <= 0 ? "aujourd'hui" : j === 1 ? "hier" : `il y a ${j} j`;
};

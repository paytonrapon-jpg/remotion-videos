import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type Candidature, type Config, type Profil } from "./api";
import { CandidaturesPage } from "./components/Candidatures";
import { JournalPage } from "./components/Journal";
import { OffresPage } from "./components/Offres";
import { ProfilPage } from "./components/Profil";
import { AutoriserPage } from "./components/Autoriser";

type Onglet = "offres" | "autoriser" | "candidatures" | "profil" | "journal";

type Ctx = {
  config: Config;
  profil: Profil;
  setProfil: (p: Profil) => void;
  candidatures: Candidature[];
  rafraichir: () => Promise<void>;
  majCandidature: (c: Candidature) => void;
  notifier: (texte: string, ton?: "succes" | "erreur") => void;
  ouvrirCandidature: (id: string) => void;
  aller: (o: Onglet) => void;
  candidatureOuverte: string | null;
  fermerCandidature: () => void;
};

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => useContext(AppCtx)!;

const ONGLETS: { id: Onglet; libelle: string }[] = [
  { id: "offres", libelle: "Offres" },
  { id: "autoriser", libelle: "À autoriser" },
  { id: "candidatures", libelle: "Mes candidatures" },
  { id: "profil", libelle: "Profil" },
  { id: "journal", libelle: "Journal" },
];

const ongletInitial = (): Onglet => {
  const h = location.hash.slice(1) as Onglet;
  return ONGLETS.some((o) => o.id === h) ? h : "offres";
};

export function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [onglet, setOnglet] = useState<Onglet>(ongletInitial);
  const [toast, setToast] = useState<{ texte: string; ton: string; id: number } | null>(null);
  const [candidatureOuverte, setCandidatureOuverte] = useState<string | null>(null);
  const [erreurChargement, setErreurChargement] = useState("");

  const rafraichir = useCallback(async () => {
    const [cfg, p, c] = await Promise.all([
      api<Config>("GET", "/config"),
      api<Profil>("GET", "/profil"),
      api<Candidature[]>("GET", "/candidatures"),
    ]);
    setConfig(cfg);
    setProfil(p);
    setCandidatures(c);
  }, []);

  useEffect(() => {
    rafraichir().catch(() => setErreurChargement("Le serveur ne répond pas. Lancez « npm run dev » dans le dossier emploi-social."));
  }, [rafraichir]);

  useEffect(() => {
    const onHash = () => setOnglet(ongletInitial());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const aller = useCallback((o: Onglet) => {
    location.hash = o;
    setOnglet(o);
  }, []);

  const notifier = useCallback((texte: string, ton: "succes" | "erreur" = "succes") => {
    const id = Date.now();
    setToast({ texte, ton, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 4500);
  }, []);

  const majCandidature = useCallback(
    (c: Candidature) => {
      setCandidatures((l) => (l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c : x)) : [c, ...l]));
      api<Config>("GET", "/config").then(setConfig).catch(() => {});
    },
    [],
  );

  const ctx = useMemo<Ctx | null>(
    () =>
      config && profil
        ? {
            config,
            profil,
            setProfil,
            candidatures,
            rafraichir,
            majCandidature,
            notifier,
            aller,
            candidatureOuverte,
            ouvrirCandidature: (id) => {
              setCandidatureOuverte(id);
              aller("candidatures");
            },
            fermerCandidature: () => setCandidatureOuverte(null),
          }
        : null,
    [config, profil, candidatures, rafraichir, majCandidature, notifier, aller, candidatureOuverte],
  );

  if (erreurChargement) return <div className="centre"><p className="alerte erreur">{erreurChargement}</p></div>;
  if (!ctx) return <div className="centre"><p className="muted">Chargement…</p></div>;

  const enAttente = candidatures.filter((c) => c.statut === "a_autoriser" || c.statut === "autorisee").length;
  const profilIncomplet = !profil!.prenom || !profil!.email || !profil!.canton || !profil!.diplomes.length || !profil!.cv;

  return (
    <AppCtx.Provider value={ctx}>
      <header className="entete">
        <div className="entete-haut">
          <a className="marque" href="#offres" onClick={() => aller("offres")}>
            <span className="logo" aria-hidden>✓</span>
            <span>Emploi <strong>Social</strong></span>
          </a>
          <div className="etats">
            <span className={`pastille ${config!.sourceOffres === "job-room" ? "ok" : "demo"}`} title={config!.sourceOffres === "job-room" ? "Offres réelles de job-room.ch, la bourse de l'emploi publique suisse" : "Offres fictives (OFFRES_DEMO=1)"}>
              {config!.sourceOffres === "job-room" ? "🇨🇭 job-room.ch" : "Offres d'exemple"}
            </span>
            <span className={`pastille ${config!.smtp ? "ok" : "demo"}`} title={config!.smtp ? "Les e-mails autorisés partent réellement" : "Envois simulés : configurez SMTP dans .env"}>
              {config!.smtp ? "Envoi réel" : "Envoi simulé"}
            </span>
            <span className="pastille" title="Envois effectués aujourd'hui / limite journalière">
              {config!.envoisDuJour}/{config!.reglages.limiteJournaliere || "∞"} aujourd'hui
            </span>
          </div>
        </div>
        <nav className="onglets" aria-label="Navigation principale">
          {ONGLETS.map((o) => (
            <a key={o.id} href={`#${o.id}`} aria-current={onglet === o.id ? "page" : undefined} onClick={() => aller(o.id)}>
              {o.libelle}
              {o.id === "autoriser" && enAttente > 0 && <span className="compteur">{enAttente}</span>}
              {o.id === "profil" && profilIncomplet && <span className="point" title="Profil incomplet" />}
            </a>
          ))}
        </nav>
      </header>
      <main className="contenu">
        {onglet === "offres" && <OffresPage />}
        {onglet === "autoriser" && <AutoriserPage />}
        {onglet === "candidatures" && <CandidaturesPage />}
        {onglet === "profil" && <ProfilPage />}
        {onglet === "journal" && <JournalPage />}
      </main>
      {toast && (
        <div className={`toast ${toast.ton}`} role="status">
          {toast.texte}
        </div>
      )}
    </AppCtx.Provider>
  );
}

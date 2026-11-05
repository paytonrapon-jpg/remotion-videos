import { useEffect, useState } from "react";
import { api, type Config, type EvenementJournal } from "../api";
import { useApp } from "../App";

const ICONES: Record<string, string> = {
  envoi: "✉️", relance: "↻", depot: "🌐", autorisation: "✅", revocation: "⛔", "autorisation-annulee": "⚠️",
  creation: "📝", statut: "•", erreur: "❗", cv: "📎", suppression: "🗑",
};

export function JournalPage() {
  const { config, rafraichir, notifier } = useApp();
  const [journal, setJournal] = useState<EvenementJournal[]>([]);
  const [r, setR] = useState(config.reglages);

  useEffect(() => {
    api<EvenementJournal[]>("GET", "/journal").then(setJournal);
  }, []);

  const enregistrer = async () => {
    await api<Config["reglages"]>("PUT", "/reglages", r);
    await rafraichir();
    notifier("Réglages enregistrés.");
  };

  return (
    <div className="colonne">
      <section className="carte">
        <h2>Réglages de sécurité</h2>
        <div className="grille-form">
          <label className="champ">
            <span>Envois maximum par jour</span>
            <input type="number" min={0} max={100} value={r.limiteJournaliere} onChange={(e) => setR({ ...r, limiteJournaliere: Number(e.target.value) })} />
            <span className="aide">0 = sans limite. Évite les envois en rafale.</span>
          </label>
          <label className="champ">
            <span>Proposer une relance après (jours)</span>
            <input type="number" min={1} max={60} value={r.delaiRelanceJours} onChange={(e) => setR({ ...r, delaiRelanceJours: Number(e.target.value) })} />
          </label>
        </div>
        <div className="actions"><button className="btn primaire" onClick={enregistrer}>Enregistrer</button></div>
      </section>

      <section>
        <h2>Journal des actions</h2>
        <p className="aide">Chaque autorisation et chaque envoi sont tracés avec l'empreinte du contenu autorisé.</p>
        {journal.length === 0 && <p className="muted">Rien pour l'instant.</p>}
        <ol className="journal">
          {journal.map((e) => (
            <li key={e.id}>
              <span className="icone" aria-hidden>{ICONES[e.type] ?? "•"}</span>
              <span className="quand">{new Date(e.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
              <span>{e.message}</span>
              {e.empreinte && <code title={e.empreinte}>{e.empreinte.slice(0, 10)}</code>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

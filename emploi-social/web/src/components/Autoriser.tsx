import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError, type Apercu, type Candidature, dateCourte, ko } from "../api";
import { useApp } from "../App";
import { Erreurs, Modal } from "./ui";

const hote = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

/**
 * Écran d'autorisation : affiche le contenu EXACT qui partira. L'autorisation
 * porte sur l'empreinte de ce contenu ; le serveur refuse tout envoi différent.
 */
export function AutorisationModal({
  candidature,
  onClose,
  progression,
  onArreter,
}: {
  candidature: Candidature;
  onClose: () => void;
  /** Relecture en série : « 2/7 », bouton « Passer » et « Arrêter ». */
  progression?: string;
  onArreter?: () => void;
}) {
  const { majCandidature, notifier, profil } = useApp();
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [coche, setCoche] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [adresse, setAdresse] = useState("");
  const recharger = () => api<Apercu>("GET", `/candidatures/${candidature.id}/apercu`).then(setApercu, (e) => notifier(e.message, "erreur"));

  /** Complète l'adresse manquante sans quitter la relecture (et la mémorise pour la structure). */
  const enregistrerAdresse = async () => {
    const c = await api<Candidature>("PUT", `/candidatures/${candidature.id}`, { destinataire: adresse.trim() });
    majCandidature(c);
    if (candidature.employeurId) await api("PUT", `/employeurs/${candidature.employeurId}`, { email: adresse.trim() }).catch(() => {});
    setAdresse("");
    await recharger();
  };

  useEffect(() => {
    api<Apercu>("GET", `/candidatures/${candidature.id}/apercu`).then(setApercu, (e) => notifier(e.message, "erreur"));
  }, [candidature.id, notifier]);

  const autoriser = async (envoyer: boolean) => {
    if (!apercu) return;
    setEnvoi(true);
    try {
      let c = await api<Candidature>("POST", `/candidatures/${candidature.id}/autoriser`, { empreinte: apercu.empreinte, confirmation: true });
      majCandidature(c);
      if (envoyer && apercu.contenu.canal === "email") {
        c = await api<Candidature>("POST", `/candidatures/${candidature.id}/envoyer`);
        majCandidature(c);
        notifier(c.envoi?.mode === "simulation" ? "Envoi simulé : le message est dans data/outbox." : `Candidature envoyée à ${apercu.contenu.a}.`);
      } else {
        notifier(apercu.contenu.canal === "site" ? "Autorisée : déposez maintenant votre candidature sur le site." : "Envoi autorisé. Vous pouvez l'envoyer quand vous voulez.");
      }
      onClose();
    } catch (e) {
      setErreurs(e instanceof ApiError && e.details.length ? e.details : [(e as Error).message]);
    } finally {
      setEnvoi(false);
    }
  };

  if (!apercu) return <Modal titre="Relire et autoriser" onClose={onClose}><p className="muted">Préparation de l'aperçu…</p></Modal>;
  const { contenu } = apercu;
  const bloque = apercu.erreurs.length > 0;
  const nom = `${profil.prenom} ${profil.nom}`.trim();

  return (
    <Modal titre={progression ? `Relire et autoriser · ${progression}` : "Relire et autoriser"} onClose={onArreter ?? onClose} large>
      {progression && <p className="meta"><strong>{candidature.offre.employeur}</strong> · {candidature.offre.intitule}</p>}
      <p className="aide">Voici exactement ce qui sera {contenu.canal === "email" ? "envoyé" : "déposé"} en votre nom. Toute modification ultérieure annulera cette autorisation.</p>
      <Erreurs erreurs={[...apercu.erreurs, ...erreurs]} />
      {contenu.canal === "email" && apercu.erreurs.some((e) => /e-mail du recruteur/.test(e)) && (
        <form className="ligne-adresse" onSubmit={(e) => { e.preventDefault(); enregistrerAdresse(); }}>
          <input type="email" required value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Adresse e-mail du recruteur" aria-label="Adresse e-mail du recruteur" />
          <button className="btn">Enregistrer l'adresse</button>
        </form>
      )}
      {!apercu.smtp && contenu.canal === "email" && (
        <p className="alerte attention">Mode simulation : rien ne sera réellement envoyé (le message sera enregistré dans <code>data/outbox</code>).</p>
      )}
      <div className="apercu-mail">
        <dl>
          <div><dt>De</dt><dd>{nom} &lt;{contenu.de || "?"}&gt;</dd></div>
          {contenu.canal === "email" ? (
            <div><dt>À</dt><dd><strong>{contenu.a || "?"}</strong></dd></div>
          ) : (
            <div><dt>Dépôt sur</dt><dd><a href={contenu.url} target="_blank" rel="noreferrer" title={contenu.url}>{hote(contenu.url)} ↗</a></dd></div>
          )}
          <div><dt>Objet</dt><dd>{contenu.objet}</dd></div>
          <div><dt>{contenu.canal === "email" ? "Pièces jointes" : "À joindre"}</dt><dd>
            {contenu.piecesJointes.length ? (
              <ul className="pj">{contenu.piecesJointes.map((d) => <li key={d.nom + d.taille}>📎 {d.nom} <span className="muted">({ko(d.taille)})</span></li>)}</ul>
            ) : "Aucune"}
          </dd></div>
        </dl>
        <pre className="corps-mail">{contenu.message}</pre>
      </div>
      <label className="consentement">
        <input type="checkbox" checked={coche} disabled={bloque} onChange={(e) => setCoche(e.target.checked)} />
        <span>
          J'ai relu cette candidature et j'autorise {contenu.canal === "email" ? <>son envoi en mon nom à <strong>{contenu.a || "(adresse manquante)"}</strong></> : <>son dépôt sur le site de l'employeur</>}.
        </span>
      </label>
      <div className="actions">
        {onArreter && <button className="btn discret" onClick={onArreter}>Arrêter</button>}
        <button className="btn discret" onClick={onClose}>{progression ? "Passer" : "Annuler"}</button>
        {contenu.canal === "email" ? (
          <>
            <button className="btn" disabled={!coche || bloque || envoi} onClick={() => autoriser(false)}>Autoriser, envoyer plus tard</button>
            <button className="btn primaire" disabled={!coche || bloque || envoi} onClick={() => autoriser(true)}>{envoi ? "Envoi…" : "Autoriser et envoyer"}</button>
          </>
        ) : (
          <button className="btn primaire" disabled={!coche || bloque || envoi} onClick={() => autoriser(false)}>Autoriser</button>
        )}
      </div>
      <p className="empreinte" title="Empreinte SHA-256 du contenu autorisé, conservée dans le journal">Empreinte : {apercu.empreinte.slice(0, 16)}…</p>
    </Modal>
  );
}

export function AutoriserPage() {
  const { candidatures, ouvrirCandidature, majCandidature, notifier, config } = useApp();
  const [aRelire, setARelire] = useState<Candidature | null>(null);
  const [lot, setLot] = useState(false);

  const enAttente = candidatures.filter((c) => c.statut === "a_autoriser");
  const [file, setFileBrut] = useState<string[] | null>(null);
  const [totalFile, setTotalFile] = useState(0);
  const setFile = (f: string[] | null) => {
    if (f && !file) setTotalFile(f.length);
    setFileBrut(f);
  };
  const enCours = file ? candidatures.find((c) => c.id === file[0]) : undefined;
  const brouillons = candidatures.filter((c) => c.statut === "brouillon");
  const autorisees = candidatures.filter((c) => c.statut === "autorisee");
  const autoriseesEmail = autorisees.filter((c) => c.canal === "email" && c.autorisationValide);
  const restant = config.reglages.limiteJournaliere ? Math.max(0, config.reglages.limiteJournaliere - config.envoisDuJour) : Infinity;

  const envoyerLot = async () => {
    setLot(true);
    let ok = 0;
    for (const c of autoriseesEmail.slice(0, restant === Infinity ? undefined : restant)) {
      try {
        majCandidature(await api<Candidature>("POST", `/candidatures/${c.id}/envoyer`));
        ok++;
      } catch (e) {
        notifier(`${c.offre.intitule} : ${(e as Error).message}`, "erreur");
        break;
      }
    }
    setLot(false);
    if (ok) notifier(`${ok} candidature${ok > 1 ? "s" : ""} envoyée${ok > 1 ? "s" : ""}.`);
  };

  const Ligne = ({ c, action }: { c: Candidature; action: ReactNode }) => (
    <li className="carte ligne">
      <div>
        <h3>{c.offre.intitule}</h3>
        <p className="meta">
          {c.offre.employeur} · {c.canal === "email" ? c.destinataire || "destinataire à compléter" : "dépôt sur site"} · créée le {dateCourte(c.creeLe)}
        </p>
      </div>
      <div className="actions">
        <button className="btn discret" onClick={() => ouvrirCandidature(c.id)}>Modifier</button>
        {action}
      </div>
    </li>
  );

  return (
    <div className="colonne">
      <section className="intro carte">
        <h1>Rien ne part sans votre accord</h1>
        <p>
          Chaque candidature est préparée automatiquement, puis attend ici votre <strong>autorisation explicite</strong> sur son contenu exact
          (destinataire, objet, lettre, CV). Si vous modifiez quoi que ce soit ensuite, l'autorisation est annulée.
        </p>
      </section>

      <section>
        <div className="barre">
          <h2>En attente de votre autorisation <span className="muted">({enAttente.length})</span></h2>
          {enAttente.length > 1 && <button className="btn primaire" onClick={() => setFile(enAttente.map((c) => c.id))}>Relire les {enAttente.length} à la suite</button>}
        </div>
        {enAttente.length === 0 && <p className="muted">Aucune candidature en attente.</p>}
        <ul className="liste">
          {enAttente.map((c) => (
            <Ligne key={c.id} c={c} action={<button className="btn primaire" onClick={() => setARelire(c)}>Relire et autoriser</button>} />
          ))}
        </ul>
      </section>

      <section>
        <div className="barre">
          <h2>Autorisées, prêtes à partir <span className="muted">({autorisees.length})</span></h2>
          {autoriseesEmail.length > 1 && (
            <button className="btn primaire" disabled={lot || restant === 0} onClick={envoyerLot}>
              {lot ? "Envoi…" : `Envoyer les ${Math.min(autoriseesEmail.length, restant)} autorisées`}
            </button>
          )}
        </div>
        {autorisees.length === 0 && <p className="muted">Aucune.</p>}
        <ul className="liste">
          {autorisees.map((c) => (
            <Ligne
              key={c.id}
              c={c}
              action={
                <>
                  <button className="btn" onClick={async () => majCandidature(await api("POST", `/candidatures/${c.id}/revoquer`))}>Retirer l'autorisation</button>
                  {c.canal === "email" ? (
                    <button className="btn primaire" onClick={async () => {
                      try { majCandidature(await api("POST", `/candidatures/${c.id}/envoyer`)); notifier("Candidature envoyée."); }
                      catch (e) { notifier((e as Error).message, "erreur"); }
                    }}>Envoyer</button>
                  ) : (
                    <button className="btn primaire" onClick={() => ouvrirCandidature(c.id)}>Déposer sur le site</button>
                  )}
                </>
              }
            />
          ))}
        </ul>
      </section>

      {brouillons.length > 0 && (
        <section>
          <h2>Brouillons <span className="muted">({brouillons.length})</span></h2>
          <ul className="liste">
            {brouillons.map((c) => (
              <Ligne key={c.id} c={c} action={<button className="btn" onClick={() => setARelire(c)}>Relire et autoriser</button>} />
            ))}
          </ul>
        </section>
      )}

      {aRelire && <AutorisationModal candidature={aRelire} onClose={() => setARelire(null)} />}
      {file && enCours && (
        <AutorisationModal
          key={enCours.id}
          candidature={enCours}
          progression={`${totalFile - file.length + 1}/${totalFile}`}
          onClose={() => setFile(file.length > 1 ? file.slice(1) : null)}
          onArreter={() => setFile(null)}
        />
      )}
    </div>
  );
}

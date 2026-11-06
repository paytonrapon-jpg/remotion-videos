import { useEffect, useMemo, useState } from "react";
import { api, ApiError, type Candidature, dateCourte, depuis, ko, type Profil, STATUTS, type Statut } from "../api";
import { useApp } from "../App";
import { AutorisationModal } from "./Autoriser";
import { BadgeStatut, Erreurs, Modal } from "./ui";

const GROUPES: { id: string; libelle: string; statuts: Statut[] }[] = [
  { id: "toutes", libelle: "Toutes", statuts: [] },
  { id: "preparation", libelle: "En préparation", statuts: ["brouillon", "a_autoriser", "autorisee"] },
  { id: "envoyees", libelle: "Envoyées", statuts: ["envoyee"] },
  { id: "entretiens", libelle: "Entretiens", statuts: ["entretien"] },
  { id: "closes", libelle: "Clôturées", statuts: ["refusee", "acceptee", "abandonnee"] },
];

export function CandidaturesPage() {
  const { candidatures, candidatureOuverte, ouvrirCandidature, fermerCandidature, aller } = useApp();
  const [groupe, setGroupe] = useState("toutes");

  const stats = useMemo(() => {
    const envoyees = candidatures.filter((c) => c.envoi).length;
    const reponses = candidatures.filter((c) => ["entretien", "refusee", "acceptee"].includes(c.statut)).length;
    return {
      envoyees,
      entretiens: candidatures.filter((c) => c.statut === "entretien" || c.statut === "acceptee").length,
      taux: envoyees ? Math.round((reponses / envoyees) * 100) : 0,
      relances: candidatures.filter((c) => c.relanceDue).length,
    };
  }, [candidatures]);

  const g = GROUPES.find((x) => x.id === groupe)!;
  const liste = g.statuts.length ? candidatures.filter((c) => g.statuts.includes(c.statut)) : candidatures;
  const ouverte = candidatures.find((c) => c.id === candidatureOuverte);

  return (
    <div className="colonne">
      <div className="stats">
        <div className="stat"><strong>{stats.envoyees}</strong><span>envoyées</span></div>
        <div className="stat"><strong>{stats.entretiens}</strong><span>entretiens</span></div>
        <div className="stat"><strong>{stats.taux} %</strong><span>taux de réponse</span></div>
        <div className={`stat ${stats.relances ? "attention" : ""}`}><strong>{stats.relances}</strong><span>à relancer</span></div>
      </div>

      <div className="segments" role="tablist">
        {GROUPES.map((x) => (
          <button key={x.id} role="tab" aria-selected={groupe === x.id} onClick={() => setGroupe(x.id)}>
            {x.libelle} <span className="muted">({x.statuts.length ? candidatures.filter((c) => x.statuts.includes(c.statut)).length : candidatures.length})</span>
          </button>
        ))}
      </div>

      {liste.length === 0 && (
        <div className="vide">
          <p>Aucune candidature ici.</p>
          <button className="btn primaire" onClick={() => aller("offres")}>Parcourir les offres</button>
        </div>
      )}

      <ul className="liste">
        {liste.map((c) => (
          <li key={c.id}>
            <button className="carte ligne cliquable" onClick={() => ouvrirCandidature(c.id)}>
              <div>
                <h3>{c.offre.intitule}</h3>
                <p className="meta">
                  {c.offre.employeur} · {c.offre.lieu}
                  {c.envoi ? <> · envoyée {depuis(c.envoi.at)}</> : <> · créée le {dateCourte(c.creeLe)}</>}
                  {c.relances.length > 0 && <> · {c.relances.length} relance{c.relances.length > 1 ? "s" : ""}</>}
                </p>
              </div>
              <div className="badges">
                {c.relanceDue && <span className="badge attention">À relancer</span>}
                {c.envoi?.mode === "simulation" && <span className="badge neutre">simulation</span>}
                <BadgeStatut statut={c.statut} />
              </div>
            </button>
          </li>
        ))}
      </ul>

      {ouverte && <EditeurCandidature key={ouverte.id} candidature={ouverte} onClose={fermerCandidature} />}
    </div>
  );
}

function EditeurCandidature({ candidature: c, onClose }: { candidature: Candidature; onClose: () => void }) {
  const { majCandidature, notifier, profil, rafraichir } = useApp();
  const [f, setF] = useState({ canal: c.canal, destinataire: c.destinataire, objet: c.objet, message: c.message, joindreCV: c.joindreCV, joindreAnnexes: c.joindreAnnexes, notes: c.notes });
  const [autoriser, setAutoriser] = useState(false);
  const [relance, setRelance] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const modifiable = ["brouillon", "a_autoriser", "autorisee"].includes(c.statut);
  const modifie = f.canal !== c.canal || f.destinataire !== c.destinataire || f.objet !== c.objet || f.message !== c.message || f.joindreCV !== c.joindreCV || f.joindreAnnexes !== c.joindreAnnexes || f.notes !== c.notes;

  useEffect(() => {
    setF({ canal: c.canal, destinataire: c.destinataire, objet: c.objet, message: c.message, joindreCV: c.joindreCV, joindreAnnexes: c.joindreAnnexes, notes: c.notes });
  }, [c.canal, c.destinataire, c.objet, c.message, c.joindreCV, c.joindreAnnexes, c.notes]);

  const appel = async (fn: () => Promise<Candidature>, ok?: string) => {
    try {
      setErreurs([]);
      const r = await fn();
      majCandidature(r);
      if (ok) notifier(ok);
      return r;
    } catch (e) {
      setErreurs(e instanceof ApiError && e.details.length ? e.details : [(e as Error).message]);
    }
  };

  const enregistrer = () =>
    appel(() => api("PUT", `/candidatures/${c.id}`, f), c.statut === "autorisee" && modifie ? "Modifications enregistrées : l'autorisation a été annulée." : "Enregistré.");

  const ouvrirAutorisation = async () => {
    if (modifie) await enregistrer();
    setAutoriser(true);
  };

  const copier = async () => {
    await navigator.clipboard.writeText(f.message);
    notifier("Lettre copiée : collez-la dans le formulaire du site.");
  };

  return (
    <Modal titre={c.offre.intitule} onClose={onClose} large>
      <div className="editeur-tete">
        <p className="meta">{c.offre.employeur} · {c.offre.lieu} · {c.offre.contrat}</p>
        <BadgeStatut statut={c.statut} />
      </div>

      {c.statut === "autorisee" && (
        <p className="alerte info">
          Autorisée le {new Date(c.autorisation!.at).toLocaleString("fr-CH")}. Modifier le contenu annulera l'autorisation.
        </p>
      )}
      <Erreurs erreurs={erreurs} />

      {modifiable ? (
        <div className="grille-form">
          <fieldset className="champ large">
            <legend>Mode de candidature</legend>
            <div className="segments petit">
              <button type="button" aria-pressed={f.canal === "email"} onClick={() => setF({ ...f, canal: "email" })}>Par e-mail</button>
              <button type="button" aria-pressed={f.canal === "site"} disabled={!c.offre.urlCandidature} onClick={() => setF({ ...f, canal: "site" })}>Sur le site de l'employeur</button>
            </div>
          </fieldset>
          {f.canal === "email" ? (
            <label className="champ large">
              <span>Destinataire</span>
              <input type="email" value={f.destinataire} onChange={(e) => setF({ ...f, destinataire: e.target.value })} placeholder="recrutement@structure.fr" />
              {!c.offre.contactEmail && <span className="aide">L'annonce ne donne pas d'e-mail : trouvez-le sur le site de la structure.</span>}
            </label>
          ) : (
            <p className="large aide">
              Après autorisation, ouvrez <a href={c.offre.urlCandidature} target="_blank" rel="noreferrer">le formulaire de l'employeur ↗</a>, collez la lettre, joignez votre CV puis confirmez le dépôt ici.
            </p>
          )}
          <label className="champ large"><span>Objet</span><input value={f.objet} onChange={(e) => setF({ ...f, objet: e.target.value })} /></label>
          <label className="champ large">
            <span>Message / lettre de motivation</span>
            <textarea rows={16} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          </label>
          <label className="case large">
            <input type="checkbox" checked={f.joindreCV} onChange={(e) => setF({ ...f, joindreCV: e.target.checked })} />
            <span>Joindre mon CV {profil.cv ? <span className="muted">({profil.cv.nom})</span> : <span className="ko">— aucun CV dans le profil</span>}</span>
          </label>
          <label className="case large">
            <input type="checkbox" checked={f.joindreAnnexes} disabled={!profil.annexes.length} onChange={(e) => setF({ ...f, joindreAnnexes: e.target.checked })} />
            <span>
              Joindre mes certificats de travail et diplômes{" "}
              <span className="muted">({profil.annexes.length ? `${profil.annexes.length} document${profil.annexes.length > 1 ? "s" : ""}, ${ko(profil.annexes.reduce((t, d) => t + d.taille, 0))}` : "aucun dans le profil"})</span>
            </span>
          </label>
        </div>
      ) : (
        <div className="apercu-mail">
          <dl>
            <div><dt>{c.canal === "email" ? "Envoyée à" : "Déposée sur"}</dt><dd>{c.canal === "email" ? c.destinataire : c.offre.urlCandidature}</dd></div>
            <div><dt>Le</dt><dd>{c.envoi && new Date(c.envoi.at).toLocaleString("fr-CH")} {c.envoi?.mode === "simulation" && <span className="badge neutre">simulation</span>}</dd></div>
            <div><dt>Objet</dt><dd>{c.objet}</dd></div>
          </dl>
          <pre className="corps-mail">{c.message}</pre>
        </div>
      )}

      <label className="champ">
        <span>Notes personnelles (jamais envoyées)</span>
        <textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Contact téléphonique, date d'entretien…" />
      </label>

      <details className="historique">
        <summary>Historique</summary>
        <ul>
          {c.historique.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString("fr-CH")} — {STATUTS[h.statut].libelle}</li>)}
          {c.relances.map((r, i) => <li key={`r${i}`}>{new Date(r.at).toLocaleString("fr-CH")} — Relance envoyée{r.mode === "simulation" ? " (simulation)" : ""}</li>)}
        </ul>
      </details>

      <div className="actions">
        <button className="btn discret danger" onClick={async () => {
          if (!confirm("Supprimer définitivement cette candidature ?")) return;
          await api("DELETE", `/candidatures/${c.id}`);
          await rafraichir();
          onClose();
        }}>Supprimer</button>
        <span className="espace" />
        {modifie && <button className="btn" onClick={enregistrer}>Enregistrer</button>}
        {modifiable && (
          <button className="btn" onClick={() => confirm("Remplacer l'objet et la lettre par une nouvelle version générée depuis votre profil ?") && appel(() => api("POST", `/candidatures/${c.id}/regenerer`), "Lettre régénérée.")}>
            Régénérer la lettre
          </button>
        )}
        {(c.statut === "brouillon" || c.statut === "a_autoriser") && (
          <button className="btn primaire" onClick={ouvrirAutorisation}>Relire et autoriser…</button>
        )}
        {c.statut === "autorisee" && !modifie && c.canal === "email" && (
          <button className="btn primaire" onClick={() => appel(() => api("POST", `/candidatures/${c.id}/envoyer`), "Candidature envoyée.")}>Envoyer maintenant</button>
        )}
        {c.statut === "autorisee" && !modifie && c.canal === "site" && (
          <>
            <button className="btn" onClick={copier}>Copier la lettre</button>
            <button className="btn" onClick={() => imprimerLettre(c, profil)}>Lettre en PDF</button>
            <a className="btn" href={c.offre.urlCandidature} target="_blank" rel="noreferrer">Ouvrir le site ↗</a>
            <button className="btn primaire" onClick={() => appel(() => api("POST", `/candidatures/${c.id}/depot-confirme`), "Dépôt enregistré.")}>J'ai déposé ma candidature</button>
          </>
        )}
        {c.statut === "envoyee" && (
          <>
            {c.canal === "email" && <button className="btn" onClick={() => setRelance(true)}>Relancer…</button>}
            <button className="btn" onClick={() => appel(() => api("POST", `/candidatures/${c.id}/statut`, { statut: "refusee" }))}>Refus reçu</button>
            <button className="btn primaire" onClick={() => appel(() => api("POST", `/candidatures/${c.id}/statut`, { statut: "entretien" }), "Bravo ! Pensez à noter la date.")}>Entretien obtenu</button>
          </>
        )}
        {c.statut === "entretien" && (
          <>
            <button className="btn" onClick={() => appel(() => api("POST", `/candidatures/${c.id}/statut`, { statut: "refusee" }))}>Refus</button>
            <button className="btn primaire" onClick={() => appel(() => api("POST", `/candidatures/${c.id}/statut`, { statut: "acceptee" }), "Félicitations !")}>Poste obtenu</button>
          </>
        )}
        {!modifiable && modifie && <button className="btn primaire" onClick={enregistrer}>Enregistrer les notes</button>}
      </div>

      {autoriser && <AutorisationModal candidature={c} onClose={() => setAutoriser(false)} />}
      {relance && <RelanceModal candidature={c} onClose={() => setRelance(false)} />}
    </Modal>
  );
}

/** Ouvre la lettre mise en page (format suisse) pour l'enregistrer en PDF via l'impression. */
function imprimerLettre(c: Candidature, profil: Profil) {
  const w = window.open("", "_blank");
  if (!w) return;
  const esc = (t: string) => t.replace(/[&<>]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[x]!);
  const exp = [`${profil.prenom} ${profil.nom}`, profil.adresse, [profil.npa, profil.ville].filter(Boolean).join(" "), profil.telephone, profil.email].filter(Boolean);
  const dest = [c.offre.employeur.replace(/\s*\(exemple\)/, ""), c.offre.contactNom, c.offre.lieu].filter(Boolean);
  const date = `${profil.ville || c.offre.lieu.replace(/^\d{4}\s*/, "")}, le ${new Date().toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" })}`;
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Lettre de motivation – ${esc(c.offre.employeur)}</title>
<style>@page{size:A4;margin:22mm 22mm 20mm 25mm}body{font:11pt/1.5 Arial,Helvetica,sans-serif;color:#111;max-width:170mm;margin:2rem auto}
.exp{margin-bottom:12mm}.dest{margin-left:95mm;margin-bottom:10mm}.date{margin-bottom:8mm}.objet{font-weight:bold;margin-bottom:8mm}
.corps{white-space:pre-wrap}@media print{body{margin:0}}</style></head><body>
<div class="exp">${exp.map(esc).join("<br>")}</div><div class="dest">${dest.map(esc).join("<br>")}</div>
<div class="date">${esc(date)}</div><div class="objet">${esc(c.objet)}</div><div class="corps">${esc(c.message)}</div>
<script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

function RelanceModal({ candidature: c, onClose }: { candidature: Candidature; onClose: () => void }) {
  const { majCandidature, notifier, config } = useApp();
  const [f, setF] = useState<{ objet: string; message: string } | null>(null);
  const [coche, setCoche] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api<{ objet: string; message: string }>("GET", `/candidatures/${c.id}/relance`).then(setF, (e) => setErreur(e.message));
  }, [c.id]);

  const envoyer = async () => {
    try {
      const { empreinte } = await api<{ empreinte: string }>("POST", `/candidatures/${c.id}/relance/apercu`, f);
      majCandidature(await api("POST", `/candidatures/${c.id}/relance`, { ...f, empreinte, confirmation: true }));
      notifier("Relance envoyée.");
      onClose();
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  return (
    <Modal titre="Relancer le recruteur" onClose={onClose} large>
      {erreur && <p className="alerte erreur">{erreur}</p>}
      {!config.smtp && <p className="alerte attention">Mode simulation : la relance sera enregistrée dans <code>data/outbox</code>.</p>}
      {f && (
        <>
          <p className="meta">À : <strong>{c.destinataire}</strong></p>
          <label className="champ"><span>Objet</span><input value={f.objet} onChange={(e) => { setF({ ...f, objet: e.target.value }); setCoche(false); }} /></label>
          <label className="champ"><span>Message</span><textarea rows={10} value={f.message} onChange={(e) => { setF({ ...f, message: e.target.value }); setCoche(false); }} /></label>
          <label className="consentement">
            <input type="checkbox" checked={coche} onChange={(e) => setCoche(e.target.checked)} />
            <span>J'ai relu cette relance et j'autorise son envoi en mon nom à <strong>{c.destinataire}</strong>.</span>
          </label>
          <div className="actions">
            <button className="btn discret" onClick={onClose}>Annuler</button>
            <button className="btn primaire" disabled={!coche} onClick={envoyer}>Autoriser et envoyer la relance</button>
          </div>
        </>
      )}
    </Modal>
  );
}

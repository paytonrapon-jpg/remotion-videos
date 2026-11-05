import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type Candidature, type Offre, depuis } from "../api";
import { useApp } from "../App";
import { Modal, Puces, Score } from "./ui";

const ecranEtroit = typeof matchMedia !== "undefined" && matchMedia("(max-width: 860px)").matches;

type Resultat = { mode: "demo" | "api"; total: number; resultats: Offre[] };

export function OffresPage() {
  const { config, profil, notifier, majCandidature, ouvrirCandidature, aller } = useApp();
  const [vue, setVue] = useState<"recherche" | "enregistrees">("recherche");
  const [metiers, setMetiers] = useState<string[]>(profil.metiers);
  const [departement, setDepartement] = useState(profil.departement);
  const [contrats, setContrats] = useState<string[]>(profil.contrats);
  const [motsCles, setMotsCles] = useState("");
  const [tri, setTri] = useState<"score" | "date">("score");
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enregistrees, setEnregistrees] = useState<Offre[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [detail, setDetail] = useState<Offre | null>(null);
  const [ajout, setAjout] = useState(false);

  const rechercher = useCallback(async () => {
    setChargement(true);
    setErreur("");
    try {
      const q = new URLSearchParams({ metiers: metiers.join(","), departement, contrats: contrats.join(","), motsCles, tri });
      setResultat(await api<Resultat>("GET", `/offres/recherche?${q}`));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }, [metiers, departement, contrats, motsCles, tri]);

  const chargerEnregistrees = useCallback(() => api<Offre[]>("GET", "/offres").then(setEnregistrees), []);

  useEffect(() => {
    rechercher();
    chargerEnregistrees();
    // Recherche initiale uniquement ; ensuite via le bouton.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enregistrer = async (o: Offre) => {
    const sauvee = await api<Offre>("POST", "/offres", o);
    setResultat((r) => r && { ...r, resultats: r.resultats.map((x) => (x.externalId === o.externalId ? { ...x, offreId: sauvee.id } : x)) });
    chargerEnregistrees();
    return sauvee;
  };

  const preparer = async (o: Offre) => {
    try {
      const id = o.id ?? o.offreId ?? (await enregistrer(o)).id;
      const c = await api<Candidature>("POST", "/candidatures", { offreId: id });
      majCandidature(c);
      setDetail(null);
      notifier("Brouillon de candidature prêt : relisez-le puis autorisez l'envoi.");
      ouvrirCandidature(c.id);
    } catch (e) {
      notifier((e as Error).message, "erreur");
    }
  };

  const liste = vue === "recherche" ? resultat?.resultats ?? [] : enregistrees;

  return (
    <div className="page-offres">
      <aside className="filtres carte">
        <form onSubmit={(e) => { e.preventDefault(); setVue("recherche"); rechercher(); }}>
          <label className="champ">
            <span>Mots-clés</span>
            <input value={motsCles} onChange={(e) => setMotsCles(e.target.value)} placeholder="MECS, internat, handicap…" />
          </label>
          <label className="champ">
            <span>Département</span>
            <input value={departement} onChange={(e) => setDepartement(e.target.value)} placeholder="ex. 34" maxLength={3} inputMode="numeric" />
          </label>
          <details className="plus-filtres" open={!ecranEtroit}>
          <summary>Métiers et contrats {metiers.length + contrats.length > 0 && <span className="muted">({metiers.length + contrats.length})</span>}</summary>
          <fieldset className="champ">
            <legend>Métiers</legend>
            <Puces
              label="Métiers"
              options={config.referentiel.metiers.map((m) => ({ valeur: m.rome, libelle: m.libelle.split(" / ")[0].split(" (")[0], titre: m.libelle }))}
              valeurs={metiers}
              onChange={setMetiers}
            />
            <p className="aide">Aucun sélectionné = tout le secteur social.</p>
          </fieldset>
          <fieldset className="champ">
            <legend>Contrats</legend>
            <Puces label="Contrats" options={config.referentiel.contrats.map((c) => ({ valeur: c.code, libelle: c.libelle }))} valeurs={contrats} onChange={setContrats} />
          </fieldset>
          </details>
          <label className="champ">
            <span>Trier par</span>
            <select value={tri} onChange={(e) => setTri(e.target.value as "score" | "date")}>
              <option value="score">Compatibilité avec mon profil</option>
              <option value="date">Date de publication</option>
            </select>
          </label>
          <button className="btn primaire plein" disabled={chargement}>{chargement ? "Recherche…" : "Rechercher"}</button>
        </form>
      </aside>

      <section className="resultats">
        <div className="barre">
          <div className="segments" role="tablist">
            <button role="tab" aria-selected={vue === "recherche"} onClick={() => setVue("recherche")}>
              Résultats {resultat && <span className="muted">({resultat.resultats.length})</span>}
            </button>
            <button role="tab" aria-selected={vue === "enregistrees"} onClick={() => setVue("enregistrees")}>
              Enregistrées <span className="muted">({enregistrees.length})</span>
            </button>
          </div>
          <button className="btn" onClick={() => setAjout(true)}>+ Ajouter une offre</button>
        </div>

        {resultat?.mode === "demo" && vue === "recherche" && (
          <p className="alerte info">
            Offres <strong>fictives</strong> de démonstration. Pour les vraies offres, ajoutez vos identifiants France Travail dans le fichier <code>.env</code> (voir le guide).
          </p>
        )}
        {!profil.diplomes.length && (
          <p className="alerte attention">
            Complétez votre <a href="#profil" onClick={() => aller("profil")}>profil</a> (diplômes, département, CV) pour un classement et des lettres personnalisés.
          </p>
        )}
        {erreur && <p className="alerte erreur">{erreur}</p>}
        {!chargement && liste.length === 0 && (
          <div className="vide">
            <p>{vue === "recherche" ? "Aucune offre ne correspond. Élargissez le département ou les métiers." : "Aucune offre enregistrée pour l'instant."}</p>
          </div>
        )}

        <ul className="liste-offres">
          {liste.map((o) => (
            <li key={o.externalId}>
              <button className="carte offre" onClick={() => setDetail(o)}>
                <Score score={o.compat?.score ?? 0} />
                <div className="offre-corps">
                  <h3>{o.intitule}</h3>
                  <p className="meta">
                    {o.employeur} · {o.lieu} · <strong>{o.contrat}</strong> {o.datePublication && <>· {depuis(o.datePublication)}</>}
                  </p>
                  <div className="etiquettes">
                    {o.compat?.raisons.map((r) => <span key={r} className="etiquette ok">{r}</span>)}
                    {o.compat?.alertes.map((r) => <span key={r} className="etiquette ko">{r}</span>)}
                    {o.dejaPostule && <span className="etiquette info">Candidature créée</span>}
                    {(o.offreId || o.id) && !o.dejaPostule && <span className="etiquette">Enregistrée</span>}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {detail && (
        <Modal titre={detail.intitule} onClose={() => setDetail(null)} large>
          <DetailOffre
            offre={detail}
            onPreparer={() => preparer(detail)}
            onEnregistrer={async () => { await enregistrer(detail); notifier("Offre enregistrée."); setDetail(null); }}
            onSupprimer={detail.id ? async () => { await api("DELETE", `/offres/${detail.id}`); chargerEnregistrees(); setDetail(null); } : undefined}
          />
        </Modal>
      )}
      {ajout && (
        <Modal titre="Ajouter une offre trouvée ailleurs" onClose={() => setAjout(false)} large>
          <AjoutOffre
            onAjout={async (o) => {
              const sauvee = await enregistrer(o);
              setAjout(false);
              setVue("enregistrees");
              notifier("Offre ajoutée.");
              setDetail({ ...sauvee });
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function DetailOffre({ offre, onPreparer, onEnregistrer, onSupprimer }: { offre: Offre; onPreparer: () => void; onEnregistrer: () => void; onSupprimer?: () => void }) {
  const { config } = useApp();
  const metier = config.referentiel.metiers.find((m) => m.rome === offre.rome);
  return (
    <div className="detail-offre">
      <p className="meta">
        <strong>{offre.employeur}</strong> · {offre.lieu}
      </p>
      <dl className="faits">
        <div><dt>Contrat</dt><dd>{offre.contratLibelle || offre.contrat || "—"}</dd></div>
        <div><dt>Temps de travail</dt><dd>{offre.dureeTravail || "—"}</dd></div>
        <div><dt>Salaire</dt><dd>{offre.salaire || "—"}</dd></div>
        <div><dt>Expérience</dt><dd>{offre.experience || "—"}</dd></div>
        <div><dt>Métier</dt><dd>{metier?.libelle ?? (offre.rome || "—")}</dd></div>
        <div><dt>Candidature</dt><dd>{offre.contactEmail ? `Par e-mail (${offre.contactEmail})` : offre.urlCandidature ? "Sur le site de l'employeur" : "Contact à trouver"}</dd></div>
      </dl>
      {offre.compat && (
        <div className="etiquettes">
          {offre.compat.raisons.map((r) => <span key={r} className="etiquette ok">{r}</span>)}
          {offre.compat.alertes.map((r) => <span key={r} className="etiquette ko">{r}</span>)}
        </div>
      )}
      <div className="description">{offre.description}</div>
      {offre.urlCandidature && (
        <p><a href={offre.urlCandidature} target="_blank" rel="noreferrer">Voir l'annonce d'origine ↗</a></p>
      )}
      <div className="actions">
        {onSupprimer && <button className="btn discret" onClick={onSupprimer}>Retirer des enregistrées</button>}
        {!offre.id && !offre.offreId && <button className="btn" onClick={onEnregistrer}>Enregistrer</button>}
        <button className="btn primaire" onClick={onPreparer} disabled={offre.dejaPostule}>
          {offre.dejaPostule ? "Candidature déjà créée" : "Préparer ma candidature"}
        </button>
      </div>
      <p className="aide">Préparer ne fait rien partir : vous relirez et autoriserez l'envoi à l'étape suivante.</p>
    </div>
  );
}

function AjoutOffre({ onAjout }: { onAjout: (o: Offre) => Promise<void> }) {
  const { config } = useApp();
  const [f, setF] = useState({ intitule: "", employeur: "", lieu: "", departement: "", contrat: "CDI", rome: "K1207", contactNom: "", contactEmail: "", urlCandidature: "", description: "", salaire: "", dureeTravail: "" });
  const [erreur, setErreur] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await onAjout({ ...f, source: "manuel", externalId: "", contratLibelle: f.contrat, experience: "", diplomesCites: [], datePublication: new Date().toISOString() });
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur");
    }
  };

  return (
    <form className="grille-form" onSubmit={submit}>
      <label className="champ large"><span>Intitulé du poste *</span><input required value={f.intitule} onChange={set("intitule")} /></label>
      <label className="champ"><span>Employeur *</span><input required value={f.employeur} onChange={set("employeur")} /></label>
      <label className="champ"><span>Ville</span><input value={f.lieu} onChange={set("lieu")} /></label>
      <label className="champ"><span>Département</span><input value={f.departement} onChange={set("departement")} maxLength={3} /></label>
      <label className="champ"><span>Contrat</span>
        <select value={f.contrat} onChange={set("contrat")}>{config.referentiel.contrats.map((c) => <option key={c.code} value={c.code}>{c.libelle}</option>)}</select>
      </label>
      <label className="champ large"><span>Métier</span>
        <select value={f.rome} onChange={set("rome")}>{config.referentiel.metiers.map((m) => <option key={m.rome} value={m.rome}>{m.libelle}</option>)}</select>
      </label>
      <label className="champ"><span>Nom du contact</span><input value={f.contactNom} onChange={set("contactNom")} placeholder="Mme Dupont, directrice" /></label>
      <label className="champ"><span>E-mail de candidature</span><input type="email" value={f.contactEmail} onChange={set("contactEmail")} /></label>
      <label className="champ large"><span>Lien de l'annonce</span><input type="url" value={f.urlCandidature} onChange={set("urlCandidature")} placeholder="https://…" /></label>
      <label className="champ large"><span>Texte de l'annonce</span><textarea rows={6} value={f.description} onChange={set("description")} placeholder="Collez l'annonce : les diplômes demandés seront détectés." /></label>
      {erreur && <p className="alerte erreur large">{erreur}</p>}
      <div className="actions large"><button className="btn primaire">Ajouter l'offre</button></div>
    </form>
  );
}

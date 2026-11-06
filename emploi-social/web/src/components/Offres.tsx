import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type Candidature, type Offre, depuis } from "../api";
import { useApp } from "../App";
import { Modal, Puces, Score } from "./ui";

const ecranEtroit = typeof matchMedia !== "undefined" && matchMedia("(max-width: 860px)").matches;
const ROMANDIE = ["GE", "VD", "VS", "FR", "NE", "JU"];
const LANGUES: Record<string, string> = { fr: "Français", de: "Allemand", it: "Italien", en: "Anglais" };

type Resultat = { mode: "demo" | "job-room"; total: number; ecartees: number; pageSuivante?: number | null; resultats: Offre[] };

export function OffresPage() {
  const { config, profil, notifier, majCandidature, ouvrirCandidature, aller } = useApp();
  const [vue, setVue] = useState<"recherche" | "enregistrees">("recherche");
  const [metiers, setMetiers] = useState<string[]>(profil.metiers);
  const [cantons, setCantons] = useState<string[]>(profil.canton ? [profil.canton] : ROMANDIE);
  const [contrat, setContrat] = useState("");
  const [tauxMin, setTauxMin] = useState(profil.tauxMin);
  const [tauxMax, setTauxMax] = useState(profil.tauxMax);
  const [depuisJours, setDepuisJours] = useState(30);
  const [motsCles, setMotsCles] = useState("");
  const [tri, setTri] = useState<"score" | "date">("score");
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [page, setPage] = useState(0);
  const [enregistrees, setEnregistrees] = useState<Offre[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [detail, setDetail] = useState<Offre | null>(null);
  const [ajout, setAjout] = useState(false);

  const rechercher = useCallback(
    async (p = 0) => {
      setChargement(true);
      setErreur("");
      try {
        const q = new URLSearchParams({
          metiers: metiers.join(","), cantons: cantons.join(","), contrat, motsCles, tri,
          tauxMin: String(tauxMin), tauxMax: String(tauxMax), depuis: String(depuisJours), page: String(p),
        });
        const r = await api<Resultat>("GET", `/offres/recherche?${q}`);
        setPage(p);
        setResultat((avant) => (p > 0 && avant ? { ...r, resultats: [...avant.resultats, ...r.resultats] } : r));
      } catch (e) {
        setErreur((e as Error).message);
      } finally {
        setChargement(false);
      }
    },
    [metiers, cantons, contrat, motsCles, tri, tauxMin, tauxMax, depuisJours],
  );

  const chargerEnregistrees = useCallback(() => api<Offre[]>("GET", "/offres").then(setEnregistrees), []);

  useEffect(() => {
    rechercher();
    chargerEnregistrees();
    // Recherche initiale uniquement ; ensuite via le bouton.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      notifier("Brouillon de candidature prêt : relisez-le puis autorisez-le.");
      ouvrirCandidature(c.id);
    } catch (e) {
      notifier((e as Error).message, "erreur");
    }
  };

  const liste = vue === "recherche" ? resultat?.resultats ?? [] : enregistrees;
  const cantonsOptions = config.referentiel.cantons.map((c) => ({ valeur: c.code, libelle: c.code, titre: c.nom }));

  return (
    <div className="page-offres">
      <aside className="filtres carte">
        <form onSubmit={(e) => { e.preventDefault(); setVue("recherche"); rechercher(0); }}>
          <fieldset className="champ">
            <legend>Cantons</legend>
            <div className="raccourcis">
              <button type="button" className="lien" onClick={() => setCantons(ROMANDIE)}>Suisse romande</button>
              <button type="button" className="lien" onClick={() => setCantons([])}>Toute la Suisse</button>
            </div>
            <Puces label="Cantons" options={cantonsOptions} valeurs={cantons} onChange={setCantons} compact />
            {cantons.length === 0 && <p className="aide">Aucun sélectionné = toute la Suisse.</p>}
          </fieldset>
          <fieldset className="champ">
            <legend>Taux d'activité : {tauxMin} – {tauxMax} %</legend>
            <div className="curseurs">
              <input type="range" min={0} max={100} step={10} value={tauxMin} aria-label="Taux minimum" onChange={(e) => setTauxMin(Math.min(Number(e.target.value), tauxMax))} />
              <input type="range" min={0} max={100} step={10} value={tauxMax} aria-label="Taux maximum" onChange={(e) => setTauxMax(Math.max(Number(e.target.value), tauxMin))} />
            </div>
          </fieldset>
          <details className="plus-filtres" open={!ecranEtroit}>
            <summary>Métiers, contrat, date {metiers.length > 0 && <span className="muted">({metiers.length})</span>}</summary>
            <fieldset className="champ">
              <legend>Métiers</legend>
              <Puces
                label="Métiers"
                options={config.referentiel.metiers.map((m) => ({ valeur: m.id, libelle: m.libelle.split(" (")[0].split(" / ")[0], titre: m.libelle }))}
                valeurs={metiers}
                onChange={setMetiers}
              />
              <p className="aide">Aucun sélectionné = tout le social.</p>
            </fieldset>
            <label className="champ">
              <span>Contrat</span>
              <select value={contrat} onChange={(e) => setContrat(e.target.value)}>
                <option value="">Tous</option>
                {config.referentiel.contrats.map((c) => <option key={c.code} value={c.code}>{c.libelle}</option>)}
              </select>
            </label>
            <label className="champ">
              <span>Publiées depuis</span>
              <select value={depuisJours} onChange={(e) => setDepuisJours(Number(e.target.value))}>
                {[3, 7, 14, 30, 60].map((j) => <option key={j} value={j}>{j} jours</option>)}
              </select>
            </label>
            <label className="champ">
              <span>Recherche libre</span>
              <input value={motsCles} onChange={(e) => setMotsCles(e.target.value)} placeholder="ex. curatelle, internat, EMS" />
              <span className="aide">Remplace les métiers ; séparez par des virgules.</span>
            </label>
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
          <p className="alerte info">Mode démonstration : offres <strong>fictives</strong>. Retirez <code>OFFRES_DEMO=1</code> pour les vraies offres suisses.</p>
        )}
        {resultat?.mode === "job-room" && vue === "recherche" && (
          <p className="aide source">
            Source : <a href="https://www.job-room.ch" target="_blank" rel="noreferrer">job-room.ch</a>, bourse de l'emploi publique suisse
            {resultat.ecartees > 0 && <> · {resultat.ecartees} annonce{resultat.ecartees > 1 ? "s" : ""} hors métiers sociaux masquée{resultat.ecartees > 1 ? "s" : ""}</>}
          </p>
        )}
        {(!profil.diplomes.length || !profil.canton) && (
          <p className="alerte attention">
            Complétez votre <a href="#profil" onClick={() => aller("profil")}>profil</a> (canton, diplômes, CV) pour un classement et des lettres personnalisés.
          </p>
        )}
        {erreur && <p className="alerte erreur">{erreur}</p>}
        {!chargement && liste.length === 0 && (
          <div className="vide">
            <p>{vue === "recherche" ? "Aucune offre ne correspond. Élargissez les cantons, le taux ou la période." : "Aucune offre enregistrée pour l'instant."}</p>
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
                    {o.employeur} · {o.lieu} {o.canton && <span className="canton">{o.canton}</span>}
                    {o.taux && <> · <strong>{o.taux}</strong></>}
                    {o.datePublication && <> · {depuis(o.datePublication)}</>}
                  </p>
                  <div className="etiquettes">
                    {o.compat?.raisons.map((r) => <span key={r} className="etiquette ok">{r}</span>)}
                    {o.compat?.alertes.map((r) => <span key={r} className="etiquette ko">{r}</span>)}
                    {o.contactEmail && <span className="etiquette info">E-mail direct</span>}
                    {o.dejaPostule && <span className="etiquette info">Candidature créée</span>}
                    {(o.offreId || o.id) && !o.dejaPostule && <span className="etiquette">Enregistrée</span>}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
        {vue === "recherche" && resultat?.pageSuivante != null && (
          <div className="actions centre-h">
            <button className="btn" disabled={chargement} onClick={() => rechercher(page + 1)}>{chargement ? "Chargement…" : "Afficher plus d'offres"}</button>
          </div>
        )}
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
  const metier = config.referentiel.metiers.find((m) => m.id === offre.metier);
  const canton = config.referentiel.cantons.find((c) => c.code === offre.canton);
  return (
    <div className="detail-offre">
      <p className="meta">
        <strong>{offre.employeur}</strong> · {offre.lieu}{canton && ` (${canton.nom})`}
      </p>
      <dl className="faits">
        <div><dt>Taux d'activité</dt><dd>{offre.taux || "—"}</dd></div>
        <div><dt>Contrat</dt><dd>{offre.contratLibelle || "—"}</dd></div>
        <div><dt>Entrée en fonction</dt><dd>{offre.entree || "À convenir"}</dd></div>
        <div><dt>Métier</dt><dd>{metier?.libelle ?? "—"}</dd></div>
        <div><dt>Langue de l'annonce</dt><dd>{LANGUES[offre.langue] ?? "—"}</dd></div>
        <div><dt>Candidature</dt><dd>{offre.contactEmail ? `Par e-mail (${offre.contactEmail})` : offre.urlCandidature ? "Sur le site de l'employeur" : "Contact à trouver"}</dd></div>
        {offre.contactNom && <div><dt>Contact</dt><dd>{offre.contactNom}{offre.contactTelephone && `, ${offre.contactTelephone}`}</dd></div>}
        {offre.reference && <div><dt>Référence</dt><dd>{offre.reference}</dd></div>}
      </dl>
      {offre.compat && (
        <div className="etiquettes">
          {offre.compat.raisons.map((r) => <span key={r} className="etiquette ok">{r}</span>)}
          {offre.compat.alertes.map((r) => <span key={r} className="etiquette ko">{r}</span>)}
        </div>
      )}
      <div className="description">{offre.description}</div>
      <p className="liens">
        {offre.urlCandidature && <a href={offre.urlCandidature} target="_blank" rel="noreferrer">Annonce complète chez l'employeur ↗</a>}
        {offre.urlAnnonce && offre.urlAnnonce !== offre.urlCandidature && <a href={offre.urlAnnonce} target="_blank" rel="noreferrer">Voir sur job-room.ch ↗</a>}
      </p>
      <div className="actions">
        {onSupprimer && <button className="btn discret" onClick={onSupprimer}>Retirer des enregistrées</button>}
        {!offre.id && !offre.offreId && <button className="btn" onClick={onEnregistrer}>Enregistrer</button>}
        <button className="btn primaire" onClick={onPreparer} disabled={offre.dejaPostule}>
          {offre.dejaPostule ? "Candidature déjà créée" : "Préparer ma candidature"}
        </button>
      </div>
      <p className="aide">Préparer ne fait rien partir : vous relirez et autoriserez chaque candidature à l'étape suivante.</p>
    </div>
  );
}

function AjoutOffre({ onAjout }: { onAjout: (o: Offre) => Promise<void> }) {
  const { config } = useApp();
  const [f, setF] = useState({ intitule: "", employeur: "", lieu: "", canton: "VD", contrat: "indetermine", taux: "", metier: "educ-social", contactNom: "", contactEmail: "", urlCandidature: "", description: "" });
  const [erreur, setErreur] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nombres = (f.taux.match(/\d{1,3}/g) ?? []).map(Number);
    try {
      await onAjout({
        ...f, source: "manuel", externalId: "", reference: "", contratLibelle: "", entree: "", langue: "fr", contactTelephone: "", urlAnnonce: "",
        taux: f.taux ? `${f.taux.replace(/\s*%?\s*$/, "")} %` : "", tauxMin: nombres[0] ?? null, tauxMax: nombres.at(-1) ?? null,
        diplomesCites: [], datePublication: new Date().toISOString(),
      });
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur");
    }
  };

  return (
    <form className="grille-form" onSubmit={submit}>
      <p className="aide large">Pour une annonce vue sur jobup.ch, jobs.ch, sozialinfo.ch, le site d'une fondation…</p>
      <label className="champ large"><span>Intitulé du poste *</span><input required value={f.intitule} onChange={set("intitule")} /></label>
      <label className="champ"><span>Employeur *</span><input required value={f.employeur} onChange={set("employeur")} /></label>
      <label className="champ"><span>Lieu (NPA et localité)</span><input value={f.lieu} onChange={set("lieu")} placeholder="1004 Lausanne" /></label>
      <label className="champ"><span>Canton</span>
        <select value={f.canton} onChange={set("canton")}>{config.referentiel.cantons.map((c) => <option key={c.code} value={c.code}>{c.nom}</option>)}</select>
      </label>
      <label className="champ"><span>Taux d'activité</span><input value={f.taux} onChange={set("taux")} placeholder="80 ou 60–80" /></label>
      <label className="champ"><span>Contrat</span>
        <select value={f.contrat} onChange={set("contrat")}>{config.referentiel.contrats.map((c) => <option key={c.code} value={c.code}>{c.libelle}</option>)}</select>
      </label>
      <label className="champ"><span>Métier</span>
        <select value={f.metier} onChange={set("metier")}>{config.referentiel.metiers.map((m) => <option key={m.id} value={m.id}>{m.libelle}</option>)}</select>
      </label>
      <label className="champ"><span>Nom du contact</span><input value={f.contactNom} onChange={set("contactNom")} placeholder="Mme Rochat" /></label>
      <label className="champ"><span>E-mail de candidature</span><input type="email" value={f.contactEmail} onChange={set("contactEmail")} /></label>
      <label className="champ large"><span>Lien de l'annonce / formulaire</span><input type="url" value={f.urlCandidature} onChange={set("urlCandidature")} placeholder="https://…" /></label>
      <label className="champ large"><span>Texte de l'annonce</span><textarea rows={6} value={f.description} onChange={set("description")} placeholder="Collez l'annonce : les diplômes demandés (ES, HES, CFC ASE…) seront détectés." /></label>
      {erreur && <p className="alerte erreur large">{erreur}</p>}
      <div className="actions large"><button className="btn primaire">Ajouter l'offre</button></div>
    </form>
  );
}

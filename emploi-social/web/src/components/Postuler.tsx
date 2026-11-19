import { useEffect, useState } from "react";
import { api, type Candidature, type CvSuisse, type Offre } from "../api";
import { useApp } from "../App";
import { AutorisationModal } from "./Autoriser";
import { Score } from "./ui";

/** Postuler à partir du lien d'une offre : CV et lettre adaptés à l'employeur. */
export function PostulerPage() {
  const { config, notifier, majCandidature, ouvrirCandidature, aller, profil } = useApp();
  const [url, setUrl] = useState("");
  const [texte, setTexte] = useState("");
  const [modeTexte, setModeTexte] = useState(false);
  const [offre, setOffre] = useState<Offre | null>(null);
  const [cvVide, setCvVide] = useState(false);
  const [occupe, setOccupe] = useState("");
  const [erreur, setErreur] = useState("");
  const [resultat, setResultat] = useState<Candidature | null>(null);
  const [relire, setRelire] = useState(false);

  useEffect(() => {
    api<CvSuisse>("GET", "/cv").then((c) => setCvVide(!c.experiences.length && !c.formations.length));
  }, []);

  const analyser = async () => {
    setErreur("");
    setResultat(null);
    setOccupe("Lecture de l'annonce…");
    try {
      setOffre(await api<Offre>("POST", "/postuler/analyser", modeTexte ? { texte, url } : { url }));
    } catch (e) {
      setErreur((e as Error).message);
      if (!modeTexte) setModeTexte(true);
    } finally {
      setOccupe("");
    }
  };

  const preparer = async () => {
    if (!offre) return;
    setErreur("");
    setOccupe(config.ia ? "Claude adapte votre CV et votre lettre à cette offre… (environ une minute)" : "Adaptation du CV et de la lettre…");
    try {
      const c = await api<Candidature>("POST", "/postuler/preparer", offre);
      majCandidature(c);
      setResultat(c);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe("");
    }
  };

  const champ = (k: keyof Offre, libelle: string, placeholder = "") => (
    <label className="champ">
      <span>{libelle}</span>
      <input value={(offre?.[k] as string) ?? ""} placeholder={placeholder} onChange={(e) => setOffre({ ...offre!, [k]: e.target.value })} />
    </label>
  );

  return (
    <div className="colonne">
      <section className="carte intro">
        <h1>Postuler à partir d'un lien</h1>
        <p>
          Collez le lien d'une annonce (jobup.ch, jobs.ch, job-room.ch, site d'une institution…). L'application lit l'offre, adapte votre CV suisse et
          rédige la lettre pour cet employeur. Vous relisez tout, puis vous autorisez l'envoi.
        </p>
      </section>

      <section className="carte">
        <form onSubmit={(e) => { e.preventDefault(); analyser(); }}>
          <label className="champ">
            <span>Lien de l'offre</span>
            <div className="ligne-adresse sans-marge">
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.jobup.ch/fr/emplois/detail/…" required={!modeTexte} />
              <button className="btn primaire" disabled={Boolean(occupe) || (!url && !texte)}>Lire l'annonce</button>
            </div>
          </label>
          <button type="button" className="lien" onClick={() => setModeTexte(!modeTexte)}>{modeTexte ? "Masquer le texte" : "Le site ne s'ouvre pas ? Collez le texte de l'annonce"}</button>
          {modeTexte && (
            <label className="champ" style={{ marginTop: "0.7rem" }}>
              <span>Texte de l'annonce</span>
              <textarea rows={8} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Copiez tout le texte de l'annonce ici (intitulé en première ligne)." />
            </label>
          )}
        </form>
        {occupe && <p className="alerte info">{occupe}</p>}
        {erreur && <p className="alerte erreur">{erreur}</p>}
      </section>

      {cvVide && (
        <p className="alerte attention">
          Votre <a href="#cv" onClick={() => aller("cv")}>CV au format suisse</a> est vide : remplissez-le ou importez votre CV pour qu'il soit adapté à chaque offre.
          {profil.cv ? " En attendant, le CV de votre profil sera joint tel quel." : ""}
        </p>
      )}

      {offre && !resultat && (
        <section className="carte">
          <div className="offre-tete">
            {offre.compat && <Score score={offre.compat.score} />}
            <div>
              <h2 className="sans-marge">{offre.intitule}</h2>
              <p className="meta">{offre.employeur} · {offre.lieu} {offre.taux && <>· <strong>{offre.taux}</strong></>} {offre.distanceKm != null && <>· à {offre.distanceKm} km</>}</p>
            </div>
          </div>
          {offre.compat && (
            <div className="etiquettes">
              {offre.compat.raisons.map((r) => <span key={r} className="etiquette ok">{r}</span>)}
              {offre.compat.alertes.map((r) => <span key={r} className="etiquette ko">{r}</span>)}
            </div>
          )}
          {offre.dejaPostule && <p className="alerte attention">Vous avez déjà préparé une candidature pour cette offre.</p>}
          <p className="aide">Vérifiez et complétez ce qui a été lu :</p>
          <div className="grille-form">
            {champ("intitule", "Poste")}
            {champ("employeur", "Employeur")}
            {champ("lieu", "Lieu", "1004 Lausanne")}
            {champ("taux", "Taux", "80 %")}
            {champ("contactNom", "Personne de contact", "Mme Rochat")}
            {champ("contactEmail", "E-mail de candidature", "Sinon : dépôt sur le site")}
          </div>
          <details>
            <summary>Texte de l'annonce ({offre.description.length} caractères)</summary>
            <div className="description">{offre.description}</div>
          </details>
          <div className="actions">
            <button className="btn primaire" disabled={Boolean(occupe)} onClick={preparer}>
              {config.ia ? "Adapter mon CV et ma lettre (Claude)" : "Adapter mon CV et ma lettre"}
            </button>
          </div>
          {!config.ia && <p className="aide">Adaptation simple (titre, ordre des compétences et missions selon les mots de l'annonce). Ajoutez une clé ANTHROPIC_API_KEY dans .env pour une réécriture par Claude.</p>}
        </section>
      )}

      {resultat && (
        <section className="carte">
          <h2>Candidature prête à relire</h2>
          <p className="meta">{resultat.offre.intitule} · {resultat.offre.employeur}</p>
          {resultat.adaptation && (
            <div className="grille-2">
              <div>
                <h3>Ce qui a été adapté {resultat.adaptation.mode === "ia" ? "par Claude" : ""}</h3>
                <ul>{resultat.adaptation.changements.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
              {resultat.adaptation.pointsAttention.length > 0 && (
                <div className="alerte attention">
                  <strong>À vérifier</strong>
                  <ul>{resultat.adaptation.pointsAttention.map((c) => <li key={c}>{c}</li>)}</ul>
                </div>
              )}
            </div>
          )}
          <div className="grille-2 apercus">
            <div>
              <h3>Lettre de motivation</h3>
              <pre className="corps-mail cadre">{resultat.message}</pre>
            </div>
            <div>
              <h3>CV adapté</h3>
              {resultat.cvFichier ? <iframe title="CV adapté" src={`/api/candidatures/${resultat.id}/cv.pdf`} className="cadre-pdf" /> : <p className="muted">Pas de CV suisse : le CV du profil sera joint.</p>}
            </div>
          </div>
          <div className="actions">
            <button className="btn discret" onClick={() => { setResultat(null); setOffre(null); setUrl(""); setTexte(""); }}>Nouvelle offre</button>
            <button className="btn" onClick={() => ouvrirCandidature(resultat.id)}>Modifier la lettre ou le CV</button>
            <button className="btn primaire" onClick={() => setRelire(true)}>Relire et autoriser…</button>
          </div>
        </section>
      )}

      {relire && resultat && (
        <AutorisationModal
          candidature={resultat}
          onClose={() => {
            setRelire(false);
            notifier("Retrouvez cette candidature dans « Mes candidatures ».");
          }}
        />
      )}
    </div>
  );
}

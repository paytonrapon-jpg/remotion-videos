import { useEffect, useRef, useState } from "react";
import { api, ApiError, type CvSuisse, type Experience, type Formation, NIVEAUX_LANGUE, type Profil } from "../api";
import { useApp } from "../App";

type Import = { cv: CvSuisse; identite: Partial<Profil>; mode: "ia" | "regles" | "json"; avertissement?: string };

/** CV au format suisse : saisie, import d'un CV existant, export PDF. */
export function CvPage() {
  const { profil, setProfil, notifier, config, aller } = useApp();
  const [cv, setCv] = useState<CvSuisse | null>(null);
  const [enregistre, setEnregistre] = useState("");
  const [importInfo, setImportInfo] = useState<Import | null>(null);
  const [occupe, setOccupe] = useState("");
  const [apercu, setApercu] = useState(0);
  const fichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<CvSuisse>("GET", "/cv").then((c) => {
      setCv(c);
      setEnregistre(JSON.stringify(c));
    });
  }, []);

  if (!cv) return <p className="muted centre">Chargement…</p>;
  const modifie = JSON.stringify(cv) !== enregistre;
  const set = <K extends keyof CvSuisse>(k: K, v: CvSuisse[K]) => setCv({ ...cv, [k]: v });

  const enregistrer = async () => {
    const c = await api<CvSuisse>("PUT", "/cv", cv);
    setCv(c);
    setEnregistre(JSON.stringify(c));
    setImportInfo(null);
    setApercu(Date.now());
    notifier("CV enregistré.");
  };

  const importer = async (f: File) => {
    setOccupe(config.ia ? "Lecture du CV par Claude…" : "Lecture du CV…");
    try {
      const fd = new FormData();
      fd.append("fichier", f);
      const r = await api<Import>("POST", "/cv/import", fd);
      setCv({ ...r.cv, photo: cv.photo });
      setImportInfo(r);
      // Coordonnées trouvées dans le CV : complète seulement les champs vides du profil.
      const manquants = Object.fromEntries(Object.entries(r.identite ?? {}).filter(([k, v]) => v && !profil[k as keyof Profil]));
      if (Object.keys(manquants).length) setProfil(await api<Profil>("PUT", "/profil", manquants));
    } catch (e) {
      notifier(e instanceof ApiError ? e.message : "Import impossible.", "erreur");
    } finally {
      setOccupe("");
      if (fichier.current) fichier.current.value = "";
    }
  };

  const photo = async (f: File) => {
    const fd = new FormData();
    fd.append("photo", f);
    try {
      const c = await api<CvSuisse>("POST", "/cv/photo", fd);
      setCv({ ...cv, photo: c.photo });
      setEnregistre(JSON.stringify({ ...JSON.parse(enregistre), photo: c.photo }));
      setApercu(Date.now());
    } catch (e) {
      notifier((e as Error).message, "erreur");
    }
  };

  const utiliser = async () => {
    if (modifie) await enregistrer();
    setOccupe("Génération du PDF…");
    try {
      setProfil(await api<Profil>("POST", "/cv/utiliser"));
      notifier("Ce CV sera joint à vos prochaines candidatures.");
    } finally {
      setOccupe("");
    }
  };

  const majExp = (i: number, e: Partial<Experience>) => set("experiences", cv.experiences.map((x, j) => (j === i ? { ...x, ...e } : x)));
  const majForm = (i: number, f: Partial<Formation>) => set("formations", cv.formations.map((x, j) => (j === i ? { ...x, ...f } : x)));
  const deplacer = <T,>(l: T[], i: number, d: number) => {
    const c = [...l];
    const [x] = c.splice(i, 1);
    c.splice(Math.max(0, Math.min(c.length, i + d)), 0, x);
    return c;
  };

  return (
    <div className="page-cv">
      <div className="colonne cv-edition">
        <section className="carte intro">
          <div className="barre">
            <h1>Mon CV au format suisse</h1>
            <div className="actions sans-marge">
              <button className="btn" onClick={() => fichier.current?.click()} disabled={Boolean(occupe)}>Importer un CV</button>
              <a className="btn" href="/api/cv/pdf" download>Télécharger le PDF</a>
            </div>
          </div>
          <p>
            Données personnelles, photo facultative, expériences antichronologiques avec taux d'activité, langues avec niveau (CECR), références.
            Importez votre CV actuel (PDF ou Word) pour le reprendre ici, puis vérifiez chaque rubrique.
          </p>
          <input ref={fichier} type="file" hidden accept=".pdf,.docx,.txt,.json" onChange={(e) => e.target.files?.[0] && importer(e.target.files[0])} />
          {occupe && <p className="alerte info">{occupe}</p>}
          {importInfo && (
            <p className="alerte attention">
              CV importé {importInfo.mode === "ia" ? "par Claude" : importInfo.mode === "json" ? "depuis une sauvegarde" : "automatiquement"} : <strong>vérifiez chaque rubrique</strong>, puis enregistrez.
              {importInfo.mode === "regles" && " La lecture automatique peut mal découper certaines lignes."}
              {importInfo.avertissement && ` ${importInfo.avertissement}`}
            </p>
          )}
        </section>

        <section className="carte">
          <h2>En-tête</h2>
          <p className="aide">Nom, adresse, téléphone, e-mail, permis de travail et de conduire viennent de votre <a href="#profil" onClick={() => aller("profil")}>profil</a>.</p>
          <div className="grille-form">
            <label className="champ large"><span>Titre du CV</span><input value={cv.titre} onChange={(e) => set("titre", e.target.value)} placeholder="Éducatrice sociale HES" /></label>
            <label className="champ"><span>Date de naissance</span><input value={cv.dateNaissance} onChange={(e) => set("dateNaissance", e.target.value)} placeholder="12.03.1990" /></label>
            <label className="champ"><span>Nationalité</span><input value={cv.nationalite} onChange={(e) => set("nationalite", e.target.value)} placeholder="Suisse" /></label>
            <label className="champ"><span>État civil (facultatif)</span><input value={cv.etatCivil} onChange={(e) => set("etatCivil", e.target.value)} placeholder="Mariée, 2 enfants" /></label>
            <div className="champ">
              <span>Photo (facultative, courante en Suisse)</span>
              <div className="photo-ligne">
                {cv.photo && <img src={`/api/cv/photo?v=${apercu}`} alt="Photo du CV" className="photo-mini" />}
                <label className="btn">{cv.photo ? "Changer" : "Ajouter"}<input type="file" hidden accept="image/jpeg,image/png" onChange={(e) => e.target.files?.[0] && photo(e.target.files[0])} /></label>
                {cv.photo && <button className="btn discret" onClick={async () => { const c = await api<CvSuisse>("DELETE", "/cv/photo"); setCv({ ...cv, photo: c.photo }); }}>Retirer</button>}
              </div>
            </div>
          </div>
          <label className="champ">
            <span>Profil (accroche)</span>
            <textarea rows={3} value={cv.accroche} onChange={(e) => set("accroche", e.target.value)} placeholder="Travailleuse sociale HES avec 5 ans d'expérience en protection de l'enfance…" />
          </label>
        </section>

        <section className="carte">
          <div className="barre"><h2>Expérience professionnelle</h2><button className="btn" onClick={() => set("experiences", [{ poste: "", employeur: "", lieu: "", debut: "", fin: "aujourd'hui", taux: "", missions: "" }, ...cv.experiences])}>+ Ajouter</button></div>
          <p className="aide">Du plus récent au plus ancien. Dates au format MM.AAAA.</p>
          {cv.experiences.map((e, i) => (
            <fieldset key={i} className="bloc">
              <div className="grille-form">
                <label className="champ large"><span>Poste</span><input value={e.poste} onChange={(ev) => majExp(i, { poste: ev.target.value })} /></label>
                <label className="champ"><span>Employeur</span><input value={e.employeur} onChange={(ev) => majExp(i, { employeur: ev.target.value })} /></label>
                <label className="champ"><span>Lieu</span><input value={e.lieu} onChange={(ev) => majExp(i, { lieu: ev.target.value })} /></label>
                <label className="champ"><span>Début</span><input value={e.debut} onChange={(ev) => majExp(i, { debut: ev.target.value })} placeholder="03.2021" /></label>
                <label className="champ"><span>Fin</span><input value={e.fin} onChange={(ev) => majExp(i, { fin: ev.target.value })} placeholder="aujourd'hui" /></label>
                <label className="champ"><span>Taux</span><input value={e.taux} onChange={(ev) => majExp(i, { taux: ev.target.value })} placeholder="80 %" /></label>
                <label className="champ large"><span>Missions (une par ligne)</span><textarea rows={3} value={e.missions} onChange={(ev) => majExp(i, { missions: ev.target.value })} /></label>
              </div>
              <div className="actions sans-marge">
                <button className="btn discret" disabled={i === 0} onClick={() => set("experiences", deplacer(cv.experiences, i, -1))}>↑</button>
                <button className="btn discret" disabled={i === cv.experiences.length - 1} onClick={() => set("experiences", deplacer(cv.experiences, i, 1))}>↓</button>
                <button className="btn discret danger" onClick={() => set("experiences", cv.experiences.filter((_, j) => j !== i))}>Supprimer</button>
              </div>
            </fieldset>
          ))}
        </section>

        <section className="carte">
          <div className="barre"><h2>Formation</h2><button className="btn" onClick={() => set("formations", [{ titre: "", ecole: "", lieu: "", debut: "", fin: "" }, ...cv.formations])}>+ Ajouter</button></div>
          {cv.formations.map((f, i) => (
            <fieldset key={i} className="bloc">
              <div className="grille-form">
                <label className="champ large"><span>Diplôme / formation</span><input value={f.titre} onChange={(ev) => majForm(i, { titre: ev.target.value })} placeholder="Bachelor HES en travail social" /></label>
                <label className="champ"><span>École</span><input value={f.ecole} onChange={(ev) => majForm(i, { ecole: ev.target.value })} placeholder="HETSL" /></label>
                <label className="champ"><span>Lieu</span><input value={f.lieu} onChange={(ev) => majForm(i, { lieu: ev.target.value })} /></label>
                <label className="champ"><span>Début</span><input value={f.debut} onChange={(ev) => majForm(i, { debut: ev.target.value })} placeholder="2016" /></label>
                <label className="champ"><span>Fin / obtention</span><input value={f.fin} onChange={(ev) => majForm(i, { fin: ev.target.value })} placeholder="2019" /></label>
              </div>
              <div className="actions sans-marge">
                <button className="btn discret danger" onClick={() => set("formations", cv.formations.filter((_, j) => j !== i))}>Supprimer</button>
              </div>
            </fieldset>
          ))}
        </section>

        <section className="carte">
          <h2>Compétences</h2>
          <label className="champ">
            <span>Une compétence par ligne</span>
            <textarea rows={5} value={cv.competences.join("\n")} onChange={(e) => set("competences", e.target.value.split("\n"))} placeholder={"Soutien à la parentalité\nConduite d'entretiens\nTravail en réseau"} />
          </label>
          <h3>Langues</h3>
          {cv.langues.map((l, i) => (
            <div key={i} className="ligne-langue">
              <input value={l.langue} aria-label="Langue" onChange={(e) => set("langues", cv.langues.map((x, j) => (j === i ? { ...x, langue: e.target.value } : x)))} />
              <select value={NIVEAUX_LANGUE.includes(l.niveau) ? l.niveau : ""} aria-label="Niveau" onChange={(e) => set("langues", cv.langues.map((x, j) => (j === i ? { ...x, niveau: e.target.value } : x)))}>
                <option value="">{l.niveau && !NIVEAUX_LANGUE.includes(l.niveau) ? l.niveau : "Niveau…"}</option>
                {NIVEAUX_LANGUE.map((n) => <option key={n}>{n}</option>)}
              </select>
              <button className="btn-icone" aria-label={`Retirer ${l.langue}`} onClick={() => set("langues", cv.langues.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="btn" onClick={() => set("langues", [...cv.langues, { langue: "", niveau: "" }])}>+ Langue</button>
          <div className="grille-form" style={{ marginTop: "1rem" }}>
            <label className="champ"><span>Informatique</span><input value={cv.informatique} onChange={(e) => set("informatique", e.target.value)} placeholder="Suite Office, logiciels métiers" /></label>
            <label className="champ"><span>Centres d'intérêt</span><input value={cv.interets} onChange={(e) => set("interets", e.target.value)} /></label>
          </div>
        </section>

        <section className="carte">
          <h2>Références</h2>
          <label className="case"><input type="checkbox" checked={cv.referencesSurDemande} onChange={(e) => set("referencesSurDemande", e.target.checked)} /><span>« Références disponibles sur demande »</span></label>
          {!cv.referencesSurDemande && (
            <>
              {cv.references.map((r, i) => (
                <div key={i} className="grille-form bloc">
                  {(["nom", "fonction", "structure", "telephone", "email"] as const).map((k) => (
                    <label key={k} className="champ"><span>{{ nom: "Nom", fonction: "Fonction", structure: "Structure", telephone: "Téléphone", email: "E-mail" }[k]}</span>
                      <input value={r[k]} onChange={(e) => set("references", cv.references.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
                    </label>
                  ))}
                </div>
              ))}
              <button className="btn" onClick={() => set("references", [...cv.references, { nom: "", fonction: "", structure: "", telephone: "", email: "" }])}>+ Référence</button>
            </>
          )}
        </section>

        <div className="barre-collante">
          <span className="muted">{modifie ? "Modifications non enregistrées" : "À jour"}</span>
          <div className="actions sans-marge">
            <a className="btn discret" href="/api/cv/json" download>Sauvegarde (.json)</a>
            <button className="btn" onClick={utiliser} disabled={Boolean(occupe)}>Joindre ce CV aux candidatures</button>
            <button className="btn primaire" disabled={!modifie} onClick={() => enregistrer().catch((e) => notifier(e.message, "erreur"))}>Enregistrer</button>
          </div>
        </div>
      </div>

      <aside className="cv-apercu">
        <div className="barre"><strong>Aperçu</strong><span className="aide sans-marge">{modifie ? "Enregistrez pour mettre à jour" : ""}</span></div>
        <iframe key={apercu} title="Aperçu du CV" src={`/api/cv/pdf?apercu=1&v=${apercu}`} />
      </aside>
    </div>
  );
}

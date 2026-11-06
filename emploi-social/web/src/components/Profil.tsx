import { useState, type FormEvent } from "react";
import { api, ko, type Profil } from "../api";
import { useApp } from "../App";
import { Puces } from "./ui";

const LANGUES = [
  { valeur: "fr", libelle: "Français" },
  { valeur: "de", libelle: "Allemand" },
  { valeur: "it", libelle: "Italien" },
  { valeur: "en", libelle: "Anglais" },
];

export function ProfilPage() {
  const { profil, setProfil, config, notifier } = useApp();
  const [f, setF] = useState<Profil>(profil);
  const [envoi, setEnvoi] = useState(false);
  const champsEdites = { ...f, cv: profil.cv, annexes: profil.annexes };
  const modifie = JSON.stringify(champsEdites) !== JSON.stringify(profil);
  const txt = (k: keyof Profil) => ({
    value: f[k] as string,
    onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }),
  });

  const appliquer = (p: Profil) => {
    setProfil(p);
    setF((actuel) => ({ ...actuel, cv: p.cv, annexes: p.annexes }));
  };

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const p = await api<Profil>("PUT", "/profil", f);
      setProfil(p);
      setF(p);
      notifier("Profil enregistré.");
    } catch (err) {
      notifier((err as Error).message, "erreur");
    }
  };

  const televerser = async (url: string, champ: string, fichiers: FileList) => {
    setEnvoi(true);
    try {
      const fd = new FormData();
      for (const fichier of Array.from(fichiers)) fd.append(champ, fichier);
      appliquer(await api<Profil>("POST", url, fd));
      notifier("Document enregistré. Les candidatures déjà autorisées qui le joignent devront être ré-autorisées.");
    } catch (err) {
      notifier((err as Error).message, "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const etapes = [
    { ok: Boolean(f.prenom && f.nom && f.email), libelle: "Identité et e-mail" },
    { ok: Boolean(f.canton), libelle: "Canton" },
    { ok: Boolean(f.permisTravail), libelle: "Autorisation de travail" },
    { ok: f.diplomes.length > 0, libelle: "Diplômes" },
    { ok: f.metiers.length > 0, libelle: "Métiers recherchés" },
    { ok: Boolean(f.experiences), libelle: "Expériences" },
    { ok: Boolean(profil.cv), libelle: "CV" },
    { ok: profil.annexes.length > 0, libelle: "Certificats de travail" },
  ];
  const pct = Math.round((etapes.filter((e) => e.ok).length / etapes.length) * 100);

  return (
    <form className="colonne profil" onSubmit={enregistrer}>
      <section className="carte progression">
        <div className="barre">
          <h1>Mon profil</h1>
          <strong>{pct} %</strong>
        </div>
        <div className="jauge" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /></div>
        <ul className="etapes">
          {etapes.map((e) => <li key={e.libelle} className={e.ok ? "ok" : ""}>{e.ok ? "✓" : "○"} {e.libelle}</li>)}
        </ul>
        <p className="aide">Ces informations servent à classer les offres et à rédiger vos lettres. Elles restent sur votre ordinateur.</p>
      </section>

      <section className="carte">
        <h2>Identité</h2>
        <div className="grille-form">
          <label className="champ"><span>Prénom</span><input {...txt("prenom")} autoComplete="given-name" /></label>
          <label className="champ"><span>Nom</span><input {...txt("nom")} autoComplete="family-name" /></label>
          <label className="champ"><span>E-mail</span><input type="email" {...txt("email")} autoComplete="email" /></label>
          <label className="champ"><span>Téléphone</span><input type="tel" {...txt("telephone")} autoComplete="tel" placeholder="+41 79 123 45 67" /></label>
          <label className="champ large"><span>Adresse</span><input {...txt("adresse")} autoComplete="street-address" /></label>
          <label className="champ"><span>NPA</span><input {...txt("npa")} autoComplete="postal-code" inputMode="numeric" maxLength={5} /></label>
          <label className="champ"><span>Localité</span><input {...txt("ville")} autoComplete="address-level2" /></label>
          <label className="champ"><span>Canton de travail souhaité</span>
            <select {...txt("canton")}>
              <option value="">—</option>
              {config.referentiel.cantons.map((c) => <option key={c.code} value={c.code}>{c.nom}</option>)}
            </select>
          </label>
          <label className="champ"><span>Autorisation de travail</span>
            <select {...txt("permisTravail")}>
              <option value="">—</option>
              {config.referentiel.permisTravail.map((p) => <option key={p.code} value={p.code}>{p.libelle}</option>)}
            </select>
          </label>
          <label className="case"><input type="checkbox" checked={f.permisConduire} onChange={(e) => setF({ ...f, permisConduire: e.target.checked })} /><span>Permis de conduire</span></label>
          <label className="case"><input type="checkbox" checked={f.vehicule} onChange={(e) => setF({ ...f, vehicule: e.target.checked })} /><span>Véhicule</span></label>
        </div>
      </section>

      <section className="carte">
        <h2>Diplômes et titres</h2>
        <Puces label="Diplômes" options={config.referentiel.diplomes.map((d) => ({ valeur: d.code, libelle: d.libelle }))} valeurs={f.diplomes} onChange={(diplomes) => setF({ ...f, diplomes })} />
        <p className="aide">Diplôme étranger ? Pour beaucoup de postes, la reconnaissance du SEFRI (ou de la CRS pour la santé) est demandée.</p>
      </section>

      <section className="carte">
        <h2>Ce que je recherche</h2>
        <fieldset className="champ">
          <legend>Métiers</legend>
          <Puces label="Métiers" options={config.referentiel.metiers.map((m) => ({ valeur: m.id, libelle: m.libelle }))} valeurs={f.metiers} onChange={(metiers) => setF({ ...f, metiers })} />
        </fieldset>
        <fieldset className="champ">
          <legend>Taux d'activité souhaité : {f.tauxMin} – {f.tauxMax} %</legend>
          <div className="curseurs">
            <input type="range" min={10} max={100} step={10} value={f.tauxMin} aria-label="Taux minimum" onChange={(e) => setF({ ...f, tauxMin: Math.min(Number(e.target.value), f.tauxMax) })} />
            <input type="range" min={10} max={100} step={10} value={f.tauxMax} aria-label="Taux maximum" onChange={(e) => setF({ ...f, tauxMax: Math.max(Number(e.target.value), f.tauxMin) })} />
          </div>
        </fieldset>
        <fieldset className="champ">
          <legend>Langues de travail</legend>
          <Puces label="Langues" options={LANGUES} valeurs={f.langues} onChange={(langues) => setF({ ...f, langues })} />
          <p className="aide">Les annonces dans une autre langue sont signalées.</p>
        </fieldset>
      </section>

      <section className="carte">
        <h2>Pour personnaliser mes lettres</h2>
        <label className="champ">
          <span>Expériences marquantes</span>
          <textarea rows={3} {...txt("experiences")} placeholder="ex. trois ans en foyer pour adolescent·e·s, un stage en institution pour adultes polyhandicapés et des remplacements en EMS" />
          <span className="aide">Une phrase qui suit « je m'appuie sur les expériences suivantes : … »</span>
        </label>
        <label className="champ">
          <span>Compétences et atouts</span>
          <textarea rows={2} {...txt("competences")} placeholder="ex. conduite d'entretiens, rédaction de rapports, approche TEACCH, connaissance du réseau vaudois" />
        </label>
        <label className="champ">
          <span>Paragraphe de motivation (facultatif)</span>
          <textarea rows={3} {...txt("motivations")} placeholder="Laissez vide pour un paragraphe adapté automatiquement à chaque métier." />
        </label>
      </section>

      <section className="carte">
        <h2>Dossier de candidature</h2>
        <p className="aide">En Suisse, on joint en général le CV, les certificats de travail et les copies des diplômes. PDF recommandé, 5 Mo maximum par fichier.</p>
        <h3>CV</h3>
        {profil.cv ? (
          <ul className="documents"><li><a href="/api/profil/cv">📎 {profil.cv.nom}</a> <span className="muted">{ko(profil.cv.taille)}</span></li></ul>
        ) : (
          <p className="muted">Aucun CV.</p>
        )}
        <label className="btn">
          {envoi ? "Envoi…" : profil.cv ? "Remplacer le CV" : "Ajouter mon CV"}
          <input type="file" accept=".pdf,.doc,.docx,.odt" hidden onChange={(e) => e.target.files?.length && televerser("/profil/cv", "cv", e.target.files)} />
        </label>

        <h3 style={{ marginTop: "1.2rem" }}>Certificats de travail et diplômes</h3>
        {profil.annexes.length === 0 && <p className="muted">Aucun document.</p>}
        <ul className="documents">
          {profil.annexes.map((d) => (
            <li key={d.fichier}>
              <a href={`/api/profil/annexes/${d.fichier}`}>📎 {d.nom}</a>
              <span>
                <span className="muted">{ko(d.taille)}</span>{" "}
                <button type="button" className="btn-icone" aria-label={`Retirer ${d.nom}`} onClick={async () => appliquer(await api<Profil>("DELETE", `/profil/annexes/${d.fichier}`))}>✕</button>
              </span>
            </li>
          ))}
        </ul>
        <label className="btn">
          + Ajouter des documents
          <input type="file" multiple accept=".pdf,.doc,.docx,.odt" hidden onChange={(e) => e.target.files?.length && televerser("/profil/annexes", "documents", e.target.files)} />
        </label>
      </section>

      <div className="barre-collante">
        <span className="muted">{modifie ? "Modifications non enregistrées" : "À jour"}</span>
        <button className="btn primaire" disabled={!modifie}>Enregistrer le profil</button>
      </div>
    </form>
  );
}

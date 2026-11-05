import { useState, type FormEvent } from "react";
import { api, type Profil } from "../api";
import { useApp } from "../App";
import { Puces } from "./ui";

export function ProfilPage() {
  const { profil, setProfil, config, notifier } = useApp();
  const [f, setF] = useState<Profil>(profil);
  const [envoiCV, setEnvoiCV] = useState(false);
  const modifie = JSON.stringify(f) !== JSON.stringify(profil);
  const txt = (k: keyof Profil) => ({
    value: f[k] as string,
    onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }),
  });

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

  const televerser = async (file: File) => {
    setEnvoiCV(true);
    try {
      const fd = new FormData();
      fd.append("cv", file);
      const p = await api<Profil>("POST", "/profil/cv", fd);
      setProfil(p);
      setF({ ...f, cv: p.cv });
      notifier("CV enregistré. Les candidatures déjà autorisées devront être ré-autorisées.");
    } catch (err) {
      notifier((err as Error).message, "erreur");
    } finally {
      setEnvoiCV(false);
    }
  };

  const etapes = [
    { ok: Boolean(f.prenom && f.nom && f.email), libelle: "Identité et e-mail" },
    { ok: Boolean(f.departement), libelle: "Département" },
    { ok: f.diplomes.length > 0, libelle: "Diplômes" },
    { ok: f.metiers.length > 0, libelle: "Métiers recherchés" },
    { ok: Boolean(f.experiences), libelle: "Expériences" },
    { ok: Boolean(profil.cv), libelle: "CV" },
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
          <label className="champ"><span>Téléphone</span><input type="tel" {...txt("telephone")} autoComplete="tel" /></label>
          <label className="champ"><span>Ville</span><input {...txt("ville")} autoComplete="address-level2" /></label>
          <label className="champ"><span>Département</span><input {...txt("departement")} maxLength={3} placeholder="ex. 34" /></label>
          <label className="case"><input type="checkbox" checked={f.permis} onChange={(e) => setF({ ...f, permis: e.target.checked })} /><span>Permis B</span></label>
          <label className="case"><input type="checkbox" checked={f.vehicule} onChange={(e) => setF({ ...f, vehicule: e.target.checked })} /><span>Véhiculé·e</span></label>
        </div>
      </section>

      <section className="carte">
        <h2>Diplômes et titres</h2>
        <Puces label="Diplômes" options={config.referentiel.diplomes.map((d) => ({ valeur: d.code, libelle: d.libelle }))} valeurs={f.diplomes} onChange={(diplomes) => setF({ ...f, diplomes })} />
      </section>

      <section className="carte">
        <h2>Ce que je recherche</h2>
        <fieldset className="champ">
          <legend>Métiers</legend>
          <Puces label="Métiers" options={config.referentiel.metiers.map((m) => ({ valeur: m.rome, libelle: m.libelle }))} valeurs={f.metiers} onChange={(metiers) => setF({ ...f, metiers })} />
        </fieldset>
        <fieldset className="champ">
          <legend>Contrats acceptés</legend>
          <Puces label="Contrats" options={config.referentiel.contrats.map((c) => ({ valeur: c.code, libelle: c.libelle }))} valeurs={f.contrats} onChange={(contrats) => setF({ ...f, contrats })} />
        </fieldset>
      </section>

      <section className="carte">
        <h2>Pour personnaliser mes lettres</h2>
        <label className="champ">
          <span>Expériences marquantes</span>
          <textarea rows={3} {...txt("experiences")} placeholder="ex. trois ans en MECS auprès d'adolescents, un stage en ESAT et des remplacements en foyer de vie" />
          <span className="aide">Une phrase qui suit « je m'appuie sur les expériences suivantes : … »</span>
        </label>
        <label className="champ">
          <span>Compétences et atouts</span>
          <textarea rows={2} {...txt("competences")} placeholder="ex. conduite d'entretiens, rédaction d'écrits professionnels, médiation animale, langue des signes" />
        </label>
        <label className="champ">
          <span>Paragraphe de motivation (facultatif)</span>
          <textarea rows={3} {...txt("motivations")} placeholder="Laissez vide pour un paragraphe adapté automatiquement à chaque métier." />
        </label>
      </section>

      <section className="carte">
        <h2>CV</h2>
        {profil.cv ? (
          <p>
            📎 <a href="/api/profil/cv">{profil.cv.nom}</a> <span className="muted">({Math.round(profil.cv.taille / 1024)} Ko, ajouté le {new Date(profil.cv.ajouteLe).toLocaleDateString("fr-FR")})</span>
          </p>
        ) : (
          <p className="muted">Aucun CV. Format PDF recommandé, 5 Mo maximum.</p>
        )}
        <label className="btn">
          {envoiCV ? "Envoi…" : profil.cv ? "Remplacer le CV" : "Ajouter mon CV"}
          <input type="file" accept=".pdf,.doc,.docx,.odt" hidden onChange={(e) => e.target.files?.[0] && televerser(e.target.files[0])} />
        </label>
      </section>

      <div className="barre-collante">
        <span className="muted">{modifie ? "Modifications non enregistrées" : "À jour"}</span>
        <button className="btn primaire" disabled={!modifie}>Enregistrer le profil</button>
      </div>
    </form>
  );
}

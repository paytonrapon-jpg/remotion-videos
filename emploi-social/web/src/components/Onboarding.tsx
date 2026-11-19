import { useState } from "react";
import { api, RAYONS, SITUATIONS, type Profil } from "../api";
import { useApp } from "../App";
import { Puces } from "./ui";

/** Questionnaire de démarrage : quelques questions pour lancer la recherche. */
export function Onboarding({ onFini }: { onFini: () => void }) {
  const { profil, setProfil, config, notifier } = useApp();
  const [f, setF] = useState<Profil>(profil);
  const [etape, setEtape] = useState(0);
  const [enCours, setEnCours] = useState(false);

  const etapes = [
    {
      titre: "Quelle est votre situation ?",
      valide: Boolean(f.situation),
      corps: (
        <div className="choix">
          {SITUATIONS.map((s) => (
            <button key={s.code} type="button" className={`choix-carte ${f.situation === s.code ? "active" : ""}`} aria-pressed={f.situation === s.code} onClick={() => { setF({ ...f, situation: s.code }); setEtape(1); }}>
              {s.libelle}
            </button>
          ))}
        </div>
      ),
    },
    {
      titre: "Quels métiers recherchez-vous ?",
      valide: f.metiers.length > 0,
      corps: <Puces label="Métiers" options={config.referentiel.metiers.map((m) => ({ valeur: m.id, libelle: m.libelle }))} valeurs={f.metiers} onChange={(metiers) => setF({ ...f, metiers })} />,
    },
    {
      titre: "Où cherchez-vous ?",
      valide: Boolean(f.npa || f.ville),
      corps: (
        <>
          <div className="grille-form">
            <label className="champ"><span>NPA</span><input value={f.npa} onChange={(e) => setF({ ...f, npa: e.target.value })} inputMode="numeric" maxLength={4} placeholder="1004" autoFocus /></label>
            <label className="champ"><span>Localité</span><input value={f.ville} onChange={(e) => setF({ ...f, ville: e.target.value })} placeholder="Lausanne" /></label>
          </div>
          <fieldset className="champ">
            <legend>Jusqu'à quelle distance ?</legend>
            <div className="segments">
              {RAYONS.map((r) => <button key={r} type="button" aria-pressed={f.rayonKm === r} onClick={() => setF({ ...f, rayonKm: r })}>{r} km</button>)}
            </div>
          </fieldset>
        </>
      ),
    },
    {
      titre: "Taux d'activité et autorisation de travail",
      valide: Boolean(f.permisTravail),
      corps: (
        <>
          <fieldset className="champ">
            <legend>Taux souhaité : {f.tauxMin} – {f.tauxMax} %</legend>
            <div className="curseurs">
              <input type="range" min={10} max={100} step={10} value={f.tauxMin} aria-label="Taux minimum" onChange={(e) => setF({ ...f, tauxMin: Math.min(Number(e.target.value), f.tauxMax) })} />
              <input type="range" min={10} max={100} step={10} value={f.tauxMax} aria-label="Taux maximum" onChange={(e) => setF({ ...f, tauxMax: Math.max(Number(e.target.value), f.tauxMin) })} />
            </div>
          </fieldset>
          <div className="choix">
            {config.referentiel.permisTravail.map((p) => (
              <button key={p.code} type="button" className={`choix-carte petit ${f.permisTravail === p.code ? "active" : ""}`} aria-pressed={f.permisTravail === p.code} onClick={() => setF({ ...f, permisTravail: p.code })}>{p.libelle}</button>
            ))}
          </div>
        </>
      ),
    },
    {
      titre: "Vos diplômes",
      valide: true,
      corps: <Puces label="Diplômes" options={config.referentiel.diplomes.map((d) => ({ valeur: d.code, libelle: d.libelle }))} valeurs={f.diplomes} onChange={(diplomes) => setF({ ...f, diplomes })} />,
    },
    {
      titre: "Vos coordonnées",
      valide: Boolean(f.prenom && f.nom && /^\S+@\S+\.\S+$/.test(f.email)),
      corps: (
        <div className="grille-form">
          <label className="champ"><span>Prénom</span><input value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} autoComplete="given-name" /></label>
          <label className="champ"><span>Nom</span><input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} autoComplete="family-name" /></label>
          <label className="champ"><span>E-mail</span><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></label>
          <label className="champ"><span>Téléphone</span><input type="tel" value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} placeholder="+41 79 123 45 67" /></label>
          <p className="aide large">Les candidatures partent depuis votre propre adresse, et seulement après votre autorisation.</p>
        </div>
      ),
    },
  ];

  const terminer = async () => {
    setEnCours(true);
    try {
      const p = await api<Profil>("PUT", "/profil", { ...f, onboardingFait: true });
      setProfil(p);
      notifier(p.lat ? `C'est parti ! Recherche autour de ${p.lieuReconnu.replace(/^\d{4} - /, "")}.` : "Profil enregistré.");
      onFini();
    } catch (e) {
      notifier((e as Error).message, "erreur");
    } finally {
      setEnCours(false);
    }
  };

  const e = etapes[etape];
  const derniere = etape === etapes.length - 1;
  return (
    <div className="onboarding">
      <div className="carte onboarding-carte">
        <div className="onboarding-tete">
          <span className="muted">Étape {etape + 1}/{etapes.length}</span>
          <button type="button" className="lien" onClick={async () => { const p = await api<Profil>("PUT", "/profil", { onboardingFait: true }); setProfil(p); onFini(); }}>Passer</button>
        </div>
        <div className="jauge"><span style={{ width: `${((etape + 1) / etapes.length) * 100}%` }} /></div>
        <h1>{e.titre}</h1>
        {e.corps}
        <div className="actions">
          {etape > 0 && <button type="button" className="btn discret" onClick={() => setEtape(etape - 1)}>Retour</button>}
          {derniere ? (
            <button type="button" className="btn primaire" disabled={!e.valide || enCours} onClick={terminer}>{enCours ? "…" : "Voir mes offres"}</button>
          ) : (
            <button type="button" className="btn primaire" disabled={!e.valide} onClick={() => setEtape(etape + 1)}>Continuer</button>
          )}
        </div>
        <p className="aide">Gratuit, sans compte : vos données restent sur votre ordinateur. Vous pourrez ajouter votre CV et vos certificats dans le Profil.</p>
      </div>
    </div>
  );
}

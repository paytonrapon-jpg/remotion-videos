import { useCallback, useEffect, useMemo, useState } from "react";
import { api, depuis, type Employeur, RAYONS } from "../api";
import { useApp } from "../App";
import { Carte, type Point } from "./Carte";
import { BadgeStatut, Modal } from "./ui";

/**
 * Candidatures spontanées : trouver les structures du social qui recrutent autour de soi,
 * compléter le contact, puis préparer des candidatures que l'on autorise une par une.
 */
export function EntreprisesPage() {
  const { profil, config, notifier, rafraichir, aller } = useApp();
  const [vue, setVue] = useState<"decouvrir" | "miennes">("decouvrir");
  const [rayon, setRayon] = useState(profil.lat ? profil.rayonKm || 30 : 0);
  const [trouves, setTrouves] = useState<Employeur[] | null>(null);
  const [miennes, setMiennes] = useState<Employeur[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [selection, setSelection] = useState<string[]>([]);
  const [metier, setMetier] = useState(profil.metiers[0] ?? "ts");
  const [edition, setEdition] = useState<Employeur | null>(null);
  const [ajout, setAjout] = useState(false);
  const [carte, setCarte] = useState(false);

  const charger = useCallback(() => api<Employeur[]>("GET", "/employeurs").then(setMiennes), []);

  const decouvrir = useCallback(async () => {
    setChargement(true);
    setErreur("");
    try {
      const q = new URLSearchParams({ metiers: profil.metiers.join(","), rayon: String(rayon), cantons: profil.canton || "" });
      setTrouves(await api<Employeur[]>("GET", `/employeurs/decouvrir?${q}`));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }, [profil.metiers, profil.canton, rayon]);

  useEffect(() => {
    charger();
    decouvrir();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ajouter = async (liste: Employeur[]) => {
    const r = await api<Employeur[]>("POST", "/employeurs", liste);
    await charger();
    setTrouves((t) => t?.map((e) => (liste.some((x) => x.cle === e.cle) ? { ...e, dejaAjoute: true } : e)) ?? t);
    notifier(`${r.length} structure${r.length > 1 ? "s" : ""} ajoutée${r.length > 1 ? "s" : ""} à votre liste.`);
    return r;
  };

  const preparer = async () => {
    const r = await api<{ creees: number }>("POST", "/candidatures/spontanees", { employeurIds: selection, metier });
    await rafraichir();
    setSelection([]);
    notifier(r.creees ? `${r.creees} candidature${r.creees > 1 ? "s" : ""} spontanée${r.creees > 1 ? "s" : ""} prête${r.creees > 1 ? "s" : ""} : relisez et autorisez-les.` : "Déjà préparées pour ce métier.");
    if (r.creees) aller("autoriser");
  };

  const liste = vue === "decouvrir" ? trouves ?? [] : miennes;
  const points: Point[] = useMemo(
    () =>
      liste
        .filter((e) => e.lat && e.lon)
        .map((e) => ({ id: e.id ?? e.cle!, lat: e.lat!, lon: e.lon!, titre: e.nom, sousTitre: e.annonces.length ? `${e.annonces.length} annonce(s) récente(s)` : e.lieu, ton: e.email ? "haut" : "neutre" })),
    [liste],
  );
  const sansEmail = miennes.filter((e) => selection.includes(e.id!) && !e.email).length;

  return (
    <div className="colonne large-colonne">
      <section className="intro carte">
        <h1>Candidatures spontanées</h1>
        <p>
          Écrivez directement aux structures du social qui recrutent près de chez vous, souvent avant qu'elles ne publient leurs postes.
          Chaque candidature est personnalisée et ne part qu'après votre autorisation.
        </p>
      </section>

      <div className="barre">
        <div className="segments" role="tablist">
          <button role="tab" aria-selected={vue === "decouvrir"} onClick={() => setVue("decouvrir")}>Qui recrute {trouves && <span className="muted">({trouves.length})</span>}</button>
          <button role="tab" aria-selected={vue === "miennes"} onClick={() => setVue("miennes")}>Ma liste <span className="muted">({miennes.length})</span></button>
        </div>
        <div className="actions sans-marge">
          <button className="btn" onClick={() => setCarte(!carte)}>{carte ? "Liste" : "Carte"}</button>
          <button className="btn" onClick={() => setAjout(true)}>+ Ajouter / importer</button>
        </div>
      </div>

      {vue === "decouvrir" && (
        <div className="filtres-ligne">
          {profil.lat ? (
            <label className="champ en-ligne">
              <span>Autour de {profil.lieuReconnu.replace(/^\d{4} - /, "")}</span>
              <select value={rayon} onChange={(e) => setRayon(Number(e.target.value))}>
                {RAYONS.map((r) => <option key={r} value={r}>{r} km</option>)}
                <option value={0}>Canton{profil.canton ? ` (${profil.canton})` : ""}</option>
              </select>
            </label>
          ) : (
            <p className="aide">Indiquez votre NPA dans le <a href="#profil" onClick={() => aller("profil")}>profil</a> pour chercher autour de chez vous.</p>
          )}
          <button className="btn primaire" disabled={chargement} onClick={decouvrir}>{chargement ? "Recherche…" : "Actualiser"}</button>
          <span className="aide">Structures ayant publié une annonce sociale ces 60 derniers jours (hors agences de placement).</span>
        </div>
      )}
      {erreur && <p className="alerte erreur">{erreur}</p>}

      {carte && points.length > 0 && <Carte points={points} domicile={profil.lat ? { lat: profil.lat, lon: profil.lon! } : null} rayonKm={vue === "decouvrir" ? rayon : undefined} onSelect={(id) => { const e = liste.find((x) => (x.id ?? x.cle) === id); if (e) setEdition(e); }} />}

      {vue === "decouvrir" && trouves && trouves.some((e) => !e.dejaAjoute) && (
        <div className="actions debut">
          <button className="btn" onClick={() => ajouter(trouves.filter((e) => !e.dejaAjoute))}>Tout ajouter à ma liste ({trouves.filter((e) => !e.dejaAjoute).length})</button>
        </div>
      )}

      {vue === "miennes" && miennes.length > 0 && (
        <div className="carte barre-campagne">
          <label className="case sans-marge">
            <input type="checkbox" checked={selection.length === miennes.length} onChange={(e) => setSelection(e.target.checked ? miennes.map((x) => x.id!) : [])} />
            <span>Tout sélectionner</span>
          </label>
          <label className="champ en-ligne sans-marge">
            <span>Métier visé</span>
            <select value={metier} onChange={(e) => setMetier(e.target.value)}>
              {config.referentiel.metiers.map((m) => <option key={m.id} value={m.id}>{m.libelle}</option>)}
            </select>
          </label>
          <button className="btn primaire" disabled={!selection.length} onClick={preparer}>
            Préparer {selection.length || ""} candidature{selection.length > 1 ? "s" : ""}
          </button>
          {sansEmail > 0 && <span className="aide">{sansEmail} sans e-mail : à compléter avant de pouvoir autoriser.</span>}
        </div>
      )}

      {!chargement && liste.length === 0 && (
        <div className="vide">
          <p>{vue === "decouvrir" ? "Aucune structure trouvée : élargissez la distance." : "Votre liste est vide. Ajoutez des structures depuis « Qui recrute » ou importez la vôtre."}</p>
        </div>
      )}

      <ul className="liste">
        {liste.map((e) => (
          <li key={e.id ?? e.cle} className="carte ligne employeur">
            {vue === "miennes" && (
              <input type="checkbox" aria-label={`Sélectionner ${e.nom}`} checked={selection.includes(e.id!)} onChange={(ev) => setSelection(ev.target.checked ? [...selection, e.id!] : selection.filter((x) => x !== e.id))} />
            )}
            <div className="employeur-corps">
              <h3>{e.nom}</h3>
              <p className="meta">
                {e.lieu} {e.canton && <span className="canton">{e.canton}</span>}
                {e.distanceKm != null && <> · à {e.distanceKm} km</>}
                {e.contactNom && <> · {e.contactNom}{e.contactFonction && `, ${e.contactFonction}`}</>}
              </p>
              <div className="etiquettes">
                {e.annonces.length > 0 && <span className="etiquette ok" title={e.annonces.map((a) => a.intitule).join("\n")}>Recrute : {e.annonces.length} annonce{e.annonces.length > 1 ? "s" : ""} ({depuis(e.annonces[0].date)})</span>}
                {e.email ? <span className="etiquette info">{e.email}</span> : <span className="etiquette ko">E-mail à trouver</span>}
                {e.candidatures?.map((c) => <BadgeStatut key={c.id} statut={c.statut} />)}
              </div>
            </div>
            <div className="actions sans-marge">
              {vue === "decouvrir" ? (
                e.dejaAjoute ? <span className="muted">Dans ma liste</span> : <button className="btn" onClick={() => ajouter([e])}>Ajouter</button>
              ) : (
                <button className="btn" onClick={() => setEdition(e)}>{e.email ? "Modifier" : "Compléter"}</button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {edition && (
        <Modal titre={edition.nom} onClose={() => setEdition(null)} large>
          <FicheEmployeur
            employeur={edition}
            onEnregistrer={async (maj) => {
              if (edition.id) await api("PUT", `/employeurs/${edition.id}`, maj);
              else await ajouter([{ ...edition, ...maj }]);
              await charger();
              await rafraichir();
              setEdition(null);
              notifier("Structure enregistrée.");
            }}
            onSupprimer={edition.id ? async () => { await api("DELETE", `/employeurs/${edition.id}`); await charger(); setEdition(null); } : undefined}
          />
        </Modal>
      )}
      {ajout && (
        <Modal titre="Ajouter des structures" onClose={() => setAjout(false)} large>
          <AjoutEmployeurs onFini={async (n) => { setAjout(false); await charger(); setVue("miennes"); notifier(`${n} structure${n > 1 ? "s" : ""} ajoutée${n > 1 ? "s" : ""}.`); }} />
        </Modal>
      )}
    </div>
  );
}

function FicheEmployeur({ employeur: e, onEnregistrer, onSupprimer }: { employeur: Employeur; onEnregistrer: (m: Partial<Employeur>) => Promise<void>; onSupprimer?: () => void }) {
  const [f, setF] = useState({ contactNom: e.contactNom, contactFonction: e.contactFonction ?? "", email: e.email, telephone: e.telephone, site: e.site, notes: e.notes ?? "" });
  const set = (k: keyof typeof f) => (ev: { target: { value: string } }) => setF({ ...f, [k]: ev.target.value });
  const recherche = encodeURIComponent(`${e.nom} ${e.lieu.replace(/^\d{4}\s*/, "")} contact`);
  return (
    <form className="grille-form" onSubmit={async (ev) => { ev.preventDefault(); await onEnregistrer(f); }}>
      <p className="meta large">{e.lieu}{e.distanceKm != null && ` · à ${e.distanceKm} km`}</p>
      {e.annonces.length > 0 && (
        <div className="large">
          <strong>Annonces récentes</strong>
          <ul className="annonces">{e.annonces.map((a, i) => <li key={i}><a href={a.url} target="_blank" rel="noreferrer">{a.intitule}</a> <span className="muted">{depuis(a.date)}</span></li>)}</ul>
        </div>
      )}
      <p className="aide large">
        Adressez-vous de préférence à la direction ou au service RH. Pour trouver l'e-mail :{" "}
        <a href={`https://www.google.com/search?q=${recherche}`} target="_blank" rel="noreferrer">chercher sur le web ↗</a>
        {e.site && <> · <a href={e.site} target="_blank" rel="noreferrer">site ↗</a></>}
      </p>
      <label className="champ"><span>Personne de contact</span><input value={f.contactNom} onChange={set("contactNom")} placeholder="Mme Anne Rochat" /></label>
      <label className="champ"><span>Fonction</span><input value={f.contactFonction} onChange={set("contactFonction")} placeholder="Directrice, responsable RH…" /></label>
      <label className="champ"><span>E-mail</span><input type="email" value={f.email} onChange={set("email")} placeholder="rh@structure.ch" /></label>
      <label className="champ"><span>Téléphone</span><input type="tel" value={f.telephone} onChange={set("telephone")} /></label>
      <label className="champ large"><span>Site web</span><input type="url" value={f.site} onChange={set("site")} placeholder="https://…" /></label>
      <label className="champ large"><span>Notes</span><textarea rows={2} value={f.notes} onChange={set("notes")} /></label>
      <div className="actions large">
        {onSupprimer && <button type="button" className="btn discret danger" onClick={onSupprimer}>Retirer de ma liste</button>}
        <span className="espace" />
        <button className="btn primaire">{e.id ? "Enregistrer" : "Ajouter à ma liste"}</button>
      </div>
    </form>
  );
}

function AjoutEmployeurs({ onFini }: { onFini: (n: number) => void }) {
  const [mode, setMode] = useState<"un" | "liste">("un");
  const [f, setF] = useState({ nom: "", lieu: "", contactNom: "", email: "", site: "" });
  const [texte, setTexte] = useState("");
  const set = (k: keyof typeof f) => (ev: { target: { value: string } }) => setF({ ...f, [k]: ev.target.value });
  return (
    <>
      <div className="segments petit">
        <button type="button" aria-pressed={mode === "un"} onClick={() => setMode("un")}>Une structure</button>
        <button type="button" aria-pressed={mode === "liste"} onClick={() => setMode("liste")}>Coller une liste</button>
      </div>
      {mode === "un" ? (
        <form className="grille-form" style={{ marginTop: "1rem" }} onSubmit={async (ev) => { ev.preventDefault(); await api("POST", "/employeurs", f); onFini(1); }}>
          <label className="champ large"><span>Nom de la structure *</span><input required value={f.nom} onChange={set("nom")} placeholder="Fondation, foyer, service social, crèche…" /></label>
          <label className="champ"><span>Lieu</span><input value={f.lieu} onChange={set("lieu")} placeholder="1004 Lausanne" /></label>
          <label className="champ"><span>Personne de contact</span><input value={f.contactNom} onChange={set("contactNom")} /></label>
          <label className="champ"><span>E-mail</span><input type="email" value={f.email} onChange={set("email")} /></label>
          <label className="champ"><span>Site web</span><input type="url" value={f.site} onChange={set("site")} /></label>
          <div className="actions large"><button className="btn primaire">Ajouter</button></div>
        </form>
      ) : (
        <form style={{ marginTop: "1rem" }} onSubmit={async (ev) => { ev.preventDefault(); const r = await api<{ ajoutes: number }>("POST", "/employeurs/import", { texte }); onFini(r.ajoutes); }}>
          <label className="champ">
            <span>Une structure par ligne : nom ; e-mail ; contact ; lieu</span>
            <textarea rows={8} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={"Foyer Les Cerisiers;direction@cerisiers.ch;Mme Favre;1205 Genève\nCrèche Arc-en-ciel;info@arcenciel.ch;;1003 Lausanne"} />
            <span className="aide">Vous pouvez coller directement des colonnes copiées depuis Excel ou Numbers.</span>
          </label>
          <div className="actions"><button className="btn primaire" disabled={!texte.trim()}>Importer</button></div>
        </form>
      )}
    </>
  );
}

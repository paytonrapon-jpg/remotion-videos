// Tests du parcours critique : rien ne part sans autorisation sur le contenu exact.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emploi-social-"));
process.env.DATA_DIR = dir;
delete process.env.SMTP_HOST;
process.env.OFFRES_DEMO = "1";

const { createApp } = await import("./app.js");
let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => {
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const api = async (method, url, body) => {
  const res = await fetch(base + url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: res.status === 204 ? null : await res.json() };
};

let candidature;

test("recherche en mode démo avec score", async () => {
  await api("PUT", "/profil", {
    prenom: "Camille", nom: "Martin", email: "camille@example.org", telephone: "06 00 00 00 00",
    canton: "VD", diplomes: ["HES-TS"], metiers: ["educ-social"], tauxMin: 60, tauxMax: 100, permisConduire: true,
    permisTravail: "G", experiences: "trois ans en foyer auprès d'adolescent·e·s",
  });
  const { json } = await api("GET", "/offres/recherche?metiers=educ-social,as,curateur");
  assert.equal(json.mode, "demo");
  assert.ok(json.resultats.length >= 3);
  assert.equal(json.resultats[0].canton, "VD");
  assert.ok(json.resultats[0].compat.score >= 90, JSON.stringify(json.resultats[0].compat));
  const { json: geneve } = await api("GET", "/offres/recherche?cantons=GE");
  assert.ok(geneve.resultats.every((o) => o.canton === "GE"));
});

test("création d'un brouillon personnalisé", async () => {
  const { json: r } = await api("GET", "/offres/recherche?metiers=educ-social&cantons=VD");
  const { json: offre } = await api("POST", "/offres", r.resultats.find((o) => o.contactEmail));
  const { status, json } = await api("POST", "/candidatures", { offreId: offre.id });
  assert.equal(status, 201);
  assert.equal(json.statut, "brouillon");
  assert.match(json.message, /Bachelor HES en travail social/);
  assert.match(json.message, /permis G/);
  assert.match(json.message, /Camille Martin/);
  candidature = json;
});

test("envoi refusé sans autorisation", async () => {
  const { status } = await api("POST", `/candidatures/${candidature.id}/envoyer`);
  assert.equal(status, 403);
});

test("autorisation refusée sans confirmation ou avec une empreinte périmée", async () => {
  await api("PUT", `/candidatures/${candidature.id}`, { joindreCV: false, joindreAnnexes: false });
  const { json: apercu } = await api("GET", `/candidatures/${candidature.id}/apercu`);
  assert.deepEqual(apercu.erreurs, []);
  assert.equal((await api("POST", `/candidatures/${candidature.id}/autoriser`, { empreinte: apercu.empreinte })).status, 400);
  assert.equal((await api("POST", `/candidatures/${candidature.id}/autoriser`, { empreinte: "x", confirmation: true })).status, 409);
});

test("modifier le contenu après autorisation annule l'autorisation", async () => {
  const { json: apercu } = await api("GET", `/candidatures/${candidature.id}/apercu`);
  const { json: ok } = await api("POST", `/candidatures/${candidature.id}/autoriser`, { empreinte: apercu.empreinte, confirmation: true });
  assert.equal(ok.statut, "autorisee");
  const { json: modifiee } = await api("PUT", `/candidatures/${candidature.id}`, { message: `${ok.message}\nPS : disponible immédiatement.` });
  assert.equal(modifiee.statut, "a_autoriser");
  assert.equal(modifiee.autorisation, null);
  assert.equal((await api("POST", `/candidatures/${candidature.id}/envoyer`)).status, 403);
});

test("envoi autorisé (simulation .eml) puis journal", async () => {
  const { json: apercu } = await api("GET", `/candidatures/${candidature.id}/apercu`);
  await api("POST", `/candidatures/${candidature.id}/autoriser`, { empreinte: apercu.empreinte, confirmation: true });
  const { status, json } = await api("POST", `/candidatures/${candidature.id}/envoyer`);
  assert.equal(status, 200);
  assert.equal(json.statut, "envoyee");
  assert.equal(json.envoi.mode, "simulation");
  const eml = fs.readFileSync(path.join(dir, "outbox", json.envoi.fichier), "utf8");
  assert.match(eml, /To: rh@tilleuls\.example\.org/);
  assert.equal((await api("POST", `/candidatures/${candidature.id}/envoyer`)).status, 403, "pas de double envoi");
  const { json: journal } = await api("GET", "/journal");
  assert.ok(journal.some((e) => e.type === "envoi" && e.mode === "simulation"));
});

test("limite journalière respectée", async () => {
  await api("PUT", "/reglages", { limiteJournaliere: 1 });
  const { json: relance } = await api("GET", `/candidatures/${candidature.id}/relance`);
  const { json: ap } = await api("POST", `/candidatures/${candidature.id}/relance/apercu`, relance);
  const { status } = await api("POST", `/candidatures/${candidature.id}/relance`, { ...relance, empreinte: ap.empreinte, confirmation: true });
  assert.equal(status, 429);
});

test("conversion d'une annonce job-room.ch", async () => {
  const { depuisJobRoom } = await import("./jobRoom.js");
  const o = depuisJobRoom({
    jobAdvertisement: {
      id: "abc", stellennummerEgov: "242886436", createdTime: "2026-11-05T20:03:00",
      publication: { startDate: "2026-11-05" },
      jobContent: {
        externalUrl: "www.example.org/annonce",
        jobDescriptions: [
          { languageIsoCode: "de", title: "Sozialpädagoge 80%", description: "x" },
          { languageIsoCode: "fr", title: "<em>Éducateur</em>·trice social·e à 80%", description: "---\ntitle: x\n---\nDiplôme ES ou HES &amp; permis de conduire exigé" },
        ],
        company: { name: "Fondation Test" },
        employment: { permanent: true, workloadPercentageMin: "60", workloadPercentageMax: "80" },
        location: { city: "Lausanne", postalCode: "1004", cantonCode: "VD" },
        applyChannel: { formUrl: "www.example.org/postuler", emailAddress: null },
        publicContact: { salutation: "MRS", firstName: "Anne", lastName: "Rochat", email: "a.rochat@example.org" },
      },
    },
  });
  assert.equal(o.intitule, "Éducateur·trice social·e à 80%");
  assert.equal(o.langue, "fr");
  assert.equal(o.canton, "VD");
  assert.equal(o.taux, "60–80 %");
  assert.equal(o.metier, "educ-social");
  assert.equal(o.contactEmail, "a.rochat@example.org");
  assert.equal(o.contactNom, "Mme Anne Rochat");
  assert.equal(o.urlCandidature, "https://www.example.org/postuler");
  assert.match(o.description, /^Diplôme ES ou HES & permis/);
  assert.ok(o.diplomesCites.includes("HES-TS"));
});

test("métiers travailleur·euse social·e, famille, référent·e et conseiller·ère reconnus", async () => {
  const { metierDuTitre } = await import("./referentiel.js");
  assert.equal(metierDuTitre("Travailleuse sociale à 80%"), "ts");
  assert.equal(metierDuTitre("Travailleur social famille 80%"), "ts-famille");
  assert.equal(metierDuTitre("Travailleuse sociale auprès des familles"), "ts-famille");
  assert.equal(metierDuTitre("Référent·e social·e à 60 %"), "referent");
  assert.equal(metierDuTitre("Conseiller·ère social·e"), "conseil");
  assert.equal(metierDuTitre("Conseiller en insertion professionnelle"), "insertion");
  assert.equal(metierDuTitre("Assistante sociale HES"), "as");
});

test("recherche autour du domicile (rayon en km)", async () => {
  const { json: p } = await api("PUT", "/profil", { npa: "1004", ville: "Lausanne", rayonKm: 30 });
  assert.ok(p.lat && p.lon, "NPA géocodé");
  const { json } = await api("GET", "/offres/recherche?rayon=30");
  assert.ok(json.resultats.length >= 1);
  assert.ok(json.resultats.every((o) => o.distanceKm <= 30), JSON.stringify(json.resultats.map((o) => [o.lieu, o.distanceKm])));
  const { json: large } = await api("GET", "/offres/recherche?rayon=150");
  assert.ok(large.resultats.length > json.resultats.length);
});

test("candidatures spontanées : préparées puis bloquées tant qu'il manque l'e-mail", async () => {
  await api("PUT", "/reglages", { limiteJournaliere: 10 });
  const { json: trouves } = await api("GET", "/employeurs/decouvrir");
  assert.ok(trouves.length >= 5);
  const { json: ajoutes } = await api("POST", "/employeurs", [trouves[0], { nom: "Foyer Sans E-mail (exemple)", lieu: "1003 Lausanne" }]);
  assert.equal(ajoutes.length, 2);
  const { json: r } = await api("POST", "/candidatures/spontanees", { employeurIds: ajoutes.map((e) => e.id), metier: "ts" });
  assert.equal(r.creees, 2);
  const { json: liste } = await api("GET", "/candidatures");
  const sansMail = liste.find((c) => c.offre.employeur === "Foyer Sans E-mail (exemple)");
  assert.equal(sansMail.statut, "a_autoriser");
  assert.match(sansMail.message, /candidature spontanée/);
  const { json: ap } = await api("GET", `/candidatures/${sansMail.id}/apercu`);
  assert.ok(ap.erreurs.some((e) => /e-mail du recruteur/.test(e)));
  // Renseigner l'e-mail de la structure complète le brouillon.
  await api("PUT", `/employeurs/${ajoutes[1].id}`, { email: "direction@foyer.example.org" });
  const { json: ap2 } = await api("GET", `/candidatures/${sansMail.id}/apercu`);
  assert.equal(ap2.contenu.a, "direction@foyer.example.org");
  assert.equal((await api("POST", `/candidatures/${sansMail.id}/envoyer`)).status, 403, "jamais d'envoi sans autorisation");
  const { json: imp } = await api("POST", "/employeurs/import", { texte: "nom;email;contact;lieu\nCrèche Arc-en-ciel;info@arc.example.org;Mme Favre;1205 Genève" });
  assert.equal(imp.ajoutes, 1);
});

const CV_TEST = {
  titre: "Travailleuse sociale HES",
  accroche: "",
  dateNaissance: "12.03.1990",
  nationalite: "Française",
  experiences: [
    { poste: "Éducatrice sociale", employeur: "Fondation Les Cerisiers", lieu: "Lausanne", debut: "03.2021", fin: "aujourd'hui", taux: "80 %", missions: "Animation d'ateliers collectifs\nAccompagnement de familles en situation de précarité\nRédaction de rapports pour la DGEJ" },
    { poste: "Assistante sociale stagiaire", employeur: "CSR de Morges", lieu: "Morges", debut: "09.2019", fin: "02.2021", taux: "100 %", missions: "Évaluation des demandes d'aide sociale\nOrientation vers le réseau" },
  ],
  formations: [{ titre: "Bachelor HES en travail social", ecole: "HETSL", lieu: "Lausanne", debut: "2016", fin: "2019" }],
  competences: ["Gestion de conflits", "Soutien à la parentalité", "Travail en réseau"],
  langues: [{ langue: "Français", niveau: "Langue maternelle" }, { langue: "Allemand", niveau: "B1" }],
  informatique: "Suite Office, Progrès PS",
  interets: "Randonnée, théâtre",
  referencesSurDemande: true,
};

test("CV suisse : enregistrement, PDF, puis réimport du PDF", async () => {
  const { json: cv } = await api("PUT", "/cv", CV_TEST);
  assert.equal(cv.experiences.length, 2);
  const res = await fetch(`${base}/cv/pdf`);
  assert.equal(res.headers.get("content-type"), "application/pdf");
  const pdf = Buffer.from(await res.arrayBuffer());
  assert.ok(pdf.length > 1500 && pdf.subarray(0, 5).toString() === "%PDF-");
  const fd = new FormData();
  fd.append("fichier", new Blob([pdf], { type: "application/pdf" }), "cv.pdf");
  const imp = await (await fetch(`${base}/cv/import`, { method: "POST", body: fd })).json();
  assert.equal(imp.mode, "regles");
  assert.equal(imp.cv.experiences.length, 2, JSON.stringify(imp.cv.experiences));
  assert.equal(imp.cv.experiences[0].debut, "03.2021");
  assert.match(imp.cv.experiences[0].poste, /Éducatrice sociale/);
  assert.ok(imp.cv.formations.some((f) => /Bachelor HES/.test(f.titre)));
  assert.ok(imp.cv.langues.some((l) => l.langue === "Allemand" && /B1/.test(l.niveau)));
  const { json: p } = await api("POST", "/cv/utiliser");
  assert.match(p.cv.nom, /^CV Camille Martin\.pdf$/);
});

test("postuler depuis un texte d'annonce : CV et lettre adaptés, autorisation obligatoire", async () => {
  const texte = "Travailleur social famille à 80% (H/F)\nFondation Horizon recherche un·e travailleur·euse social·e pour le soutien à la parentalité et le travail en réseau.\nContact : rh@horizon.example.org";
  const { status, json: offre } = await api("POST", "/postuler/analyser", { texte });
  assert.equal(status, 200);
  assert.equal(offre.metier, "ts-famille");
  assert.equal(offre.taux, "80 %");
  assert.equal(offre.contactEmail, "rh@horizon.example.org");
  const { status: s2, json: c } = await api("POST", "/postuler/preparer", { ...offre, employeur: "Fondation Horizon" });
  assert.equal(s2, 201);
  assert.equal(c.statut, "a_autoriser");
  assert.equal(c.adaptation.mode, "regles");
  assert.equal(c.cvAdapte.competences[0], "Soutien à la parentalité");
  assert.match(c.cvAdapte.titre, /Travailleur social famille/);
  assert.ok(c.cvFichier && c.cvFichier.taille > 1000);
  const { json: ap } = await api("GET", `/candidatures/${c.id}/apercu`);
  assert.equal(ap.contenu.piecesJointes[0].sha256, c.cvFichier.sha256, "le CV adapté est la pièce jointe");
  await api("POST", `/candidatures/${c.id}/autoriser`, { empreinte: ap.empreinte, confirmation: true });
  // Modifier le CV adapté annule l'autorisation.
  const { json: maj } = await api("PUT", `/candidatures/${c.id}/cv`, { titre: "Travailleuse sociale famille" });
  assert.equal(maj.statut, "a_autoriser");
  assert.equal(maj.autorisation, null);
  assert.equal((await api("POST", `/candidatures/${c.id}/envoyer`)).status, 403);
});

test("accès téléphone : code obligatoire", async () => {
  const { protegerPar } = await import("./acces.js");
  const { createApp: creer } = await import("./app.js");
  const srv = creer({ proteger: protegerPar("1234-5678") }).listen(0);
  await new Promise((r) => srv.once("listening", r));
  const url = `http://127.0.0.1:${srv.address().port}/api/config`;
  assert.equal((await fetch(url)).status, 401);
  const mauvais = Buffer.from("moi:0000-0000").toString("base64");
  assert.equal((await fetch(url, { headers: { Authorization: `Basic ${mauvais}` } })).status, 401);
  const bon = Buffer.from("moi:1234-5678").toString("base64");
  assert.equal((await fetch(url, { headers: { Authorization: `Basic ${bon}` } })).status, 200);
  srv.close();
});

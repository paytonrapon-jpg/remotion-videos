// Tests du parcours critique : rien ne part sans autorisation sur le contenu exact.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emploi-social-"));
process.env.DATA_DIR = dir;
delete process.env.SMTP_HOST;
delete process.env.FRANCE_TRAVAIL_CLIENT_ID;

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
    departement: "34", diplomes: ["DEES"], metiers: ["K1207"], contrats: ["CDI"], permis: true,
    experiences: "trois ans en MECS auprès d'adolescents confiés à l'ASE",
  });
  const { json } = await api("GET", "/offres/recherche?metiers=K1207");
  assert.equal(json.mode, "demo");
  assert.ok(json.resultats.length >= 3);
  assert.equal(json.resultats[0].departement, "34");
  assert.ok(json.resultats[0].compat.score >= 90);
});

test("création d'un brouillon personnalisé", async () => {
  const { json: r } = await api("GET", "/offres/recherche?metiers=K1207&departement=34");
  const { json: offre } = await api("POST", "/offres", r.resultats.find((o) => o.contactEmail));
  const { status, json } = await api("POST", "/candidatures", { offreId: offre.id });
  assert.equal(status, 201);
  assert.equal(json.statut, "brouillon");
  assert.match(json.message, /DE Éducateur spécialisé/);
  assert.match(json.message, /Camille Martin/);
  candidature = json;
});

test("envoi refusé sans autorisation", async () => {
  const { status } = await api("POST", `/candidatures/${candidature.id}/envoyer`);
  assert.equal(status, 403);
});

test("autorisation refusée sans confirmation ou avec une empreinte périmée", async () => {
  await api("PUT", `/candidatures/${candidature.id}`, { joindreCV: false });
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
  assert.match(eml, /To: recrutement@tilleuls\.example\.org/);
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

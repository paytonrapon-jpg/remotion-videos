// Protection par mot de passe quand l'application est accessible depuis d'autres
// appareils (Wi-Fi local ou hébergement en ligne). Page de connexion, puis cookie de
// session signé valable 30 jours sur l'appareil.
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DATA_DIR } from "./store.js";

const COOKIE = "es_session";
const DUREE_MS = 30 * 86_400_000;

/** Mot de passe : MOT_DE_PASSE (réglage) ou code généré une fois et conservé dans data/. */
export function codeAcces() {
  if (process.env.MOT_DE_PASSE) return process.env.MOT_DE_PASSE;
  const fichier = path.join(DATA_DIR, "code-acces.txt");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(fichier)) return fs.readFileSync(fichier, "utf8").trim();
  const code = `${randomInt(1000, 10000)}-${randomInt(1000, 10000)}`;
  fs.writeFileSync(fichier, code, { mode: 0o600 });
  return code;
}

/** Clé de signature des sessions : changer le mot de passe déconnecte tous les appareils. */
function cleSessions(code) {
  const fichier = path.join(DATA_DIR, "sel-sessions.txt");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(fichier)) fs.writeFileSync(fichier, randomBytes(32).toString("hex"), { mode: 0o600 });
  return createHmac("sha256", fs.readFileSync(fichier, "utf8").trim()).update(code).digest();
}

const egal = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

const lireCookie = (req) =>
  Object.fromEntries((req.headers.cookie ?? "").split(";").map((c) => c.trim().split("=").map(decodeURIComponent)))[COOKIE];

const page = (erreur = "") => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark"><title>Emploi Social – connexion</title>
<style>
  :root { --fond:#f6f4ef; --carte:#fff; --texte:#1f2a2a; --bord:#e2ddd3; --primaire:#0f6e6a; --ko:#a33b2b; }
  @media (prefers-color-scheme: dark) { :root { --fond:#121717; --carte:#1a2121; --texte:#e6ecea; --bord:#2e3a3a; --primaire:#3fb3a8; --ko:#f19484; } }
  * { box-sizing: border-box; } body { margin:0; min-height:100vh; display:grid; place-items:center; background:var(--fond); color:var(--texte); font:16px/1.5 system-ui,-apple-system,sans-serif; padding:16px; }
  form { background:var(--carte); border:1px solid var(--bord); border-radius:14px; padding:28px 24px; width:min(380px,100%); }
  h1 { font-size:1.3rem; margin:0 0 4px; } p { margin:0 0 18px; opacity:.75; font-size:.95rem; }
  input { width:100%; font:inherit; padding:12px; border-radius:9px; border:1px solid var(--bord); background:transparent; color:inherit; margin-bottom:12px; }
  button { width:100%; font:inherit; font-weight:600; padding:12px; border:0; border-radius:9px; background:var(--primaire); color:#fff; cursor:pointer; }
  .err { color:var(--ko); font-size:.9rem; margin:-4px 0 12px; }
</style></head><body>
<form method="post" action="/connexion">
  <h1>✓ Emploi Social</h1>
  <p>Entrez votre mot de passe. Cet appareil restera connecté 30 jours.</p>
  <input type="password" name="code" autocomplete="current-password" placeholder="Mot de passe" autofocus required aria-label="Mot de passe">
  ${erreur ? `<div class="err" role="alert">${erreur}</div>` : ""}
  <button>Se connecter</button>
</form></body></html>`;

/**
 * Installe la connexion sur l'application Express. Tout le reste exige une session,
 * sauf /sante (vérification de l'hébergeur).
 */
export function installerConnexion(app, code) {
  const cle = cleSessions(code);
  const signer = (expire) => `${expire}.${createHmac("sha256", cle).update(String(expire)).digest("base64url")}`;
  const valide = (jeton) => {
    const [expire, sig] = String(jeton ?? "").split(".");
    return Number(expire) > Date.now() && egal(sig, signer(expire).split(".")[1]);
  };
  const echecs = new Map(); // ip → { n, depuis }

  app.get("/connexion", (_req, res) => res.type("html").send(page()));

  app.post("/connexion", (req, res, next) => {
    let corps = "";
    req.setEncoding("utf8");
    req.on("data", (c) => (corps = (corps + c).slice(0, 2000)));
    req.on("end", () => {
      try {
        const ip = req.ip ?? "?";
        const e = echecs.get(ip);
        if (e && e.n >= 8 && Date.now() - e.depuis < 15 * 60_000) {
          return res.status(429).type("html").send(page("Trop d'essais. Réessayez dans 15 minutes."));
        }
        const saisi = new URLSearchParams(corps).get("code") ?? "";
        if (!egal(saisi, code)) {
          echecs.set(ip, { n: (e && Date.now() - e.depuis < 15 * 60_000 ? e.n : 0) + 1, depuis: e?.depuis && Date.now() - e.depuis < 15 * 60_000 ? e.depuis : Date.now() });
          return res.status(401).type("html").send(page("Mot de passe incorrect."));
        }
        echecs.delete(ip);
        const securise = req.secure ? "; Secure" : "";
        res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(signer(Date.now() + DUREE_MS))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DUREE_MS / 1000}${securise}`);
        res.redirect(303, "/");
      } catch (err) {
        next(err);
      }
    });
  });

  app.get("/deconnexion", (_req, res) => {
    res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    res.redirect(303, "/connexion");
  });

  app.use((req, res, next) => {
    if (req.path === "/sante" || valide(lireCookie(req))) return next();
    if (req.path.startsWith("/api/")) return res.status(401).json({ erreur: "Session expirée : reconnectez-vous.", connexion: true });
    res.redirect(303, "/connexion");
  });
}

/** Adresses de cet ordinateur sur le réseau local (ex. 192.168.1.23). */
export const adressesLocales = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address);

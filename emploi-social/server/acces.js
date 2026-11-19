// Accès depuis le téléphone : l'application s'ouvre au réseau Wi-Fi local,
// protégée par un code d'accès (demandé une fois par le navigateur du téléphone).
import { randomInt, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DATA_DIR } from "./store.js";

/** Code d'accès : MOT_DE_PASSE (.env) ou code généré une fois et conservé dans data/. */
export function codeAcces() {
  if (process.env.MOT_DE_PASSE) return process.env.MOT_DE_PASSE;
  const fichier = path.join(DATA_DIR, "code-acces.txt");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(fichier)) return fs.readFileSync(fichier, "utf8").trim();
  const code = `${randomInt(1000, 10000)}-${randomInt(1000, 10000)}`;
  fs.writeFileSync(fichier, code, { mode: 0o600 });
  return code;
}

/** Middleware : exige le code (authentification HTTP, le nom d'utilisateur est libre). */
export function protegerPar(code) {
  const attendu = Buffer.from(code);
  return (req, res, next) => {
    const [type, valeur] = (req.headers.authorization ?? "").split(" ");
    if (type === "Basic" && valeur) {
      const mdp = Buffer.from(Buffer.from(valeur, "base64").toString("utf8").split(":").slice(1).join(":"));
      if (mdp.length === attendu.length && timingSafeEqual(mdp, attendu)) return next();
    }
    res.setHeader("WWW-Authenticate", 'Basic realm="Emploi Social - code d acces", charset="UTF-8"');
    res.status(401).send("Code d'accès requis. Nom d'utilisateur : ce que vous voulez. Mot de passe : le code affiché dans le Terminal du Mac.");
  };
}

/** Adresses du Mac sur le réseau local (ex. 192.168.1.23). */
export const adressesLocales = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address);

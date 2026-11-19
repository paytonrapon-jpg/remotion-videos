import { adressesLocales, codeAcces, protegerPar } from "./acces.js";
import { createApp } from "./app.js";
import { smtpConfigure } from "./envoi.js";
import { modeDemo } from "./jobRoom.js";

const port = Number(process.env.PORT || 5175);
// Par défaut, écoute uniquement sur cet ordinateur. Avec « npm run telephone »,
// l'application est ouverte au Wi-Fi local, toujours protégée par un code d'accès.
const telephone = process.argv.includes("--telephone");
const host = process.env.HOST || (telephone ? "0.0.0.0" : "127.0.0.1");
const ouvert = !["127.0.0.1", "localhost", "::1"].includes(host);
const code = ouvert ? codeAcces() : null;

createApp({ proteger: code ? protegerPar(code) : null }).listen(port, host, () => {
  console.log(`\n  Emploi Social → http://localhost:${port}`);
  if (ouvert) {
    const ips = adressesLocales();
    console.log("\n  📱 Sur votre téléphone (connecté au même Wi-Fi), ouvrez :");
    for (const ip of ips.length ? ips : ["<adresse du Mac>"]) console.log(`       http://${ip}:${port}`);
    console.log(`\n  🔑 Code d'accès : ${code}`);
    console.log("     (nom d'utilisateur : ce que vous voulez, mot de passe : ce code)");
    console.log("     Laissez cette fenêtre ouverte et le Mac allumé pendant que vous l'utilisez.");
  }
  console.log(`\n  Offres : ${modeDemo() ? "exemples fictifs (OFFRES_DEMO=1)" : "job-room.ch, bourse de l'emploi suisse"}`);
  console.log(`  Envoi  : ${smtpConfigure() ? "SMTP réel" : "simulation (fichiers .eml dans data/outbox)"}\n`);
});

import { adressesLocales, codeAcces } from "./acces.js";
import { createApp } from "./app.js";
import { smtpConfigure } from "./envoi.js";
import { modeDemo } from "./jobRoom.js";

const port = Number(process.env.PORT || 5175);
// Par défaut, écoute uniquement sur cet ordinateur. Avec « npm run telephone » ou en
// ligne (Render), l'application est ouverte aux autres appareils, avec mot de passe.
const enLigne = Boolean(process.env.RENDER);
const telephone = process.argv.includes("--telephone");
const host = process.env.HOST || (telephone || enLigne ? "0.0.0.0" : "127.0.0.1");
const ouvert = !["127.0.0.1", "localhost", "::1"].includes(host);
const motDePasse = ouvert ? codeAcces() : null;

if (enLigne && !process.env.MOT_DE_PASSE) {
  console.warn("⚠️  MOT_DE_PASSE non défini : un code a été généré, voir data/code-acces.txt. Définissez MOT_DE_PASSE dans Render.");
}
if (motDePasse && motDePasse.length < 10 && enLigne) {
  console.warn("⚠️  Mot de passe court : utilisez au moins 10 caractères pour une application en ligne.");
}

createApp({ motDePasse }).listen(port, host, () => {
  if (enLigne) {
    console.log(`Emploi Social en ligne (port ${port}), protégé par mot de passe.`);
  } else {
    console.log(`\n  Emploi Social → http://localhost:${port}`);
  }
  if (ouvert && !enLigne) {
    const ips = adressesLocales();
    console.log("\n  📱 Sur votre téléphone (connecté au même Wi-Fi), ouvrez :");
    for (const ip of ips.length ? ips : ["<adresse du Mac>"]) console.log(`       http://${ip}:${port}`);
    console.log(`\n  🔑 Mot de passe : ${motDePasse}`);
    console.log("     Laissez cette fenêtre ouverte et le Mac allumé pendant que vous l'utilisez.");
  }
  console.log(`  Offres : ${modeDemo() ? "exemples fictifs (OFFRES_DEMO=1)" : "job-room.ch, bourse de l'emploi suisse"}`);
  console.log(`  Envoi  : ${smtpConfigure() ? "SMTP réel" : "simulation (fichiers .eml dans data/outbox)"}\n`);
});

import { createApp } from "./app.js";
import { smtpConfigure } from "./envoi.js";
import { modeDemo } from "./jobRoom.js";

const port = Number(process.env.PORT || 5175);
// Écoute uniquement en local : vos données personnelles ne sont pas exposées au réseau.
const host = process.env.HOST || "127.0.0.1";

createApp().listen(port, host, () => {
  console.log(`\n  Emploi Social → http://localhost:${port}`);
  console.log(`  Offres : ${modeDemo() ? "exemples fictifs (OFFRES_DEMO=1)" : "job-room.ch, bourse de l'emploi suisse"}`);
  console.log(`  Envoi  : ${smtpConfigure() ? "SMTP réel" : "simulation (fichiers .eml dans data/outbox)"}\n`);
});

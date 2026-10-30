// Exporte une vidéo directement dans le dossier Google Drive (Google Drive pour ordinateur, Mac).
//
//   npm run drive -- EmptyLegGvaMpl         exporte une vidéo
//   npm run drive -- EmptyLegGvaMpl RdvClient  en exporte plusieurs
//   npm run drive -- --dossier "/chemin"    choisit un autre dossier de destination
//   npm run drive                           affiche le dossier et les vidéos disponibles

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CONFIG = path.join(import.meta.dirname, "..", ".drive-folder");
const SUBFOLDER = "Vidéos Remotion";

// Cherche « Mon Drive » dans ~/Library/CloudStorage/GoogleDrive-<compte>/.
const detectDrive = () => {
  const root = path.join(os.homedir(), "Library", "CloudStorage");
  if (!fs.existsSync(root)) return null;
  for (const account of fs.readdirSync(root).filter((d) => d.startsWith("GoogleDrive-"))) {
    for (const name of ["Mon Drive", "My Drive"]) {
      const dir = path.join(root, account, name);
      if (fs.existsSync(dir)) return path.join(dir, SUBFOLDER);
    }
  }
  return null;
};

const fail = (message) => {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
};

const args = process.argv.slice(2);

const setIndex = args.indexOf("--dossier");
if (setIndex !== -1) {
  const dir = args[setIndex + 1];
  if (!dir) fail("Indique le dossier après --dossier, entre guillemets.");
  fs.writeFileSync(CONFIG, path.resolve(dir));
  console.log(`✓ Dossier de destination enregistré : ${path.resolve(dir)}`);
  args.splice(setIndex, 2);
  if (args.length === 0) process.exit(0);
}

let folder = fs.existsSync(CONFIG) ? fs.readFileSync(CONFIG, "utf8").trim() : detectDrive();
if (!folder) {
  fail(
    "Dossier Google Drive introuvable. Vérifie que Google Drive pour ordinateur est installé et connecté,\n" +
      '  ou indique le dossier toi-même : npm run drive -- --dossier "/chemin/vers/le/dossier"',
  );
}
fs.mkdirSync(folder, { recursive: true });

if (args.length === 0) {
  console.log(`Dossier de destination : ${folder}\n`);
  spawnSync("npx", ["remotion", "compositions"], { stdio: "inherit" });
  console.log("\nExemple : npm run drive -- EmptyLegGvaMpl");
  process.exit(0);
}

const date = new Date().toISOString().slice(0, 10);
for (const id of args) {
  const output = path.join(folder, `${id}-${date}.mp4`);
  console.log(`\n▶ Rendu de ${id} vers ${output}\n`);
  const result = spawnSync("npx", ["remotion", "render", id, output], { stdio: "inherit" });
  if (result.status !== 0) fail(`Le rendu de ${id} a échoué.`);
  console.log(`\n✓ ${id} est dans ton Drive : ${output}`);
}

// Rend toutes les vidéos d'un lot : node scripts/render-reels.mjs reels/batches/AAAA-MM-JJ.json
// Chaque vidéo sort dans out/reels/<date>/<id>.mp4.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("Usage : node scripts/render-reels.mjs reels/batches/AAAA-MM-JJ.json");
const batch = JSON.parse(readFileSync(file, "utf8"));
const dir = `out/reels/${batch.date}`;
mkdirSync(dir, { recursive: true });

for (const reel of batch.reels) {
  const propsFile = `${dir}/${reel.id}.props.json`;
  writeFileSync(propsFile, JSON.stringify(reel.props));
  execFileSync("npx", ["remotion", "render", "EmptyLegReel", `${dir}/${reel.id}.mp4`, `--props=${propsFile}`, "--crf=20"], { stdio: "inherit" });
}
console.log(`${batch.reels.length} vidéos dans ${dir}`);

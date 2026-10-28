// Télécharge un extrait vertical libre de droits depuis Pexels pour une destination.
// Usage : node scripts/fetch-footage.mjs "Palma de Mallorca" palma
// Sortie : public/footage/pexels/<slug>.mp4 (H.264, 1080x1920) et une ligne JSON sur stdout
// { file, duration, author, url } à reporter dans les props du reel.
// Nécessite la variable d'environnement PEXELS_API_KEY (clé gratuite : https://www.pexels.com/api/).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const [query, slug] = process.argv.slice(2);
if (!query || !slug) throw new Error('Usage : node scripts/fetch-footage.mjs "<recherche>" <slug>');
const key = process.env.PEXELS_API_KEY;
if (!key) throw new Error("PEXELS_API_KEY absente : ajoutez-la dans les réglages de l'environnement.");

const search = async (orientation) => {
  const url = `https://api.pexels.com/videos/search?${new URLSearchParams({ query, orientation, size: "medium", per_page: "15" })}`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels ${res.status} : ${await res.text()}`);
  return (await res.json()).videos ?? [];
};

// Vertical d'abord, sinon paysage (recadré au rendu) ; durée utile 6 à 60 s.
let videos = (await search("portrait")).filter((v) => v.duration >= 6 && v.duration <= 60);
if (!videos.length) videos = (await search("landscape")).filter((v) => v.duration >= 6 && v.duration <= 60);
if (!videos.length) throw new Error(`Aucune vidéo Pexels pour « ${query} »`);

const video = videos[0];
const file = [...video.video_files]
  .filter((f) => f.file_type === "video/mp4" && f.link)
  .sort((a, b) => Math.abs(Math.max(a.width, a.height) - 1920) - Math.abs(Math.max(b.width, b.height) - 1920))[0];

const dir = "public/footage/pexels";
mkdirSync(dir, { recursive: true });
const raw = `${dir}/${slug}.raw.mp4`;
writeFileSync(raw, Buffer.from(await (await fetch(file.link)).arrayBuffer()));
const out = `${dir}/${slug}.mp4`;
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-an", "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30", "-c:v", "libx264", "-preset", "fast", "-crf", "21", "-pix_fmt", "yuv420p", out]);
execFileSync("rm", [raw]);
console.log(JSON.stringify({ file: `footage/pexels/${slug}.mp4`, duration: video.duration, author: video.user?.name ?? "", url: video.url }));

import { Caption, Word } from "./types";

// Regroupe les mots transcrits en courtes lignes de sous-titres.
export const buildCaptions = (
  rawWords: Word[],
  { maxWords = 4, hide = [] as { start: number; end: number }[] } = {},
): Caption[] => {
  // Rattache la ponctuation isolée (« ? », « ! ») au mot précédent.
  const words: Word[] = [];
  for (const w of rawWords) {
    const last = words[words.length - 1];
    if (last && /^[?!:;]+$/.test(w.word)) {
      words[words.length - 1] = { ...last, word: `${last.word} ${w.word}`, end: w.end };
    } else {
      words.push({ ...w });
    }
  }

  const visible = words.filter((w) => !hide.some((h) => w.start >= h.start && w.start < h.end));

  const captions: Caption[] = [];
  let chunk: Word[] = [];
  const flush = () => {
    if (chunk.length === 0) return;
    captions.push({
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
      text: chunk.map((w) => w.word).join(" "),
      words: chunk,
    });
    chunk = [];
  };

  visible.forEach((w, i) => {
    const prev = visible[i - 1];
    if (prev && w.start - prev.end > 0.4) flush();
    chunk.push(w);
    if (chunk.length >= maxWords || /[.,?!]$/.test(w.word)) flush();
  });
  flush();

  // Prolonge chaque ligne jusqu'à la suivante (au plus 0,5 s) pour éviter les clignotements.
  return captions.map((c, i) => {
    const next = captions[i + 1];
    return { ...c, end: next ? Math.min(next.start, c.end + 0.5) : c.end + 0.5 };
  });
};

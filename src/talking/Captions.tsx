import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fontFamily } from "./theme";
import { Word } from "./types";

// Met en surbrillance le mot prononcé : selon son minutage s'il est connu,
// sinon en répartissant les mots uniformément sur la durée.
export const CaptionLine: React.FC<{ text: string; start: number; words?: Word[] }> = ({
  text,
  start,
  words: timed,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const words = timed
    ? timed.map((w) => w.word)
    : text.replace(/ ([?!:;])/g, " $1").split(" ");
  const time = start + frame / fps;
  const current = timed
    ? timed.reduce((acc, w, i) => (time >= w.start ? i : acc), 0)
    : Math.min(words.length - 1, Math.floor((frame / durationInFrames) * words.length));

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 150 }}>
      <div
        style={{
          width: "88%",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 30px",
          fontFamily,
          fontWeight: 900,
          fontSize: 76,
          lineHeight: 1.15,
          textTransform: "uppercase",
          WebkitTextStroke: "10px black",
          paintOrder: "stroke fill",
        }}
      >
        {words.map((word, i) => (
          <span
            key={i}
            style={{
              color: i === current ? colors.highlight : "white",
              display: "inline-block",
            }}
          >
            {word}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

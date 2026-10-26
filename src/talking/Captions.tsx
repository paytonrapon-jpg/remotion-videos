import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fontFamily } from "./theme";

// Met en surbrillance le mot prononcé, en répartissant les mots uniformément sur la durée.
export const CaptionLine: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const words = text.replace(/ ([?!:;])/g, "\u00a0$1").split(" ");
  const current = Math.min(
    words.length - 1,
    Math.floor((frame / durationInFrames) * words.length),
  );

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 170 }}>
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

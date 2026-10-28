import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CaptionLine } from "./Captions";
import { IllustrationCard } from "./IllustrationCard";
import { KeywordCard } from "./KeywordCard";
import { PromptCard } from "./PromptCard";
import { ScreenCard } from "./ScreenCard";
import { colors, fontFamily } from "./theme";
import { TalkingHeadProps } from "./types";

const Placeholder: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "linear-gradient(180deg, #d9d6d2, #a9a5a0)",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <span style={{ fontFamily, fontWeight: 800, fontSize: 60, color: "rgba(0,0,0,0.25)" }}>
      Ta vidéo ici
    </span>
  </AbsoluteFill>
);

export const TalkingHead: React.FC<TalkingHeadProps> = ({ videoSrc, overlays, captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Léger zoom "punch" sur la vidéo à chaque apparition d'un mot-clé.
  const zoom = overlays
    .filter((o) => o.type === "keyword")
    .reduce((acc, o) => {
      const local = frame - Math.round(o.start * fps);
      const inRange = frame < Math.round(o.end * fps);
      return inRange ? acc + 0.06 * spring({ frame: local, fps, config: { damping: 20 } }) : acc;
    }, 1);

  // Floute et assombrit la vidéo pendant les écrans d'application.
  const t = frame / fps;
  const screenFocus = overlays
    .filter((o) => o.type === "screen")
    .reduce(
      (acc, o) =>
        Math.max(
          acc,
          interpolate(t, [o.start, o.start + 0.4, o.end - 0.3, o.end], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        ),
      0,
    );

  return (
    <AbsoluteFill style={{ background: colors.ink }}>
      <AbsoluteFill
        style={{
          transform: `scale(${zoom + screenFocus * 0.08})`,
          filter: screenFocus > 0 ? `blur(${screenFocus * 18}px) brightness(${1 - screenFocus * 0.55})` : undefined,
        }}
      >
        {videoSrc ? (
          <OffthreadVideo
            src={staticFile(videoSrc)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Placeholder />
        )}
      </AbsoluteFill>

      {captions.map((c, i) => (
        <Sequence
          key={`c${i}`}
          from={Math.round(c.start * fps)}
          durationInFrames={Math.round((c.end - c.start) * fps)}
          layout="none"
        >
          <CaptionLine text={c.text} start={c.start} words={c.words} />
        </Sequence>
      ))}

      {overlays.map((o, i) => (
        <Sequence
          key={`o${i}`}
          from={Math.round(o.start * fps)}
          durationInFrames={Math.round((o.end - o.start) * fps)}
        >
          {o.type === "keyword" ? (
            <KeywordCard text={o.text} icon={o.icon} color={o.color} />
          ) : o.type === "prompt" ? (
            <PromptCard title={o.title} text={o.text} />
          ) : o.type === "screen" ? (
            <ScreenCard {...o} />
          ) : (
            <IllustrationCard name={o.name} label={o.label} />
          )}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

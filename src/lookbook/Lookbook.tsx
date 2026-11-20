import {
  AbsoluteFill,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily } from "../talking/theme";

const c = {
  bg1: "#F7EDE6",
  bg2: "#EAD6C8",
  ink: "#2A1E1A",
  rose: "#E8B4B8",
  gold: "#C9A063",
  white: "#FFFFFF",
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type Piece = {
  /** Nom de la pièce, ex. "Brassière pastel" */
  name: string;
  /** Marque ou magasin, ex. "ola" (laisser vide si inconnu) */
  shop?: string;
  /** Position de l'étiquette en % de l'image */
  x: number;
  y: number;
};

export type Look = {
  title: string;
  image: string;
  /** "cutout" = mannequin détourée posée sur le fond ; "photo" = photo en carte */
  mode: "cutout" | "photo";
  pieces: Piece[];
  caption: string;
};

export type LookbookProps = {
  hook: string;
  looks: Look[];
  cta: string;
  /** Vidéo de fond facultative dans public/, ex. "mannequins/fond.mp4" */
  backgroundVideo?: string;
};

export const HOOK_S = 2.5;
export const LOOK_S = 5;
export const OUTRO_S = 3;
export const lookbookDuration = (p: LookbookProps) =>
  Math.round((HOOK_S + p.looks.length * LOOK_S + OUTRO_S) * 30);

const Background: React.FC<{ video?: string }> = ({ video }) => {
  const frame = useCurrentFrame();
  const x = 50 + Math.sin(frame / 70) * 20;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${x}% 35%, rgba(255,255,255,0.7), transparent 55%), linear-gradient(180deg, ${c.bg1}, ${c.bg2})`,
      }}
    >
      {video ? (
        <OffthreadVideo src={staticFile(video)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div
      style={{
        position: "absolute",
        bottom: 110,
        left: 70,
        right: 70,
        background: "rgba(42,30,26,0.82)",
        borderRadius: 32,
        padding: "22px 30px",
        textAlign: "center",
        fontFamily,
        fontWeight: 900,
        fontSize: 46,
        lineHeight: 1.25,
        color: c.white,
              }}
    >
      {words.map((w, i) => {
        const start = 6 + i * 4;
        const o = interpolate(frame, [start, start + 4], [0, 1], clamp);
        const active = frame >= start && frame < start + 8;
        return (
          <span key={i} style={{ opacity: o, color: active ? c.rose : c.white }}>
            {w}{" "}
          </span>
        );
      })}
    </div>
  );
};

const Tag: React.FC<{ piece: Piece; delay: number }> = ({ piece, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 12 } });
  return (
    <div
      style={{
        position: "absolute",
        left: `${piece.x}%`,
        top: `${piece.y}%`,
        transform: `translate(-50%, -50%) scale(${p})`,
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "rgba(255,255,255,0.94)",
        borderRadius: 999,
        padding: "14px 26px 14px 16px",
        boxShadow: "0 10px 30px rgba(42,30,26,0.25)",
        fontFamily,
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ width: 22, height: 22, borderRadius: 99, background: c.rose, border: `4px solid ${c.ink}` }} />
      <div style={{ fontSize: 34, fontWeight: 800, color: c.ink }}>
        {piece.name}
        {piece.shop ? <span style={{ color: c.gold }}> · {piece.shop}</span> : null}
      </div>
    </div>
  );
};

const LookScene: React.FC<{ look: Look; index: number }> = ({ look, index }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 15 } });
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], clamp);
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.07]);
  const titleP = spring({ frame: frame - 4, fps, config: { damping: 14 } });

  const isCutout = look.mode === "cutout";
  const box: React.CSSProperties = isCutout
    ? { left: 60, right: 60, top: 300, bottom: 330 }
    : { left: 120, right: 120, top: 330, bottom: 360 };

  return (
    <AbsoluteFill style={{ opacity: exit }}>
      <div
        style={{
          position: "absolute",
          top: 120,
          width: "100%",
          textAlign: "center",
          fontFamily,
          opacity: titleP,
          transform: `translateY(${(1 - titleP) * -40}px)`,
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 8, color: c.gold }}>LOOK {index + 1}</div>
        <div style={{ fontSize: 76, fontWeight: 900, color: c.ink }}>{look.title}</div>
      </div>

      <div
        style={{
          position: "absolute",
          ...box,
          transform: `translateY(${(1 - enter) * 700}px) rotate(${isCutout ? 0 : (1 - enter) * 8 - 2}deg)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: isCutout ? "visible" : "hidden",
            borderRadius: isCutout ? 0 : 36,
            border: isCutout ? undefined : `14px solid ${c.white}`,
            boxShadow: isCutout ? undefined : "0 30px 70px rgba(42,30,26,0.35)",
          }}
        >
          <Img
            src={staticFile(look.image)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: isCutout ? "contain" : "cover",
              objectPosition: isCutout ? "bottom center" : "center",
              transform: `scale(${zoom})`,
              transformOrigin: "50% 100%",
              filter: isCutout ? "drop-shadow(0 25px 40px rgba(42,30,26,0.35))" : undefined,
            }}
          />
        </div>
        {look.pieces.map((p, i) => (
          <Tag key={i} piece={p} delay={18 + i * 12} />
        ))}
      </div>

      <Caption text={look.caption} />
    </AbsoluteFill>
  );
};

const Hook: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], clamp);
  const lines = text.split("\n");
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: exit }}>
      {lines.map((l, i) => {
        const p = spring({ frame: frame - i * 8, fps, config: { damping: 13 } });
        return (
          <div
            key={i}
            style={{
              fontFamily,
              fontWeight: 900,
              fontSize: 96,
              lineHeight: 1.1,
              color: i === lines.length - 1 ? c.gold : c.ink,
              textAlign: "center",
              padding: "0 60px",
              opacity: p,
              transform: `scale(${0.6 + p * 0.4})`,
            }}
          >
            {l}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ looks: Look[]; cta: string }> = ({ looks, cta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 260, left: 0, right: 0, height: 1100 }}>
        {looks.map((l, i) => {
          const p = spring({ frame: frame - i * 6, fps, config: { damping: 14 } });
          const n = looks.length;
          const w = 900 / n;
          const rot = (i - (n - 1) / 2) * 6;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 90 + i * w - 20,
                top: 60,
                width: w + 40,
                height: 980,
                transform: `translateY(${(1 - p) * 500}px) rotate(${rot}deg)`,
                borderRadius: 30,
                overflow: "hidden",
                border: `12px solid ${c.white}`,
                boxShadow: "0 25px 60px rgba(42,30,26,0.35)",
                background: c.rose,
              }}
            >
              <Img src={staticFile(l.image.replace("-cutout.png", ".jpg"))} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  left: 20,
                  width: 80,
                  height: 80,
                  borderRadius: 99,
                  background: c.ink,
                  color: c.white,
                  fontFamily,
                  fontWeight: 900,
                  fontSize: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 260,
          width: "100%",
          textAlign: "center",
          fontFamily,
          fontWeight: 900,
          fontSize: 72,
          color: c.ink,
          opacity: interpolate(frame, [14, 24], [0, 1], clamp),
        }}
      >
        {cta}
      </div>
    </AbsoluteFill>
  );
};

export const Lookbook: React.FC<LookbookProps> = ({ hook, looks, cta, backgroundVideo }) => {
  const { fps } = useVideoConfig();
  const hookF = HOOK_S * fps;
  const lookF = LOOK_S * fps;
  return (
    <AbsoluteFill style={{ background: c.bg1 }}>
      <Background video={backgroundVideo} />
      <Sequence durationInFrames={hookF}>
        <Hook text={hook} />
      </Sequence>
      {looks.map((look, i) => (
        <Sequence key={i} from={hookF + i * lookF} durationInFrames={lookF}>
          <LookScene look={look} index={i} />
        </Sequence>
      ))}
      <Sequence from={hookF + looks.length * lookF}>
        <Outro looks={looks} cta={cta} />
      </Sequence>
    </AbsoluteFill>
  );
};

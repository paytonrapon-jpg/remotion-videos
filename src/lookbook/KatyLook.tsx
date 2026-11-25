import {
  AbsoluteFill,
  Img,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily } from "../talking/theme";

// Vidéo « outfit » façon TikTok : les pièces du look en haut, l'avatar qui parle en bas.
// Tous les temps sont en secondes dans la vidéo de l'avatar (sa piste audio sert de voix off).

export type KatyLookProps = {
  /** vidéo de l'avatar qui parle (public/) */
  avatar: string;
  /** cadrage de l'avatar dans la moitié basse (object-position CSS) */
  avatarPosition?: string;
  /** durée totale (s) */
  duration: number;
  hook: { text: string; from: number; to: number };
  pieces: { photo: string; at: number }[];
  reveal: { photo: string; at: number };
  /** gros mot-clé affiché sur l'avatar, comme « SNEAKERS » */
  captions: { text: string; from: number; to: number }[];
};

const c = { wall: "#E6E4E1", ink: "#1E1A18", gold: "#C9A063", white: "#FFFFFF" };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const FPS = 30;
const f = (s: number) => Math.round(s * FPS);

const SPLIT = 1000; // haut : le look ; bas : l'avatar
const CARD = 280;
const CARD_GAP = 22;
const cardY = (i: number, n: number) => (SPLIT - (n * CARD + (n - 1) * CARD_GAP)) / 2 + i * (CARD + CARD_GAP);

const PieceCard: React.FC<{ photo: string; at: number; i: number; n: number }> = ({ photo, at, i, n }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - f(at), fps, config: { damping: 12, mass: 0.8 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        top: cardY(i, n),
        width: CARD,
        height: CARD,
        borderRadius: 26,
        overflow: "hidden",
        background: c.white,
        border: `8px solid ${c.white}`,
        boxShadow: "0 18px 40px rgba(30,26,24,0.22)",
        transform: `translateX(${(1 - p) * -380}px) scale(${0.85 + p * 0.15})`,
        opacity: Math.min(1, p * 1.5),
      }}
    >
      <Img src={staticFile(photo)} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} />
    </div>
  );
};

const Reveal: React.FC<{ photo: string; at: number }> = ({ photo, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - f(at), fps, config: { damping: 14 } });
  const zoom = interpolate(frame, [f(at), f(at) + 150], [1.06, 1], clamp);
  const flash = interpolate(frame, [f(at), f(at) + 4, f(at) + 14], [0, 0.7, 0], clamp);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 360,
          top: 50,
          width: 680,
          height: SPLIT - 90,
          borderRadius: 30,
          overflow: "hidden",
          border: `8px solid ${c.white}`,
          boxShadow: "0 24px 60px rgba(30,26,24,0.3)",
          opacity: p,
          transform: `translateY(${(1 - p) * 60}px) scale(${0.92 + p * 0.08})`,
        }}
      >
        <Img src={staticFile(photo)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
      </div>
      <AbsoluteFill style={{ background: c.white, opacity: flash, height: SPLIT }} />
    </>
  );
};

const HookTitle: React.FC<{ text: string; from: number; to: number }> = ({ text, from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = interpolate(frame, [f(to) - 6, f(to) + 4], [1, 0], clamp);
  const lines = text.split("\n");
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: SPLIT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity: out,
      }}
    >
      {lines.map((l, i) => {
        const p = spring({ frame: frame - f(from) - i * 7, fps, config: { damping: 13 } });
        return (
          <div
            key={i}
            style={{
              fontFamily,
              fontWeight: 900,
              fontSize: 120,
              lineHeight: 1.05,
              color: i === lines.length - 1 ? "#1F3A8A" : c.ink,
              textAlign: "center",
              opacity: p,
              transform: `scale(${0.6 + p * 0.4})`,
            }}
          >
            {l}
          </div>
        );
      })}
    </div>
  );
};

const Caption: React.FC<{ text: string; from: number; to: number }> = ({ text, from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < f(from) || frame >= f(to)) return null;
  const p = spring({ frame: frame - f(from), fps, config: { damping: 10, mass: 0.6 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 1640,
        textAlign: "center",
        fontFamily: "Impact, 'Anton', 'Arial Narrow Bold', sans-serif",
        fontWeight: 900,
        fontSize: 132,
        letterSpacing: 2,
        color: c.white,
        WebkitTextStroke: "6px #000",
        paintOrder: "stroke fill",
        textShadow: "0 6px 18px rgba(0,0,0,0.45)",
        transform: `scale(${0.7 + p * 0.3})`,
        zIndex: 5,
      }}
    >
      {text}
    </div>
  );
};

export const KatyLook: React.FC<KatyLookProps> = ({ avatar, avatarPosition, hook, pieces, reveal, captions }) => (
  <AbsoluteFill style={{ background: c.wall }}>
    {/* Avatar qui parle, moitié basse (sa piste audio est la voix off) */}
    <div style={{ position: "absolute", left: 0, top: SPLIT - 40, width: 1080, height: 1920 - SPLIT + 40, overflow: "hidden" }}>
      <OffthreadVideo
        src={staticFile(avatar)}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: avatarPosition ?? "50% 25%" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(${c.wall} 0px, rgba(230,228,225,0) 120px)`,
        }}
      />
    </div>

    <HookTitle {...hook} />
    {pieces.map((p, i) => (
      <PieceCard key={p.photo} {...p} i={i} n={pieces.length} />
    ))}
    <Reveal {...reveal} />
    {captions.map((cap) => (
      <Caption key={cap.text + cap.from} {...cap} />
    ))}
  </AbsoluteFill>
);

export const katyLookDuration = (p: KatyLookProps) => f(p.duration);

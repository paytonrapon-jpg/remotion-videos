import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily } from "../talking/theme";
import durees from "./voix-durees.json";
import { pieceArt } from "./pieces";

const c = {
  bg1: "#F7EDE6",
  bg2: "#EAD6C8",
  ink: "#2A1E1A",
  rose: "#E8B4B8",
  gold: "#C9A063",
  white: "#FFFFFF",
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const FPS = 30;
const GAP = 0.15; // silence entre deux phrases (s)

type Line = { voice: string; id: string };
type Piece = Line & { art: string; photo?: string; fit?: string };
type Look = {
  image: string;
  photo: string;
  mode: string;
  intro: Line;
  pieces: Piece[];
  reveal: Line;
};
export type LookbookProps = {
  hook: Line & { text: string };
  looks: Look[];
  outro: Line & { text: string };
};

const sec = (id: string) => (durees as Record<string, number>)[id] ?? 1.5;
const f = (s: number) => Math.round(s * FPS);

// Minutage calé sur la durée de chaque phrase de la voix off.
const lookTiming = (look: Look) => {
  let t = sec(look.intro.id) + GAP;
  const pieces = look.pieces.map((p) => {
    const start = t;
    t += sec(p.id) + GAP;
    return start;
  });
  const reveal = t + 0.2;
  const end = reveal + Math.max(sec(look.reveal.id) + 1.6, 2.8);
  return { pieces, reveal, end };
};
const hookLen = (p: LookbookProps) => sec(p.hook.id) + 0.6;
const outroLen = (p: LookbookProps) => sec(p.outro.id) + 1;

export const lookbookDuration = (p: LookbookProps) =>
  f(hookLen(p)) + p.looks.reduce((a, l) => a + f(lookTiming(l).end), 0) + f(outroLen(p));

const Voice: React.FC<{ id: string; at?: number }> = ({ id, at = 0 }) => (
  <Sequence from={f(at)} layout="none">
    <Audio src={staticFile(`mannequins/voix/${id}.wav`)} />
  </Sequence>
);

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const x = 50 + Math.sin(frame / 70) * 20;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${x}% 35%, rgba(255,255,255,0.7), transparent 55%), linear-gradient(180deg, ${c.bg1}, ${c.bg2})`,
      }}
    />
  );
};

// Position d'une pièce : grande carte pendant l'énumération, vignette sous la mannequin ensuite.
const gridPos = (i: number, n: number) => {
  const size = n <= 2 ? 520 : 440;
  const cols = n === 1 ? 1 : 2;
  const rows = Math.ceil(n / cols);
  const row = Math.floor(i / cols);
  const inRow = row === rows - 1 ? n - row * cols : cols;
  const col = i - row * cols;
  const gapX = 40;
  const gapY = 50;
  const totalH = rows * size + (rows - 1) * gapY;
  const rowW = inRow * size + (inRow - 1) * gapX;
  return {
    x: (1080 - rowW) / 2 + col * (size + gapX),
    y: 330 + (1300 - totalH) / 2 + row * (size + gapY),
    size,
    rot: (i % 2 === 0 ? -1 : 1) * (3 + (i % 3)),
  };
};
const thumbPos = (i: number, n: number) => {
  const size = 170;
  const gap = 24;
  const w = n * size + (n - 1) * gap;
  return { x: (1080 - w) / 2 + i * (size + gap), y: 1610, size, rot: 0 };
};

const PieceCard: React.FC<{ piece: Piece; i: number; n: number; start: number; reveal: number }> = ({
  piece,
  i,
  n,
  start,
  reveal,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - f(start), fps, config: { damping: 11, mass: 0.8 } });
  const move = spring({ frame: frame - f(reveal) - i * 3, fps, config: { damping: 15 } });
  const a = gridPos(i, n);
  const b = thumbPos(i, n);
  const lerp = (k: "x" | "y" | "size" | "rot") => a[k] + (b[k] - a[k]) * move;
  const size = lerp("size");
  const zoom = interpolate(frame, [f(start), f(reveal)], [0.92, 1.02], clamp);
  const Art = pieceArt[piece.art];
  return (
    <div
      style={{
        position: "absolute",
        left: lerp("x"),
        top: lerp("y"),
        width: size,
        height: size,
        transform: `scale(${pop}) rotate(${lerp("rot")}deg)`,
        borderRadius: 24 + move * 6,
        border: `${12 - move * 5}px solid ${c.white}`,
        overflow: "hidden",
        boxShadow: "0 20px 50px rgba(42,30,26,0.3)",
        background: "#FFFDFB",
        zIndex: 2,
      }}
    >
      <div style={{ width: "100%", height: "100%", padding: size * 0.06, transform: `scale(${zoom})` }}>
        {piece.photo ? (
          <Img
            src={staticFile(piece.photo)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: piece.fit === "cover" ? "cover" : "contain",
              borderRadius: piece.fit === "cover" ? 12 : 0,
            }}
          />
        ) : Art ? (
          <Art />
        ) : null}
      </div>
    </div>
  );
};

const LookScene: React.FC<{ look: Look; index: number }> = ({ look, index }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = lookTiming(look);
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], clamp);
  const titleP = spring({ frame: frame - 2, fps, config: { damping: 14 } });
  const enter = spring({ frame: frame - f(t.reveal), fps, config: { damping: 15 } });
  const zoom = interpolate(frame, [f(t.reveal), durationInFrames], [1, 1.05], clamp);
  const isCutout = look.mode === "cutout";
  const box: React.CSSProperties = isCutout
    ? { left: 80, right: 80, top: 300, bottom: 360 }
    : { left: 170, right: 170, top: 290, bottom: 400 };

  return (
    <AbsoluteFill style={{ opacity: exit }}>
      <Voice id={look.intro.id} />
      {look.pieces.map((p, i) => (
        <Voice key={p.id} id={p.id} at={t.pieces[i]} />
      ))}
      <Voice id={look.reveal.id} at={t.reveal} />

      <div
        style={{
          position: "absolute",
          top: 130,
          width: "100%",
          textAlign: "center",
          fontFamily,
          fontWeight: 900,
          fontSize: 64,
          letterSpacing: 14,
          color: c.gold,
          opacity: titleP,
          transform: `translateY(${(1 - titleP) * -40}px)`,
        }}
      >
        LOOK {index + 1}
      </div>

      {frame >= f(t.reveal) ? (
        <div
          style={{
            position: "absolute",
            ...box,
            opacity: enter,
            transform: `translateY(${(1 - enter) * 500}px) rotate(${isCutout ? 0 : (1 - enter) * 8 - 2}deg)`,
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
        </div>
      ) : null}

      {look.pieces.map((p, i) => (
        <PieceCard key={p.id} piece={p} i={i} n={look.pieces.length} start={t.pieces[i]} reveal={t.reveal} />
      ))}
    </AbsoluteFill>
  );
};

const Hook: React.FC<{ text: string; id: string }> = ({ text, id }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], clamp);
  const lines = text.split("\n");
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: exit }}>
      <Voice id={id} />
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

const Outro: React.FC<{ looks: Look[]; text: string; id: string }> = ({ looks, text, id }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = looks.length;
  const w = 900 / n;
  return (
    <AbsoluteFill>
      <Voice id={id} />
      {looks.map((l, i) => {
        const p = spring({ frame: frame - i * 6, fps, config: { damping: 14 } });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 90 + i * w - 20,
              top: 320,
              width: w + 40,
              height: 980,
              transform: `translateY(${(1 - p) * 500}px) rotate(${(i - (n - 1) / 2) * 6}deg)`,
              borderRadius: 30,
              overflow: "hidden",
              border: `12px solid ${c.white}`,
              boxShadow: "0 25px 60px rgba(42,30,26,0.35)",
            }}
          >
            <Img src={staticFile(l.photo)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
        {text}
      </div>
    </AbsoluteFill>
  );
};

export const Lookbook: React.FC<LookbookProps> = (props) => {
  const { hook, looks, outro } = props;
  let cursor = f(hookLen(props));
  const scenes = looks.map((look, i) => {
    const len = f(lookTiming(look).end);
    const s = (
      <Sequence key={i} from={cursor} durationInFrames={len}>
        <LookScene look={look} index={i} />
      </Sequence>
    );
    cursor += len;
    return s;
  });
  return (
    <AbsoluteFill style={{ background: c.bg1 }}>
      <Background />
      <Sequence durationInFrames={f(hookLen(props))}>
        <Hook text={hook.text} id={hook.id} />
      </Sequence>
      {scenes}
      <Sequence from={cursor}>
        <Outro looks={looks} text={outro.text} id={outro.id} />
      </Sequence>
    </AbsoluteFill>
  );
};

import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "../talking/theme";

const fontFamily = "Montserrat";

const c = {
  navy: "#0E1A2B",
  navy2: "#16263D",
  gold: "#E7A92B",
  cream: "#F6F1E7",
  muted: "#9AA8BC",
  green: "#CFE6D2",
  greenInk: "#2F6B3A",
};

export type EmptyLegProps = {
  from: { code: string; city: string };
  to: { code: string; city: string };
  date: string;
  time: string;
  aircraft: string;
  category: string;
  seats: number;
  threshold: number;
  booked: number;
  seatPrice: number;
  fullPrice: number;
  duration: string;
  distance: string;
  cta: string;
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const euro = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ")} €`;

// Entrée en glissant vers le haut, sortie en fondu, pour chaque scène.
const useScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], clamp);
  const pop = (delay = 0) => spring({ frame: frame - delay, fps, config: { damping: 14 } });
  return { frame, fps, exit, pop };
};

const Rise: React.FC<{ p: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  p,
  children,
  style,
}) => (
  <div style={{ opacity: p, transform: `translateY(${(1 - p) * 60}px)`, ...style }}>{children}</div>
);

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const x = 50 + Math.sin(frame / 60) * 25;
  const y = 30 + Math.cos(frame / 80) * 15;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${x}% ${y}%, rgba(231,169,43,0.28), transparent 45%), linear-gradient(180deg, ${c.navy2}, ${c.navy})`,
      }}
    >
      {Array.from({ length: 40 }).map((_, i) => {
        const sx = (i * 137) % 1080;
        const sy = (i * 263 + frame * (0.6 + (i % 3) * 0.3)) % 1920;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: sx,
              top: 1920 - sy,
              width: 3,
              height: 3 + (i % 4) * 6,
              borderRadius: 2,
              background: c.cream,
              opacity: 0.12 + (i % 5) * 0.04,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Plane: React.FC<{ size: number; color?: string; angle?: number }> = ({ size, color = c.gold, angle = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${angle}deg)` }}>
    <path
      d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"
      fill={color}
      transform="rotate(90 12 12)"
    />
  </svg>
);

const Hook: React.FC<EmptyLegProps> = ({ seatPrice }) => {
  const { exit, pop, frame } = useScene();
  const fly = interpolate(frame, [0, 60], [-300, 1300], { ...clamp, easing: Easing.inOut(Easing.quad) });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: exit, fontFamily }}>
      <div style={{ position: "absolute", top: 560, left: fly }}>
        <Plane size={140} />
      </div>
      <Rise p={pop(4)} style={{ color: c.gold, fontSize: 44, fontWeight: 800, letterSpacing: 8 }}>
        EMPTY LEG
      </Rise>
      <Rise p={pop(10)} style={{ color: c.cream, fontSize: 118, fontWeight: 900, textAlign: "center", lineHeight: 1.02, margin: "24px 0" }}>
        Vole en
        <br />
        jet privé
      </Rise>
      <Rise p={pop(18)} style={{ display: "flex", alignItems: "baseline", gap: 18, background: c.gold, borderRadius: 24, padding: "18px 40px" }}>
        <span style={{ fontSize: 54, fontWeight: 800, color: c.navy }}>dès</span>
        <span style={{ fontSize: 110, fontWeight: 900, color: c.navy }}>{euro(seatPrice)}</span>
      </Rise>
      <Rise p={pop(24)} style={{ color: c.muted, fontSize: 44, fontWeight: 800, marginTop: 22 }}>
        par siège
      </Rise>
    </AbsoluteFill>
  );
};

const Route: React.FC<EmptyLegProps> = ({ from, to, duration, distance }) => {
  const { exit, pop, frame } = useScene();
  const travel = interpolate(frame, [12, 90], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  // Arc de vol entre les deux aéroports.
  const pt = (t: number) => ({ x: 170 + 740 * t, y: 330 - Math.sin(Math.PI * t) * 190 });
  const p = pt(travel);
  const q = pt(Math.min(1, travel + 0.01));
  const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
  const path = Array.from({ length: 41 }, (_, i) => pt(i / 40)).map((v, i) => `${i ? "L" : "M"}${v.x} ${v.y}`).join(" ");

  const Airport: React.FC<{ code: string; city: string; d: number }> = ({ code, city, d }) => (
    <Rise p={pop(d)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={{ background: c.cream, color: c.navy, fontSize: 96, fontWeight: 900, letterSpacing: 6, borderRadius: 26, padding: "14px 34px" }}>
        {code}
      </div>
      <span style={{ color: c.cream, fontSize: 46, fontWeight: 800 }}>{city}</span>
    </Rise>
  );

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: exit, fontFamily }}>
      <Rise p={pop(0)} style={{ color: c.gold, fontSize: 44, fontWeight: 800, letterSpacing: 8, marginBottom: 40 }}>
        LE TRAJET
      </Rise>
      <div style={{ position: "relative", width: 1080, height: 420 }}>
        <svg width={1080} height={420} style={{ position: "absolute" }}>
          <path d={path} fill="none" stroke={c.muted} strokeWidth={5} strokeDasharray="14 14" opacity={0.5} />
          <path d={path} fill="none" stroke={c.gold} strokeWidth={6} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - travel} />
        </svg>
        <div style={{ position: "absolute", left: p.x - 50, top: p.y - 50 }}>
          <Plane size={100} angle={angle} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", width: 960, marginTop: -60 }}>
        <Airport {...from} d={4} />
        <Airport {...to} d={10} />
      </div>
      <Rise p={pop(70)} style={{ marginTop: 70, display: "flex", gap: 30, color: c.cream, fontSize: 52, fontWeight: 900 }}>
        <span>≈ {duration}</span>
        <span style={{ color: c.gold }}>·</span>
        <span>{distance}</span>
      </Rise>
    </AbsoluteFill>
  );
};

const Details: React.FC<EmptyLegProps> = ({ date, time, aircraft, category, seats }) => {
  const { exit, pop } = useScene();
  const rows = [
    { label: "Date", value: date, sub: time },
    { label: "Avion", value: aircraft, sub: category },
    { label: "Capacité", value: `${seats} places`, sub: "Cabine privée" },
  ];
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: exit, fontFamily, gap: 34 }}>
      <Rise p={pop(0)} style={{ color: c.gold, fontSize: 44, fontWeight: 800, letterSpacing: 8, marginBottom: 10 }}>
        LE VOL
      </Rise>
      {rows.map((r, i) => (
        <Rise
          key={r.label}
          p={pop(6 + i * 8)}
          style={{
            width: 900,
            background: "rgba(246,241,231,0.08)",
            border: "2px solid rgba(246,241,231,0.15)",
            borderRadius: 32,
            padding: "34px 44px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span style={{ color: c.gold, fontSize: 34, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase" }}>{r.label}</span>
          <span style={{ color: c.cream, fontSize: 72, fontWeight: 900 }}>{r.value}</span>
          <span style={{ color: c.muted, fontSize: 38, fontWeight: 800 }}>{r.sub}</span>
        </Rise>
      ))}
    </AbsoluteFill>
  );
};

const Seat: React.FC<{ filled: boolean; p: number; pulse?: number }> = ({ filled, p, pulse = 0 }) => (
  <svg width={150} height={150} viewBox="0 0 24 24" style={{ transform: `scale(${p * (1 + pulse * 0.08)})` }}>
    <path
      d="M7 3h6a2 2 0 0 1 2 2v7h3a2 2 0 0 1 2 2v3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM8 19h2v2H8zM16 19h2v2h-2z"
      fill={filled ? c.gold : "none"}
      stroke={filled ? c.gold : c.cream}
      strokeWidth={1.3}
      strokeLinejoin="round"
    />
  </svg>
);

const Price: React.FC<EmptyLegProps> = ({ seats, seatPrice, fullPrice }) => {
  const { exit, pop, frame } = useScene();
  const split = interpolate(frame, [30, 70], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const value = interpolate(split, [0, 1], [fullPrice, seatPrice]);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: exit, fontFamily }}>
      <Rise p={pop(0)} style={{ color: c.gold, fontSize: 44, fontWeight: 800, letterSpacing: 8 }}>
        LE PRIX
      </Rise>
      <Rise p={pop(6)} style={{ color: c.muted, fontSize: 46, fontWeight: 800, marginTop: 40 }}>
        Avion entier {euro(fullPrice)}, partagé à {seats}
      </Rise>
      <div style={{ display: "flex", gap: 10, margin: "50px 0" }}>
        {Array.from({ length: seats }).map((_, i) => (
          <Seat key={i} filled={split > (i + 1) / seats - 0.01} p={pop(10 + i * 4)} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <span style={{ color: c.cream, fontSize: 190, fontWeight: 900, letterSpacing: -4 }}>{euro(value)}</span>
      </div>
      <Rise p={split} style={{ color: c.gold, fontSize: 60, fontWeight: 900 }}>
        par siège
      </Rise>
    </AbsoluteFill>
  );
};

const Cta: React.FC<EmptyLegProps> = ({ seats, threshold, booked, cta, from, to }) => {
  const { exit, pop, frame } = useScene();
  const missing = Math.max(0, threshold - booked);
  const pulse = Math.abs(Math.sin(frame / 8));
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: exit, fontFamily }}>
      <Rise p={pop(0)} style={{ background: c.green, color: c.greenInk, fontSize: 40, fontWeight: 900, borderRadius: 999, padding: "14px 34px" }}>
        Co-financement ouvert
      </Rise>
      <Rise p={pop(6)} style={{ color: c.cream, fontSize: 78, fontWeight: 900, textAlign: "center", lineHeight: 1.08, marginTop: 40 }}>
        Plus que {missing} sièges
        <br />
        <span style={{ color: c.gold }}>pour confirmer le vol</span>
      </Rise>
      <div style={{ display: "flex", gap: 10, margin: "50px 0 20px" }}>
        {Array.from({ length: seats }).map((_, i) => (
          <Seat key={i} filled={i < booked} p={pop(12 + i * 3)} pulse={i >= booked && i < threshold ? pulse : 0} />
        ))}
      </div>
      <Rise p={pop(16)} style={{ color: c.muted, fontSize: 40, fontWeight: 800 }}>
        {booked}/{seats} sièges réservés · {from.code} → {to.code}
      </Rise>
      <Rise
        p={pop(26)}
        style={{
          marginTop: 70,
          background: c.gold,
          color: c.navy,
          fontSize: 60,
          fontWeight: 900,
          borderRadius: 28,
          padding: "34px 70px",
          transform: `scale(${1 + pulse * 0.04})`,
          boxShadow: "0 20px 50px rgba(231,169,43,0.35)",
        }}
      >
        {cta}
      </Rise>
    </AbsoluteFill>
  );
};

export const EmptyLeg: React.FC<EmptyLegProps> = (props) => {
  const { fps } = useVideoConfig();
  const scenes: [React.FC<EmptyLegProps>, number][] = [
    [Hook, 2.6],
    [Route, 3.8],
    [Details, 3.0],
    [Price, 3.2],
    [Cta, 3.4],
  ];
  let from = 0;
  return (
    <AbsoluteFill>
      <Background />
      {scenes.map(([Scene, seconds], i) => {
        const start = from;
        from += Math.round(seconds * fps);
        return (
          <Sequence key={i} from={start} durationInFrames={Math.round(seconds * fps)}>
            <Scene {...props} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const emptyLegDuration = 16;

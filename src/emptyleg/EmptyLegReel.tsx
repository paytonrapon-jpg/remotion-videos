import "@fontsource/montserrat/latin-600.css";
import "@fontsource/montserrat/latin-800.css";
import "@fontsource/montserrat/latin-900.css";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type Clip = { from: number; seconds: number };

export type EmptyLegReelProps = {
  videoSrc: string;
  clips: Clip[];
  fromCity: string;
  toCity: string;
  fromFlag: "ch" | "fr";
  toFlag: "ch" | "fr";
  date: string;
  pricePerSeat: string;
  seats: number;
  total: string;
  aircraft: string;
  flightTime: string;
  disclaimer: string;
};

const fontFamily = "Montserrat";
const c = {
  navy: "#10233a",
  amber: "#f0a93a",
  white: "#ffffff",
  mist: "rgba(255,255,255,0.78)",
};

// La bande de prix recouvre exactement la zone où la vidéo source a ses sous-titres incrustés.
const BAND_TOP = 1120;
const BAND_HEIGHT = 300;

const Flag: React.FC<{ kind: "ch" | "fr"; size: number }> = ({ kind, size }) =>
  kind === "ch" ? (
    <div style={{ width: size, height: size, background: "#d52b1e", borderRadius: size * 0.12, position: "relative", boxShadow: "0 6px 18px rgba(0,0,0,.35)" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: size * 0.62, height: size * 0.2, background: "#fff", transform: "translate(-50%,-50%)" }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", width: size * 0.2, height: size * 0.62, background: "#fff", transform: "translate(-50%,-50%)" }} />
    </div>
  ) : (
    <div style={{ width: size * 1.4, height: size, display: "flex", borderRadius: size * 0.1, overflow: "hidden", boxShadow: "0 6px 18px rgba(0,0,0,.35)" }}>
      <div style={{ flex: 1, background: "#0055a4" }} />
      <div style={{ flex: 1, background: "#fff" }} />
      <div style={{ flex: 1, background: "#ef4135" }} />
    </div>
  );

const Logo: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="15" fill="none" stroke="#fff" strokeWidth="1.5" />
    <path d="M5 17.5 27 12l-3 3.5-8 2.2-3.2 5.3h-2.1l1.4-4.5L7 19.4z" fill={c.amber} />
  </svg>
);

const textShadow = "0 4px 24px rgba(0,0,0,.55), 0 2px 4px rgba(0,0,0,.4)";

export const EmptyLegReel: React.FC<EmptyLegReelProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const pop = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
  const outroStart = durationInFrames - 95;

  // Montage : chaque extrait enchaîné, avec un lent zoom qui écarte aussi le filigrane du bord gauche.
  let cursor = 0;
  const clips = p.clips.map((clip, i) => {
    const len = Math.round(clip.seconds * fps);
    const el = (
      <Sequence key={i} from={cursor} durationInFrames={len}>
        <ClipLayer src={p.videoSrc} startFrom={Math.round(clip.from * fps)} len={len} />
      </Sequence>
    );
    cursor += len;
    return el;
  });

  const seatsFilled = Math.min(p.seats, Math.max(0, Math.floor((frame - 40) / 8)));
  const outro = interpolate(frame, [outroStart, outroStart + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: c.navy, fontFamily }}>
      {clips}

      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,20,36,.78) 0%, rgba(8,20,36,.35) 30%, rgba(8,20,36,0) 45%, rgba(8,20,36,0) 75%, rgba(8,20,36,.55) 100%)" }} />

      {/* Itinéraire */}
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, color: c.white }}>
        <div style={{ transform: `scale(${pop(0)})`, background: c.amber, color: c.navy, fontWeight: 800, fontSize: 34, letterSpacing: 4, padding: "10px 26px", borderRadius: 999 }}>
          EMPTY LEG · OFFRE RÉELLE
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 26, transform: `translateY(${(1 - pop(4)) * -60}px)`, opacity: pop(4) }}>
          <Flag kind={p.fromFlag} size={92} />
          <span style={{ fontWeight: 900, fontSize: 124, textShadow }}>{p.fromCity}</span>
        </div>
        <div style={{ transform: `scale(${pop(10)})`, width: 96, height: 96, borderRadius: 22, background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,.3)" }}>
          <svg width="56" height="56" viewBox="0 0 24 24"><path d="M12 3v15m0 0-6-6m6 6 6-6" stroke={c.navy} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 26, transform: `translateY(${(1 - pop(16)) * 60}px)`, opacity: pop(16) }}>
          <span style={{ fontWeight: 900, fontSize: 112, textShadow }}>{p.toCity}</span>
          <Flag kind={p.toFlag} size={80} />
        </div>
        <div style={{ opacity: pop(22), fontWeight: 800, fontSize: 70, textShadow }}>{p.date}</div>
      </div>

      {/* Bande de prix (toujours opaque : elle masque les sous-titres d'origine) */}
      <div style={{ position: "absolute", top: BAND_TOP, left: 0, right: 0, height: BAND_HEIGHT, background: c.navy, borderTop: `4px solid ${c.amber}`, borderBottom: `4px solid ${c.amber}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: c.white }}>
        <div style={{ transform: `scale(${pop(30)})`, fontWeight: 900, fontSize: 86, letterSpacing: -1 }}>
          {p.pricePerSeat}<span style={{ fontSize: 50, fontWeight: 800 }}>/pers.</span>
          <span style={{ fontSize: 50, fontWeight: 800, color: c.mist }}>  ·  Max {p.seats} pers.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: pop(38) }}>
          <span style={{ fontWeight: 800, fontSize: 58, color: c.amber }}>Total : {p.total}</span>
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: p.seats }, (_, i) => (
              <div key={i} style={{ width: 30, height: 36, borderRadius: "9px 9px 4px 4px", background: i < seatsFilled ? c.amber : "rgba(255,255,255,.25)" }} />
            ))}
          </div>
        </div>
      </div>

      {/* Détails du vol */}
      <div style={{ position: "absolute", top: BAND_TOP + BAND_HEIGHT + 28, left: 60, right: 60, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
        {[p.aircraft, p.flightTime, "Co-financement ouvert"].map((t, i) => (
          <div key={t} style={{ opacity: pop(46 + i * 5), transform: `translateY(${(1 - pop(46 + i * 5)) * 30}px)`, background: "rgba(255,255,255,.92)", color: c.navy, fontWeight: 800, fontSize: 36, padding: "12px 24px", borderRadius: 999 }}>
            {t}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: BAND_TOP + BAND_HEIGHT + 182, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 16, opacity: pop(62), color: c.white }}>
        <Logo size={58} />
        <span style={{ fontWeight: 800, fontSize: 40, textShadow }}>Réserve ta place sur Aileron</span>
      </div>
      <div style={{ position: "absolute", top: BAND_TOP + BAND_HEIGHT + 256, left: 80, right: 80, textAlign: "center", fontWeight: 600, fontSize: 24, color: c.mist, textShadow }}>
        {p.disclaimer}
      </div>

      {/* Fin : appel à l'action */}
      {frame >= outroStart ? (
        <AbsoluteFill style={{ background: `rgba(16,35,58,${0.94 * outro})`, alignItems: "center", justifyContent: "center", color: c.white, gap: 30, opacity: outro }}>
          <Logo size={170} />
          <div style={{ fontWeight: 900, fontSize: 96, letterSpacing: -1 }}>Aileron</div>
          <div style={{ fontWeight: 800, fontSize: 56, textAlign: "center", lineHeight: 1.2, padding: "0 80px" }}>
            Partage le jet.<br /><span style={{ color: c.amber }}>Divise le prix.</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 40, color: c.mist, textAlign: "center" }}>
            {p.fromCity} → {p.toCity} · {p.date}<br />{p.pricePerSeat}/pers. · {p.seats} places
          </div>
          <div style={{ marginTop: 20, background: c.amber, color: c.navy, fontWeight: 900, fontSize: 46, padding: "22px 48px", borderRadius: 999, transform: `scale(${1 + 0.04 * Math.sin((frame - outroStart) / 6)})` }}>
            Plus d’infos en DM
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

const ClipLayer: React.FC<{ src: string; startFrom: number; len: number }> = ({ src, startFrom, len }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, len], [1.22, 1.28]);
  const fade = interpolate(frame, [0, 6], [0.4, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "75% 50%", filter: `brightness(${fade})` }}>
      <OffthreadVideo muted src={staticFile(src)} startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};

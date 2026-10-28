import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fontFamily } from "./theme";

export type ScreenSection = { heading: string; items: string[] };

// Tous les temps sont en secondes, par rapport au début de l'écran.
export type ScreenCardProps = {
  title: string;
  // Plages de frappe du prompt : chaque morceau s'écrit pendant sa plage.
  typing: { text: string; start: number; end: number }[];
  sendAt: number;
  response: { intro: string; sections: ScreenSection[]; start: number; end: number };
};

const ui = {
  window: "#262624",
  bar: "#1F1E1D",
  panel: "#30302E",
  border: "#3E3E3A",
  text: "#F0EEE6",
  muted: "#A6A39A",
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Cursor: React.FC<{ x: number; y: number; pressed: boolean }> = ({ x, y, pressed }) => (
  <svg
    width={70}
    height={70}
    viewBox="0 0 24 24"
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `scale(${pressed ? 0.85 : 1})`,
      transformOrigin: "top left",
      filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))",
    }}
  >
    <path d="M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.7 L11 13.3 L18 13 Z" fill="white" stroke="black" strokeWidth={1.4} strokeLinejoin="round" />
  </svg>
);

export const ScreenCard: React.FC<ScreenCardProps> = ({ title, typing, sendAt, response }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  const enter = spring({ frame, fps, config: { damping: 16 } });
  const exit = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], clamp);

  const typed = typing
    .map((part) => {
      const n = Math.round(interpolate(t, [part.start, part.end], [0, part.text.length], clamp));
      return part.text.slice(0, n);
    })
    .join("");
  const fullPrompt = typing.map((p) => p.text).join("");
  const sent = t >= sendAt;
  const caretOn = Math.floor(frame / 8) % 2 === 0;

  // Zoom sur la zone de saisie pendant la frappe, puis vue d'ensemble pour la réponse.
  const zoom = interpolate(t, [0.6, 1.4, sendAt - 0.2, sendAt + 0.5], [1, 1.08, 1.08, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  // Le curseur rejoint le bouton Envoyer juste avant le clic.
  const move = interpolate(t, [sendAt - 1.1, sendAt - 0.15], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const cursorX = interpolate(move, [0, 1], [600, 968]);
  const cursorY = interpolate(move, [0, 1], [1520, 1330]);
  const cursorVisible = t > sendAt - 1.3 && t < sendAt + 0.8;
  const pressed = t >= sendAt - 0.1 && t < sendAt + 0.1;
  const ripple = interpolate(t, [sendAt, sendAt + 0.4], [0, 1], clamp);

  const lines = [
    { kind: "intro" as const, text: response.intro },
    ...response.sections.flatMap((s) => [
      { kind: "heading" as const, text: s.heading },
      ...s.items.map((text) => ({ kind: "item" as const, text })),
    ]),
  ];
  const shown = interpolate(t, [response.start, response.end], [0, lines.length], clamp);

  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 150, opacity: exit }}>
      <div
        style={{
          width: 980,
          height: 1250,
          background: ui.window,
          borderRadius: 28,
          border: `2px solid ${ui.border}`,
          boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontFamily,
          transformOrigin: "50% 95%",
          transform: `translateY(${interpolate(enter, [0, 1], [120, 0])}px) scale(${interpolate(enter, [0, 1], [0.85, 1]) * zoom})`,
          opacity: enter,
        }}
      >
        <div
          style={{
            height: 70,
            background: ui.bar,
            display: "flex",
            alignItems: "center",
            padding: "0 26px",
            gap: 14,
            borderBottom: `2px solid ${ui.border}`,
          }}
        >
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <div key={c} style={{ width: 20, height: 20, borderRadius: 10, background: c }} />
          ))}
          <span style={{ flex: 1, textAlign: "center", color: ui.muted, fontSize: 30, fontWeight: 800, marginRight: 80 }}>
            {title}
          </span>
        </div>

        <div style={{ flex: 1, padding: "36px 40px", display: "flex", flexDirection: "column", gap: 26, overflow: "hidden" }}>
          {sent ? (
            <div
              style={{
                alignSelf: "flex-end",
                maxWidth: "85%",
                background: ui.panel,
                color: ui.text,
                borderRadius: 24,
                padding: "20px 26px",
                fontSize: 27,
                lineHeight: 1.35,
                fontWeight: 800,
                opacity: interpolate(t, [sendAt, sendAt + 0.25], [0, 1], clamp),
              }}
            >
              {fullPrompt}
            </div>
          ) : null}

          {sent ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, color: colors.accent, fontSize: 40, fontWeight: 900 }}>
                <span style={{ transform: `rotate(${frame * 6}deg)`, display: "inline-block" }}>✳</span>
              </div>
              {lines.map((line, i) => {
                const p = Math.max(0, Math.min(1, shown - i));
                if (p <= 0) return null;
                return (
                  <div
                    key={i}
                    style={{
                      color: line.kind === "heading" ? colors.highlight : ui.text,
                      fontSize: line.kind === "heading" ? 42 : 35,
                      fontWeight: line.kind === "item" ? 800 : 900,
                      lineHeight: 1.3,
                      marginTop: line.kind === "heading" ? 14 : 0,
                      paddingLeft: line.kind === "item" ? 26 : 0,
                      opacity: p,
                      transform: `translateY(${(1 - p) * 16}px)`,
                    }}
                  >
                    {line.kind === "item" ? "• " : ""}
                    {line.text}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div style={{ padding: "0 30px 30px" }}>
          <div
            style={{
              background: ui.panel,
              border: `2px solid ${ui.border}`,
              borderRadius: 26,
              padding: "24px 26px",
              display: "flex",
              alignItems: "flex-end",
              gap: 20,
              minHeight: 110,
            }}
          >
            <div style={{ flex: 1, color: sent || typed ? ui.text : ui.muted, fontSize: 33, lineHeight: 1.35, fontWeight: 800 }}>
              {sent ? "" : typed || "Comment puis-je t'aider ?"}
              {!sent ? <span style={{ color: colors.accent, opacity: caretOn ? 1 : 0 }}>|</span> : null}
            </div>
            <div
              style={{
                position: "relative",
                width: 70,
                height: 70,
                borderRadius: 18,
                background: colors.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${pressed ? 0.88 : 1})`,
              }}
            >
              <svg width={36} height={36} viewBox="0 0 24 24">
                <path d="M12 19 V5 M5 12 L12 5 L19 12" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {ripple > 0 && ripple < 1 ? (
                <div
                  style={{
                    position: "absolute",
                    inset: -40 * ripple,
                    borderRadius: 999,
                    border: `4px solid ${colors.accent}`,
                    opacity: 1 - ripple,
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {cursorVisible ? <Cursor x={cursorX} y={cursorY} pressed={pressed} /> : null}
    </AbsoluteFill>
  );
};

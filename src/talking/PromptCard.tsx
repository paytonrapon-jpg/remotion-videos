import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fontFamily } from "./theme";

// Bulle de chat où le prompt s'écrit lettre par lettre.
export const PromptCard: React.FC<{ title: string; text: string }> = ({ title, text }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 14 } });
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const typed = Math.round(
    interpolate(frame, [10, durationInFrames - 20], [0, text.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const cursorOn = Math.floor(frame / 8) % 2 === 0;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 150 }}>
      <div
        style={{
          width: "88%",
          background: "white",
          borderRadius: 36,
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
          transform: `translateY(${interpolate(enter, [0, 1], [400, 0])}px) scale(${exit})`,
          opacity: exit,
        }}
      >
        <div
          style={{
            background: colors.accent,
            color: colors.cream,
            fontFamily,
            fontWeight: 900,
            fontSize: 48,
            padding: "24px 40px",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <span style={{ fontSize: 56 }}>✳</span>
          {title}
        </div>
        <div
          style={{
            fontFamily,
            fontWeight: 800,
            fontSize: 50,
            lineHeight: 1.3,
            color: colors.ink,
            padding: "34px 40px 44px",
            minHeight: 330,
          }}
        >
          {text.slice(0, typed)}
          <span style={{ opacity: cursorOn ? 1 : 0, color: colors.accent }}>|</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

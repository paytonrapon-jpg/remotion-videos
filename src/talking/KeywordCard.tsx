import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Illustration } from "./illustrations";
import { colors, fontFamily } from "./theme";
import { IllustrationName } from "./types";

export const KeywordCard: React.FC<{
  text: string;
  icon?: IllustrationName;
  color?: string;
}> = ({ text, icon, color = colors.accent }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 11, stiffness: 160 } });
  const textIn = spring({ frame: frame - 5, fps, config: { damping: 14 } });
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 520 }}>
      <div
        style={{
          width: "84%",
          background: color,
          borderRadius: 18,
          padding: "70px 50px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 30,
          boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
          transform: `scale(${interpolate(enter, [0, 1], [0.5, 1]) * exit}) rotate(${interpolate(enter, [0, 1], [-6, 0])}deg)`,
          opacity: Math.min(enter * 2, 1) * exit,
        }}
      >
        <span
          style={{
            fontFamily,
            fontWeight: 900,
            fontSize: 150,
            letterSpacing: -4,
            color: colors.cream,
            transform: `translateY(${interpolate(textIn, [0, 1], [60, 0])}px)`,
            opacity: textIn,
          }}
        >
          {text}
        </span>
        {icon ? <Illustration name={icon} size={110} color={colors.cream} /> : null}
      </div>
    </AbsoluteFill>
  );
};

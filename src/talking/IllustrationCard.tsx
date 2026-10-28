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

export const IllustrationCard: React.FC<{ name: IllustrationName; label?: string }> = ({
  name,
  label,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 13 } });
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const float = Math.sin(frame / 12) * 6;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 420 }}>
      <div
        style={{
          background: colors.cream,
          borderRadius: 36,
          padding: "30px 60px",
          display: "flex",
          alignItems: "center",
          gap: 30,
          maxWidth: "88%",
          boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
          transform: `translateY(${interpolate(enter, [0, 1], [250, 0]) + float}px) scale(${exit})`,
          opacity: Math.min(enter * 2, 1) * exit,
        }}
      >
        <Illustration name={name} size={200} />
        {label ? (
          <span
            style={{
              fontFamily,
              fontWeight: 900,
              fontSize: 64,
              lineHeight: 1.05,
              color: colors.ink,
            }}
          >
            {label}
          </span>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

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
  const float = Math.sin(frame / 12) * 8;

  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 220 }}>
      <div
        style={{
          background: colors.cream,
          borderRadius: 40,
          padding: "50px 70px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
          transform: `translateY(${interpolate(enter, [0, 1], [-200, 0]) + float}px) scale(${exit})`,
          opacity: enter * exit,
        }}
      >
        <Illustration name={name} size={340} />
        {label ? (
          <span style={{ fontFamily, fontWeight: 900, fontSize: 72, color: colors.ink }}>
            {label}
          </span>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

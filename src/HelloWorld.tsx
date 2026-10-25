import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const HelloWorld: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12 } });
  const opacity = interpolate(
    frame,
    [0, 20, durationInFrames - 20, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1e1b4b, #7c3aed)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h1
        style={{
          color: "white",
          fontSize: 140,
          fontFamily: "sans-serif",
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        {title}
      </h1>
    </AbsoluteFill>
  );
};

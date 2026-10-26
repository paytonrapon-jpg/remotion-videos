import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../theme";
import { IllustrationName } from "../types";

type Props = { size: number; color?: string };

const ArrowUp: React.FC<Props> = ({ size, color = colors.cream }) => {
  const frame = useCurrentFrame();
  const bounce = Math.sin(frame / 5) * size * 0.08;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <g transform={`translate(0 ${bounce})`}>
        <path d="M50 12 L84 52 H62 V88 H38 V52 H16 Z" fill={color} />
      </g>
    </svg>
  );
};

const Chart: React.FC<Props> = ({ size, color = colors.accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bars = [0.3, 0.5, 0.7, 0.95];
  const line = interpolate(frame, [10, 35], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {bars.map((h, i) => {
        const grow = spring({ frame: frame - i * 4, fps, config: { damping: 12 } });
        const height = h * 70 * grow;
        return (
          <rect
            key={i}
            x={12 + i * 21}
            y={88 - height}
            width={14}
            height={height}
            rx={3}
            fill={color}
            opacity={0.55 + i * 0.15}
          />
        );
      })}
      <path
        d="M14 70 L38 55 L58 40 L86 14"
        fill="none"
        stroke={colors.ink}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={line}
      />
    </svg>
  );
};

const Check: React.FC<Props> = ({ size, color = colors.accent }) => {
  const frame = useCurrentFrame();
  const circle = interpolate(frame, [0, 15], [1, 0], { extrapolateRight: "clamp" });
  const tick = interpolate(frame, [12, 24], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle
        cx={50}
        cy={50}
        r={40}
        fill="none"
        stroke={color}
        strokeWidth={8}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={circle}
        transform="rotate(-90 50 50)"
      />
      <path
        d="M30 52 L45 66 L72 36"
        fill="none"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={tick}
      />
    </svg>
  );
};

const Lightbulb: React.FC<Props> = ({ size, color = colors.highlight }) => {
  const frame = useCurrentFrame();
  const glow = 0.6 + 0.4 * Math.abs(Math.sin(frame / 8));
  const rays = [0, 45, 90, 135, 180].map((deg) => deg - 180);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {rays.map((deg) => (
        <line
          key={deg}
          x1={50}
          y1={8}
          x2={50}
          y2={0}
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          opacity={glow}
          transform={`rotate(${deg + 90} 50 42)`}
        />
      ))}
      <circle cx={50} cy={42} r={22} fill={color} opacity={glow} />
      <rect x={40} y={62} width={20} height={8} rx={2} fill={colors.ink} />
      <rect x={42} y={72} width={16} height={6} rx={2} fill={colors.ink} />
    </svg>
  );
};

export const Illustration: React.FC<Props & { name: IllustrationName }> = ({
  name,
  ...props
}) => {
  switch (name) {
    case "arrow-up":
      return <ArrowUp {...props} />;
    case "chart":
      return <Chart {...props} />;
    case "check":
      return <Check {...props} />;
    case "lightbulb":
      return <Lightbulb {...props} />;
  }
};

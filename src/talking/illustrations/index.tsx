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

const Calendar: React.FC<Props> = ({ size, color = colors.accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = spring({ frame: frame - 10, fps, config: { damping: 10 } });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x={12} y={18} width={76} height={70} rx={8} fill="white" stroke={colors.ink} strokeWidth={5} />
      <rect x={12} y={18} width={76} height={18} rx={8} fill={color} />
      <rect x={28} y={10} width={6} height={16} rx={3} fill={colors.ink} />
      <rect x={66} y={10} width={6} height={16} rx={3} fill={colors.ink} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect key={`${r}${c}`} x={22 + c * 16} y={44 + r * 13} width={9} height={7} rx={2} fill={colors.ink} opacity={0.2} />
        )),
      )}
      <circle cx={58.5} cy={60.5} r={10 * mark} fill="none" stroke={color} strokeWidth={5} />
    </svg>
  );
};

const Question: React.FC<Props> = ({ size, color = colors.accent }) => {
  const frame = useCurrentFrame();
  const marks = [
    { x: 22, y: 60, s: 0.8, d: 0 },
    { x: 50, y: 45, s: 1.2, d: 6 },
    { x: 78, y: 62, s: 0.9, d: 12 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {marks.map((m, i) => {
        const t = Math.max(0, frame - m.d);
        const pop = Math.min(1, t / 8);
        const y = m.y + Math.sin((frame + m.d * 4) / 7) * 5;
        return (
          <text
            key={i}
            x={m.x}
            y={y}
            fontSize={44 * m.s * pop}
            fontWeight={900}
            fontFamily="Montserrat"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={i === 1 ? color : colors.ink}
            transform={`rotate(${Math.sin((frame + i * 10) / 9) * 12} ${m.x} ${y})`}
          >
            ?
          </text>
        );
      })}
    </svg>
  );
};

const Warning: React.FC<Props> = ({ size, color = colors.highlight }) => {
  const frame = useCurrentFrame();
  const shake = frame < 20 ? Math.sin(frame * 1.6) * 6 * (1 - frame / 20) : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <g transform={`rotate(${shake} 50 55)`}>
        <path d="M50 10 L92 86 H8 Z" fill={color} stroke={colors.ink} strokeWidth={5} strokeLinejoin="round" />
        <rect x={46} y={36} width={8} height={28} rx={4} fill={colors.ink} />
        <circle cx={50} cy={74} r={5} fill={colors.ink} />
      </g>
    </svg>
  );
};

const List: React.FC<Props> = ({ size, color = colors.cream }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {[0, 1, 2].map((i) => {
        const p = spring({ frame: frame - i * 5, fps, config: { damping: 14 } });
        return (
          <g key={i} opacity={p} transform={`translate(${(1 - p) * -20} 0)`}>
            <circle cx={18} cy={24 + i * 26} r={7} fill={color} />
            <rect x={32} y={19 + i * 26} width={56 * p} height={10} rx={5} fill={color} />
          </g>
        );
      })}
    </svg>
  );
};

const Chat: React.FC<Props> = ({ size, color = colors.cream }) => {
  const frame = useCurrentFrame();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d="M12 20 H88 V68 H40 L24 84 V68 H12 Z" fill="none" stroke={color} strokeWidth={7} strokeLinejoin="round" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={32 + i * 18} cy={44 - Math.max(0, Math.sin((frame - i * 4) / 4)) * 6} r={6} fill={color} />
      ))}
    </svg>
  );
};

const Stopwatch: React.FC<Props> = ({ size, color = colors.accent }) => {
  const frame = useCurrentFrame();
  const angle = interpolate(frame, [0, 60], [0, 360], { extrapolateRight: "clamp" });
  const fill = interpolate(frame, [0, 60], [1, 0], { extrapolateRight: "clamp" });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x={43} y={6} width={14} height={9} rx={3} fill={colors.ink} />
      <circle cx={50} cy={56} r={36} fill="white" stroke={colors.ink} strokeWidth={6} />
      <circle
        cx={50}
        cy={56}
        r={26}
        fill="none"
        stroke={color}
        strokeWidth={14}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={fill}
        transform="rotate(-90 50 56)"
        opacity={0.45}
      />
      <line x1={50} y1={56} x2={50} y2={30} stroke={colors.ink} strokeWidth={5} strokeLinecap="round" transform={`rotate(${angle} 50 56)`} />
      <circle cx={50} cy={56} r={5} fill={colors.ink} />
    </svg>
  );
};

const ThumbsUp: React.FC<Props> = ({ size, color = colors.cream }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 4, fps, config: { damping: 7, stiffness: 180 } });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <g transform={`translate(50 55) scale(${pop}) rotate(${(1 - pop) * -30}) translate(-50 -55)`}>
        <rect x={10} y={44} width={18} height={44} rx={4} fill={color} />
        <path
          d="M34 46 L50 14 C58 14 62 20 60 30 L57 42 H82 C88 42 92 48 90 54 L84 80 C83 85 79 88 74 88 H34 Z"
          fill={color}
        />
      </g>
    </svg>
  );
};

const Comment: React.FC<Props> = ({ size, color = colors.accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 9 } });
  const heart = spring({ frame: frame - 14, fps, config: { damping: 8 } });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <g transform={`translate(50 50) scale(${pop}) translate(-50 -50)`}>
        <path d="M50 12 C74 12 90 26 90 44 C90 62 74 76 50 76 C44 76 39 75 34 73 L16 84 L22 67 C14 61 10 53 10 44 C10 26 26 12 50 12 Z" fill={color} />
        <text x={50} y={46} fontSize={22} fontWeight={900} fontFamily="Montserrat" textAnchor="middle" dominantBaseline="middle" fill={colors.cream}>
          RDV
        </text>
      </g>
      <g transform={`translate(80 78) scale(${heart})`}>
        <path d="M0 6 C-10 -2 -10 -12 -3 -12 C0 -12 0 -9 0 -8 C0 -9 0 -12 3 -12 C10 -12 10 -2 0 6 Z" fill="#E5484D" transform="scale(1.3)" />
      </g>
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
    case "calendar":
      return <Calendar {...props} />;
    case "question":
      return <Question {...props} />;
    case "warning":
      return <Warning {...props} />;
    case "list":
      return <List {...props} />;
    case "chat":
      return <Chat {...props} />;
    case "stopwatch":
      return <Stopwatch {...props} />;
    case "thumbs-up":
      return <ThumbsUp {...props} />;
    case "comment":
      return <Comment {...props} />;
  }
};

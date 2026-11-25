import "@fontsource/montserrat/latin-300.css";
import "@fontsource/montserrat/latin-600.css";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
} from "remotion";

export type LogoOverlayProps = {
  video: string;
  brand: string;
  suffix: string;
};

const gold = "#E9C98B";

export const LogoOverlay: React.FC<LogoOverlayProps> = ({
  video,
  brand,
  suffix,
}) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [6, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  // Reflet doré qui balaie le logo toutes les 5 s
  const sweep = ((frame % 150) / 150) * 260 - 80;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <OffthreadVideo
        src={staticFile(video)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 150,
        }}
      >
        <div
          style={{
            opacity: enter,
            transform: `translateY(${(1 - enter) * -30}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "26px 54px 22px",
            borderRadius: 999,
            background: "rgba(12, 10, 9, 0.55)",
            border: `1.5px solid rgba(233, 201, 139, 0.55)`,
            boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
            fontFamily: "Montserrat",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              letterSpacing: "0.22em",
              marginRight: "-0.22em",
              lineHeight: 1,
              backgroundImage: `linear-gradient(100deg, ${gold} ${sweep - 20}%, #FFF6E0 ${sweep}%, ${gold} ${sweep + 20}%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {brand.toUpperCase()}
          </div>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 18,
              color: "#FFF6E0",
              fontSize: 28,
              fontWeight: 300,
              letterSpacing: "0.5em",
              marginRight: "-0.5em",
            }}
          >
            <span style={{ width: 46, height: 1.5, background: gold }} />
            {suffix.toUpperCase()}
            <span style={{ width: 46, height: 1.5, background: gold, marginLeft: "-0.5em" }} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

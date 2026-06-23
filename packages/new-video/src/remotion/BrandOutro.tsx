import {
  AbsoluteFill,
  Audio as RemotionAudio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { BRAND_DARK } from "./BrandLogo";

const FONT_STACK = "Inter, system-ui, -apple-system, sans-serif";

const LINES = [
  { text: "Thank you for watching.", start: 10, size: 64, weight: 700 },
  {
    text: "The application is free to download—please see the link in the description below.",
    start: 60,
    size: 34,
    weight: 400,
  },
  {
    text: "If you'd like custom features or a version tailored to your business, feel free to get in touch. My contact details are provided below.",
    start: 210,
    size: 34,
    weight: 400,
  },
  {
    text: "Don't forget to like the video and subscribe for more software demos and tutorials.",
    start: 440,
    size: 34,
    weight: 400,
  },
];

/**
 * Animated outro scene. The logo fades in, then each line of text appears
 * in sync with the narration audio, finishing with a smooth fade-out.
 */
export function BrandOutro() {
  const frame = useCurrentFrame();

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(frame, [575, 600], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND_DARK,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
        padding: "0 160px",
      }}
    >
      <RemotionAudio src={staticFile("audio/outro.mp3")} />
      <Img
        src={staticFile("screenshots/logo.png")}
        style={{
          width: 180,
          height: 180,
          objectFit: "contain",
          opacity: logoOpacity,
          marginBottom: 60,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 32,
          alignItems: "center",
          textAlign: "center",
          maxWidth: 1400,
        }}
      >
        {LINES.map((line, i) => {
          const opacity = interpolate(frame, [line.start, line.start + 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const translateY = interpolate(frame, [line.start, line.start + 20], [30, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <p
              key={i}
              style={{
                color: i === 0 ? "white" : "rgba(255, 255, 255, 0.8)",
                fontSize: line.size,
                fontWeight: line.weight,
                fontFamily: FONT_STACK,
                margin: 0,
                opacity,
                transform: `translateY(${translateY}px)`,
                lineHeight: 1.4,
              }}
            >
              {line.text}
            </p>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

import {
  AbsoluteFill,
  Audio as RemotionAudio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND_DARK, BRAND_NAME, BRAND_TAGLINE } from "./BrandLogo";

const FONT_STACK = "Inter, system-ui, -apple-system, sans-serif";

const FEATURES = [
  "Manage founder sales contacts in one place.",
  "Track prospects through a simple sales pipeline.",
  "Run outreach campaigns for different products.",
  "Send and preview reusable email templates.",
  "Remember follow-ups and see sales progress.",
];

/**
 * Animated brand intro adapted from the RVE "Logo Bounce Drop" template.
 * The logo drops from above with a spring bounce, squashes on landing,
 * then the company name, tagline, and feature lines fade in.
 */
export function BrandIntro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo drops from above with spring bounce
  const drop = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 120, mass: 0.8 },
  });
  const translateY = interpolate(drop, [0, 1], [-500, 0]);

  // Squash and stretch on landing
  const squashProgress = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 6, stiffness: 200, mass: 0.5 },
  });
  const scaleX = interpolate(squashProgress, [0, 0.5, 1], [1.3, 1.1, 1]);
  const scaleY = interpolate(squashProgress, [0, 0.5, 1], [0.7, 0.9, 1]);

  // Company name fades in after bounce
  const nameOpacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const nameTranslateY = interpolate(frame, [25, 45], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tagline fades in after the name
  const taglineOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Smooth fade-out after narration finishes
  const fadeOut = interpolate(frame, [515, 540], [1, 0], {
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
      }}
    >
      <RemotionAudio src={staticFile("audio/intro.mp3")} />
      <div
        style={{
          transform: `translateY(${translateY}px) scaleX(${scaleX}) scaleY(${scaleY})`,
        }}
      >
        <Img
          src={staticFile("screenshots/logo.png")}
          style={{ width: 240, height: 240, objectFit: "contain" }}
        />
      </div>
      <p
        style={{
          color: "white",
          fontSize: 72,
          fontWeight: 700,
          fontFamily: FONT_STACK,
          opacity: nameOpacity,
          transform: `translateY(${nameTranslateY}px)`,
          margin: 0,
          paddingTop: 40,
        }}
      >
        {BRAND_NAME}
      </p>
      <p
        style={{
          color: "rgba(255, 255, 255, 0.6)",
          fontSize: 32,
          fontWeight: 400,
          fontFamily: FONT_STACK,
          marginTop: 16,
          opacity: taglineOpacity,
          margin: 0,
        }}
      >
        {BRAND_TAGLINE}
      </p>
      <div
        style={{
          marginTop: 48,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          alignItems: "center",
        }}
      >
        {FEATURES.map((feature, i) => {
          const start = 75 + i * 15;
          const featureOpacity = interpolate(frame, [start, start + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const featureTranslateY = interpolate(frame, [start, start + 15], [20, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <p
              key={i}
              style={{
                color: "rgba(255, 255, 255, 0.85)",
                fontSize: 30,
                fontWeight: 400,
                fontFamily: FONT_STACK,
                margin: 0,
                opacity: featureOpacity,
                transform: `translateY(${featureTranslateY}px)`,
              }}
            >
              {feature}
            </p>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

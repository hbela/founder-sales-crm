import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { FPS, INTRO_DURATION_IN_FRAMES, OUTRO_DURATION_IN_FRAMES, type SceneWithAudio } from "../lib/schema";
import { BrandIntro } from "./BrandIntro";
import { BrandOutro } from "./BrandOutro";
import { BRAND_DARK, BRAND_PRIMARY } from "./BrandLogo";

const FONT_STACK = "Inter, system-ui, -apple-system, sans-serif";

export function DemoVideo({ scenes = [] }: { scenes: SceneWithAudio[] }) {
  let offset = INTRO_DURATION_IN_FRAMES;
  const segments = scenes.map((scene) => {
    const durationInFrames = Math.max(1, Math.round(scene.durationSeconds * FPS));
    const from = offset;
    offset += durationInFrames;
    return { scene, from, durationInFrames };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#eaf6ff" }}>
      <Sequence
        from={0}
        durationInFrames={INTRO_DURATION_IN_FRAMES}
        style={{
          translate: "2px 0px"
        }}>
        <BrandIntro />
      </Sequence>
      {segments.map(({ scene, from, durationInFrames }) => (
        <Sequence key={scene.id} from={from} durationInFrames={durationInFrames}>
          <SceneFrame scene={scene} durationInFrames={durationInFrames} />
        </Sequence>
      ))}
      <Sequence from={offset} durationInFrames={OUTRO_DURATION_IN_FRAMES}>
        <BrandOutro />
      </Sequence>
    </AbsoluteFill>
  );
}

function SceneFrame({
  scene,
  durationInFrames,
}: {
  scene: SceneWithAudio;
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  // Slow Ken Burns zoom across the scene.
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.06]);

  return (
    <AbsoluteFill
      style={{
        // Branded gradient backdrop so the framing margins read as intentional.
        background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND_PRIMARY} 100%)`,
        // Symmetric padding keeps the screenshot centred with even margins on
        // every side regardless of its (non-16:9) aspect ratio.
        padding: "72px 96px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
      <div
        style={{
          position: "relative",
          height: "100%",
          maxWidth: "100%",
          // Screenshots are captured at the 1920×1080 viewport (16:9), so the
          // card matches that aspect ratio — the image fills it edge-to-edge
          // with no cropping or internal letterboxing.
          aspectRatio: "16 / 9",
          borderRadius: 28,
          overflow: "hidden",
          boxShadow: "0 40px 90px rgba(0, 0, 0, 0.45)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <Img
          src={staticFile(scene.screenshot)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 40,
            fontSize: 48,
            fontWeight: 700,
            fontFamily: FONT_STACK,
            color: "#0f172a",
            background: "white",
            padding: "20px 32px",
            borderRadius: 20,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
          }}
        >
          {scene.title}
        </div>
      </div>
    </AbsoluteFill>
  );
}

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
    <AbsoluteFill>
      <Img
        src={staticFile(scene.screenshot)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: `scale(${scale})`,
        }}
      />
      {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 100,
          fontSize: 52,
          fontWeight: 700,
          color: "#0f172a",
          background: "white",
          padding: "24px 36px",
          borderRadius: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        }}
      >
        {scene.title}
      </div>
    </AbsoluteFill>
  );
}

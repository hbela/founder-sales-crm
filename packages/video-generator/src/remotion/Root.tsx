import { Composition, registerRoot } from "remotion";
import { DemoVideo } from "./DemoVideo";
import { FPS, INTRO_DURATION_IN_FRAMES, OUTRO_DURATION_IN_FRAMES, type SceneWithAudio } from "../lib/schema";

export const RemotionRoot = () => {
  return (
    <Composition
      id="DemoVideo"
      component={DemoVideo}
      durationInFrames={1}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ scenes: [] as SceneWithAudio[] }}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(
          1,
          INTRO_DURATION_IN_FRAMES +
            props.scenes.reduce((sum, s) => sum + Math.round(s.durationSeconds * FPS), 0) +
            OUTRO_DURATION_IN_FRAMES,
        ),
      })}
    />
  );
};

registerRoot(RemotionRoot);

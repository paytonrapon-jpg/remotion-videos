import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { demo } from "./talking/demo";
import { TalkingHead } from "./talking/TalkingHead";
import { EmptyLegReel, reelSeconds } from "./emptyleg/EmptyLegReel";
import { genevaMontpellier } from "./emptyleg/genevaMontpellier";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ title: "Bonjour Remotion !" }}
      />
      <Composition
        id="TalkingHead"
        component={TalkingHead}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={demo}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(props.durationInSeconds * 30),
        })}
      />
      <Composition
        id="EmptyLegGenevaMontpellier"
        component={EmptyLegReel}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={genevaMontpellier}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(reelSeconds(props.clips) * 30),
        })}
      />
      {/* Modèle générique : les reels quotidiens le rendent avec --props=<fichier JSON>. */}
      <Composition
        id="EmptyLegReel"
        component={EmptyLegReel}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...genevaMontpellier, videoSrc: undefined, clips: [] }}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(reelSeconds(props.clips) * 30),
        })}
      />
    </>
  );
};

import { Composition } from "remotion";
import { EmptyLeg, emptyLegDuration } from "./emptyleg/EmptyLeg";
import { gvaMpl } from "./emptyleg/gva-mpl";
import { HelloWorld } from "./HelloWorld";
import { LogoOverlay } from "./logo/LogoOverlay";
import { demo } from "./talking/demo";
import { rdv } from "./talking/rdv";
import { TalkingHead } from "./talking/TalkingHead";

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
        id="RdvClient"
        component={TalkingHead}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={rdv}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(props.durationInSeconds * 30),
        })}
      />
      <Composition
        id="EmptyLegGvaMpl"
        component={EmptyLeg}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={emptyLegDuration * 30}
        defaultProps={gvaMpl}
      />
      <Composition
        id="CjPerruques"
        component={LogoOverlay}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={526}
        defaultProps={{
          video: "cj-perruques.mp4",
          brand: "luxbeouty",
          suffix: ".hair",
        }}
      />
      <Composition
        id="CjPerruques2"
        component={LogoOverlay}
        fps={30}
        width={1280}
        height={720}
        durationInFrames={1112}
        defaultProps={{
          video: "cj-perruques-2.mp4",
          brand: "luxbeouty",
          suffix: ".hair",
          position: "top-left" as const,
          scale: 0.6,
        }}
      />
    </>
  );
};

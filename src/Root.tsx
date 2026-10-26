import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { demo } from "./talking/demo";
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
    </>
  );
};

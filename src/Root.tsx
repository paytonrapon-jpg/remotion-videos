import { Composition } from "remotion";
import { EmptyLeg, emptyLegDuration } from "./emptyleg/EmptyLeg";
import { gvaMpl } from "./emptyleg/gva-mpl";
import { HelloWorld } from "./HelloWorld";
import { Lookbook, lookbookDuration, type LookbookProps } from "./lookbook/Lookbook";
import lookCasual from "./lookbook/look-casual.json";
import lookDoudoune from "./lookbook/look-doudoune.json";
import lookBleu from "./lookbook/look-bleu.json";
import katyBleu from "./lookbook/katy-bleu.json";
import { KatyLook, KatyLookProps, katyLookDuration } from "./lookbook/KatyLook";
import mesMannequins from "./lookbook/mes-mannequins.json";
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
        id="LookbookMannequins"
        component={Lookbook}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={mesMannequins}
        calculateMetadata={({ props }) => ({ durationInFrames: lookbookDuration(props) })}
      />
      <Composition
        id="LookCasual"
        component={Lookbook}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={lookCasual as LookbookProps}
        calculateMetadata={({ props }) => ({ durationInFrames: lookbookDuration(props) })}
      />
      <Composition
        id="LookDoudoune"
        component={Lookbook}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={lookDoudoune as LookbookProps}
        calculateMetadata={({ props }) => ({ durationInFrames: lookbookDuration(props) })}
      />
      <Composition
        id="LookBleu"
        component={Lookbook}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={lookBleu as LookbookProps}
        calculateMetadata={({ props }) => ({ durationInFrames: lookbookDuration(props) })}
      />
      <Composition
        id="KatyLookBleu"
        component={KatyLook}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={katyBleu as KatyLookProps}
        calculateMetadata={({ props }) => ({ durationInFrames: katyLookDuration(props) })}
      />
    </>
  );
};

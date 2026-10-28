export type IllustrationName =
  | "arrow-up"
  | "chart"
  | "check"
  | "lightbulb"
  | "calendar"
  | "question"
  | "warning"
  | "list"
  | "chat"
  | "stopwatch"
  | "thumbs-up"
  | "comment";

// Tous les temps sont en secondes, par rapport au début de la vidéo.
export type Overlay =
  | {
      type: "keyword";
      start: number;
      end: number;
      text: string;
      icon?: IllustrationName;
      color?: string;
    }
  | {
      type: "illustration";
      start: number;
      end: number;
      name: IllustrationName;
      label?: string;
    }
  | {
      type: "prompt";
      start: number;
      end: number;
      title: string;
      text: string;
    };

export type Word = {
  start: number;
  end: number;
  word: string;
};

export type Caption = {
  start: number;
  end: number;
  text: string;
  // Minutage de chaque mot ; sans lui, la surbrillance avance à vitesse régulière.
  words?: Word[];
};

export type TalkingHeadProps = {
  // Fichier placé dans le dossier public/, ex. "ma-video.mp4". null = fond de démonstration.
  videoSrc: string | null;
  durationInSeconds: number;
  overlays: Overlay[];
  captions: Caption[];
};

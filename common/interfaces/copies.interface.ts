import { Lang } from 'common/enums/app.enum';

export type PromotionClipCopiesType = Record<
  Lang,
  {
    movie: {
      infoText: string;
      titleText: string;
      descriptionText: string;
    };
    show: {
      infoText: string;
      titleText: string;
      descriptionText: string;
    };
    generic: {
      infoText: string;
      titleText: string;
      descriptionText: string;
      playbackURL: string;
      thumbnailURL: string;
    };
  }
>;

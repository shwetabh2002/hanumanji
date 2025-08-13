import { APP_CONFIGS } from 'common/configs/app.config';
import { Lang } from 'common/enums/app.enum';
import { PromotionClipCopiesType } from 'common/interfaces/copies.interface';

export const SHARE_COPIES = {
  bho: {
    en: 'Watch #TITLE# today, only on the STAGE App \n– now STAGE App is available on your Smart TV 📺 too!',
    hin: 'आज ही देखो #TITLE# सिर्फ STAGE App पर \n– और अब STAGE App आपके Smart TV 📺 पर भी!',
  },
  har: {
    en: 'Watch #TITLE# today, only on the STAGE App \n– now STAGE App is available on your Smart TV 📺 too!',
    hin: 'आज ही देखो #TITLE# सिर्फ STAGE App पर \n– और अब STAGE App आपके Smart TV 📺 पर भी!',
  },
  raj: {
    en: 'Watch #TITLE# today, only on the STAGE App \n– now STAGE App is available on your Smart TV 📺 too!',
    hin: 'आज ही देखो #TITLE# सिर्फ STAGE App पर \n– और अब STAGE App आपके Smart TV 📺 पर भी!',
  },
};

export const SHARE_COPIES_PREVIEW = {
  en: 'This content is exclusive to you, do not share it with others',
  hin: 'यह फिल्म/शो सिर्फ आपके लिए है, कृपया इसे किसी और के साथ शेयर न करें।',
};

export const PROMOTION_CLIP_COPIES: PromotionClipCopiesType = {
  [Lang.EN]: {
    generic: {
      descriptionText: '',
      infoText: 'Now start watching',
      playbackURL: `${APP_CONFIGS.CDN.URL}/subscription/tnpl_2/NC_subscription_success_hindi_v1.mp4`,
      thumbnailURL: `${APP_CONFIGS.CDN.URL}/icons/success1x_icon_18oct.png`, // TODO: Replace this after getting the thumbnail from the product team
      titleText: 'Your favourite movie/show is ready',
    },
    movie: {
      descriptionText: 'Movie · %contentDuration%',
      infoText: 'Your favourite movie is ready',
      titleText: 'Now start watching',
    },
    show: {
      descriptionText: 'Show · %contentDuration%',
      infoText: 'Your favourite movie is ready',
      titleText: 'Now start watching',
    },
  },
  [Lang.HIN]: {
    generic: {
      descriptionText: '',
      infoText: 'अब देखना शुरू करें',
      playbackURL: `${APP_CONFIGS.CDN.URL}/subscription/tnpl_2/NC_subscription_success_hindi_v1.mp4`,
      thumbnailURL: `${APP_CONFIGS.CDN.URL}/subscription/tnpl_2/NC_subscription_success_hindi_v1.mp4`,
      titleText: 'आपकी पसंदीदा फिल्म/शो तैयार है',
    },
    movie: {
      descriptionText: 'फिल्म · %contentDuration%',
      infoText: 'अब देखना शुरू करें',
      titleText: 'आपकी पसंदीदा फिल्म तैयार है',
    },
    show: {
      descriptionText: 'शो · %contentDuration%',
      infoText: 'अब देखना शुरू करें',
      titleText: 'आपका पसंदीदा शो तैयार है',
    },
  },
};

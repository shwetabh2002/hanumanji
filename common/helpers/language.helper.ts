import { Lang } from '../enums/app.enum';
import { VideoResolution } from '../enums/media.enum';
import { HomeScreenEn, videoResolutionLabelEn } from '../localization/english';
import { HomeScreenHin, videoResolutionLabelHin } from '../localization/hindi';

export const LANGUAGE_MAP = {
  [Lang.EN]: {
    homeScreen: HomeScreenEn,
    videoResolutionLabel: videoResolutionLabelEn,
  },
  [Lang.HIN]: {
    homeScreen: HomeScreenHin,
    videoResolutionLabel: videoResolutionLabelHin,
  },
} as const;

export const LanguageHelper = {
  loadHomeScreen(lang: Lang = Lang.HIN) {
    return LANGUAGE_MAP[lang].homeScreen;
  },
  loadVideoResolution(lang: Lang = Lang.HIN, label: VideoResolution) {
    return LANGUAGE_MAP[lang].videoResolutionLabel[label];
  },
};

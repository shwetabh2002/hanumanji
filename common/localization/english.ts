import { VideoResolution } from '../enums/media.enum';
import { IHomeScreen } from '../interfaces/homeScreen.interface';
import { IVideoResolutionLabel } from '../interfaces/localization';

export const HomeScreenEn: IHomeScreen = {
  homeAllTabFreemium: {
    allContent: 'All Content',
    artistShows: 'Shows',
    artistVideos: 'Videos',
    comingSoon: 'Coming Soon',
    continueWatching: 'Continue Watching',
    freeShows: 'Free Shows',
    genreCta: 'Select From Genre',
    genreShows: 'Shows',
    genreVideos: 'Videos',
    heading: 'Raam ram ji',
    newShow: 'All New Shows',
    newVideos: 'All New Videos',
    platter: 'Platter',
    popularArtist: 'Popular Artist',
    premiumShows: 'VIP Shows',
    premiumVideos: 'VIP Videos',
    promotedContent: 'Promoted Content',
    recommendedForYou: "Neeraj Chopra's Favourite Shows",
    shortFilm: 'Videos',
    similar: {
      consumptionScreenEpisodeWidgets: 'Similar Video',
      consumptionScreenShowWidgets: 'More Super Hit Web Series',
    },
    top20Content: {
      har: 'Top 20 in Haryana',
      raj: 'Top 20 in Rajasthan',
    },
    trendingContent: {
      har: 'Trending in Haryana',
      raj: 'Trending in Rajasthan',
    },
    webSeries: 'Web Series',
  },
};

export const videoResolutionLabelEn: IVideoResolutionLabel = {
  [VideoResolution.AVERAGE]: 'Average (360p)',
  [VideoResolution.FULL_HD]: 'Full HD (1080p)',
  [VideoResolution.HD]: 'HD (720p)',
  [VideoResolution.LOW]: 'Low (240p)',
  [VideoResolution.MEDIUM]: 'Medium (480p)',
};

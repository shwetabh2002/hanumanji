import { VideoResolution } from '../enums/media.enum';
import { IHomeScreen } from '../interfaces/homeScreen.interface';
import { IVideoResolutionLabel } from '../interfaces/localization';

export const HomeScreenHin: IHomeScreen = {
  homeAllTabFreemium: {
    allContent: 'सारे शोज़',
    artistShows: ' के शोज',
    artistVideos: ' के वीडियोज़',
    comingSoon: 'जल्द आ रहा है',
    continueWatching: 'जो आपने अधुरा छोड़ दिया',
    freeShows: 'फ्री शोज़',
    genreCta: 'अपनी पसंद की शैली चुनें',
    genreShows: ' के शो',
    genreVideos: ' के वीडियोज़',
    heading: 'राम राम जी',
    newShow: ' बिल्कुल नये शोज़',
    newVideos: 'बिल्कुल नये वीडियोज़',
    platter: 'Platter',
    popularArtist: 'मशहूर कलाकार',
    premiumShows: 'VIP शोज़',
    premiumVideos: 'VIP वीडियोज़',
    promotedContent: 'Promoted Content',
    recommendedForYou: 'नीरज चोपड़ा के फेवरेट शोज़',
    shortFilm: 'वीडियोज़',
    similar: {
      consumptionScreenEpisodeWidgets: 'एक जैसे वीडियो',
      consumptionScreenShowWidgets: 'देखे अगली धमाकेदार वेब सीरीज',
    },
    top20Content: {
      har: 'हमारे टॉप 20 शोज़',
      raj: 'हमारे टॉप 20 शोज़',
    },
    trendingContent: {
      har: 'इस हफ्ते के फेमस शोज',
      raj: 'इस हफ्ते के फेमस शोज',
    },
    webSeries: 'वेब सीरीज',
  },
};

export const videoResolutionLabelHin: IVideoResolutionLabel = {
  [VideoResolution.AVERAGE]: 'औसत (360p)',
  [VideoResolution.FULL_HD]: 'पूर्ण एचडी (1080p)',
  [VideoResolution.HD]: 'उच्च गुणवत्ता (720p)',
  [VideoResolution.LOW]: 'निम्न (240p)',
  [VideoResolution.MEDIUM]: 'मध्यम (480p)',
};

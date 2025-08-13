export interface ITrendingContent {
  har: string;
  raj: string;
}

export interface ISimilarContent {
  consumptionScreenEpisodeWidgets: string;
  consumptionScreenShowWidgets: string;
}

export interface IHomeAllTabFreemium {
  allContent: string;
  artistShows: string;
  artistVideos: string;
  comingSoon: string;
  continueWatching: string;
  freeShows: string;
  genreCta: string;
  genreShows: string;
  genreVideos: string;
  heading: string;
  newShow: string;
  newVideos: string;
  platter: string;
  popularArtist: string;
  premiumShows: string;
  premiumVideos: string;
  promotedContent: string;
  recommendedForYou: string;
  shortFilm: string;
  similar: ISimilarContent;
  top20Content: ITrendingContent;
  trendingContent: ITrendingContent;
  webSeries: string;
}

export interface IHomeScreen {
  homeAllTabFreemium: IHomeAllTabFreemium;
}

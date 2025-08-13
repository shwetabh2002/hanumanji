export interface NcantoAsset {
  assetId: string;
  assetType: 'VOD';
  audioLang: string[]; // Array of audio languages (e.g., "en", "fr")
  availabilityEndTime: string; // ISO 8601 formatted date
  availabilityStartTime: string; // ISO 8601 formatted date
  durationSeconds: number; // Optional for non-episode assets like seasons
  episode?: number; // Optional; for individual episodes
  episodesInSeason?: number; // Optional; only relevant for season assets
  genreBroad?: string[]; // Array of genres (e.g., Drama, Mystery) *** Currently made optional to avoid errors
  genreMedium?: string[]; // Array of genres (e.g., Drama, Mystery)
  imageUrl?: string[];
  originalTitle: string;
  parentalGuidance: string;
  programType: NcantoProgramType; // Can be "TV Show" or "Episode"
  season?: number; // Optional; may not be in all assets (e.g., season itself)
  seriesId?: string; // Optional; for series identification
  sourceId: string;
  structuredKeywords?: IStructuredKeywordData;
  subtitled: boolean; // Whether the asset has subtitles
  synopses: { long: { en: string } };
  titles: { en: string };
}

export enum NcantoProgramType {
  EPISODE = 'Episode',
  MOVIE = 'Movie',
  SEASON = 'Season',
  SHOW = 'Series',
}

export enum NcantoAssetType {
  EPISODE = 'EPISODE',
  MOVIE = 'MOVIE',
  SEASON = 'SEASON',
  SHOW = 'SHOW',
}

export interface IStructuredKeywordData {
  categories?: IStructuredKeyword[];
  descriptorTags?: IStructuredKeyword[];
  moods?: IStructuredKeyword[];
  themes?: IStructuredKeyword[];
}
export interface IStructuredKeyword {
  id: string;
  perLanguage: { en: string };
  weight: number;
}

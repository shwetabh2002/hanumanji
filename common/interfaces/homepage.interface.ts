import { Thumbnail } from 'src/content/schemas/thumbnail.schema';

export enum HomePageContentType {
  MOVIE = 'individual',
  SHOW = 'show',
}
export enum HomePageResponseMessage {
  ERROR = 'error',
  SUCCESS = 'success',
}
export interface IHomePageRowData {
  _id: number;
  contentType: HomePageContentType;
  releaseDate: string;
  slug: string;
  thumbnail: Thumbnail;
  title: string;
}
export interface IHomePageRowResponse {
  data: IHomePageRowData[];
  responseMessage: HomePageResponseMessage;
}

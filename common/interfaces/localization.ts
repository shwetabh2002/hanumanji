import { VideoResolution } from '../enums/media.enum';

export interface IVideoResolutionLabel {
  [VideoResolution.AVERAGE]: string;
  [VideoResolution.FULL_HD]: string;
  [VideoResolution.HD]: string;
  [VideoResolution.LOW]: string;
  [VideoResolution.MEDIUM]: string;
}

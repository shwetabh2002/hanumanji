import { Platform } from 'common/enums/app.enum';
import { ImageRatio } from 'common/enums/media.enum';

export type ThumbnailQualityConfig = Record<
  Platform,
  Partial<Record<ImageRatio, string>>
>;

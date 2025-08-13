import { Platform } from 'common/enums/app.enum';
import { ImageRatio } from 'common/enums/media.enum';
import { ThumbnailQualityConfig } from 'common/interfaces/appConstants.interface';

export const DecoratorConstants = {
  Admin: 'admin',
  CMS: 'cms',
  Internal: 'internal',
  PartnerLogin: 'partnerLogin',
  PgAuthDecoratorKey: 'pgAuth',
  PlatformPublic: 'platformPublic',
  Privileges: 'privileges',
  Public: 'public',
};

export const THUMBNAIL_QUALITY_CONFIG: ThumbnailQualityConfig = {
  [Platform.APP]: {
    [ImageRatio.RATIO_16_9]: 'small',
  },
  [Platform.TV]: {
    [ImageRatio.RATIO_16_9]: 'medium',
  },
  [Platform.WEB]: {
    [ImageRatio.RATIO_16_9]: 'small',
  },
};

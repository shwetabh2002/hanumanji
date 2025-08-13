import { posix } from 'path';

import {
  GenerateContentTranscodingParams,
  ImageOrientation,
  MP4Resolution,
} from '../../src/cms/interfaces/files.interface';
import { ContentType } from '@app/common/enums/common.enums';
import { APP_CONFIGS } from 'common/configs/app.config';
import { THUMBNAIL_QUALITY_CONFIG } from 'common/constants/app.constant';
import { Platform } from 'common/enums/app.enum';
import { ImageRatio } from 'common/enums/media.enum';
import {
  VisionularContentType,
  VisionularTranscodingTemplate,
} from 'common/interfaces/visionular.interface';
import { Thumbnail } from 'src/content/schemas/thumbnail.schema';

import { Lang } from 'common/enums/app.enum';

const S3_BUCKETS = {
  CDN_VIDEO_BUCKET: 'stagemediaprivate', // For Production use stagemediaprivate , dev: stagetestmediaprivate
  MAIN_VIDEO: 'stagemediavideo', // For Production use stagemediavideo, dev: stagetestmediaprivate
  MEDIA_IMAGE: 'stagemediavideo',
  MEDIA_PREVIEW: 'stage-media-preview',
  REEL_BUCKET: 'stagemediavideo',
  SUBTITLE: 'stagemediavideo',
};

export const sanitizeFileExtension = (fileExtension: string) => {
  if (fileExtension.startsWith('.')) {
    return fileExtension;
  }
  return `.${fileExtension}`;
};

export const MediaFilePathUtils = {
  extractFileNameWithExtension: (filePath: string) => {
    return {
      extension: posix.extname(filePath),
      nameWithExtension: posix.basename(filePath),
      nameWithoutExtension: posix.basename(filePath, posix.extname(filePath)),
    };
  },
  generateArtistImageFilePath: ({
    fileExtension,
    fileName,
  }: {
    fileName: string;
    fileExtension: string;
  }) => {
    const sanitizedFileExtension = sanitizeFileExtension(fileExtension);
    return {
      bucket: S3_BUCKETS.MEDIA_IMAGE,
      filePath: `artist/${fileName}${sanitizedFileExtension}`,
    };
  },

  generateContentOnboardingCategoryThumbnailURL: (fileName: string): string => {
    return `${APP_CONFIGS.CDN.URL}/category/${fileName}`;
  },

  generateContentTranscodingOutputPath: (
    params: GenerateContentTranscodingParams,
  ): {
    s3Key: string;
    uniqueFileName: string;
  } => {
    const timestamp = new Date().getTime();
    switch (params.contentType) {
      case VisionularContentType.SHOW_EPISODE: {
        const { extension, templateDirectory } =
          APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
            params.transcodingTemplate
          ];

        const uniqueFileName = `${params.episodeSlug}_${timestamp}/playlist.${extension}`;
        return {
          s3Key: posix.normalize(
            `videos/show/${params.showSlug}/episodes/${templateDirectory}/${uniqueFileName}`,
          ),
          uniqueFileName,
        };
      }
      case VisionularContentType.INDIVIDUAL: {
        const { extension, templateDirectory } =
          APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
            params.transcodingTemplate
          ];

        const uniqueFileName = `${params.episodeSlug}_${timestamp}/playlist.${extension}`;
        return {
          s3Key: posix.normalize(
            `videos/individual/${params.episodeSlug}/${templateDirectory}/${uniqueFileName}`,
          ),
          uniqueFileName,
        };
      }
      case VisionularContentType.EPISODE_PERIPHERAL: {
        const { extension, templateDirectory } =
          APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
            params.transcodingTemplate
          ];

        const uniqueFileName = `${params.episodeSlug}_${timestamp}/playlist.${extension}`;
        return {
          s3Key: posix.normalize(
            `videos/individual/${params.episodeSlug}/trailer/${templateDirectory}/${uniqueFileName}`,
          ),
          uniqueFileName,
        };
      }
      case VisionularContentType.SHOW_PERIPHERAL: {
        const { extension, templateDirectory } =
          APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
            params.transcodingTemplate
          ];
        const uniqueFileName = `${params.showSlug}_${timestamp}/playlist.${extension}`;
        return {
          s3Key: posix.normalize(
            `videos/show/${params.showSlug}/trailer/${templateDirectory}/${uniqueFileName}`,
          ),
          uniqueFileName,
        };
      }
      case VisionularContentType.REEL: {
        const { extension, templateDirectory } =
          APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
            params.transcodingTemplate
          ];
        const uniqueFileName = `${params.reelId}_${timestamp}/playlist.${extension}`;
        return {
          s3Key: posix.normalize(
            `videos/${params.reelContentType}/${params.contentSlug}/reels/${templateDirectory}/${uniqueFileName}`,
          ),
          uniqueFileName,
        };
      }
      default: {
        throw new Error('Invalid content type');
      }
    }
  },

  generateHorizontal16x9ThumbnailURL: ({
    contentType,
    platform,
    thumbnail,
  }: {
    contentType: ContentType.MOVIE | ContentType.SHOW | ContentType.EPISODE;
    thumbnail: Thumbnail;
    platform: Platform;
  }) => {
    const subFolderPath = contentType === ContentType.SHOW ? 'show' : 'episode';
    return `${APP_CONFIGS.CDN.URL}/${subFolderPath}/horizontal/${THUMBNAIL_QUALITY_CONFIG[platform][ImageRatio.RATIO_16_9]}/${thumbnail.horizontal.ratio1.sourceLink}`;
  },

  generateImageViewURL: ({
    contentType,
    fileName,
  }: {
    contentType: ContentType.SHOW | ContentType.EPISODE | 'artist';
    fileName: string;
  }) => {
    return `${APP_CONFIGS.CDN.URL}/${contentType}/${fileName}`;
  },
  generateMp4OutputFilePath: ({
    contentType,
    fileName,
  }: {
    contentType: ContentType.SHOW | ContentType.EPISODE | ContentType.REEL;
    fileName: string;
  }) => {
    const resolutions: MP4Resolution[] = [240, 360, 480, 720, 1080];
    const bucket =
      contentType === ContentType.REEL
        ? S3_BUCKETS.REEL_BUCKET
        : S3_BUCKETS.MAIN_VIDEO;

    const directory = contentType === ContentType.REEL ? 'reels' : contentType;

    const outputDirectory = `s3://${posix.normalize(
      `${bucket}/${directory}/main-video/`,
    )}`;
    const sourceFilePath = `s3://${posix.normalize(
      `${bucket}/${directory}/main-video/${fileName}`,
    )}`;

    const resolutionFilePaths: Record<MP4Resolution, string> = {} as Record<
      MP4Resolution,
      string
    >;
    const resolutionFilePathsWithFileName: Record<MP4Resolution, string> =
      {} as Record<MP4Resolution, string>;

    resolutions.reduce((acc, resolution) => {
      acc[resolution as MP4Resolution] =
        `${directory}/main-video/${resolution}/`;
      return acc;
    }, resolutionFilePaths);

    resolutions.reduce((acc, resolution) => {
      acc[resolution as MP4Resolution] =
        `s3://${bucket}/${contentType}/main-video/${resolution}/${fileName}`;
      return acc;
    }, resolutionFilePathsWithFileName);

    return {
      bucket,
      outputDirectory,
      resolutionFilePaths,
      resolutionFilePathsWithFileName,
      sourceFilePath,
    };
  },
  generatePeripheralPlaybackURL: ({
    contentType,
    hls265SourceLink,
    hlsSourceLink,
    slug,
  }: {
    contentType: ContentType.SHOW | ContentType.MOVIE;
    slug: string;
    hlsSourceLink: string;
    hls265SourceLink: string;
  }): {
    playbackURLH264: string;
    playbackURLH265: string;
  } => {
    const { templateDirectory: templateDirectoryHLS } =
      APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
        VisionularTranscodingTemplate.H264
      ];
    const { templateDirectory: templateDirectoryH265 } =
      APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[
        VisionularTranscodingTemplate.H265
      ];
    return {
      playbackURLH264: `${APP_CONFIGS.CDN.URL}/trailers/${contentType}/${slug}/trailer/${templateDirectoryHLS}/${hlsSourceLink}`,
      playbackURLH265: `${APP_CONFIGS.CDN.URL}/trailers/${contentType}/${slug}/trailer/${templateDirectoryH265}/${hls265SourceLink}`,
    };
  },

  generateRawMovieFilePath: ({
    fileExtension,
    fileName,
  }: {
    fileName: string;
    fileExtension: string;
  }) => {
    const sanitizedFileExtension = sanitizeFileExtension(fileExtension);
    const bucket = S3_BUCKETS.MAIN_VIDEO;
    const filePath = `episode/main-video/${fileName}${sanitizedFileExtension}`;
    return {
      bucket,
      filePath,
      fullFilePath: posix.normalize(
        `https://${bucket}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },

  generateRawReelFilePath: ({
    fileExtension,
    fileName,
  }: {
    fileName: string;
    fileExtension: string;
  }) => {
    const sanitizedFileExtension = sanitizeFileExtension(fileExtension);
    const bucket = S3_BUCKETS.REEL_BUCKET;
    const filePath = `reels/main-video/${fileName}${sanitizedFileExtension}`;
    return {
      bucket,
      filePath,
      fullFilePath: posix.normalize(
        `https://${bucket}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },

  generateRawShowEpisodeFilePath: ({
    fileExtension,
    fileName,
  }: {
    fileName: string;
    fileExtension: string;
  }) => {
    const sanitizedFileExtension = sanitizeFileExtension(fileExtension);
    const bucket = S3_BUCKETS.MAIN_VIDEO;
    const filePath = `episode/main-video/${fileName}${sanitizedFileExtension}`;
    return {
      bucket,
      filePath,
      fullFilePath: posix.normalize(
        `https://${bucket}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },
  generateRawShowFilePath: ({
    fileExtension,
    fileName,
  }: {
    fileName: string;
    fileExtension: string;
  }) => {
    const sanitizedFileExtension = sanitizeFileExtension(fileExtension);
    const bucket = S3_BUCKETS.MAIN_VIDEO;
    const filePath = `show/main-video/${fileName}${sanitizedFileExtension}`;
    return {
      bucket,
      filePath,
      fullFilePath: posix.normalize(
        `https://${bucket}.s3.amazonaws.com/${filePath}`,
      ),
    };
  },

  generateReelMp4PreviewURL: ({
    fileName,
    reelId,
  }: {
    fileName: string;
    reelId: string;
  }) => {
    const generatedFilePath = MediaFilePathUtils.generateMp4OutputFilePath({
      contentType: ContentType.REEL,
      fileName: reelId,
    });
    console.log(generatedFilePath);
    return `https://${generatedFilePath.bucket}.s3.ap-south-1.amazonaws.com/${generatedFilePath.resolutionFilePaths[480]}${fileName}`;
  },
  generateReelPlaylistFilePath: ({
    contentSlug,
    fileName,
    reelContentType,
    templateDirectory,
  }: {
    reelContentType: ContentType;
    templateDirectory: string;
    contentSlug: string;
    fileName: string;
  }) => {
    const TEMPLATE_DIRECTORY =
      templateDirectory === VisionularTranscodingTemplate.H264
        ? 'HLS'
        : 'HLS-H265';
    console.log(
      APP_CONFIGS.PLATFORM.IS_PRODUCTION
        ? 'stagemediaprivate'
        : 'stagetestmediaprivate',
    );
    return {
      bucket: APP_CONFIGS.PLATFORM.IS_PRODUCTION
        ? 'stagemediaprivate'
        : 'stagetestmediaprivate',
      filePath: `videos/${reelContentType}/${contentSlug}/reels/${TEMPLATE_DIRECTORY}/${fileName}`,
    };
  },
  generateSubtitleFilePath: ({
    language,
    slug,
  }: {
    slug: string;
    language: Lang;
  }) => {
    const filename = `${slug}-${language}-${new Date().getTime()}`;
    return {
      bucket: S3_BUCKETS.SUBTITLE,
      fileName: `${filename}.srt`,
      filePath: posix.join('episode/srt/'),
    };
  },
  generateThumbnailFilePath: ({
    contentType,
    orientation,
  }: {
    orientation: ImageOrientation;
    contentType: ContentType;
  }): {
    bucket: string;
    large: string;
    'semi-large': string;
    medium: string;
    raw: string;
    small: string;
  } => {
    const orientationPath = `${contentType}/${orientation}`;

    return {
      bucket: S3_BUCKETS.MEDIA_IMAGE,
      large: posix.join(orientationPath, 'large/'),
      medium: posix.join(orientationPath, 'medium/'),
      raw: posix.join(orientationPath, ''),
      'semi-large': posix.join(orientationPath, 'semi-large'),
      small: posix.join(orientationPath, 'small/'),
    };
  },

  getReelPlaylistFilePath: ({ reelId }: { reelId: string }) => {
    return `s3://${S3_BUCKETS.REEL_BUCKET}/reels/${reelId}/playlist.mp4`;
  },
};

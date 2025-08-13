import { ClientAppIdEnum } from '../enums/app.enum';
import { EnvironmentEnum } from '../enums/common.enums';
import { parsedEnv } from '../utils/env.utils';

const IS_PRODUCTION = parsedEnv.NODE_ENV === EnvironmentEnum.PRODUCTION;
export const LEGACY_APP_BASE_URL = IS_PRODUCTION
  ? 'https://stageapi.stage.in'
  : 'https://dev-api.stage.in';

export const APP_CONFIGS = {
  ALERTS: {
    PAYTM: {
      TR_CONFIGS: {
        OBSERVATION_TIME_FRAME: 300,
        OFFSET_TIME: 300,
        THRESHOLD: 0.03,
      },
    },
    PHONEPE: {
      TR_CONFIGS: {
        OBSERVATION_TIME_FRAME: 300,
        OFFSET_TIME: 300,
        THRESHOLD: 0.08,
      },
    },
  },
  AMPLITUDE: {
    API_URL: 'https://api.amplitude.com/2/httpapi',
    HAR_APP_API_KEY: parsedEnv.AMPLITUDE_API_KEY_HAR,
    MAIN_APP_API_KEY: parsedEnv.AMPLITUDE_API_KEY,
    RAJ_APP_API_KEY: parsedEnv.AMPLITUDE_API_KEY_RAJ,
  },
  APPLE_PAY: {
    appStoreConnectApiPrivateKeyId: 1531280099,
    bundleId: ClientAppIdEnum.IOS_MAIN,
    issuerId: '8fc30eeb-aa44-42f5-8f32-010bc9113a04',
    keyId: '83X9GY4GDM',
  },
  APPSFLYER: {
    BASE_URL: 'https://api3.appsflyer.com/inappevent',
    SECRET: parsedEnv.APPSFLYER_SECRET,
    SHORTLINK_API_URL: 'https://onelink.appsflyer.com',
    SHORTLINK_ENDPOINT: '/shortlink/v1',
    TEMPLATE_ID: 'xGYy',
    API_TOKEN: parsedEnv.APPSFLYER_API_TOKEN,
    TTL: '31d',
    PID: 'content_sharing',
    AF_DP: 'stage://',
    DEEPLINK_REFRESH_DAYS: 25,
  },
  AWS: {
    ACCESS_KEY_ID: parsedEnv.AWS_S3_ACCESS_KEY_ID,
    CLOUDFRONT: {
      ACCESS_KEY_ID: parsedEnv.CF_ACCESS_KEY_ID,
      API_URL: parsedEnv.AWS_CLOUDFRONT_URL,
      FREE_CONTENT_EXPIRATION_TIME: 1200, // 20 mins
      PRIVATE_KEY: parsedEnv.CF_PRIVATE_KEY,
      REGION: 'ap-south-1',
    },
    MEDIA_CONVERT: {
      ENDPOINT: 'https://htunurlzb.mediaconvert.ap-south-1.amazonaws.com',
      QUEUE_ARN: 'arn:aws:mediaconvert:ap-south-1:485200587121:queues/Default',
      REGION: 'ap-south-1',
      ROLE_ARN: 'arn:aws:iam::485200587121:role/mediaconvertrolenew',
    },
    S3: { REGION: 'ap-south-1' },
    SECRET_ACCESS_KEY: parsedEnv.AWS_S3_SECRET_ACCESS_KEY,
  },
  BULL_MQ: {
    DB: 0,
    HOST: parsedEnv.BULL_MQ_HOST,
    PORT: parsedEnv.BULL_MQ_PORT,
    PREFIX: 'stage',
  },
  CACHE: {
    TTL: {
      DISTRIBUTED_LOCK: 10, // lock ttl for distributed services
      FIVE_MINS: 5 * 60,
      HALF_HOUR: 30 * 60,
      ONE_DAY: 24 * 60 * 60,
      ONE_HOUR: 60 * 60,
      TEN_DAYS: 10 * 24 * 60 * 60,
      THIRTY_DAYS: 30 * 24 * 60 * 60,
    },
  },
  CDN: {
    URL: parsedEnv.BUCKET_PATH,
  },
  CELETEL: {
    SMS: {
      API_URL: 'https://api.celetel.com/api',
      FROM: 'STAGEE',
      PASSWORD: parsedEnv.CELETEL_SMS_PASSWORD,
      PRINCIPAL_ENTITY_ID: '1701159230668292176',
      USERNAME: parsedEnv.CELETEL_SMS_USERNAME,
    },
    WHATSAPP: {
      API_URL: 'https://rcmapi.instaalerts.zone/services/rcm/sendMessage',
      AUTH_TOKEN: parsedEnv.CELETEL_WHATSAPP_AUTH_TOKEN,
      NUMBERS: {
        BHO: '917065019993',
        HAR: '918700436692',
        RAJ: '919311518665',
      },
    },
  },
  CLEVERTAP: {
    HAR: {
      ACCOUNT_ID: parsedEnv.X_CLEVERTAP_ACCOUNT_ID_HAR,
      PASSCODE: parsedEnv.X_CLEVERTAP_PASSCODE_HAR,
    },
    MAIN: {
      ACCOUNT_ID: parsedEnv.X_CLEVERTAP_ACCOUNT_ID,
      PASSCODE: parsedEnv.X_CLEVERTAP_PASSCODE,
    },
    RAJ: {
      ACCOUNT_ID: parsedEnv.X_CLEVERTAP_ACCOUNT_ID_RAJ,
      PASSCODE: parsedEnv.X_CLEVERTAP_PASSCODE_RAJ,
    },
    URL: 'https://in1.api.clevertap.com/1/upload',
  },
  ENV: parsedEnv.NODE_ENV,
  FEATURE_ELIGIBILITY: { SEASON: 505592 },
  FIREBASE: {
    BASE_URL: 'https://www.google-analytics.com/mp/collect',
    IOS: { API_SECRET: 'DO_NOT_HAVE', APP_ID: 'DO_NOT_HAVE' },
    MAIN: {
      API_SECRET: parsedEnv.GA4_API_SECRET,
      APP_ID: parsedEnv.FIREBASE_APP_ID,
    },
    MEASUREMENT_ID: parsedEnv.FIREBASE_MEASUREMENT_ID,
    WEB: {
      API_SECRET: parsedEnv.GA4_API_SECRET_WEB,
    },
  },
  GUPSHUP: {
    SMS: {
      API_URL: 'https://enterpriseapi.smsgupshup.com/GatewayAPI',
      PASSWORD: parsedEnv.GUPSHUP_SMS_PASSWORD,
      USER_ID: parsedEnv.GUPSHUP_SMS_USER_ID,
    },
    WHATSAPP: {
      API_URL: 'https://media.smsgupshup.com/GatewayAPI/rest',
      PASSWORD: parsedEnv.GUPSHUP_WHATSAPP_PASSWORD,
      USER_ID: parsedEnv.GUPSHUP_WHATSAPP_USER_ID,
    },
  },
  IS_PRODUCTION: IS_PRODUCTION,
  IS_TEST: parsedEnv.NODE_ENV === EnvironmentEnum.TEST,
  JUSPAY: {
    API_KEY: parsedEnv.JUSPAY_API_KEY,
    API_URL: IS_PRODUCTION
      ? 'https://api.juspay.in'
      : 'https://sandbox.juspay.in',
    MERCHANT_ID: parsedEnv.JUSPAY_MERCHANT_ID,
  },
  KAFKA: {
    BACKFILL_NCANTO_USER_EVENT_TOPIC: 'ncanto_backfill_events',
    BROKERS: parsedEnv.KAFKA_BROKER_URLS.split(','),
    BYW_TOPIC: 'byw_events',
    CLIENT_ID: 'stage-nest-backend',
    CONTENT_CHANGES_TOPIC: 'content_changes',
    DOWNLOAD_STARTED_TOPIC: 'download_started',
    GROUP_ID_BACKFILL_NCANTO_USER_EVENT:
      'stage-consumer-group-backfill-ncanto-event-new',
    GROUP_ID_BYW_TOPIC: 'stage-consumer-group',
    GROUP_ID_CONTENT_CHANGES: 'stage-consumer-group-content-changes',
    GROUP_ID_DOWNLOAD_STARTED: 'stage-consumer-group-download-started',
    GROUP_ID_PREVIEW_CONTENT: 'stage-consumer-group-preview-content',
    GROUP_ID_THUMBNAIL_CLICKED: 'stage-consumer-group-thumbnail-clicked',
    GROUP_ID_USER_CHANGES: 'stage-consumer-group-user-changes',
    GROUP_ID_USER_WATCH_LIST: 'stage-consumer-group-user-watch-list',
    GROUP_ID_WATCHED_VIDEO: 'stage-consumer-group-watched-video',
    PREVIEW_CONTENT: 'preview_content',
    THUMBNAIL_CLICKED_TOPIC: 'thumbnail_clicked',
    USER_SUBSCRIPTION_CHANGES_TOPIC: 'new_subscription',
    WATCHED_VIDEO_TOPIC: 'wv-events',
    WATCHLIST_TOPIC: 'watchlist_events',
  },
  METABASE: {
    SUBSCRIPTION_RATE_URL:
      'https://stage.metabaseapp.com/public/question/5ae2d121-fe63-4b05-bc9d-009eb87bcbfd.json',
  },
  MONGO_DB: { URL: parsedEnv.MONGO_DB_URI },
  NCANTO: {
    API_KEY: parsedEnv.NCANTO_API_KEY,
    API_URL: IS_PRODUCTION
      ? 'https://stage-prod.xroadmedia.com'
      : 'https://stage-staging.xroadmedia.com',
    STORE_ID: IS_PRODUCTION ? 'stage_production' : 'stage_development',
  },
  OPENAI: {
    API_KEY: parsedEnv.OPENAI_API_KEY,
  },
  PARTNER: {
    JIO_JWT_EXPIRE_TIME: '10d',
    TEN_DAYS_IN_MILI_SECONDS: 10 * 24 * 60 * 60 * 1000,
  },
  PAYTM: {
    API_URL: IS_PRODUCTION
      ? 'https://securegw.paytm.in'
      : 'https://securegw-stage.paytm.in',
    DISPUTE_URL_PATH: IS_PRODUCTION
      ? 'https://securegw.paytm.in/v1/dispute/action'
      : 'https://securegw-stage.paytm.in/v1/dispute/action',
    MERCHANT_ID: parsedEnv.PAYTM_MERCHANT_ID,
    MERCHANT_KEY: parsedEnv.PAYTM_MERCHANT_KEY,
    REFUND_URL_PATH: '/refund/api/v1/refund/apply/sync',
  },
  PHONEPE: {
    API_URL: IS_PRODUCTION
      ? 'https://mercury-t2.phonepe.com'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox',
    CALLBACK_URL: `${LEGACY_APP_BASE_URL}/v23/recurring-payments/phonePeWebhook`,
    MERCHANT_ID: parsedEnv.PHONEPE_MERCHANT_ID,
    REFUND_URL_PATH: `/v4/credit/backToSource`,
    SALT_INDEX: parsedEnv.PHONEPE_SALT_INDEX,
    SALT_KEY: parsedEnv.PHONEPE_SALT_KEY,
  },
  PLATFORM: {
    DEFAULT_CACHE_TTL_SECONDS: 60 * 60 * 24 * 7,
    DEFAULT_MANDATE_EXPIRY_DAYS: 365 * 30, // 30 years in days
    ENV: parsedEnv.NODE_ENV,
    INTENT_LINK_EXPIRE_MINS: 6, // 5 + 1 buffer
    INTER_SERVICE_SECRET: parsedEnv.INTER_SERVICES_AUTH_KEY,
    IS_PRODUCTION: IS_PRODUCTION,
    JWT_ACCESS_TOKEN_EXPIRE_TIME: '30d',
    JWT_SECRET: parsedEnv.JWT_ACCESS_TOKEN_SECRET_KEY,
    PHONEPE_HEALTH_X_VERIFY: parsedEnv.PHONEPE_HEALTH_X_VERIFY,
    PORT: parsedEnv.PORT,
    SUBSCRIBED_NUMBERS: { END_NUMBER_CODE: 30, START_NUMBER_CODE: 16 },
    TEST_NUMBERS_PATTERN: '40241234',
    TRIAL_EXPIRED_NUMBERS: { END_NUMBER_CODE: 50, START_NUMBER_CODE: 46 },
    TRIAL_NUMBERS: { END_NUMBER_CODE: 45, START_NUMBER_CODE: 36 },
    TRIAL_PAUSED_NUMBERS: { END_NUMBER_CODE: 35, START_NUMBER_CODE: 31 },
    UNSUBSCRIBED_NUMBERS: { END_NUMBER_CODE: 15, START_NUMBER_CODE: 1 },
  },
  RAZORPAY: {
    API_URL: IS_PRODUCTION
      ? 'https://api.razorpay.com'
      : 'https://api.razorpay.com',
    KEY_ID: parsedEnv.RAZORPAY_KEY_ID,
    KEY_SECRET: parsedEnv.RAZORPAY_KEY_SECRET,
    WEBHOOK_SECRET_RECURRING: parsedEnv.RAZORPAY_WEBHOOK_SECRET_RECURRING,
  },
  RECOMMENDATION: {
    REELS: {
      ENGAGEMENT_SCORE: {
        HIGH_ENGAGEMENT_VIEW: 3,
        LIKE: 3,
        LOW_ENGAGEMENT_VIEW: -1,
        MEDIUM_ENGAGEMENT_VIEW: 1,
        SHARE: 3,
        ZERO_ENGAGEMENT_VIEW: -2,
      },
      STATICAL_DATA_URL: {
        BHO_MOVIE:
          'https://stage.metabaseapp.com/public/question/04f135bf-3078-430d-bdde-dfafa284a8ba.json',
        BHO_SHOW:
          'https://stage.metabaseapp.com/public/question/b81b8e24-7f36-44c0-8903-0329faefd9a7.json',
        HAR_MOVIE:
          'https://stage.metabaseapp.com/public/question/e7567b23-8f84-48cf-a0db-e53a9a514d55.json',
        HAR_SHOW:
          'https://stage.metabaseapp.com/public/question/64c88f1c-09bb-4069-baf8-5db97ed07f43.json',
        RAJ_MOVIE:
          'https://stage.metabaseapp.com/public/question/af9bcab4-edd0-4317-9e64-c19a4bcfeabf.json',
        RAJ_SHOW:
          'https://stage.metabaseapp.com/public/question/f94b2341-68c7-4404-9ae6-774f6ac68a5f.json',
      },
    },
  },
  REDIS: {
    DB: 2,
    HOST: parsedEnv.REDIS_HOST,
    PORT: parsedEnv.REDIS_PORT,
    SCAN_N_DELETE_BATCH_SIZE: 10000,
  },
  RUDDERSTACK: {
    DATA_PLANE_URL: parsedEnv.RUDDERSTACK_DATA_PLANE_URL,
    FLUSH_AT: 10, // batch of 10
    FLUSH_INTERVAL: 10000, // 10 secs
    WRITE_KEY: parsedEnv.RUDDERSTACK_WRITE_KEY_NEST,
  },
  SETTING: { ENTITY_ID: '63e24d7e1d2bd632af06e7e4' },
  SETU: {
    ACCOUNT_SERVICE_URL: 'https://accountservice.setu.co',
    API_URL: 'https://umap.setu.co', //https://umap-uat-core.setu.co',
    CLIENT_ID: parsedEnv.SETU_CLIENT_ID_V2,
    CLIENT_SECRET: parsedEnv.SETU_CLIENT_SECRET_V2,
    MERCHANT_ID: parsedEnv.SETU_MERCHANT_ID_V2,
    MERCHANT_VPA: parsedEnv.SETU_MERCHANT_VPA,
    TOKEN_EXPIRY_SECS: 4 * 60,
    WEBHOOK_SECRET: parsedEnv.SETU_WEBHOOK_SECRET,
  },
  SLACK: { BOT_TOKEN: parsedEnv.SLACK_BOT_TOKEN },
  STAGE: { SUPPORT_NUMBER: '07314621128' },
  STATSIG: {
    API_KEY: parsedEnv.STATSIG_API_KEY,
  },
  TEST: { UPI_ID: 'test@upi' },
  VISIONULAR: {
    API_KEY: 'F1C6A7DAAE9E4B1187EDBB6411BBF52C',
    API_SECRET: '41A1AB0E136643BE8FD1C16021D59A5A',
    BASE_URL: 'https://api.visionular.com',
    OUTPUT: (() => {
      switch (parsedEnv.NODE_ENV) {
        case EnvironmentEnum.PRODUCTION:
          return {
            outputBase: 's3://stagemediaprivate/videos',
            storageId: '202e8f878fb5acd2',
          };
        case EnvironmentEnum.DEVELOPMENT:
        case EnvironmentEnum.TEST:
          return {
            outputBase: 's3://stagetestmediaprivate/videos',
            storageId: 'f0a502985c531f21',
          };
        case EnvironmentEnum.PREPROD:
          return {
            outputBase: 's3://stagetestmediaprivate/videos',
            storageId: '7b659c0cda937417',
          };
        default:
          throw new Error('Invalid environment');
      }
    })(),
    TRANSCODING_TEMPLATES: {
      H264: {
        extension: 'm3u8',
        id: 'H264_HLS_ABR_4K_NODRM',
        templateDirectory: 'HLS',
      },
      H265: {
        extension: 'm3u8',
        id: 'H265_HLS_ABR_4K_NODRM',
        templateDirectory: 'HLS-H265',
      },
      MP4_WATERMARK: {
        extension: 'mp4',
        id: 'H264_MP4_1080P_WM',
        templateDirectory: 'MP4-WM',
      },
    },
  },
} as const;

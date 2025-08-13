import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

import { EnvironmentEnum } from '../enums/common.enums';

const envSchema = z.object({
  // Amplitude
  AMPLITUDE_API_KEY: z.string(),
  AMPLITUDE_API_KEY_HAR: z.string(),
  AMPLITUDE_API_KEY_RAJ: z.string(),

  // AppsFlyer
  APPSFLYER_SECRET: z.string(),
  APPSFLYER_API_TOKEN: z.string(),

  AWS_CLOUDFRONT_URL: z.string(),
  AWS_S3_ACCESS_KEY_ID: z.string(),

  AWS_S3_SECRET_ACCESS_KEY: z.string(),
  //BUCKET_PATH
  BUCKET_PATH: z.string(),
  // BullMQ
  BULL_MQ_HOST: z.string(),
  BULL_MQ_PORT: z.preprocess(
    (val) => Number(val),
    z.number().min(1).max(65535),
  ),
  // Celetel SMS
  CELETEL_SMS_PASSWORD: z.string(),

  CELETEL_SMS_USERNAME: z.string(),
  // Celetel Whatsapp
  CELETEL_WHATSAPP_AUTH_TOKEN: z.string(),
  CF_ACCESS_KEY_ID: z.string(),
  CF_PRIVATE_KEY: z.string(),

  // Firebase
  FIREBASE_APP_ID: z.string(),

  FIREBASE_MEASUREMENT_ID: z.string(),
  GA4_API_SECRET: z.string(),
  GA4_API_SECRET_WEB: z.string(),
  // Gupshup SMS
  GUPSHUP_SMS_PASSWORD: z.string(),

  GUPSHUP_SMS_USER_ID: z.string(),

  // Gupshup Whatsapp
  GUPSHUP_WHATSAPP_PASSWORD: z.string(),

  GUPSHUP_WHATSAPP_USER_ID: z.string(),
  INTER_SERVICES_AUTH_KEY: z.string(),

  JIO_PARTNER_ID: z.string(),

  JIO_PLAN_ID: z.string(),

  JIOTV_JWT_SECRET_KEY: z.string(),
  JUSPAY_API_KEY: z.string(),
  // Payment - Juspay
  JUSPAY_MERCHANT_ID: z.string(),

  JWT_ACCESS_TOKEN_EXPIRE_TIME: z.string(),

  // JWT
  JWT_ACCESS_TOKEN_SECRET_KEY: z.string(),

  JWT_REFRESH_TOKEN_EXPIRE_TIME: z.string(),

  JWT_REFRESH_TOKEN_SECRET_KEY: z.string(),

  KAFKA_BROKER_URLS: z.string().default('localhost:29092'),
  // Database
  MONGO_DB_URI: z.string().url(),
  NCANTO_API_KEY: z.string(),

  // Environment
  NODE_ENV: z.enum([
    EnvironmentEnum.DEVELOPMENT,
    EnvironmentEnum.PRODUCTION,
    EnvironmentEnum.TEST,
    EnvironmentEnum.PREPROD,
  ]),
  // OpenAI
  OPENAI_API_KEY: z.string(),

  // Payment - Paytm
  PAYTM_MERCHANT_ID: z.string(),
  PAYTM_MERCHANT_KEY: z.string(),

  PHONEPE_HEALTH_X_VERIFY: z.string(),
  PHONEPE_MERCHANT_ID: z.string(),

  PHONEPE_SALT_INDEX: z.string(),

  // Payment - PhonePe
  PHONEPE_SALT_KEY: z.string(),

  PORT: z.preprocess((val) => Number(val), z.number().min(1).max(65535)),
  // Payment - Razorpay

  RAZORPAY_KEY_ID: z.string(),
  RAZORPAY_KEY_SECRET: z.string(),

  RAZORPAY_WEBHOOK_SECRET_RECURRING: z.string(),
  // Redis
  REDIS_HOST: z.string(),
  REDIS_PORT: z.preprocess((val) => Number(val), z.number().min(1).max(65535)),
  // Rudder stack
  RUDDERSTACK_DATA_PLANE_URL: z.string(),
  RUDDERSTACK_WRITE_KEY_NEST: z.string(),
  // Payment - Setu
  SETU_CLIENT_ID_V2: z.string(),
  SETU_CLIENT_SECRET_V2: z.string(),

  SETU_MERCHANT_ID_V2: z.string(),

  SETU_MERCHANT_VPA: z.string(),

  SETU_WEBHOOK_SECRET: z.string(),
  SLACK_BOT_TOKEN: z.string(),

  STAGE_BASE_URL: z.string(),
  STATSIG_API_KEY: z.string(),
  STC_JWT_SCRET_KEY: z.string(),
  // STC
  STC_PARTNER_ID: z.string(),

  STC_PLAN_ID: z.string(),
  // CleverTap
  X_CLEVERTAP_ACCOUNT_ID: z.string(),
  X_CLEVERTAP_ACCOUNT_ID_HAR: z.string(),

  X_CLEVERTAP_ACCOUNT_ID_RAJ: z.string(),
  X_CLEVERTAP_PASSCODE: z.string(),
  X_CLEVERTAP_PASSCODE_HAR: z.string(),
  X_CLEVERTAP_PASSCODE_RAJ: z.string(),
});

export const parsedEnv = envSchema.parse(process.env);

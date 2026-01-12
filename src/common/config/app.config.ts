import { registerAs } from '@nestjs/config';

export default registerAs('app', () => {
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';

  // Validate critical env vars in production
  if (isProduction) {
    const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  return {
    name: process.env.APP_NAME || 'Rapido Clone',
    version: process.env.APP_VERSION || '1.0.0',
    description: process.env.APP_DESCRIPTION || 'Ride-hailing app backend',
    port: parseInt(process.env.PORT, 10) || 3010,
    environment: env,
    isProduction,

    // JWT Configuration
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '365d',
    },

    // Database Configuration
    database: {
      uri: process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/rapido_db?authSource=admin',
      options: {
        maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE, 10) || 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      },
    },

    // Redis Configuration
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB, 10) || 0,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'rideit:',
    },

    // Kafka Configuration
    kafka: {
      clientId: process.env.KAFKA_CLIENT_ID || 'rideit-app',
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:29092'],
      groupId: process.env.KAFKA_GROUP_ID || 'rideit-consumer-group',
      enabled: process.env.KAFKA_ENABLED === 'true', // Disabled by default in dev
    },

    // Rate Limiting
    throttle: {
      ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
      limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
    },

    // Razorpay Configuration
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    },

    // SMS Provider (Twilio)
    sms: {
      provider: process.env.SMS_PROVIDER || 'mock', // 'twilio' | 'msg91' | 'mock'
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
      },
      msg91: {
        authKey: process.env.MSG91_AUTH_KEY || '',
        senderId: process.env.MSG91_SENDER_ID || 'RAPIDO',
        templateId: process.env.MSG91_TEMPLATE_ID || '',
      },
    },

    // Push Notifications (Firebase)
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    },

    // Google Maps API
    googleMaps: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    },

    // Location Configuration
    location: {
      defaultRadius: parseInt(process.env.DEFAULT_SEARCH_RADIUS, 10) || 5000, // meters
      maxRadius: parseInt(process.env.MAX_SEARCH_RADIUS, 10) || 20000, // meters
      driverLocationTtl: parseInt(process.env.DRIVER_LOCATION_TTL, 10) || 300, // seconds
    },

    // Booking Configuration
    booking: {
      defaultWaitTime: parseInt(process.env.DEFAULT_WAIT_TIME, 10) || 300, // seconds
      maxWaitTime: parseInt(process.env.MAX_WAIT_TIME, 10) || 900, // seconds
      autoAcceptTime: parseInt(process.env.AUTO_ACCEPT_TIME, 10) || 60, // seconds
    },

    // Logging
    logging: {
      level: process.env.LOG_LEVEL || 'debug',
      format: process.env.LOG_FORMAT || 'json',
    },

    // CORS
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    },
  };
}); 
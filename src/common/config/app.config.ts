import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'Rapido Clone',
  version: process.env.APP_VERSION || '1.0.0',
  description: process.env.APP_DESCRIPTION || 'Ride-hailing app backend',
  port: parseInt(process.env.PORT, 10) || 3010,
  environment: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '365d',
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/',
    options: {
      maxPoolSize: 10,
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
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'rapido:',
  },

  // Kafka Configuration
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'rapido-app',
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    groupId: process.env.KAFKA_GROUP_ID || 'rapido-consumer-group',
  },

  // Rate Limiting
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 10,
  },

  // Razorpay Configuration
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_key_id',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_key_secret',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret',
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
})); 
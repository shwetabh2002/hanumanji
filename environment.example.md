# Environment Configuration Template

Create a `.env` file in the root directory with the following variables:

```env
# Application Configuration
APP_NAME=Rapido Clone
APP_VERSION=1.0.0
APP_DESCRIPTION=Ride-hailing app backend
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Database Configuration
MONGODB_URI=mongodb://admin:password@localhost:27017/rapido_db?authSource=admin

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=rapido:

# Kafka Configuration
KAFKA_CLIENT_ID=rapido-app
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=rapido-consumer-group

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_key_id
RAZORPAY_KEY_SECRET=rzp_test_key_secret
RAZORPAY_WEBHOOK_SECRET=webhook_secret

# Location Configuration
DEFAULT_SEARCH_RADIUS=5000
MAX_SEARCH_RADIUS=20000
DRIVER_LOCATION_TTL=300

# Booking Configuration
DEFAULT_WAIT_TIME=300
MAX_WAIT_TIME=900
AUTO_ACCEPT_TIME=60
```

## Instructions

1. Copy the above configuration to a `.env` file in the root directory
2. Replace all placeholder values with actual credentials for production
3. Update MongoDB URI with your database credentials
4. Configure Redis connection settings
5. Set up Kafka broker addresses
6. Update Razorpay credentials for payment processing 
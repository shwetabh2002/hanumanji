# Rapido Clone - Ride-Hailing App Backend

A complete ride-hailing application backend built with NestJS, similar to Rapido. This application provides a scalable, modular architecture for managing users, drivers, bookings, payments, and real-time location tracking.

## 🚀 Features

- **Modular Architecture**: Clean separation of concerns with feature-based modules
- **JWT Authentication**: Role-based access control (User, Driver, Admin)
- **Real-time Communication**: WebSocket gateway for live updates
- **Geolocation Services**: Redis-based nearest driver search with geospatial indexing
- **Event Streaming**: Kafka integration for event-driven architecture
- **Payment Integration**: Razorpay integration for secure payments
- **API Documentation**: Comprehensive Swagger/OpenAPI documentation
- **Rate Limiting**: Built-in rate limiting and security middleware
- **Data Validation**: Class-validator for request validation
- **Global Exception Handling**: Centralized error handling and logging
- **Docker Support**: Full containerization with Docker Compose

## 🏗️ Architecture

### Modular Structure

```
src/
├── modules/
│   ├── auth/           # Authentication & JWT management
│   ├── user/           # User management
│   ├── driver/         # Driver management & vehicle info
│   ├── booking/        # Ride booking & trip management
│   ├── payments/       # Payment processing with Razorpay
│   └── location/       # Geolocation & driver tracking
├── shared/
│   ├── database/       # Database connections & utilities
│   ├── cache/          # Redis caching layer
│   ├── events/         # Kafka event streaming
│   └── websocket/      # Real-time communication
├── common/
│   ├── config/         # Configuration management
│   ├── constants/      # Application constants
│   ├── enums/          # TypeScript enums
│   ├── filters/        # Exception filters
│   ├── interceptors/   # Request/response interceptors
│   └── guards/         # Authentication guards
└── tests/              # Unit and E2E tests
```

## 🛠️ Tech Stack

- **Framework**: NestJS with Fastify
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis for session management and geolocation
- **Message Queue**: Apache Kafka for event streaming
- **Authentication**: JWT with Passport
- **API Documentation**: Swagger/OpenAPI
- **Validation**: Class-validator & Class-transformer
- **Testing**: Jest
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- Node.js (v22.x or higher)
- Docker & Docker Compose
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rapido-clone-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

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

### 4. Start Infrastructure Services

```bash
docker-compose up -d
```

This will start:
- MongoDB (port 27017)
- Redis (port 6379)
- Apache Kafka (port 9092)
- Kafka UI (port 8080)

### 5. Run the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

The application will be available at:
- API: http://localhost:3000
- Swagger Documentation: http://localhost:3000/api/docs
- Kafka UI: http://localhost:8080

## 📖 API Documentation

Once the application is running, visit http://localhost:3000/api/docs to explore the interactive API documentation.

### Key Endpoints

- **Authentication**: `/auth/*` - User/Driver registration and login
- **Users**: `/users/*` - User profile management
- **Drivers**: `/drivers/*` - Driver management and vehicle info
- **Bookings**: `/bookings/*` - Ride booking and trip management
- **Payments**: `/payments/*` - Payment processing
- **Location**: `/location/*` - Geolocation services

## 🔄 Event Streaming

The application uses Kafka for event-driven architecture:

### Event Topics

- `booking.created` - New booking created
- `booking.accepted` - Driver accepted booking
- `trip.started` - Trip started
- `trip.completed` - Trip completed
- `driver.location.updated` - Driver location update
- `payment.completed` - Payment processed

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🔧 Development

### Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint:check

# Type check
npm run type:check
```

### Database Management

MongoDB collections are automatically created with proper indexes for geospatial queries and performance optimization.

### Redis Usage

Redis is used for:
- Driver location tracking with geospatial indexing
- Session management
- Rate limiting
- Caching frequently accessed data

## 🚢 Deployment

### Docker Deployment

```bash
# Build the application
npm run build

# Build Docker image
docker build -t rapido-clone-backend .

# Run with Docker Compose
docker-compose up --build
```

### Environment Variables for Production

Ensure all environment variables are properly configured for production:

- Use strong JWT secrets
- Configure proper MongoDB connection strings
- Set up Redis cluster for high availability
- Configure Kafka cluster
- Use production Razorpay credentials

## 🔐 Security Features

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS configuration
- Helmet security headers
- Request/response logging

## 📊 Monitoring

The application includes:
- Health check endpoints
- Request/response logging
- Error tracking and alerting
- Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the UNLICENSED License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the code comments and examples

---

**Happy Coding! 🚗💨**

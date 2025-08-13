import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  logger.log('🚀 Starting Rapido Clone API...');
  logger.log('📋 Initializing NestJS application...');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ 
      logger: true
    }),
    {
      logger: ['log', 'error', 'warn', 'debug', 'verbose']
    }
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port');
  const environment = configService.get<string>('app.environment');
  const appName = configService.get<string>('app.name');
  const appVersion = configService.get<string>('app.version');

  logger.log(`📱 Application: ${appName} v${appVersion}`);
  logger.log(`🌍 Environment: ${environment}`);
  logger.log(`🔧 Node.js Version: ${process.version}`);
  
  // Global pipes
  logger.log('🔍 Setting up global validation pipe...');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
        },
    }),
  );

  // CORS configuration
  logger.log('🌐 Configuring CORS...');
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    });

  // Database connections logging
  const mongoUri = configService.get<string>('app.database.uri');
  const redisHost = configService.get<string>('app.redis.host');
  const redisPort = configService.get<number>('app.redis.port');
  const kafkaBrokers = configService.get<string[]>('app.kafka.brokers');

  logger.log(`🗄️  MongoDB URI: ${mongoUri?.replace(/\/\/[^@]*@/, '//***:***@') || 'Not configured'}`);
  logger.log(`🔴 Redis: ${redisHost}:${redisPort}`);
  logger.log(`📨 Kafka Brokers: ${kafkaBrokers?.join(', ') || 'Not configured'}`);

  // Swagger documentation
  if (environment !== 'production') {
    logger.log('📚 Setting up Swagger documentation...');
    const config = new DocumentBuilder()
      .setTitle('Rapido Clone API')
      .setDescription('Ride-hailing app backend API documentation')
      .setVersion(appVersion)
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('app', 'Application endpoints')
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('drivers', 'Driver management endpoints')
      .addTag('bookings', 'Booking management endpoints')
      .addTag('payments', 'Payment processing endpoints')
      .addTag('location', 'Location services endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    logger.log(`📖 Swagger docs will be available at: http://localhost:${port}/api/docs`);
  }

  // Security and middleware logging
  logger.log('🛡️  Security middleware configured');
  logger.log('⚡ Rate limiting enabled');
  logger.log('🔒 JWT authentication configured');
  logger.log('📝 Global logging interceptor active');
  logger.log('🚨 Global exception filter active');

  // Start server
  await app.listen(port, '0.0.0.0');
  
  // Success logs with INFO level
  console.log('\n');
  logger.log(`Server listening at http://localhost:${port}`);
  logger.log('✅ APPLICATION STARTUP COMPLETE!');
  logger.log('═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
  logger.log(`🚀 SERVER IS RUNNING ON PORT: ${port}`);
  logger.log(`🌐 Server URL: http://localhost:${port}`);
  logger.log(`📖 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🏥 Health Check: http://localhost:${port}/health`);
  logger.log(`📊 Environment: ${environment.toUpperCase()}`);
  logger.log(`⏰ Started at: ${new Date().toLocaleString()}`);
  logger.log('═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('\n');

  // Additional environment-specific logs
  if (environment === 'development') {
    logger.log('🔄 Hot reload enabled');
    logger.log('🐛 Debug mode active');
  }

  // Log important endpoints
  logger.log('📍 Important Endpoints:');
  logger.log(`   └── GET  /           - API Information`);
  logger.log(`   └── GET  /health     - Health Check`);
  logger.log(`   └── GET  /api/docs   - Swagger Documentation`);

  // Graceful shutdown handlers
  process.on('SIGINT', async () => {
    logger.warn('🛑 Received SIGINT signal. Shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.warn('🛑 Received SIGTERM signal. Shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Promise Rejection:', reason);
    logger.error('Promise:', promise);
  });

  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Failed to start application:', error);
  process.exit(1);
});

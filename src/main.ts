import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

/**
 * Bootstrap the NestJS application
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  // Create Fastify application
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 3010);
  const isProduction = config.get<boolean>('app.isProduction', false);

  // ─────────────────────────────────────────────────────────────
  // Global Configuration
  // ─────────────────────────────────────────────────────────────
  
  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true,           // Auto-transform payloads
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: config.get<string[]>('app.cors.origins', ['http://localhost:3000']),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // API Versioning (optional, for future use)
  // app.enableVersioning({ type: VersioningType.URI });

  // ─────────────────────────────────────────────────────────────
  // Swagger Documentation (non-production only)
  // ─────────────────────────────────────────────────────────────
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Rapido Clone API')
      .setDescription('Ride-hailing platform API')
      .setVersion(config.get<string>('app.version', '1.0.0'))
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT-auth',
      )
      .addTag('auth', 'Authentication & Authorization')
      .addTag('users', 'User Management')
      .addTag('drivers', 'Driver Management')
      .addTag('bookings', 'Ride Bookings')
      .addTag('payments', 'Payment Processing')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Graceful Shutdown
  // ─────────────────────────────────────────────────────────────
  app.enableShutdownHooks();

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Promise Rejection', reason);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error.stack);
    process.exit(1);
  });

  // ─────────────────────────────────────────────────────────────
  // Start Server
  // ─────────────────────────────────────────────────────────────
  await app.listen(port, '0.0.0.0');

  // Log startup info
  logger.log(`Server running on http://localhost:${port}`);
  
  if (!isProduction) {
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
}

// Start application
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

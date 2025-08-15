// ========================================
// 🔧 CRYPTO POLYFILL FOR NODE.js 18
// ========================================
import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
// import { ThrottlerGuard } from '@nestjs/throttler';
import helmet from 'helmet';
import compression from 'compression';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppConfig } from './config/app.config';

async function bootstrap() {
  // ========================================
  // 🚀 CREATE NESTJS APPLICATION - OPTIMIZED
  // ========================================
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn'] // Reduced logging in production
        : ['log', 'error', 'warn', 'debug'],
  });

  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app');
  const logger = new Logger('Bootstrap');

  // Debug JWT secret - only in development
  const jwtSecret = configService.get('JWT_SECRET');
  if (!jwtSecret) {
    logger.error(
      '❌ JWT_SECRET environment variable is required but not found',
    );
    process.exit(1);
  }

  // Reduce verbose logging in production
  if (process.env.NODE_ENV !== 'production') {
    logger.log(
      `🔐 JWT_SECRET loaded from environment (first 8 chars): ${jwtSecret.substring(0, 8)}...`,
    );
    logger.log(`🔐 NODE_ENV: ${configService.get('NODE_ENV')}`);
  }

  // ========================================
  // 🛡️ SECURITY MIDDLEWARE
  // ========================================
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          imgSrc: ["'self'", "'data:'", "'https:'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );

  // ========================================
  // 🗜️ COMPRESSION
  // ========================================
  app.use(compression());

  // ========================================
  // 🌐 CORS CONFIGURATION
  // ========================================
  app.enableCors({
    origin: appConfig.cors.origins,
    methods: appConfig.cors.methods,
    allowedHeaders: appConfig.cors.allowedHeaders,
    credentials: appConfig.cors.credentials,
  });

  // Log CORS origins in development
  if (appConfig.environment !== 'production') {
    logger.log(`🌐 CORS Origins: ${appConfig.cors.origins.join(', ')}`);
  }

  // ========================================
  // 📁 STATIC FILES
  // ========================================
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/slips',
  });

  // ========================================
  // 🔧 GLOBAL PIPES & GUARDS
  // ========================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // อนุญาตให้ส่ง properties เกินมา (จะถูกลบอัตโนมัติ)
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Rate limiting guard (optional - remove if not needed)
  // app.useGlobalGuards(app.get(ThrottlerGuard));

  // ========================================
  // 🚦 API PREFIX & VERSIONING
  // ========================================
  app.setGlobalPrefix(`api/${appConfig.apiVersion}`);

  // ========================================
  // 📚 SWAGGER DOCUMENTATION
  // ========================================
  const config = new DocumentBuilder()
    .setTitle(appConfig.swagger.title)
    .setDescription(appConfig.swagger.description)
    .setVersion(appConfig.swagger.version)
    .addBearerAuth()
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Orders', 'Order management operations')
    .addTag('Payments', 'Payment processing')
    .addTag('Seats', 'Seat management and booking')
    .addTag('Analytics', 'Reports and analytics')
    .addTag('Audit', 'System audit trail')
    .addTag('Config', 'System configuration')
    .addTag('Health', 'Application health checks')
    .addTag('Email', 'Email automation system')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  if (appConfig.swagger.enabled) {
    SwaggerModule.setup(appConfig.swagger.path, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    logger.log(
      `📚 Swagger documentation available at: /${appConfig.swagger.path}`,
    );
  }

  // ========================================
  // 🚀 START SERVER
  // ========================================
  const port = appConfig.port;
  await app.listen(port, '0.0.0.0');

  logger.log(`🥊 Patong Boxing Stadium Ticket System started on port ${port}`);
  logger.log(`🌐 Environment: ${appConfig.environment}`);
  logger.log(`🌍 Frontend URL: ${appConfig.domain.frontend}`);
  logger.log(`🔗 Backend URL: ${appConfig.domain.backend}`);
  logger.log(
    `📱 API Base URL: ${appConfig.domain.api}/${appConfig.apiVersion}`,
  );

  if (appConfig.swagger.enabled) {
    logger.log(
      `📚 Documentation: ${appConfig.domain.backend}/${appConfig.swagger.path}`,
    );
  }

  logger.log(
    `💊 Health Check: ${appConfig.domain.api}/${appConfig.apiVersion}/health`,
  );
}

bootstrap().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});

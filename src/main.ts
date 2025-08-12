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

async function bootstrap() {
  // ========================================
  // 🚀 CREATE NESTJS APPLICATION
  // ========================================
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

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
    origin: ['http://43.229.133.51:3000', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

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
  const apiVersion = configService.get('API_VERSION', 'v1');
  app.setGlobalPrefix(`api/${apiVersion}`);

  // ========================================
  // 📚 SWAGGER DOCUMENTATION
  // ========================================
  const config = new DocumentBuilder()
    .setTitle('🎫 Boxing Ticket Booking System API')
    .setDescription(
      `
      Complete ticket booking system with order management, 
      payment processing, seat allocation, and analytics.
      
      ## Features
      - 🎟️ Order Management
      - 💳 Payment Processing
      - 💺 Seat Management
      - 📊 Analytics & Reporting
      - 🔐 Role-based Access Control
      - 🔍 Audit Trail
      
      ## Authentication
      Use JWT token in Authorization header: \`Bearer <token>\`
    `,
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Orders', 'Order management operations')
    .addTag('Payments', 'Payment processing')
    .addTag('Seats', 'Seat management and booking')
    .addTag('Analytics', 'Reports and analytics')
    .addTag('Audit', 'System audit trail')
    .addTag('Config', 'System configuration')
    .addTag('Health', 'Application health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  logger.log('📚 Swagger documentation available at: /api/docs');

  // ========================================
  // 🚀 START SERVER
  // ========================================
  const port = configService.get('PORT', process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');

  logger.log(`🎫 Boxing Ticket Booking System started on port ${port}`);
  logger.log(`🌐 Environment: ${configService.get('NODE_ENV', 'development')}`);
  logger.log(`📱 API Base URL: http://localhost:${port}/api/${apiVersion}`);
  logger.log(`📚 Documentation: http://localhost:${port}/api/docs`);
  logger.log(
    `💊 Health Check: http://localhost:${port}/api/${apiVersion}/health`,
  );
}

bootstrap().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});

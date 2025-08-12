import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import {
  ApiVersioningMiddleware,
  AdvancedRateLimitMiddleware,
  RequestTransformationMiddleware,
} from './api-gateway.middleware';

@Module({
  imports: [ConfigModule],
  controllers: [ApiGatewayController],
  providers: [
    ApiGatewayService,
    ApiVersioningMiddleware,
    AdvancedRateLimitMiddleware,
    RequestTransformationMiddleware,
  ],
  exports: [
    ApiGatewayService,
    ApiVersioningMiddleware,
    AdvancedRateLimitMiddleware,
    RequestTransformationMiddleware,
  ],
})
export class ApiGatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply API versioning middleware to all routes except gateway itself
    consumer
      .apply(ApiVersioningMiddleware)
      .exclude('gateway/*path')
      .forRoutes('*');

    // Apply rate limiting middleware to all routes
    consumer.apply(AdvancedRateLimitMiddleware).forRoutes('*');

    // Apply request transformation middleware to all API routes
    consumer
      .apply(RequestTransformationMiddleware)
      .exclude('gateway/*path', 'health', 'docs', 'api-docs')
      .forRoutes('*');
  }
}

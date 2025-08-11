import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

// Export the configuration for testing and reuse
export const throttlerConfig = {
  imports: [ConfigModule],
  useFactory: () => [
    {
      name: 'global',
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute (global)
    },
    {
      name: 'api',
      ttl: 60000, // 1 minute
      limit: 50, // 50 API requests per minute
    },
    {
      name: 'qr-validation',
      ttl: 60000, // 1 minute
      limit: 20, // 20 QR validations per minute
    },
    {
      name: 'email',
      ttl: 3600000, // 1 hour
      limit: 10, // 10 emails per hour
    },
    {
      name: 'auth',
      ttl: 900000, // 15 minutes
      limit: 5, // 5 authentication attempts per 15 minutes
    },
  ],
};

@Module({
  imports: [ThrottlerModule.forRootAsync(throttlerConfig)],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [ThrottlerModule],
})
export class ThrottlerConfigModule {}

import { Module } from '@nestjs/common';
import { ApiIntegrationController } from './api-integration.controller';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuditModule } from '../audit/audit.module';
import { CacheService } from '../common/services/cache.service';
import { PerformanceService } from '../common/services/performance.service';

@Module({
  imports: [AnalyticsModule, AuditModule],
  controllers: [ApiIntegrationController],
  providers: [CacheService, PerformanceService],
})
export class ApiIntegrationModule {}

import { Module } from '@nestjs/common';
import { PerformanceController } from './performance.controller';
import { CacheService } from '../common/services/cache.service';
import { PerformanceService } from '../common/services/performance.service';

@Module({
  controllers: [PerformanceController],
  providers: [CacheService, PerformanceService],
  exports: [CacheService, PerformanceService],
})
export class PerformanceModule {}

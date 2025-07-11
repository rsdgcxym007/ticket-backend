import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from '../common/services/cache.service';

@Injectable()
export class CacheCleanupTask {
  private readonly logger = new Logger(CacheCleanupTask.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * ทำความสะอาด Cache ทุก 5 นาที
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredCache() {
    this.logger.log('🧹 Starting cache cleanup...');

    const statsBefore = this.cacheService.getStats();
    this.cacheService.cleanup();
    const statsAfter = this.cacheService.getStats();

    const cleaned = statsBefore.totalKeys - statsAfter.totalKeys;

    if (cleaned > 0) {
      this.logger.log(`✅ Cleaned up ${cleaned} expired cache entries`);
    }

    this.logger.debug(`📊 Cache stats: ${statsAfter.totalKeys} active keys`);
  }

  /**
   * รีเซ็ต Cache ทั้งหมดทุกชั่วโมง (สำหรับข้อมูลที่อาจจะเก่า)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async resetAllCache() {
    this.logger.log('🔄 Performing hourly cache reset...');

    const stats = this.cacheService.getStats();
    this.cacheService.clear();

    this.logger.log(`♻️ Reset ${stats.totalKeys} cache entries for fresh data`);
  }
}

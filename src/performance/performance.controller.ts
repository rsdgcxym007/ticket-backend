import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CacheService } from '../common/services/cache.service';
import { PerformanceService } from '../common/services/performance.service';
import { ApiResponseHelper } from '../common/utils';

@ApiTags('Performance')
@ApiBearerAuth()
@Controller('performance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PerformanceController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly performanceService: PerformanceService,
  ) {}

  /**
   * รายงานประสิทธิภาพระบบ (Admin เท่านั้น)
   */
  @Get('report')
  @Roles(UserRole.ADMIN)
  async getPerformanceReport() {
    const report = this.performanceService.getPerformanceReport();
    const cacheStats = this.cacheService.getStats();

    return ApiResponseHelper.success(
      {
        performance: report,
        cache: cacheStats,
        timestamp: new Date().toISOString(),
      },
      'ดึงรายงานประสิทธิภาพสำเร็จ',
    );
  }

  /**
   * ล้าง Cache ทั้งหมด (Admin เท่านั้น)
   */
  @Get('cache/clear')
  @Roles(UserRole.ADMIN)
  async clearCache() {
    const statsBefore = this.cacheService.getStats();
    this.cacheService.clear();
    const statsAfter = this.cacheService.getStats();

    return ApiResponseHelper.success(
      {
        before: statsBefore,
        after: statsAfter,
        cleared: statsBefore.totalKeys,
      },
      'ล้างแคชสำเร็จ',
    );
  }

  /**
   * ล้าง Performance Metrics (Admin เท่านั้น)
   */
  @Get('metrics/reset')
  @Roles(UserRole.ADMIN)
  async resetMetrics() {
    this.performanceService.resetMetrics();

    return ApiResponseHelper.success(
      { message: 'รีเซ็ตข้อมูลประสิทธิภาพเรียบร้อยแล้ว' },
      'รีเซ็ตข้อมูลสำเร็จ',
    );
  }

  /**
   * สถานะ Cache
   */
  @Get('cache/stats')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getCacheStats() {
    const stats = this.cacheService.getStats();

    return ApiResponseHelper.success(stats, 'ดึงข้อมูลสถิติแคชสำเร็จ');
  }
}

import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RealTimeMonitoringService } from './real-time-monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('📡 Real-time Monitoring')
@Controller('monitoring/realtime')
@UseGuards(JwtAuthGuard)
export class RealTimeMonitoringController {
  private readonly logger = new Logger(RealTimeMonitoringController.name);

  constructor(private readonly monitoringService: RealTimeMonitoringService) {}

  /**
   * 📊 System Health Dashboard
   */
  @Get('health')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
  @ApiOperation({
    summary: 'สุขภาพระบบแบบเรียลไทม์',
    description: 'แสดงข้อมูลสุขภาพระบบทั้งหมดแบบเรียลไทม์',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลสุขภาพระบบ',
  })
  async getSystemHealth() {
    try {
      this.logger.log('📊 Getting system health metrics');
      const health = await this.monitoringService.getSystemHealth();

      return {
        success: true,
        data: health,
        message: 'System health retrieved successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get system health: ${error.message}`);
      throw error;
    }
  }

  /**
   * ⚡ Performance Monitoring
   */
  @Get('performance')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'การติดตามประสิทธิภาพแบบเรียลไทม์',
    description: 'แสดงข้อมูลประสิทธิภาพระบบและ API แบบเรียลไทม์',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลประสิทธิภาพระบบ',
  })
  async getPerformanceMetrics() {
    try {
      this.logger.log('⚡ Getting performance metrics');
      const performance = await this.monitoringService.getPerformanceMetrics();

      return {
        success: true,
        data: performance,
        message: 'Performance metrics retrieved successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to get performance metrics: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 🔒 Security Monitoring
   */
  @Get('security')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'การติดตามความปลอดภัยแบบเรียลไทม์',
    description: 'แสดงข้อมูลการติดตามความปลอดภัยและภัยคุกคามแบบเรียลไทม์',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลการติดตามความปลอดภัย',
  })
  async getSecurityMonitoring() {
    try {
      this.logger.log('🔒 Getting security monitoring');
      const security = await this.monitoringService.getSecurityMonitoring();

      return {
        success: true,
        data: security,
        message: 'Security monitoring retrieved successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to get security monitoring: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 📈 Business Metrics
   */
  @Get('business')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'เมตริกทางธุรกิจแบบเรียลไทม์',
    description: 'แสดงข้อมูลเมตริกทางธุรกิจและการขายแบบเรียลไทม์',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลเมตริกทางธุรกิจ',
  })
  async getBusinessMetrics() {
    try {
      this.logger.log('📈 Getting business metrics');
      const business = await this.monitoringService.getBusinessMetrics();

      return {
        success: true,
        data: business,
        message: 'Business metrics retrieved successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get business metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🚨 System Alerts
   */
  @Get('alerts')
  @Throttle({ default: { limit: 40, ttl: 60000 } }) // 40 requests per minute
  @ApiOperation({
    summary: 'การแจ้งเตือนระบบแบบเรียลไทม์',
    description: 'แสดงการแจ้งเตือนและปัญหาของระบบแบบเรียลไทม์',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลการแจ้งเตือนระบบ',
  })
  async getSystemAlerts() {
    try {
      this.logger.log('🚨 Getting system alerts');
      const alerts = await this.monitoringService.getSystemAlerts();

      return {
        success: true,
        data: alerts,
        alertCount: alerts.length,
        message: 'System alerts retrieved successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get system alerts: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📊 Complete Dashboard
   */
  @Get('dashboard')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'แดชบอร์ดการติดตามแบบเรียลไทม์',
    description: 'แสดงข้อมูลการติดตามทั้งหมดในหน้าเดียว',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลแดชบอร์ดการติดตามแบบเรียลไทม์',
  })
  async getCompleteDashboard() {
    try {
      this.logger.log('📊 Getting complete monitoring dashboard');

      const [health, performance, security, business, alerts] =
        await Promise.all([
          this.monitoringService.getSystemHealth(),
          this.monitoringService.getPerformanceMetrics(),
          this.monitoringService.getSecurityMonitoring(),
          this.monitoringService.getBusinessMetrics(),
          this.monitoringService.getSystemAlerts(),
        ]);

      return {
        success: true,
        data: {
          health,
          performance,
          security,
          business,
          alerts,
        },
        summary: {
          systemStatus: health.status,
          activeAlerts: alerts.length,
          onlineUsers: business.activity.onlineUsers,
          avgResponseTime: performance.api.responseTime.avg,
        },
        message: 'Complete monitoring dashboard retrieved successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to get complete dashboard: ${error.message}`,
      );
      throw error;
    }
  }
}

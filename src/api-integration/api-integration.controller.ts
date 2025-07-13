import { Controller, Get, Delete, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AnalyticsService } from '../analytics/analytics.service';
import { AuditService } from '../audit/audit.service';
import { PerformanceService } from '../common/services/performance.service';
import { CacheService } from '../common/services/cache.service';

@ApiTags('🔗 API Integration - รวมข้อมูล APIs')
@Controller('api-integration')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApiIntegrationController {
  private readonly logger = new Logger(ApiIntegrationController.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly auditService: AuditService,
    private readonly performanceService: PerformanceService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 📊 Dashboard Analytics Overview
   */
  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'Dashboard Analytics Overview',
    description: 'รวมข้อมูล Analytics สำหรับ Dashboard Frontend',
  })
  @ApiResponse({ status: 200, description: 'ดึงข้อมูล Dashboard สำเร็จ' })
  async getDashboardOverview() {
    try {
      const [analytics, performance, audit] = await Promise.all([
        this.getAnalyticsOverview(),
        this.getPerformanceOverview(),
        this.getAuditOverview(),
      ]);

      return {
        success: true,
        message: 'ดึงข้อมูล Dashboard สำเร็จ',
        data: {
          analytics,
          performance,
          audit,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard:', error);
      throw error;
    }
  }

  /**
   * 📈 Analytics Summary
   */
  @Get('analytics')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'Analytics Summary',
    description: 'สรุปข้อมูล Analytics ทั้งหมด',
  })
  @ApiResponse({ status: 200, description: 'ดึงข้อมูล Analytics สำเร็จ' })
  async getAnalyticsSummary() {
    try {
      const data = await this.getAnalyticsOverview();

      return {
        success: true,
        message: 'ดึงข้อมูล Analytics สำเร็จ',
        data,
      };
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงข้อมูล Analytics:', error);
      throw error;
    }
  }

  /**
   * ⚡ Performance Overview
   */
  @Get('performance')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'Performance Overview',
    description: 'สรุปข้อมูล Performance ระบบ',
  })
  @ApiResponse({ status: 200, description: 'ดึงข้อมูล Performance สำเร็จ' })
  async getPerformanceSummary() {
    try {
      const data = await this.getPerformanceOverview();

      return {
        success: true,
        message: 'ดึงข้อมูล Performance สำเร็จ',
        data,
      };
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงข้อมูล Performance:', error);
      throw error;
    }
  }

  /**
   * 🔍 Audit Overview
   */
  @Get('audit')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Audit Overview',
    description: 'สรุปข้อมูล Audit Logs',
  })
  @ApiResponse({ status: 200, description: 'ดึงข้อมูล Audit สำเร็จ' })
  async getAuditSummary() {
    try {
      const data = await this.getAuditOverview();

      return {
        success: true,
        message: 'ดึงข้อมูล Audit สำเร็จ',
        data,
      };
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงข้อมูล Audit:', error);
      throw error;
    }
  }

  /**
   * 🌐 System Overview
   */
  @Get('system')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'System Overview',
    description: 'สรุปข้อมูลระบบทั้งหมด',
  })
  @ApiResponse({ status: 200, description: 'ดึงข้อมูลระบบสำเร็จ' })
  async getSystemOverview() {
    try {
      const [analytics, performance, audit] = await Promise.all([
        this.getAnalyticsOverview(),
        this.getPerformanceOverview(),
        this.getAuditOverview(),
      ]);

      const systemHealth = this.calculateSystemHealth(performance);
      const endpoints = this.getAvailableEndpoints();

      return {
        success: true,
        message: 'ดึงข้อมูลระบบสำเร็จ',
        data: {
          health: systemHealth,
          analytics,
          performance,
          audit,
          endpoints,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงข้อมูลระบบ:', error);
      throw error;
    }
  }

  /**
   * 📋 Available Endpoints
   */
  @Get('endpoints')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'Available Endpoints',
    description: 'รายการ API Endpoints ที่ใช้งานได้',
  })
  @ApiResponse({ status: 200, description: 'ดึงรายการ Endpoints สำเร็จ' })
  async getEndpoints() {
    try {
      const endpoints = this.getAvailableEndpoints();

      return {
        success: true,
        message: 'ดึงรายการ Endpoints สำเร็จ',
        data: {
          endpoints,
          total: endpoints.length,
          categories: this.groupEndpointsByCategory(endpoints),
        },
      };
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงรายการ Endpoints:', error);
      throw error;
    }
  }

  /**
   * 🗑️ Clear All Cache
   */
  @Delete('cache')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Clear All Cache',
    description: 'ล้าง Cache ทั้งหมดของระบบ',
  })
  @ApiResponse({ status: 200, description: 'ล้าง Cache สำเร็จ' })
  async clearCache() {
    try {
      this.cacheService.clear();

      this.logger.log('✅ ล้าง Cache ทั้งหมดแล้ว');

      return {
        success: true,
        message: 'ล้าง Cache ทั้งหมดสำเร็จ',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการล้าง Cache:', error);
      throw error;
    }
  }

  // Private Methods
  private async getAnalyticsOverview() {
    try {
      const overview = {
        totalRevenue: 0,
        totalOrders: 0,
        totalUsers: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        popularSeats: [],
        revenueByZone: {},
        dailyStats: [],
        status: 'available',
      };

      return overview;
    } catch (error) {
      this.logger.warn('Analytics service not available:', error.message);
      return {
        totalRevenue: 0,
        totalOrders: 0,
        totalUsers: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        popularSeats: [],
        revenueByZone: {},
        dailyStats: [],
        status: 'service_unavailable',
      };
    }
  }

  private async getPerformanceOverview() {
    try {
      const startTime = Date.now();
      const currentTime = new Date();
      const responseTime = Date.now() - startTime;

      return {
        responseTime,
        throughput: 0,
        errorRate: 0,
        uptime: 100,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        cpuUsage: 0,
        activeConnections: 0,
        lastUpdated: currentTime.toISOString(),
        status: 'available',
      };
    } catch (error) {
      this.logger.warn('Performance service not available:', error.message);
      return {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        uptime: 100,
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0,
        lastUpdated: new Date().toISOString(),
        status: 'service_unavailable',
      };
    }
  }

  private async getAuditOverview() {
    try {
      return {
        totalLogs: 0,
        recentLogs: 0,
        lastActivity: null,
        topActions: [],
        topUsers: [],
        status: 'available',
      };
    } catch (error) {
      this.logger.warn('Audit service not available:', error.message);
      return {
        totalLogs: 0,
        recentLogs: 0,
        lastActivity: null,
        topActions: [],
        topUsers: [],
        status: 'service_unavailable',
      };
    }
  }

  private calculateSystemHealth(performance: any): string {
    const { responseTime, errorRate, uptime } = performance;

    if (errorRate > 5 || responseTime > 2000 || uptime < 95) {
      return 'critical';
    } else if (errorRate > 2 || responseTime > 1000 || uptime < 99) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  private getAvailableEndpoints() {
    return [
      {
        path: '/api/auth/login',
        method: 'POST',
        category: 'Authentication',
      },
      {
        path: '/api/auth/register',
        method: 'POST',
        category: 'Authentication',
      },
      {
        path: '/api/auth/profile',
        method: 'GET',
        category: 'Authentication',
      },
      {
        path: '/api/user',
        method: 'GET',
        category: 'User Management',
      },
      {
        path: '/api/user/:id',
        method: 'GET',
        category: 'User Management',
      },
      {
        path: '/api/user/:id',
        method: 'PATCH',
        category: 'User Management',
      },
      {
        path: '/api/order',
        method: 'GET',
        category: 'Order Management',
      },
      {
        path: '/api/order',
        method: 'POST',
        category: 'Order Management',
      },
      {
        path: '/api/order/:id',
        method: 'GET',
        category: 'Order Management',
      },
      {
        path: '/api/order/:id/cancel',
        method: 'PATCH',
        category: 'Order Management',
      },
      {
        path: '/api/seats/availability',
        method: 'GET',
        category: 'Seat Management',
      },
      {
        path: '/api/seats/:id/reserve',
        method: 'POST',
        category: 'Seat Management',
      },
      {
        path: '/api/seats/:id/release',
        method: 'POST',
        category: 'Seat Management',
      },
      {
        path: '/api/zone',
        method: 'GET',
        category: 'Zone Management',
      },
      {
        path: '/api/zone/:id',
        method: 'GET',
        category: 'Zone Management',
      },
      {
        path: '/api/payment/slip',
        method: 'POST',
        category: 'Payment',
      },
      {
        path: '/api/payment/verify',
        method: 'POST',
        category: 'Payment',
      },
      {
        path: '/api/analytics/revenue',
        method: 'GET',
        category: 'Analytics',
      },
      {
        path: '/api/analytics/orders',
        method: 'GET',
        category: 'Analytics',
      },
      {
        path: '/api/analytics/seats',
        method: 'GET',
        category: 'Analytics',
      },
      {
        path: '/api/staff',
        method: 'GET',
        category: 'Staff Management',
      },
      {
        path: '/api/staff',
        method: 'POST',
        category: 'Staff Management',
      },
      {
        path: '/api/staff/:id',
        method: 'GET',
        category: 'Staff Management',
      },
      {
        path: '/api/staff/:id',
        method: 'PATCH',
        category: 'Staff Management',
      },
      {
        path: '/api/staff/:id/status',
        method: 'PATCH',
        category: 'Staff Management',
      },
      {
        path: '/api/staff/summary',
        method: 'GET',
        category: 'Staff Management',
      },
      {
        path: '/api/api-integration/dashboard',
        method: 'GET',
        category: 'Integration',
      },
      {
        path: '/api/api-integration/analytics',
        method: 'GET',
        category: 'Integration',
      },
      {
        path: '/api/api-integration/performance',
        method: 'GET',
        category: 'Integration',
      },
      {
        path: '/api/api-integration/audit',
        method: 'GET',
        category: 'Integration',
      },
      {
        path: '/api/api-integration/system',
        method: 'GET',
        category: 'Integration',
      },
      {
        path: '/api/api-integration/endpoints',
        method: 'GET',
        category: 'Integration',
      },
      {
        path: '/api/api-integration/cache',
        method: 'DELETE',
        category: 'Integration',
      },
    ];
  }

  private groupEndpointsByCategory(endpoints: any[]) {
    return endpoints.reduce((acc, endpoint) => {
      const category = endpoint.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(endpoint);
      return acc;
    }, {});
  }
}

import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { success } from '../common/responses';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get main dashboard summary',
    description:
      'Retrieve comprehensive dashboard data including sales, orders, and occupancy',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboard(@Req() req: Request) {
    const data = await this.dashboardService.getDashboardData();
    return success(data, 'Dashboard summary', req);
  }

  @Get('/statistics')
  @ApiOperation({
    summary: 'Get detailed statistics',
    description: 'Get detailed statistics for today, week, and month',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(@Req() req: Request) {
    const data = await this.dashboardService.getStatistics();
    return success(data, 'Dashboard statistics', req);
  }

  @Get('/revenue-analytics')
  @ApiOperation({
    summary: 'Get revenue analytics',
    description: 'Analyze revenue trends over different time periods',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Time period for analysis (daily, weekly, monthly, yearly)',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue analytics retrieved successfully',
  })
  async getRevenueAnalytics(
    @Query('period') period: string = 'weekly',
    @Req() req: Request,
  ) {
    const data = await this.dashboardService.getRevenueAnalytics(period);
    return success(data, 'Revenue analytics', req);
  }

  @Get('/seat-occupancy')
  @ApiOperation({
    summary: 'Get seat occupancy data',
    description: 'Get seat occupancy information for a specific show date',
  })
  @ApiQuery({
    name: 'showDate',
    required: false,
    description: 'Show date in YYYY-MM-DD format (defaults to today)',
  })
  @ApiResponse({
    status: 200,
    description: 'Seat occupancy data retrieved successfully',
  })
  async getSeatOccupancy(
    @Query('showDate') showDate: string,
    @Req() req: Request,
  ) {
    const data = await this.dashboardService.getSeatOccupancy(showDate);
    return success(data, 'Seat occupancy data', req);
  }

  @Get('/performance-metrics')
  @ApiOperation({
    summary: 'Get performance metrics',
    description: 'Get system performance and conversion metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
  })
  async getPerformanceMetrics(@Req() req: Request) {
    const data = await this.dashboardService.getPerformanceMetrics();
    return success(data, 'Performance metrics', req);
  }

  @Get('/referrer-analytics')
  @ApiOperation({
    summary: 'Get referrer analytics',
    description: 'Analyze referrer performance and commission data',
  })
  @ApiResponse({
    status: 200,
    description: 'Referrer analytics retrieved successfully',
  })
  async getReferrerAnalytics(@Req() req: Request) {
    const data = await this.dashboardService.getReferrerAnalytics();
    return success(data, 'Referrer analytics', req);
  }

  @Get('/recent-activities')
  @ApiOperation({
    summary: 'Get recent activities',
    description: 'Get recent orders, payments, and system activities',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent activities retrieved successfully',
  })
  async getRecentActivities(@Req() req: Request) {
    const data = await this.dashboardService.getRecentActivities();
    return success(data, 'Recent activities', req);
  }

  @Get('/alerts')
  @ApiOperation({
    summary: 'Get system alerts',
    description: 'Get system alerts and notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'System alerts retrieved successfully',
  })
  async getAlerts(@Req() req: Request) {
    const data = await this.dashboardService.getAlerts();
    return success(data, 'System alerts', req);
  }
}

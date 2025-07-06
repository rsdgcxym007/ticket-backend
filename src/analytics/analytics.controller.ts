import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  UseGuards,
  Param,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import {
  GetDailySalesReportDto,
  GetMonthlySalesReportDto,
  GetDateRangeReportDto,
  GetReferrerReportDto,
  GetSeatUtilizationReportDto,
  GetRevenueReportDto,
  GetTopReferrersDto,
  GetPaymentMethodStatsDto,
  GetHourlyStatsDto,
  GetPerformanceMetricsDto,
  ExportReportDto,
  GetCustomReportDto,
} from './dto/analytics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * 📊 รายงานยอดขายรายวัน
   */
  @Get('daily-sales')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getDailySalesReport(@Query() query: GetDailySalesReportDto) {
    return {
      success: true,
      data: await this.analyticsService.getDailySalesReport(query.date),
    };
  }

  /**
   * 📊 รายงานยอดขายรายเดือน
   */
  @Get('monthly-sales')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getMonthlySalesReport(@Query() query: GetMonthlySalesReportDto) {
    return {
      success: true,
      data: await this.analyticsService.getMonthlySalesReport(
        Number(query.year),
        Number(query.month),
      ),
    };
  }

  /**
   * 📊 รายงานยอดขายตามช่วงวันที่
   */
  @Get('date-range-sales')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getDateRangeSalesReport(@Query() query: GetDateRangeReportDto) {
    return {
      success: true,
      data: await this.analyticsService.getDateRangeSalesReport(
        query.startDate,
        query.endDate,
      ),
    };
  }

  /**
   * 📊 รายงานผู้แนะนำ
   */
  @Get('referrer-report')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getReferrerReport(@Query() query: GetReferrerReportDto) {
    return {
      success: true,
      data: await this.analyticsService.getReferrerReport(
        query.startDate,
        query.endDate,
      ),
    };
  }

  /**
   * 📊 รายงานการใช้ที่นั่ง
   */
  @Get('seat-utilization')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getSeatUtilizationReport(@Query() query: GetSeatUtilizationReportDto) {
    return {
      success: true,
      data: await this.analyticsService.getSeatUtilizationReport(query.date),
    };
  }

  /**
   * 📊 รายงานรายได้
   */
  @Get('revenue')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getRevenueReport(@Query() query: GetRevenueReportDto) {
    return {
      success: true,
      data: await this.analyticsService.getRevenueReport(
        query.startDate,
        query.endDate,
        query.paymentMethod,
        query.orderStatus,
      ),
    };
  }

  /**
   * 📊 ผู้แนะนำที่ดีที่สุด
   */
  @Get('top-referrers')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getTopReferrers(@Query() query: GetTopReferrersDto) {
    return {
      success: true,
      data: await this.analyticsService.getTopReferrers(
        query.limit,
        query.startDate,
        query.endDate,
      ),
    };
  }

  /**
   * 📊 สถิติวิธีการชำระเงิน
   */
  @Get('payment-methods')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getPaymentMethodStats(@Query() query: GetPaymentMethodStatsDto) {
    return {
      success: true,
      data: await this.analyticsService.getPaymentMethodStats(
        query.startDate,
        query.endDate,
      ),
    };
  }

  /**
   * 📊 สถิติรายชั่วโมง
   */
  @Get('hourly-stats')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getHourlyStats(@Query() query: GetHourlyStatsDto) {
    return {
      success: true,
      data: await this.analyticsService.getHourlyStats(query.date),
    };
  }

  /**
   * 📊 เมตริกการประสิทธิภาพ
   */
  @Get('performance-metrics')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getPerformanceMetrics(@Query() query: GetPerformanceMetricsDto) {
    return {
      success: true,
      data: await this.analyticsService.getPerformanceMetrics(
        query.startDate,
        query.endDate,
      ),
    };
  }

  /**
   * 📊 สถิติเรียลไทม์
   */
  @Get('real-time-stats')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getRealTimeStats() {
    return {
      success: true,
      data: await this.analyticsService.getRealTimeStats(),
    };
  }

  /**
   * 📊 รายงานแบบกำหนดเอง
   */
  @Post('custom-report')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getCustomReport(@Body() dto: GetCustomReportDto) {
    return {
      success: true,
      data: await this.analyticsService.getCustomReport(dto),
    };
  }

  /**
   * 📊 ส่งออกรายงาน
   */
  @Post('export')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async exportReport(@Body() dto: ExportReportDto, @Res() res: Response) {
    const buffer = await this.analyticsService.exportReport(dto);

    const filename = `${dto.reportType}_${dto.startDate}_${dto.endDate}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /**
   * 📊 ดาวน์โหลดรายงาน PDF
   */
  @Get('download/:reportType/:date')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async downloadReport(
    @Param('reportType') reportType: string,
    @Param('date') date: string,
    @Res() res: Response,
  ) {
    const buffer = await this.analyticsService.generatePDFReport(
      reportType,
      date,
    );

    const filename = `${reportType}_${date}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}

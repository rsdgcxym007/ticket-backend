import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { success } from '../common/responses';

@ApiTags('Dashboard - แดชบอร์ดจัดการระบบตั๋ว')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'แดชบอร์ดหลักแบบใหม่ - ข้อมูลครบถ้วน',
    description:
      'ข้อมูลสรุปยอดขาย ยอดรายได้ ผลงาน Referrer ที่นั่งว่าง ลูกค้า และสถานะระบบ',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลแดชบอร์ดหลักทั้งหมด',
  })
  async getDashboard(@Req() req: Request) {
    const data = await this.dashboardService.getDashboardSummary();
    return success(data, 'ข้อมูลแดชบอร์ดหลักแบบใหม่', req);
  }

  @Get('/referrer-performance')
  @ApiOperation({
    summary: 'ผลงาน Referrer วันนี้',
    description: 'ยอดออเดอร์ ค่าคอมมิชชั่น และข้อมูลการแนะนำของวันนี้',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลผลงาน Referrer',
  })
  async getTodayReferrerPerformance(@Req() req: Request) {
    const data = await this.dashboardService.getTodayReferrerPerformance();
    return success(data, 'ผลงาน Referrer วันนี้', req);
  }

  @Get('/all-referrers')
  @ApiOperation({
    summary: 'ผลงาน Referrer ทั้งหมด',
    description: 'ยอดออเดอร์ ค่าคอมมิชชั่น และข้อมูลการแนะนำทั้งหมด',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลผลงาน Referrer ทั้งหมด',
  })
  async getAllReferrerPerformance(@Req() req: Request) {
    const data = await this.dashboardService.getReferrerPerformance();
    return success(data, 'ผลงาน Referrer ทั้งหมด', req);
  }

  @Get('/ticket-sales')
  @ApiOperation({
    summary: 'สรุปยอดขายตั๋ว',
    description: 'ยอดขายตั๋วแบ่งตามวัน สัปดาห์ เดือน และทั้งหมด',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลสรุปยอดขายตั๋ว',
  })
  async getTicketSalesSummary(@Req() req: Request) {
    const data = await this.dashboardService.getTicketSalesSummary();
    return success(data, 'สรุปยอดขายตั๋ว', req);
  }

  @Get('/revenue-summary')
  @ApiOperation({
    summary: 'สรุปยอดรายได้',
    description: 'ยอดรายได้รวม ยอดสุทธิ ค่าคอมมิชชั่น แบ่งตามช่วงเวลา',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลสรุปยอดรายได้',
  })
  async getRevenueSummary(@Req() req: Request) {
    const data = await this.dashboardService.getRevenueSummary();
    return success(data, 'สรุปยอดรายได้', req);
  }

  @Get('/seat-availability')
  @ApiOperation({
    summary: 'ที่นั่งว่างแต่ละโซน',
    description:
      'จำนวนที่นั่งว่าง จองแล้ว แต่ละโซน (กรองที่นั่ง seatNumber เป็น null)',
  })
  @ApiQuery({
    name: 'showDate',
    required: false,
    description: 'วันที่แสดง (YYYY-MM-DD) ถ้าไม่ระบุจะใช้วันนี้',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลที่นั่งว่างแต่ละโซน',
  })
  async getSeatAvailability(
    @Query('showDate') showDate?: string,
    @Req() req?: Request,
  ) {
    const data =
      await this.dashboardService.getSeatAvailabilityByZone(showDate);
    return success(data, 'ข้อมูลที่นั่งว่างแต่ละโซน', req);
  }

  @Get('/customer-analytics')
  @ApiOperation({
    summary: 'วิเคราะห์ลูกค้า',
    description: 'จำนวนลูกค้าใหม่ ลูกค้าประจำ อัตราการกลับมาซื้อ',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลวิเคราะห์ลูกค้า',
  })
  async getCustomerAnalytics(@Req() req: Request) {
    const data = await this.dashboardService.getCustomerAnalytics();
    return success(data, 'วิเคราะห์ลูกค้า', req);
  }

  @Get('/system-health')
  @ApiOperation({
    summary: 'สถานะระบบและการแจ้งเตือน',
    description:
      'ออเดอร์รอชำระ หมดอายุ โซนที่นั่งเหลือน้อย และการแจ้งเตือนต่างๆ',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลสถานะระบบ',
  })
  async getSystemHealth(@Req() req: Request) {
    const data = await this.dashboardService.getSystemHealth();
    return success(data, 'สถานะระบบและการแจ้งเตือน', req);
  }

  @Get('/quick-stats')
  @ApiOperation({
    summary: 'สถิติด่วน',
    description: 'ข้อมูลสำคัญที่ต้องดูทันที - ออเดอร์วันนี้ อัตราความสำเร็จ',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลสถิติด่วน',
  })
  async getQuickStats(@Req() req: Request) {
    const data = await this.dashboardService.getQuickStats();
    return success(data, 'สถิติด่วน', req);
  }
}

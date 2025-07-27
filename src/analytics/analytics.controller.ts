import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ThailandTimeHelper } from '../common/utils/thailand-time.helper';
import { UserRole, PaymentMethod, OrderStatus } from '../common/enums';

@ApiTags('📊 Analytics - วิเคราะห์ข้อมูล')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * 📊 รายงานยอดขายรายวัน
   */
  @Get('sales/daily')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'รายงานยอดขายรายวัน',
    description:
      'รายงานสรุปยอดขายของวันที่ระบุ รวมถึงรายละเอียดการจำแนกตามหมวดหมู่ต่างๆ',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'วันที่ต้องการดูรายงาน (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @ApiResponse({
    status: 200,
    description: 'รายงานยอดขายรายวัน',
  })
  async getDailySalesReport(@Query('date') date?: string) {
    const targetDate =
      date || ThailandTimeHelper.format(ThailandTimeHelper.now(), 'YYYY-MM-DD');

    try {
      this.logger.log(`📊 สร้างรายงานยอดขายรายวัน: ${targetDate}`);
      return await this.analyticsService.getDailySalesReport(targetDate);
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการสร้างรายงานยอดขายรายวัน:', error);
      throw new BadRequestException('ไม่สามารถสร้างรายงานยอดขายรายวันได้');
    }
  }

  /**
   * 📈 รายงานยอดขายรายเดือน
   */
  @Get('sales/monthly')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'รายงานยอดขายรายเดือน',
    description: 'รายงานสรุปยอดขายของเดือนที่ระบุ พร้อมการวิเคราะห์แบบรายวัน',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'ปีที่ต้องการดูรายงาน (YYYY)',
    example: 2024,
  })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'เดือนที่ต้องการดูรายงาน (1-12)',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'รายงานยอดขายรายเดือน',
  })
  async getMonthlySalesReport(
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    const currentDate = ThailandTimeHelper.now();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || currentDate.getMonth() + 1;

    if (targetMonth < 1 || targetMonth > 12) {
      throw new BadRequestException('กรุณาระบุเดือนให้ถูกต้อง (1-12)');
    }

    try {
      this.logger.log(
        `📈 สร้างรายงานยอดขายรายเดือน: ${targetYear}-${targetMonth}`,
      );
      return await this.analyticsService.getMonthlySalesReport(
        targetYear,
        targetMonth,
      );
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการสร้างรายงานยอดขายรายเดือน:', error);
      throw new BadRequestException('ไม่สามารถสร้างรายงานยอดขายรายเดือนได้');
    }
  }

  /**
   * 👥 รายงานผู้แนะนำ
   */
  @Get('referrers')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'รายงานผู้แนะนำ',
    description: 'รายงานสรุปผลการดำเนินงานของผู้แนะนำในช่วงเวลาที่ระบุ',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'วันที่เริ่มต้น (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'วันที่สิ้นสุด (YYYY-MM-DD)',
    example: '2024-01-31',
  })
  @ApiResponse({
    status: 200,
    description: 'รายงานผู้แนะนำ',
  })
  async getReferrerReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const currentDate = ThailandTimeHelper.now();
    const defaultStart = ThailandTimeHelper.format(
      ThailandTimeHelper.startOfMonth(currentDate),
      'YYYY-MM-DD',
    );
    const defaultEnd = ThailandTimeHelper.format(currentDate, 'YYYY-MM-DD');

    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    try {
      this.logger.log(`👥 สร้างรายงานผู้แนะนำ: ${start} - ${end}`);
      return await this.analyticsService.getReferrerReport(start, end);
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการสร้างรายงานผู้แนะนำ:', error);
      throw new BadRequestException('ไม่สามารถสร้างรายงานผู้แนะนำได้');
    }
  }

  /**
   * 💺 รายงานการใช้งานที่นั่ง
   */
  @Get('seats/utilization')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'รายงานการใช้งานที่นั่ง',
    description: 'รายงานสรุปการใช้งานที่นั่งของวันที่ระบุ',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'วันที่ต้องการดูรายงาน (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @ApiResponse({
    status: 200,
    description: 'รายงานการใช้งานที่นั่ง',
  })
  async getSeatUtilizationReport(@Query('date') date?: string) {
    const targetDate =
      date || ThailandTimeHelper.format(ThailandTimeHelper.now(), 'YYYY-MM-DD');

    try {
      this.logger.log(`💺 สร้างรายงานการใช้งานที่นั่ง: ${targetDate}`);
      return await this.analyticsService.getSeatUtilizationReport(targetDate);
    } catch (error) {
      this.logger.error(
        'เกิดข้อผิดพลาดในการสร้างรายงานการใช้งานที่นั่ง:',
        error,
      );
      throw new BadRequestException('ไม่สามารถสร้างรายงานการใช้งานที่นั่งได้');
    }
  }

  /**
   * 📊 สถิติแบบ Real-time
   */
  @Get('realtime')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'สถิติแบบ Real-time',
    description: 'สถิติปัจจุบันของระบบที่อัปเดตแบบ Real-time',
  })
  @ApiResponse({
    status: 200,
    description: 'สถิติแบบ Real-time',
  })
  async getRealtimeStats() {
    try {
      this.logger.log('📊 ดึงสถิติแบบ Real-time');
      return await this.analyticsService.getRealtimeStats();
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการดึงสถิติแบบ Real-time:', error);
      throw new BadRequestException('ไม่สามารถดึงสถิติแบบ Real-time ได้');
    }
  }

  /**
   * 📈 เปรียบเทียบยอดขายรายสัปดาห์
   */
  @Get('sales/weekly-comparison')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'เปรียบเทียบยอดขายรายสัปดาห์',
    description: 'เปรียบเทียบยอดขายของสัปดาห์ปัจจุบันกับสัปดาห์ที่แล้ว',
  })
  @ApiResponse({
    status: 200,
    description: 'เปรียบเทียบยอดขายรายสัปดาห์',
  })
  async getWeeklyComparison() {
    try {
      this.logger.log('📈 เปรียบเทียบยอดขายรายสัปดาห์');
      return await this.analyticsService.getWeeklyComparison();
    } catch (error) {
      this.logger.error(
        'เกิดข้อผิดพลาดในการเปรียบเทียบยอดขายรายสัปดาห์:',
        error,
      );
      throw new BadRequestException('ไม่สามารถเปรียบเทียบยอดขายรายสัปดาห์ได้');
    }
  }

  /**
   * 📊 รายงานยอดขายตามช่วงวันที่
   */
  @Get('sales/date-range')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'รายงานยอดขายตามช่วงวันที่',
    description: 'รายงานยอดขายรายละเอียดตามช่วงวันที่ที่ระบุ',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'วันที่เริ่มต้น (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'วันที่สิ้นสุด (YYYY-MM-DD)',
    example: '2024-01-31',
  })
  @ApiResponse({
    status: 200,
    description: 'รายงานยอดขายตามช่วงวันที่',
  })
  async getDateRangeSalesReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'กรุณาระบุวันที่เริ่มต้นและวันที่สิ้นสุดให้ครบถ้วน',
      );
    }

    try {
      this.logger.log(
        `📊 สร้างรายงานยอดขายตามช่วงวันที่: ${startDate} - ${endDate}`,
      );
      return await this.analyticsService.getDateRangeSalesReport(
        startDate,
        endDate,
      );
    } catch (error) {
      this.logger.error(
        'เกิดข้อผิดพลาดในการสร้างรายงานยอดขายตามช่วงวันที่:',
        error,
      );
      throw new BadRequestException(
        'ไม่สามารถสร้างรายงานยอดขายตามช่วงวันที่ได้',
      );
    }
  }

  /**
   * 📊 รายงานรายได้แบบละเอียด
   */
  @Get('revenue/detailed')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'รายงานรายได้แบบละเอียด',
    description: 'รายงานรายได้รายละเอียดพร้อมการกรองตามเงื่อนไขต่างๆ',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'วันที่เริ่มต้น (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'วันที่สิ้นสุด (YYYY-MM-DD)',
    example: '2024-01-31',
  })
  @ApiQuery({
    name: 'paymentMethod',
    required: false,
    description: 'วิธีชำระเงิน',
    enum: PaymentMethod,
    example: PaymentMethod.CREDIT_CARD,
  })
  @ApiQuery({
    name: 'orderStatus',
    required: false,
    description: 'สถานะออเดอร์',
    enum: OrderStatus,
    example: OrderStatus.PAID,
  })
  @ApiResponse({
    status: 200,
    description: 'รายงานรายได้แบบละเอียด',
  })
  async getDetailedRevenueReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('paymentMethod') paymentMethod?: PaymentMethod,
    @Query('orderStatus') orderStatus?: OrderStatus,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('กรุณาระบุวันที่เริ่มต้นและวันที่สิ้นสุด');
    }

    try {
      this.logger.log(
        `📊 สร้างรายงานรายได้แบบละเอียด: ${startDate} - ${endDate}`,
      );
      return await this.analyticsService.getRevenueReport(
        startDate,
        endDate,
        paymentMethod,
        orderStatus,
      );
    } catch (error) {
      this.logger.error(
        'เกิดข้อผิดพลาดในการสร้างรายงานรายได้แบบละเอียด:',
        error,
      );
      throw new BadRequestException('ไม่สามารถสร้างรายงานรายได้แบบละเอียดได้');
    }
  }
}

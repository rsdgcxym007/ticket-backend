import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Query,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { QRCodeService } from '../common/services/qr-code.service';
import {
  ScanQRCodeDto,
  BulkScanDto,
  ScanHistoryDto,
  ScanStatsDto,
} from './dto/mobile-scanner.dto';

@ApiTags('📱 Mobile Scanner API')
@Controller('api/v1/mobile/scanner')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MobileScannerController {
  private readonly logger = new Logger(MobileScannerController.name);

  constructor(private readonly qrCodeService: QRCodeService) {}

  /**
   * 📱 สแกน QR Code ด้วย Mobile App
   */
  @Post('scan')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'สแกน QR Code ด้วย Mobile App',
    description: 'ใช้สำหรับ Staff สแกน QR Code เพื่อตรวจสอบตั๋ว',
  })
  @ApiResponse({
    status: 200,
    description: 'สแกนสำเร็จ',
    schema: {
      example: {
        success: true,
        data: {
          orderId: 'ORD-20250811-001',
          isValid: true,
          attendanceStatus: 'checked_in',
          customerName: 'John Doe',
          ticketType: 'seated',
          seats: ['A1', 'A2'],
        },
        message: 'เช็คอินสำเร็จ',
        timestamp: '2025-08-11T14:30:00.000Z',
      },
    },
  })
  async scanQRCode(@Body() scanDto: ScanQRCodeDto, @Req() req: any) {
    try {
      const staffId = req.user.id;
      const staffName = req.user.name || 'Unknown Staff';

      this.logger.log(
        `📱 Staff ${staffName} กำลังสแกน QR Code: ${scanDto.qrData.substring(0, 20)}...`,
      );

      // ตรวจสอบ QR Code
      const validation = await this.qrCodeService.validateQRCode(
        scanDto.qrData,
      );

      if (!validation.isValid) {
        this.logger.warn(
          `❌ QR Code ไม่ถูกต้อง - Staff: ${staffName}, Error: ${validation.error}`,
        );
        return {
          success: false,
          data: null,
          message: validation.error || 'QR Code ไม่ถูกต้อง',
          timestamp: new Date().toISOString(),
        };
      }

      // บันทึกประวัติการสแกน
      const scanRecord = {
        orderId: validation.data?.orderId,
        staffId,
        staffName,
        scanTime: new Date(),
        location: scanDto.location || 'Unknown',
        deviceId: scanDto.deviceId || 'Unknown',
        scanResult: 'success',
      };

      this.logger.log(
        `✅ เช็คอินสำเร็จ - Order: ${validation.data?.orderId}, Staff: ${staffName}`,
      );

      return {
        success: true,
        data: {
          orderId: validation.data?.orderId,
          isValid: true,
          attendanceStatus: 'checked_in',
          ticketType: validation.data?.ticketType,
          seats: validation.data?.seats,
          amount: validation.data?.amount,
          showDate: validation.data?.showDate,
          validUntil: validation.data?.validUntil,
        },
        message: 'เช็คอินสำเร็จ',
        timestamp: new Date().toISOString(),
        scanRecord,
      };
    } catch (error) {
      this.logger.error(`❌ เกิดข้อผิดพลาดในการสแกน QR Code: ${error.message}`);
      throw new HttpException(
        'เกิดข้อผิดพลาดในการสแกน QR Code',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 📱 สแกนหลาย QR Code พร้อมกัน (Bulk Scan)
   */
  @Post('bulk-scan')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'สแกนหลาย QR Code พร้อมกัน',
    description: 'ใช้สำหรับสแกน QR Code หลายอันพร้อมกัน',
  })
  async bulkScanQRCodes(@Body() bulkScanDto: BulkScanDto, @Req() req: any) {
    try {
      const staffId = req.user.id;
      const staffName = req.user.name || 'Unknown Staff';
      const results = [];

      this.logger.log(
        `📱 Staff ${staffName} กำลังสแกนหลาย QR Code จำนวน ${bulkScanDto.qrCodes.length} อัน`,
      );

      for (const qrData of bulkScanDto.qrCodes) {
        try {
          const validation = await this.qrCodeService.validateQRCode(qrData);
          results.push({
            qrData: qrData.substring(0, 20) + '...',
            isValid: validation.isValid,
            orderId: validation.data?.orderId,
            error: validation.error,
          });
        } catch (error) {
          results.push({
            qrData: qrData.substring(0, 20) + '...',
            isValid: false,
            error: error.message,
          });
        }
      }

      const successCount = results.filter((r) => r.isValid).length;
      const failCount = results.length - successCount;

      this.logger.log(
        `📊 Bulk scan เสร็จ - สำเร็จ: ${successCount}, ล้มเหลว: ${failCount}`,
      );

      return {
        success: true,
        data: {
          totalScanned: results.length,
          successCount,
          failCount,
          results,
        },
        message: `สแกนเสร็จ ${successCount}/${results.length} อัน`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ เกิดข้อผิดพลาดใน bulk scan: ${error.message}`);
      throw new HttpException(
        'เกิดข้อผิดพลาดใน bulk scan',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 📊 สถิติการสแกนของ Staff
   */
  @Get('stats')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'สถิติการสแกนของ Staff',
    description: 'ดูสถิติการสแกน QR Code ของ Staff',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'วันที่เริ่มต้น (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'วันที่สิ้นสุด (YYYY-MM-DD)',
  })
  async getScanStats(@Query() query: ScanStatsDto, @Req() req: any) {
    try {
      const staffId = req.user.id;
      const staffName = req.user.name || 'Unknown Staff';

      this.logger.log(`📊 ดึงสถิติการสแกนสำหรับ Staff: ${staffName}`);

      // Mock data สำหรับ demo (ในระบบจริงจะดึงจาก database)
      const mockStats = {
        staffId,
        staffName,
        period: {
          startDate: query.startDate || new Date().toISOString().split('T')[0],
          endDate: query.endDate || new Date().toISOString().split('T')[0],
        },
        totals: {
          totalScans: 125,
          successfulScans: 118,
          failedScans: 7,
          uniqueOrders: 112,
          duplicateScans: 6,
        },
        dailyStats: [
          {
            date: '2025-08-11',
            scans: 45,
            successful: 42,
            failed: 3,
          },
          {
            date: '2025-08-10',
            scans: 38,
            successful: 36,
            failed: 2,
          },
        ],
        hourlyDistribution: {
          '09:00': 5,
          '10:00': 12,
          '11:00': 18,
          '12:00': 22,
          '13:00': 25,
          '14:00': 20,
          '15:00': 15,
          '16:00': 8,
        },
      };

      return {
        success: true,
        data: mockStats,
        message: 'ดึงสถิติการสแกนสำเร็จ',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ เกิดข้อผิดพลาดในการดึงสถิติ: ${error.message}`);
      throw new HttpException(
        'เกิดข้อผิดพลาดในการดึงสถิติ',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 📋 ประวัติการสแกนของ Staff
   */
  @Get('history')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'ประวัติการสแกนของ Staff',
    description: 'ดูประวัติการสแกน QR Code ของ Staff',
  })
  async getScanHistory(@Query() query: ScanHistoryDto, @Req() req: any) {
    try {
      const staffId = req.user.id;
      const staffName = req.user.name || 'Unknown Staff';

      this.logger.log(`📋 ดึงประวัติการสแกนสำหรับ Staff: ${staffName}`);

      // Mock data สำหรับ demo
      const mockHistory = {
        staffId,
        staffName,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 20,
          total: 125,
          totalPages: 7,
        },
        scans: [
          {
            id: 'scan-001',
            orderId: 'ORD-20250811-001',
            scanTime: '2025-08-11T14:30:00.000Z',
            result: 'success',
            location: 'Main Gate',
            deviceId: 'mobile-001',
          },
          {
            id: 'scan-002',
            orderId: 'ORD-20250811-002',
            scanTime: '2025-08-11T14:28:00.000Z',
            result: 'success',
            location: 'Main Gate',
            deviceId: 'mobile-001',
          },
          {
            id: 'scan-003',
            orderId: null,
            scanTime: '2025-08-11T14:25:00.000Z',
            result: 'failed',
            error: 'Invalid QR Code format',
            location: 'Main Gate',
            deviceId: 'mobile-001',
          },
        ],
      };

      return {
        success: true,
        data: mockHistory,
        message: 'ดึงประวัติการสแกนสำเร็จ',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ เกิดข้อผิดพลาดในการดึงประวัติ: ${error.message}`);
      throw new HttpException(
        'เกิดข้อผิดพลาดในการดึงประวัติ',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 🔄 ซิงค์ข้อมูลออฟไลน์
   */
  @Post('sync')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'ซิงค์ข้อมูลออฟไลน์',
    description: 'ซิงค์ข้อมูลการสแกนที่เก็บไว้ออฟไลน์',
  })
  async syncOfflineData(@Body() syncData: any, @Req() req: any) {
    try {
      const staffId = req.user.id;
      const staffName = req.user.name || 'Unknown Staff';

      this.logger.log(`🔄 ซิงค์ข้อมูลออฟไลน์สำหรับ Staff: ${staffName}`);

      // จำลองการซิงค์ข้อมูล
      const syncResult = {
        staffId,
        totalRecords: syncData.records?.length || 0,
        syncedRecords: syncData.records?.length || 0,
        failedRecords: 0,
        conflicts: 0,
        lastSyncTime: new Date().toISOString(),
      };

      return {
        success: true,
        data: syncResult,
        message: 'ซิงค์ข้อมูลสำเร็จ',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ เกิดข้อผิดพลาดในการซิงค์ข้อมูล: ${error.message}`);
      throw new HttpException(
        'เกิดข้อผิดพลาดในการซิงค์ข้อมูล',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

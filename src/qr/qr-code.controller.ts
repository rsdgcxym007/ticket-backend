import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import {
  QRCodeService,
  QRValidationResult,
} from '../common/services/qr-code.service';
import {
  CreateQRCodeDto,
  ValidateQRCodeDto,
  QRCodeStatsDto,
} from './dto/qr-code.dto';

@ApiTags('🎫 QR Code Management')
@Controller('api/v1/qr')
export class QRCodeController {
  private readonly logger = new Logger(QRCodeController.name);

  constructor(private readonly qrCodeService: QRCodeService) {}

  /**
   * 🎫 สร้าง QR Code สำหรับตั๋ว
   */
  @Post('generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'สร้าง QR Code สำหรับตั๋ว',
    description: 'สร้าง QR Code ที่ปลอดภัยสำหรับตั๋วที่ชำระเงินแล้ว',
  })
  @ApiResponse({
    status: 201,
    description: 'สร้าง QR Code สำเร็จ',
    schema: {
      example: {
        success: true,
        statusCode: 201,
        message: 'สร้าง QR Code สำเร็จ',
        data: {
          qrCodeImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          qrData: {
            orderId: 'ORD-20250811-001',
            userId: 'user-uuid',
            showDate: '2025-08-15T19:00:00.000Z',
            seats: ['A1', 'A2'],
            amount: 3000,
            ticketType: 'seated',
            validUntil: '2025-08-22T19:00:00.000Z',
            securityHash: 'abc123...',
          },
        },
        timestamp: '2025-08-11T14:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ข้อมูลไม่ถูกต้อง',
  })
  @ApiResponse({
    status: 401,
    description: 'ไม่มีสิทธิ์เข้าใช้งาน',
  })
  async generateQRCode(@Body() createQRCodeDto: CreateQRCodeDto) {
    try {
      const result = await this.qrCodeService.generateTicketQR(
        createQRCodeDto.orderId,
        createQRCodeDto.userId,
        createQRCodeDto.showDate,
        createQRCodeDto.seats,
        createQRCodeDto.amount,
        createQRCodeDto.ticketType,
        createQRCodeDto.options,
      );

      this.logger.log(
        `✅ สร้าง QR Code สำเร็จ สำหรับออเดอร์ ${createQRCodeDto.orderId}`,
      );

      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'สร้าง QR Code สำเร็จ',
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการสร้าง QR Code: ${error.message}`,
      );
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'ไม่สามารถสร้าง QR Code ได้',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 🔍 ตรวจสอบ QR Code
   */
  @Post('validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 validations per minute
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'ตรวจสอบ QR Code',
    description: 'ตรวจสอบความถูกต้องของ QR Code สำหรับการเข้างาน',
  })
  @ApiResponse({
    status: 200,
    description: 'ตรวจสอบ QR Code สำเร็จ',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'ตรวจสอบ QR Code สำเร็จ',
        data: {
          isValid: true,
          data: {
            orderId: 'ORD-20250811-001',
            userId: 'user-uuid',
            showDate: '2025-08-15T19:00:00.000Z',
            seats: ['A1', 'A2'],
            amount: 3000,
            ticketType: 'seated',
          },
          timestamp: '2025-08-11T14:30:00.000Z',
        },
        timestamp: '2025-08-11T14:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'QR Code ไม่ถูกต้อง',
  })
  async validateQRCode(@Body() validateQRCodeDto: ValidateQRCodeDto) {
    try {
      const result: QRValidationResult =
        await this.qrCodeService.validateQRCode(validateQRCodeDto.qrData);

      const statusCode = result.isValid
        ? HttpStatus.OK
        : HttpStatus.BAD_REQUEST;
      const message = result.isValid
        ? 'ตรวจสอบ QR Code สำเร็จ'
        : 'QR Code ไม่ถูกต้อง';

      if (result.isValid) {
        this.logger.log(
          `✅ QR Code ถูกต้อง สำหรับออเดอร์ ${result.data?.orderId}`,
        );
      } else {
        this.logger.warn(`⚠️ QR Code ไม่ถูกต้อง: ${result.error}`);
      }

      return {
        success: result.isValid,
        statusCode,
        message,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการตรวจสอบ QR Code: ${error.message}`,
      );
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'ไม่สามารถตรวจสอบ QR Code ได้',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 📊 สถิติการใช้งาน QR Code
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'สถิติการใช้งาน QR Code',
    description: 'รายงานสถิติการสร้างและการสแกน QR Code',
  })
  @ApiResponse({
    status: 200,
    description: 'ดึงข้อมูลสถิติสำเร็จ',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'ดึงข้อมูลสถิติสำเร็จ',
        data: {
          totalGenerated: 150,
          totalScanned: 120,
          successfulScans: 110,
          failedScans: 10,
          scansByDate: [],
          scansByLocation: [],
        },
        timestamp: '2025-08-11T14:30:00.000Z',
      },
    },
  })
  async getQRCodeStats(@Query() _query: QRCodeStatsDto) {
    try {
      const stats = await this.qrCodeService.getQRCodeStats();

      this.logger.log('📊 ดึงข้อมูลสถิติ QR Code สำเร็จ');

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'ดึงข้อมูลสถิติสำเร็จ',
        data: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ: ${error.message}`,
      );
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'ไม่สามารถดึงข้อมูลสถิติได้',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 🎨 สร้าง QR Code หลายรูปแบบ
   */
  @Post('generate-formats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'สร้าง QR Code หลายรูปแบบ',
    description: 'สร้าง QR Code ในรูปแบบต่างๆ (PNG, SVG)',
  })
  @ApiResponse({
    status: 201,
    description: 'สร้าง QR Code หลายรูปแบบสำเร็จ',
  })
  async generateMultipleFormats(
    @Body() body: { data: string; formats?: Array<'png' | 'svg'> },
  ) {
    try {
      const { data, formats = ['png'] } = body;
      const results = await this.qrCodeService.generateMultipleFormats(
        data,
        formats,
      );

      this.logger.log(
        `✅ สร้าง QR Code หลายรูปแบบสำเร็จ: ${formats.join(', ')}`,
      );

      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'สร้าง QR Code หลายรูปแบบสำเร็จ',
        data: results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการสร้าง QR Code หลายรูปแบบ: ${error.message}`,
      );
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'ไม่สามารถสร้าง QR Code หลายรูปแบบได้',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 🔍 ตรวจสอบ QR Code สำหรับ Public (ไม่ต้อง login)
   */
  @Post('public/validate')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 public validations per minute
  @ApiOperation({
    summary: 'ตรวจสอบ QR Code (Public)',
    description: 'ตรวจสอบความถูกต้องของ QR Code โดยไม่ต้อง login',
  })
  @ApiResponse({
    status: 200,
    description: 'ตรวจสอบ QR Code สำเร็จ',
  })
  async validateQRCodePublic(@Body() validateQRCodeDto: ValidateQRCodeDto) {
    try {
      const result: QRValidationResult =
        await this.qrCodeService.validateQRCode(validateQRCodeDto.qrData);

      // ไม่แสดงข้อมูลละเอียดใน public endpoint
      const sanitizedResult = {
        isValid: result.isValid,
        error: result.error,
        timestamp: result.timestamp,
        // ไม่ส่ง sensitive data
        basicInfo: result.isValid
          ? {
              orderId: result.data?.orderId,
              showDate: result.data?.showDate,
              ticketType: result.data?.ticketType,
            }
          : null,
      };

      const statusCode = result.isValid
        ? HttpStatus.OK
        : HttpStatus.BAD_REQUEST;
      const message = result.isValid ? 'QR Code ถูกต้อง' : 'QR Code ไม่ถูกต้อง';

      this.logger.log(
        `🔍 Public QR validation: ${result.isValid ? 'Valid' : 'Invalid'}`,
      );

      return {
        success: result.isValid,
        statusCode,
        message,
        data: sanitizedResult,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการตรวจสอบ QR Code (Public): ${error.message}`,
      );
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'ไม่สามารถตรวจสอบ QR Code ได้',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

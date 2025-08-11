import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  Param,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { EmailAutomationService } from './email-automation.service';
import {
  SendTicketEmailDto,
  SendBulkEmailDto,
  EmailTemplateDto,
  EmailStatsDto,
} from './dto/email-automation.dto';

@ApiTags('📧 Email Automation')
@Controller('api/v1/email')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmailAutomationController {
  private readonly logger = new Logger(EmailAutomationController.name);

  constructor(private readonly emailService: EmailAutomationService) {}

  /**
   * 📧 ส่งตั๋ว QR Code ทาง Email
   */
  @Post('send-ticket')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'ส่งตั๋ว QR Code ทาง Email',
    description: 'ส่งตั๋วพร้อม QR Code ให้ลูกค้าทาง email อัตโนมัติ',
  })
  @ApiResponse({
    status: 200,
    description: 'ส่ง email สำเร็จ',
    schema: {
      example: {
        success: true,
        data: {
          messageId: 'email-msg-001',
          orderId: 'ORD-20250811-001',
          recipientEmail: 'customer@example.com',
          sentAt: '2025-08-11T14:30:00.000Z',
        },
        message: 'ส่งตั๋วทาง email สำเร็จ',
      },
    },
  })
  async sendTicketEmail(@Body() sendTicketDto: SendTicketEmailDto) {
    try {
      this.logger.log(
        `📧 กำลังส่งตั๋วทาง email สำหรับออเดอร์ ${sendTicketDto.orderId}`,
      );

      const result = await this.emailService.sendTicketEmail(sendTicketDto);

      this.logger.log(`✅ ส่งตั๋วทาง email สำเร็จ: ${result.messageId}`);

      return {
        success: true,
        data: result,
        message: 'ส่งตั๋วทาง email สำเร็จ',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ เกิดข้อผิดพลาดในการส่ง email: ${error.message}`);
      throw new HttpException(
        'เกิดข้อผิดพลาดในการส่ง email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 📧 ส่งคำยืนยันการสั่งซื้อ
   */
  @Post('send-confirmation')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'ส่งคำยืนยันการสั่งซื้อ',
    description: 'ส่ง email ยืนยันการสั่งซื้อให้ลูกค้า',
  })
  async sendOrderConfirmation(@Body() confirmationDto: any) {
    try {
      this.logger.log(
        `📧 กำลังส่งคำยืนยันการสั่งซื้อสำหรับออเดอร์ ${confirmationDto.orderId}`,
      );

      const result =
        await this.emailService.sendOrderConfirmation(confirmationDto);

      return {
        success: true,
        data: result,
        message: 'ส่งคำยืนยันการสั่งซื้อสำเร็จ',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ เกิดข้อผิดพลาดในการส่งคำยืนยัน: ${error.message}`);
      throw new HttpException(
        'เกิดข้อผิดพลาดในการส่งคำยืนยัน',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 📧 ส่ง Email แบบ Bulk
   */
  @Post('send-bulk')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'ส่ง Email แบบ Bulk',
    description: 'ส่ง email ให้ลูกค้าหลายคนพร้อมกัน',
  })
  async sendBulkEmail(@Body() bulkEmailDto: SendBulkEmailDto) {
    try {
      this.logger.log(
        `📧 กำลังส่ง bulk email ให้ ${bulkEmailDto.recipients.length} คน`,
      );

      const result = await this.emailService.sendBulkEmail(bulkEmailDto);

      return {
        success: true,
        data: result,
        message: `ส่ง bulk email สำเร็จ ${result.successCount}/${result.totalCount} อัน`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการส่ง bulk email: ${error.message}`,
      );
      throw new HttpException(
        'เกิดข้อผิดพลาดในการส่ง bulk email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 📧 รายการ Email Templates
   */
  @Get('templates')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'รายการ Email Templates',
    description: 'ดูรายการ email templates ที่มีอยู่',
  })
  async getEmailTemplates() {
    try {
      const templates = await this.emailService.getEmailTemplates();

      return {
        success: true,
        data: templates,
        message: 'ดึงรายการ templates สำเร็จ',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการดึง templates: ${error.message}`,
      );
      throw new HttpException(
        'เกิดข้อผิดพลาดในการดึง templates',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 📧 สร้าง Email Template ใหม่
   */
  @Post('templates')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'สร้าง Email Template ใหม่',
    description: 'สร้าง email template ใหม่สำหรับการส่ง email',
  })
  async createEmailTemplate(@Body() templateDto: EmailTemplateDto) {
    try {
      this.logger.log(`📧 กำลังสร้าง email template: ${templateDto.name}`);

      const result = await this.emailService.createEmailTemplate(templateDto);

      return {
        success: true,
        data: result,
        message: 'สร้าง email template สำเร็จ',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการสร้าง template: ${error.message}`,
      );
      throw new HttpException(
        'เกิดข้อผิดพลาดในการสร้าง template',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 📧 ทดสอบส่ง Email
   */
  @Post('test')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'ทดสอบส่ง Email',
    description: 'ส่ง test email เพื่อทดสอบระบบ',
  })
  async sendTestEmail(@Body() testEmailDto: any) {
    try {
      this.logger.log(`📧 กำลังส่ง test email ไปยัง ${testEmailDto.email}`);

      const result = await this.emailService.sendTestEmail(testEmailDto);

      return {
        success: true,
        data: result,
        message: 'ส่ง test email สำเร็จ',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการส่ง test email: ${error.message}`,
      );
      throw new HttpException(
        'เกิดข้อผิดพลาดในการส่ง test email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 📊 สถิติการส่ง Email
   */
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'สถิติการส่ง Email',
    description: 'ดูสถิติการส่ง email ของระบบ',
  })
  async getEmailStats(@Query() statsDto: EmailStatsDto) {
    try {
      this.logger.log('📊 ดึงสถิติการส่ง email');

      const stats = await this.emailService.getEmailStats(statsDto);

      return {
        success: true,
        data: stats,
        message: 'ดึงสถิติการส่ง email สำเร็จ',
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
   * 📧 ประวัติการส่ง Email
   */
  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'ประวัติการส่ง Email',
    description: 'ดูประวัติการส่ง email ทั้งหมด',
  })
  async getEmailHistory(@Query() query: any) {
    try {
      this.logger.log('📧 ดึงประวัติการส่ง email');

      const history = await this.emailService.getEmailHistory(query);

      return {
        success: true,
        data: history,
        message: 'ดึงประวัติการส่ง email สำเร็จ',
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
   * 🔄 ส่ง Email ที่ล้มเหลวใหม่
   */
  @Post('retry/:messageId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'ส่ง Email ที่ล้มเหลวใหม่',
    description: 'ส่ง email ที่ล้มเหลวใหม่อีกครั้ง',
  })
  @ApiParam({
    name: 'messageId',
    description: 'รหัสข้อความ email ที่ต้องการส่งใหม่',
  })
  async retryFailedEmail(@Param('messageId') messageId: string) {
    try {
      this.logger.log(`🔄 กำลังส่ง email ใหม่: ${messageId}`);

      const result = await this.emailService.retryFailedEmail(messageId);

      return {
        success: true,
        data: result,
        message: 'ส่ง email ใหม่สำเร็จ',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการส่ง email ใหม่: ${error.message}`,
      );
      throw new HttpException(
        'เกิดข้อผิดพลาดในการส่ง email ใหม่',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QRCodeService } from '../common/services/qr-code.service';
import {
  SendTicketEmailDto,
  SendBulkEmailDto,
  EmailTemplateDto,
  EmailStatsDto,
  EmailSendResultDto,
  BulkEmailResultDto,
  EmailTemplateResponseDto,
} from './dto/email-automation.dto';

@Injectable()
export class EmailAutomationService {
  private readonly logger = new Logger(EmailAutomationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly qrCodeService: QRCodeService,
  ) {}

  /**
   * 📧 ส่งตั๋ว QR Code ทาง Email
   */
  async sendTicketEmail(
    sendTicketDto: SendTicketEmailDto,
  ): Promise<EmailSendResultDto> {
    this.logger.log(
      `📧 กำลังส่งตั๋วทาง email สำหรับออเดอร์ ${sendTicketDto.orderId}`,
    );

    try {
      // จำลองการสร้าง QR Code
      const qrCode = sendTicketDto.includeQRCode
        ? await this.generateQRCodeForOrder(sendTicketDto.orderId)
        : null;

      // จำลองการส่ง email
      const messageId = `email-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Mock email template
      const emailTemplate = this.getTicketEmailTemplate(
        sendTicketDto,
        qrCode?.qrCodeImage,
      );

      this.logger.log(`✅ ส่งตั๋วทาง email สำเร็จ - Message ID: ${messageId}`);

      return {
        messageId,
        orderId: sendTicketDto.orderId,
        recipientEmail: sendTicketDto.recipientEmail,
        sentAt: new Date().toISOString(),
        status: 'sent',
      };
    } catch (error) {
      this.logger.error(`❌ เกิดข้อผิดพลาดในการส่งตั๋ว: ${error.message}`);

      return {
        messageId: `failed-${Date.now()}`,
        orderId: sendTicketDto.orderId,
        recipientEmail: sendTicketDto.recipientEmail,
        sentAt: new Date().toISOString(),
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * 📧 ส่งคำยืนยันการสั่งซื้อ
   */
  async sendOrderConfirmation(
    confirmationDto: any,
  ): Promise<EmailSendResultDto> {
    this.logger.log(
      `📧 กำลังส่งคำยืนยันการสั่งซื้อสำหรับออเดอร์ ${confirmationDto.orderId}`,
    );

    try {
      const messageId = `conf-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Mock confirmation email
      const emailContent = this.getOrderConfirmationTemplate(confirmationDto);

      this.logger.log(
        `✅ ส่งคำยืนยันการสั่งซื้อสำเร็จ - Message ID: ${messageId}`,
      );

      return {
        messageId,
        orderId: confirmationDto.orderId,
        recipientEmail: confirmationDto.customerEmail,
        sentAt: new Date().toISOString(),
        status: 'sent',
      };
    } catch (error) {
      this.logger.error(`❌ เกิดข้อผิดพลาดในการส่งคำยืนยัน: ${error.message}`);

      return {
        messageId: `failed-${Date.now()}`,
        orderId: confirmationDto.orderId,
        recipientEmail: confirmationDto.customerEmail,
        sentAt: new Date().toISOString(),
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * 📧 ส่ง Email แบบ Bulk
   */
  async sendBulkEmail(
    bulkEmailDto: SendBulkEmailDto,
  ): Promise<BulkEmailResultDto> {
    this.logger.log(
      `📧 กำลังส่ง bulk email ให้ ${bulkEmailDto.recipients.length} คน`,
    );

    const results: EmailSendResultDto[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const recipient of bulkEmailDto.recipients) {
      try {
        const messageId = `bulk-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // จำลองการส่ง email
        const success = Math.random() > 0.1; // 90% success rate

        if (success) {
          results.push({
            messageId,
            orderId: recipient.customData?.orderId || 'N/A',
            recipientEmail: recipient.email,
            sentAt: new Date().toISOString(),
            status: 'sent',
          });
          successCount++;
        } else {
          results.push({
            messageId,
            orderId: recipient.customData?.orderId || 'N/A',
            recipientEmail: recipient.email,
            sentAt: new Date().toISOString(),
            status: 'failed',
            error: 'Simulated random failure',
          });
          failedCount++;
        }

        // Simulate delay between sends
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          messageId: `failed-${Date.now()}`,
          orderId: recipient.customData?.orderId || 'N/A',
          recipientEmail: recipient.email,
          sentAt: new Date().toISOString(),
          status: 'failed',
          error: error.message,
        });
        failedCount++;
      }
    }

    const batchId = `batch-${Date.now()}`;

    this.logger.log(
      `📊 Bulk email เสร็จ - สำเร็จ: ${successCount}, ล้มเหลว: ${failedCount}`,
    );

    return {
      totalCount: bulkEmailDto.recipients.length,
      successCount,
      failedCount,
      results,
      batchId,
    };
  }

  /**
   * 📧 รายการ Email Templates
   */
  async getEmailTemplates(): Promise<EmailTemplateResponseDto[]> {
    this.logger.log('📧 ดึงรายการ email templates');

    // Mock templates
    const templates: EmailTemplateResponseDto[] = [
      {
        id: 'template-001',
        name: 'ticket-confirmation',
        subject: 'ตั๋วแมทช์มวยของคุณ - {{eventName}}',
        description: 'Template สำหรับส่งตั๋วให้ลูกค้า',
        variables: [
          'customerName',
          'orderId',
          'eventName',
          'eventDate',
          'seats',
        ],
        createdAt: '2025-08-01T10:00:00.000Z',
        updatedAt: '2025-08-10T15:30:00.000Z',
      },
      {
        id: 'template-002',
        name: 'order-confirmation',
        subject: 'ยืนยันการสั่งซื้อ - {{orderId}}',
        description: 'Template สำหรับยืนยันการสั่งซื้อ',
        variables: ['customerName', 'orderId', 'totalAmount', 'paymentMethod'],
        createdAt: '2025-08-01T10:00:00.000Z',
        updatedAt: '2025-08-05T12:00:00.000Z',
      },
      {
        id: 'template-003',
        name: 'event-reminder',
        subject: 'เตือนความจำ - แมทช์มวยจะเริ่มใน 24 ชั่วโมง',
        description: 'Template สำหรับเตือนลูกค้าก่อนงาน',
        variables: ['customerName', 'eventName', 'eventDate', 'location'],
        createdAt: '2025-08-01T10:00:00.000Z',
        updatedAt: '2025-08-08T09:00:00.000Z',
      },
    ];

    return templates;
  }

  /**
   * 📧 สร้าง Email Template ใหม่
   */
  async createEmailTemplate(
    templateDto: EmailTemplateDto,
  ): Promise<EmailTemplateResponseDto> {
    this.logger.log(`📧 กำลังสร้าง email template: ${templateDto.name}`);

    // จำลองการสร้าง template
    const newTemplate: EmailTemplateResponseDto = {
      id: `template-${Date.now()}`,
      name: templateDto.name,
      subject: templateDto.subject,
      description: templateDto.description,
      variables: templateDto.variables || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.logger.log(`✅ สร้าง email template สำเร็จ: ${newTemplate.id}`);

    return newTemplate;
  }

  /**
   * 📧 ทดสอบส่ง Email
   */
  async sendTestEmail(testEmailDto: any): Promise<EmailSendResultDto> {
    this.logger.log(`📧 กำลังส่ง test email ไปยัง ${testEmailDto.email}`);

    const messageId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return {
      messageId,
      orderId: 'TEST-ORDER',
      recipientEmail: testEmailDto.email,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };
  }

  /**
   * 📊 สถิติการส่ง Email
   */
  async getEmailStats(statsDto: EmailStatsDto): Promise<any> {
    this.logger.log('📊 ดึงสถิติการส่ง email');

    // Mock statistics
    const stats = {
      period: {
        startDate: statsDto.startDate || '2025-08-01',
        endDate: statsDto.endDate || '2025-08-11',
      },
      totals: {
        totalSent: 1250,
        totalDelivered: 1180,
        totalOpened: 890,
        totalClicked: 234,
        totalFailed: 70,
        totalBounced: 25,
      },
      dailyStats: [
        {
          date: '2025-08-11',
          sent: 145,
          delivered: 138,
          opened: 89,
          clicked: 23,
          failed: 7,
        },
        {
          date: '2025-08-10',
          sent: 98,
          delivered: 92,
          opened: 67,
          clicked: 18,
          failed: 6,
        },
      ],
      templateStats: [
        {
          templateName: 'ticket-confirmation',
          sent: 890,
          delivered: 845,
          openRate: 0.72,
          clickRate: 0.18,
        },
        {
          templateName: 'order-confirmation',
          sent: 360,
          delivered: 335,
          openRate: 0.89,
          clickRate: 0.25,
        },
      ],
    };

    return stats;
  }

  /**
   * 📧 ประวัติการส่ง Email
   */
  async getEmailHistory(query: any): Promise<any> {
    this.logger.log('📧 ดึงประวัติการส่ง email');

    // Mock history
    const history = {
      pagination: {
        page: query.page || 1,
        limit: query.limit || 20,
        total: 1250,
        totalPages: 63,
      },
      emails: [
        {
          id: 'email-001',
          messageId: 'msg-20250811-001',
          recipientEmail: 'customer1@example.com',
          subject: 'ตั๋วแมทช์มวยของคุณ - Boxing Championship 2025',
          templateName: 'ticket-confirmation',
          status: 'delivered',
          sentAt: '2025-08-11T14:30:00.000Z',
          deliveredAt: '2025-08-11T14:30:15.000Z',
          openedAt: '2025-08-11T15:45:22.000Z',
        },
        {
          id: 'email-002',
          messageId: 'msg-20250811-002',
          recipientEmail: 'customer2@example.com',
          subject: 'ยืนยันการสั่งซื้อ - ORD-20250811-002',
          templateName: 'order-confirmation',
          status: 'sent',
          sentAt: '2025-08-11T14:28:00.000Z',
        },
      ],
    };

    return history;
  }

  /**
   * 🔄 ส่ง Email ที่ล้มเหลวใหม่
   */
  async retryFailedEmail(messageId: string): Promise<EmailSendResultDto> {
    this.logger.log(`🔄 กำลังส่ง email ใหม่: ${messageId}`);

    // จำลองการส่งใหม่
    const newMessageId = `retry-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return {
      messageId: newMessageId,
      orderId: 'RETRY-ORDER',
      recipientEmail: 'retry@example.com',
      sentAt: new Date().toISOString(),
      status: 'sent',
    };
  }

  /**
   * 🛠️ Private Methods
   */
  private async generateQRCodeForOrder(orderId: string) {
    // จำลองการสร้าง QR Code
    return await this.qrCodeService.generateTicketQR(
      orderId,
      'email-user',
      new Date().toISOString(),
      ['A1'],
      2000,
      'seated',
    );
  }

  private getTicketEmailTemplate(
    sendTicketDto: SendTicketEmailDto,
    qrCodeImage?: string,
  ): string {
    return `
      <html>
        <body>
          <h1>สวัสดี ${sendTicketDto.recipientName || 'ลูกค้า'}</h1>
          <p>ตั๋วของคุณสำหรับออเดอร์ ${sendTicketDto.orderId} พร้อมแล้ว!</p>
          ${qrCodeImage ? `<img src="data:image/png;base64,${qrCodeImage}" alt="QR Code" />` : ''}
          <p>กรุณานำ QR Code นี้มาใช้เข้างาน</p>
          ${sendTicketDto.notes ? `<p>หมายเหตุ: ${sendTicketDto.notes}</p>` : ''}
        </body>
      </html>
    `;
  }

  private getOrderConfirmationTemplate(confirmationDto: any): string {
    return `
      <html>
        <body>
          <h1>ยืนยันการสั่งซื้อ</h1>
          <p>ออเดอร์ ${confirmationDto.orderId} ของคุณได้รับการยืนยันแล้ว</p>
          <p>จำนวนเงิน: ${confirmationDto.totalAmount} บาท</p>
          <p>วิธีชำระเงิน: ${confirmationDto.paymentMethod}</p>
        </body>
      </html>
    `;
  }
}

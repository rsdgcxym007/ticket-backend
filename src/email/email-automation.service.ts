import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
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
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly qrCodeService: QRCodeService,
  ) {
    this.initializeEmailTransporter();
  }

  /**
   * 📧 Initialize Email Transporter
   */
  private initializeEmailTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const smtpPort = this.configService.get<number>('SMTP_PORT') || 587;
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    // Configuration for different SMTP setups
    const transportConfig: any = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
    };

    // Only add auth if credentials are provided (for localhost SMTP without auth)
    if (smtpUser && smtpPass && smtpPort !== 25) {
      transportConfig.auth = {
        user: smtpUser,
        pass: smtpPass,
      };
    }

    // For port 25 (local SMTP), don't require TLS
    if (smtpPort === 25) {
      transportConfig.secure = false;
      transportConfig.requireTLS = false;
      transportConfig.tls = {
        rejectUnauthorized: false
      };
    }

    this.transporter = nodemailer.createTransport(transportConfig);

    this.logger.log(
      `📧 Email transporter initialized with ${smtpUser || 'no-auth'} on ${smtpHost}:${smtpPort}`,
    );
  }

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
      // สร้าง QR Code ถ้าต้องการ
      const qrCode = sendTicketDto.includeQRCode
        ? await this.generateQRCodeForOrder(sendTicketDto.orderId)
        : null;

      // สร้าง HTML email template
      const emailTemplate = this.getTicketEmailTemplate(
        sendTicketDto,
        qrCode?.qrCodeImage,
      );

      // ตั้งค่า email
      const mailOptions = {
        from:
          this.configService.get<string>('EMAIL_FROM') || 'rsdgcxym@gmail.com',
        to: sendTicketDto.recipientEmail,
        subject: `🎫 ตั๋วของคุณสำหรับออเดอร์ ${sendTicketDto.orderId}`,
        html: emailTemplate,
        attachments: qrCode
          ? [
              {
                filename: `ticket-${sendTicketDto.orderId}.png`,
                content: qrCode.qrCodeImage.split('base64,')[1],
                encoding: 'base64',
                cid: 'qrcode', // สำหรับใช้ใน HTML เป็น <img src="cid:qrcode">
              },
            ]
          : [],
      };

      // ส่ง email จริงๆ
      const result = await this.transporter.sendMail(mailOptions);
      const messageId = result.messageId;

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
      // สร้าง HTML email template
      const emailContent = this.getOrderConfirmationTemplate(confirmationDto);

      // ตั้งค่า email
      const mailOptions = {
        from:
          this.configService.get<string>('EMAIL_FROM') || 'rsdgcxym@gmail.com',
        to: confirmationDto.customerEmail,
        subject: `✅ ยืนยันการสั่งซื้อ - ออเดอร์ ${confirmationDto.orderId}`,
        html: emailContent,
      };

      // ส่ง email จริงๆ
      const result = await this.transporter.sendMail(mailOptions);
      const messageId = result.messageId;

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
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="format-detection" content="telephone=no">
        <title>🎫 Your Digital Ticket - Order ${sendTicketDto.orderId}</title>
        <!--[if mso]>
        <noscript>
          <xml>
            <o:OfficeDocumentSettings>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
        </noscript>
        <![endif]-->
        <style>
          /* Reset Styles */
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          /* Email Client Compatibility */
          table, td, div, h1, h2, h3, p { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif; }
          
          body { 
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #2d3748;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          .email-wrapper {
            width: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            min-height: 100vh;
          }
          
          .email-container {
            max-width: 680px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          
          .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.05"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
            opacity: 0.1;
          }
          
          .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
          }
          
          .header .subtitle {
            font-size: 18px;
            opacity: 0.9;
            position: relative;
            z-index: 1;
          }
          
          .ticket-card {
            margin: 30px;
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            overflow: hidden;
            position: relative;
          }
          
          .ticket-header {
            background: linear-gradient(90deg, #f7fafc 0%, #edf2f7 100%);
            padding: 20px 25px;
            border-bottom: 2px dashed #cbd5e0;
            position: relative;
          }
          
          .ticket-header::after {
            content: '';
            position: absolute;
            bottom: -11px;
            left: -11px;
            width: 20px;
            height: 20px;
            background: #ffffff;
            border-radius: 50%;
            border: 2px solid #e2e8f0;
          }
          
          .ticket-header::before {
            content: '';
            position: absolute;
            bottom: -11px;
            right: -11px;
            width: 20px;
            height: 20px;
            background: #ffffff;
            border-radius: 50%;
            border: 2px solid #e2e8f0;
          }
          
          .ticket-body {
            padding: 25px;
            background: #ffffff;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 25px;
          }
          
          .info-item {
            display: flex;
            flex-direction: column;
          }
          
          .info-label {
            font-size: 12px;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
            font-weight: 600;
          }
          
          .info-value {
            font-size: 16px;
            color: #2d3748;
            font-weight: 600;
          }
          
          .highlight-info {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
            text-align: center;
          }
          
          .qr-section {
            text-align: center;
            padding: 30px;
            background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
            border-radius: 16px;
            margin: 25px;
          }
          
          .qr-section h3 {
            color: #4a5568;
            margin-bottom: 15px;
            font-size: 20px;
          }
          
          .qr-code-container {
            display: inline-block;
            padding: 20px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            margin: 20px 0;
          }
          
          .qr-section img {
            max-width: 200px;
            height: auto;
            border-radius: 8px;
          }
          
          .instructions {
            background: #fff8e1;
            border-left: 4px solid #ffc107;
            padding: 15px 20px;
            margin: 20px 25px;
            border-radius: 0 8px 8px 0;
          }
          
          .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          
          .social-links {
            margin: 20px 0;
          }
          
          .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #667eea;
            text-decoration: none;
          }
          
          /* Mobile Responsiveness */
          @media only screen and (max-width: 600px) {
            .email-wrapper { padding: 20px 10px; }
            .email-container { margin: 0 10px; }
            .header { padding: 30px 20px; }
            .header h1 { font-size: 24px; }
            .ticket-card { margin: 20px 15px; }
            .info-grid { grid-template-columns: 1fr; gap: 15px; }
            .qr-section { padding: 20px 15px; margin: 20px 15px; }
            .footer { padding: 20px 15px; }
          }
          
          /* Dark Mode Support */
          @media (prefers-color-scheme: dark) {
            .email-container { background: #1a202c; }
            .ticket-body { background: #1a202c; color: #e2e8f0; }
            .info-value { color: #e2e8f0; }
            .footer { background: #2d3748; color: #e2e8f0; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <div class="header">
              <h1>🎫 Digital Ticket</h1>
              <p class="subtitle">Your event pass is ready!</p>
            </div>
            
            <div class="ticket-card">
              <div class="ticket-header">
                <h2 style="margin: 0; font-size: 18px; color: #4a5568;">EVENT TICKET</h2>
                <p style="margin: 5px 0 0 0; color: #718096; font-size: 14px;">Order: ${sendTicketDto.orderId}</p>
              </div>
              
              <div class="ticket-body">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Ticket Holder</span>
                    <span class="info-value">${sendTicketDto.recipientName || 'Guest'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Ticket Type</span>
                    <span class="info-value">${sendTicketDto.ticketType || 'General'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Quantity</span>
                    <span class="info-value">${sendTicketDto.quantity || 1} ticket${(sendTicketDto.quantity || 1) > 1 ? 's' : ''}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Event Date</span>
                    <span class="info-value">${sendTicketDto.showDate || 'TBA'}</span>
                  </div>
                  ${
                    sendTicketDto.seatNumbers &&
                    sendTicketDto.seatNumbers.length > 0
                      ? `
                  <div class="info-item" style="grid-column: 1 / -1;">
                    <span class="info-label">Seat Numbers</span>
                    <span class="info-value">${sendTicketDto.seatNumbers.join(', ')}</span>
                  </div>
                  `
                      : ''
                  }
                </div>
                
                <div class="highlight-info">
                  <strong style="font-size: 18px;">Total Amount</strong><br>
                  <span style="font-size: 24px; font-weight: 700;">฿${sendTicketDto.totalAmount.toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>

            ${
              qrCodeImage
                ? `
            <div class="qr-section">
              <h3>🎯 Entry QR Code</h3>
              <p style="color: #718096; margin-bottom: 10px;">Present this QR code at the entrance</p>
              <div class="qr-code-container">
                <img src="cid:qrcode" alt="Entry QR Code" />
              </div>
              <p style="color: #718096; font-size: 14px; margin-top: 10px;">
                📱 Scan with any QR code reader
              </p>
            </div>
            `
                : ''
            }

            <div class="instructions">
              <h4 style="margin: 0 0 10px 0; color: #e65100;">⚠️ Important Instructions</h4>
              <ul style="margin: 0; padding-left: 20px; color: #e65100;">
                <li>Please arrive 30 minutes before the event</li>
                <li>Keep this email and QR code accessible on your device</li>
                <li>Bring a valid ID for verification</li>
                <li>Screenshots of QR codes are accepted</li>
              </ul>
            </div>

            <div class="footer">
              <h4 style="color: #4a5568; margin-bottom: 15px;">Thank you for your purchase!</h4>
              <p style="color: #718096; margin-bottom: 20px;">
                Questions? Contact us at <a href="mailto:rsdgcxym@gmail.com" style="color: #667eea;">rsdgcxym@gmail.com</a>
              </p>
              
              <div class="social-links">
                <a href="#" style="color: #667eea;">📧 Email</a>
                <a href="#" style="color: #667eea;">📱 Line</a>
                <a href="#" style="color: #667eea;">📞 Phone</a>
              </div>
              
              <p style="color: #a0aec0; font-size: 12px; margin-top: 20px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getOrderConfirmationTemplate(confirmationDto: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ยืนยันการสั่งซื้อ - ${confirmationDto.orderId}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #28a745;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #28a745;
            font-size: 28px;
            margin: 0;
          }
          .order-details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .total-amount {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ ยืนยันการสั่งซื้อ</h1>
            <p>ออเดอร์ของคุณได้รับการยืนยันแล้ว</p>
          </div>
          
          <div class="order-details">
            <h2>📋 รายละเอียดออเดอร์</h2>
            <p><strong>หมายเลขออเดอร์:</strong> ${confirmationDto.orderId}</p>
            <p><strong>ชื่อลูกค้า:</strong> ${confirmationDto.customerName || 'ไม่ระบุ'}</p>
            <p><strong>วิธีชำระเงิน:</strong> ${confirmationDto.paymentMethod || 'ไม่ระบุ'}</p>
            <p><strong>วันที่สั่งซื้อ:</strong> ${new Date().toLocaleDateString('th-TH')}</p>
          </div>

          <div class="total-amount">
            <h3>💰 จำนวนเงินรวม</h3>
            <h2 style="color: #28a745; margin: 10px 0;">${confirmationDto.totalAmount || '0'} บาท</h2>
          </div>

          <div class="footer">
            <p>🎫 ตั๋วจะถูกส่งให้คุณทางอีเมลหลังจากชำระเงินเรียบร้อยแล้ว</p>
            <p>ขอบคุณที่เลือกใช้บริการของเรา</p>
            <p><small>หากมีคำถาม กรุณาติดต่อ: rsdgcxym@gmail.com</small></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

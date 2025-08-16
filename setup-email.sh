#!/bin/bash
# อัปเดต Node.js app สำหรับส่งอีเมลผ่าน SendGrid
# Author: GitHub Copilot - Email Integration  
# Date: 2025-08-16

set -e

echo "📧 ติดตั้ง Email dependencies..."

# เข้าไปในโฟลเดอร์ backend
cd /var/www/patong-boxing/backend || cd /home/nodeapp/patong-boxing/backend

# ติดตั้ง email dependencies
npm install @sendgrid/mail nodemailer dotenv

# สร้างไฟล์ environment สำหรับ email
echo "📝 ตั้งค่า environment variables..."

# เพิ่ม email settings ใน .env
cat >> .env << 'EOF'

# Email Settings
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@patongboxingstadiumticket.com  
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-app@patongboxingstadiumticket.com
SMTP_PASS=your-app-password

# Email Templates
COMPANY_NAME=Patong Boxing Stadium
COMPANY_URL=https://patongboxingstadiumticket.com
SUPPORT_EMAIL=support@patongboxingstadiumticket.com
EOF

# สร้าง email service
echo "📧 สร้าง email service..."

mkdir -p src/email

cat > src/email/email.service.ts << 'EOF'
import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  data?: any;
}

@Injectable()
export class EmailService {
  private sendGridClient;
  private nodemailerTransporter;

  constructor() {
    // SendGrid setup
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.sendGridClient = sgMail;
    }

    // Nodemailer setup (fallback)
    this.nodemailerTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (this.sendGridClient && process.env.SENDGRID_API_KEY) {
        await this.sendVia SendGrid(options);
      } else {
        await this.sendViaNodemailer(options);
      }
      console.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  private async sendViaSendGrid(options: EmailOptions): Promise<void> {
    const msg = {
      to: options.to,
      from: process.env.FROM_EMAIL,
      subject: options.subject,
      html: options.html || options.text,
      text: options.text,
    };

    await this.sendGridClient.send(msg);
  }

  private async sendViaNodemailer(options: EmailOptions): Promise<void> {
    await this.nodemailerTransporter.sendMail({
      from: `"${process.env.COMPANY_NAME}" <${process.env.FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }

  // Email templates
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">ยินดีต้อนรับสู่ ${process.env.COMPANY_NAME}</h1>
        <p>สวัสดี ${name}!</p>
        <p>ขอบคุณที่สมัครสมาชิกกับเรา เรายินดีต้อนรับคุณสู่ครอบครัว Patong Boxing Stadium</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.COMPANY_URL}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            เยี่ยมชมเว็บไซต์
          </a>
        </div>
        <p>หากมีคำถาม สามารถติดต่อได้ที่ ${process.env.SUPPORT_EMAIL}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          © 2025 ${process.env.COMPANY_NAME}. All rights reserved.
        </p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `ยินดีต้อนรับสู่ ${process.env.COMPANY_NAME}`,
      html,
    });
  }

  async sendTicketConfirmation(to: string, ticketData: any): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">การจองตั๋วสำเร็จ!</h1>
        <p>สวัสดี ${ticketData.customerName}!</p>
        <p>ตั๋วของคุณได้รับการยืนยันแล้ว</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>รายละเอียดการจอง</h3>
          <p><strong>เลขที่จอง:</strong> ${ticketData.bookingId}</p>
          <p><strong>การแข่งขัน:</strong> ${ticketData.matchName}</p>
          <p><strong>วันที่:</strong> ${ticketData.matchDate}</p>
          <p><strong>เวลา:</strong> ${ticketData.matchTime}</p>
          <p><strong>ที่นั่ง:</strong> ${ticketData.seatDetails}</p>
          <p><strong>ราคา:</strong> ฿${ticketData.totalAmount}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.COMPANY_URL}/booking/${ticketData.bookingId}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            ดูรายละเอียดตั๋ว
          </a>
        </div>

        <p>กรุณานำ QR Code นี้มาแสดงที่สนามในวันแข่งขัน</p>
        <p>หากมีคำถาม สามารถติดต่อได้ที่ ${process.env.SUPPORT_EMAIL}</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `ยืนยันการจองตั๋ว - ${ticketData.matchName}`,
      html,
    });
  }

  async sendPasswordReset(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.COMPANY_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc3545;">รีเซ็ตรหัสผ่าน</h1>
        <p>คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชี ${to}</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            รีเซ็ตรหัสผ่าน
          </a>
        </div>
        
        <p style="color: #666;">ลิงก์นี้จะหมดอายุในอีก 1 ชั่วโมง</p>
        <p style="color: #666;">หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: 'รีเซ็ตรหัสผ่าน - Patong Boxing Stadium',
      html,
    });
  }
}
EOF

# สร้าง email module
cat > src/email/email.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
EOF

# อัปเดต app.module.ts
echo "🔧 อัปเดต app.module.ts..."

# เพิ่ม EmailModule ใน imports (ต้องแก้ด้วยมือ)
echo "
📝 กรุณาเพิ่มโค้ดนี้ใน src/app.module.ts:

import { EmailModule } from './email/email.module';

แล้วเพิ่ม EmailModule ในส่วน imports:
imports: [
  // ... modules อื่นๆ
  EmailModule,
],
"

# รีสตาร์ท app
echo "🔄 รีสตาร์ท application..."
pm2 restart all

echo ""
echo "✅ Email setup เสร็จสิ้น!"
echo ""
echo "📋 ขั้นตอนถัดไป:"
echo "1. ตั้งค่า SendGrid API key ใน .env"
echo "2. ตั้งค่า MX records ใน Cloudflare"  
echo "3. เพิ่ม EmailModule ใน app.module.ts"
echo "4. ทดสอบส่งอีเมล"
echo ""
echo "🧪 วิธีทดสอบ:"
echo "curl -X POST http://localhost:4000/test-email -d '{\"email\":\"test@example.com\"}'"
EOF

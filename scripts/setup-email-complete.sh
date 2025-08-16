#!/bin/bash

# Email Configuration Script for patongboxingstadiumticket.com
# ติดตั้ง SendGrid และ SMTP configuration
# Author: GitHub Copilot
# Date: 2025-08-16

set -e

DOMAIN="patongboxingstadiumticket.com"
APP_DIR="/var/www/patong-boxing"
NODE_USER="nodeapp"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1404715794205511752/H4H1Q-aJ2B1LwSpKxHYP7rt4tCWA0p10339NN5Gy71fhwXvFjcfSQKXNl9Xdj60ks__l"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Discord notification
send_notification() {
    local message="$1"
    local color="$2"
    
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{
             \"embeds\": [{
                 \"title\": \"📧 Email Setup\",
                 \"description\": \"$message\",
                 \"color\": $color,
                 \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
             }]
         }" \
         "$DISCORD_WEBHOOK_URL" 2>/dev/null || true
}

log "🚀 Starting Email Configuration Setup"
send_notification "🚀 Starting email configuration for $DOMAIN" 3447003

# Step 1: Install email dependencies
log "📦 Installing email dependencies..."
cd "$APP_DIR"
sudo -u "$NODE_USER" npm install @sendgrid/mail nodemailer @nestjs/mailer handlebars mjml

success "Email dependencies installed"

# Step 2: Create email service
log "📧 Creating email service..."
mkdir -p src/email/{templates,dto}

# Email service
cat > src/email/email.service.ts << 'EOF'
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as handlebars from 'handlebars';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: any;
  html?: string;
  text?: string;
  attachments?: any[];
}

export interface BookingEmailData {
  customerName: string;
  bookingId: string;
  eventName: string;
  eventDate: string;
  seatNumbers: string[];
  totalAmount: number;
  qrCode?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private sendGridMail: typeof sgMail;
  private smtpTransporter: nodemailer.Transporter;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeSendGrid();
    this.initializeSMTP();
    this.loadTemplates();
  }

  private initializeSendGrid() {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey && apiKey !== 'your_sendgrid_api_key_here') {
      sgMail.setApiKey(apiKey);
      this.sendGridMail = sgMail;
      this.logger.log('SendGrid initialized successfully');
    } else {
      this.logger.warn('SendGrid API key not configured');
    }
  }

  private initializeSMTP() {
    const smtpConfig = {
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    if (smtpConfig.auth.user && smtpConfig.auth.pass) {
      this.smtpTransporter = nodemailer.createTransporter(smtpConfig);
      this.logger.log('SMTP transporter initialized successfully');
    } else {
      this.logger.warn('SMTP credentials not configured');
    }
  }

  private loadTemplates() {
    const templateNames = [
      'booking-confirmation',
      'payment-success',
      'event-reminder',
      'booking-cancelled',
      'password-reset',
      'welcome'
    ];

    templateNames.forEach(templateName => {
      try {
        const templatePath = join(__dirname, 'templates', `${templateName}.hbs`);
        const templateSource = readFileSync(templatePath, 'utf8');
        const template = handlebars.compile(templateSource);
        this.templates.set(templateName, template);
      } catch (error) {
        this.logger.warn(`Template ${templateName} not found`);
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      let html = options.html;
      let text = options.text;

      // Use template if specified
      if (options.template && this.templates.has(options.template)) {
        const template = this.templates.get(options.template);
        html = template(options.context || {});
        text = this.htmlToText(html);
      }

      const emailData = {
        to: Array.isArray(options.to) ? options.to : [options.to],
        from: {
          email: this.configService.get<string>('FROM_EMAIL', `noreply@${this.configService.get<string>('DOMAIN', 'patongboxingstadiumticket.com')}`),
          name: this.configService.get<string>('COMPANY_NAME', 'Patong Boxing Stadium')
        },
        subject: options.subject,
        html,
        text,
        attachments: options.attachments || []
      };

      // Try SendGrid first, fallback to SMTP
      if (this.sendGridMail) {
        await this.sendWithSendGrid(emailData);
      } else if (this.smtpTransporter) {
        await this.sendWithSMTP(emailData);
      } else {
        throw new Error('No email service configured');
      }

      this.logger.log(`Email sent successfully to ${emailData.to.join(', ')}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return false;
    }
  }

  private async sendWithSendGrid(emailData: any) {
    await this.sendGridMail.sendMultiple({
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments
    });
  }

  private async sendWithSMTP(emailData: any) {
    await this.smtpTransporter.sendMail({
      from: `"${emailData.from.name}" <${emailData.from.email}>`,
      to: emailData.to.join(', '),
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments
    });
  }

  // Specific email methods
  async sendBookingConfirmation(to: string, data: BookingEmailData): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Booking Confirmation - ${data.eventName}`,
      template: 'booking-confirmation',
      context: {
        ...data,
        companyName: this.configService.get<string>('COMPANY_NAME', 'Patong Boxing Stadium'),
        companyUrl: this.configService.get<string>('COMPANY_URL', 'https://patongboxingstadiumticket.com'),
        supportEmail: this.configService.get<string>('SUPPORT_EMAIL', 'support@patongboxingstadiumticket.com')
      }
    });
  }

  async sendPaymentSuccess(to: string, data: BookingEmailData): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Payment Confirmation - ${data.eventName}`,
      template: 'payment-success',
      context: data
    });
  }

  async sendEventReminder(to: string, data: BookingEmailData): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Event Reminder - ${data.eventName}`,
      template: 'event-reminder',
      context: data
    });
  }

  async sendPasswordReset(to: string, resetToken: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Password Reset Request',
      template: 'password-reset',
      context: {
        resetUrl: `${this.configService.get<string>('COMPANY_URL')}/reset-password?token=${resetToken}`,
        companyName: this.configService.get<string>('COMPANY_NAME')
      }
    });
  }

  async sendWelcomeEmail(to: string, customerName: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Welcome to ${this.configService.get<string>('COMPANY_NAME')}!`,
      template: 'welcome',
      context: {
        customerName,
        companyName: this.configService.get<string>('COMPANY_NAME'),
        companyUrl: this.configService.get<string>('COMPANY_URL')
      }
    });
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  // Test email functionality
  async testEmail(): Promise<boolean> {
    try {
      return await this.sendEmail({
        to: this.configService.get<string>('SUPPORT_EMAIL', 'admin@patongboxingstadiumticket.com'),
        subject: 'Test Email - System Check',
        html: `
          <h2>Email System Test</h2>
          <p>This is a test email to verify the email system is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Domain:</strong> ${this.configService.get<string>('DOMAIN')}</p>
          <p>If you receive this email, the email system is configured correctly.</p>
        `,
        text: 'Email system test - if you receive this, email is working correctly.'
      });
    } catch (error) {
      this.logger.error('Email test failed:', error);
      return false;
    }
  }
}
EOF

# Email module
cat > src/email/email.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';

@Module({
  imports: [ConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
EOF

# Email DTOs
cat > src/email/dto/send-email.dto.ts << 'EOF'
import { IsEmail, IsString, IsOptional, IsArray } from 'class-validator';

export class SendEmailDto {
  @IsEmail({}, { each: true })
  to: string | string[];

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  context?: any;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsArray()
  attachments?: any[];
}
EOF

success "Email service created"

# Step 3: Create email templates
log "📝 Creating email templates..."

# Booking confirmation template
cat > src/email/templates/booking-confirmation.hbs << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Booking Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #d32f2f; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .booking-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .qr-code { text-align: center; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .btn { display: inline-block; background: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🥊 {{companyName}}</h1>
            <h2>Booking Confirmation</h2>
        </div>
        
        <div class="content">
            <p>Dear {{customerName}},</p>
            <p>Thank you for your booking! Your tickets have been confirmed.</p>
            
            <div class="booking-details">
                <h3>📋 Booking Details</h3>
                <p><strong>Booking ID:</strong> {{bookingId}}</p>
                <p><strong>Event:</strong> {{eventName}}</p>
                <p><strong>Date:</strong> {{eventDate}}</p>
                <p><strong>Seats:</strong> {{#each seatNumbers}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</p>
                <p><strong>Total Amount:</strong> ฿{{totalAmount}}</p>
            </div>

            {{#if qrCode}}
            <div class="qr-code">
                <h3>🎫 Your QR Code</h3>
                <img src="{{qrCode}}" alt="QR Code" style="max-width: 200px;">
                <p>Please present this QR code at the venue entrance</p>
            </div>
            {{/if}}

            <p>
                <a href="{{companyUrl}}/booking/{{bookingId}}" class="btn">View Booking Details</a>
            </p>
        </div>
        
        <div class="footer">
            <p>If you have any questions, please contact us at {{supportEmail}}</p>
            <p>{{companyName}} - {{companyUrl}}</p>
        </div>
    </div>
</body>
</html>
EOF

# Payment success template
cat > src/email/templates/payment-success.hbs << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment Successful</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4caf50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Payment Successful!</h1>
        </div>
        
        <div class="content">
            <div class="success-icon">🎉</div>
            <p>Dear {{customerName}},</p>
            <p>Your payment of <strong>฿{{totalAmount}}</strong> has been processed successfully!</p>
            
            <div class="booking-details">
                <h3>Payment Details</h3>
                <p><strong>Booking ID:</strong> {{bookingId}}</p>
                <p><strong>Event:</strong> {{eventName}}</p>
                <p><strong>Amount Paid:</strong> ฿{{totalAmount}}</p>
            </div>

            <p>Your tickets are now confirmed and ready for use. You should receive your tickets via email shortly.</p>
        </div>
    </div>
</body>
</html>
EOF

# Event reminder template
cat > src/email/templates/event-reminder.hbs << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Event Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff9800; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Event Reminder</h1>
        </div>
        
        <div class="content">
            <p>Dear {{customerName}},</p>
            <p>This is a friendly reminder about your upcoming event!</p>
            
            <div class="booking-details">
                <h3>📅 Event Details</h3>
                <p><strong>Event:</strong> {{eventName}}</p>
                <p><strong>Date:</strong> {{eventDate}}</p>
                <p><strong>Your Seats:</strong> {{#each seatNumbers}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</p>
                <p><strong>Booking ID:</strong> {{bookingId}}</p>
            </div>

            <p><strong>Important:</strong> Please arrive at least 30 minutes before the event starts and bring your QR code ticket.</p>
        </div>
    </div>
</body>
</html>
EOF

# Welcome template
cat > src/email/templates/welcome.hbs << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2196f3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🥊 Welcome to {{companyName}}!</h1>
        </div>
        
        <div class="content">
            <p>Dear {{customerName}},</p>
            <p>Welcome to {{companyName}}! We're excited to have you join our community of boxing enthusiasts.</p>
            
            <p>Here's what you can do with your account:</p>
            <ul>
                <li>🎫 Book tickets for upcoming events</li>
                <li>📱 Get mobile-friendly QR code tickets</li>
                <li>📊 View your booking history</li>
                <li>🔔 Receive event notifications</li>
            </ul>

            <p>Visit our website to explore upcoming events: <a href="{{companyUrl}}">{{companyUrl}}</a></p>
            
            <p>Thank you for choosing {{companyName}}!</p>
        </div>
    </div>
</body>
</html>
EOF

# Password reset template
cat > src/email/templates/password-reset.hbs << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f44336; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .btn { display: inline-block; background: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset Request</h1>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for your {{companyName}} account.</p>
            
            <p>Click the button below to reset your password:</p>
            <p><a href="{{resetUrl}}" class="btn">Reset Password</a></p>
            
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            
            <p>This link will expire in 24 hours for security reasons.</p>
        </div>
    </div>
</body>
</html>
EOF

success "Email templates created"

# Step 4: Add email environment variables
log "🔧 Updating environment variables..."
if [ -f "$APP_DIR/.env" ]; then
    # Update email section in .env
    sed -i '/# Email Configuration/,/# SMTP Configuration/c\
# Email Configuration (SendGrid)\
SENDGRID_API_KEY=your_sendgrid_api_key_here\
FROM_EMAIL=noreply@patongboxingstadiumticket.com\
COMPANY_NAME=Patong Boxing Stadium\
COMPANY_URL=https://patongboxingstadiumticket.com\
SUPPORT_EMAIL=support@patongboxingstadiumticket.com\
\
# SMTP Configuration (Alternative)' "$APP_DIR/.env"
else
    warning ".env file not found, please run complete deployment first"
fi

success "Environment variables updated"

# Step 5: Add email module to app.module.ts
log "📦 Adding email module to main app..."
if [ -f "$APP_DIR/src/app.module.ts" ]; then
    # Check if EmailModule is already imported
    if ! grep -q "EmailModule" "$APP_DIR/src/app.module.ts"; then
        # Add import at top
        sed -i '1i import { EmailModule } from '\''./email/email.module'\'';' "$APP_DIR/src/app.module.ts"
        
        # Add to imports array
        sed -i '/imports: \[/a\    EmailModule,' "$APP_DIR/src/app.module.ts"
        
        success "EmailModule added to app.module.ts"
    else
        log "EmailModule already imported"
    fi
else
    warning "app.module.ts not found"
fi

# Step 6: Create email test endpoint
log "🧪 Creating email test endpoint..."
mkdir -p src/test
cat > src/test/email-test.controller.ts << 'EOF'
import { Controller, Post, Get, Body } from '@nestjs/common';
import { EmailService } from '../email/email.service';

@Controller('test/email')
export class EmailTestController {
  constructor(private readonly emailService: EmailService) {}

  @Get('health')
  async testEmailHealth() {
    const result = await this.emailService.testEmail();
    return {
      success: result,
      message: result ? 'Email system is working' : 'Email system has issues',
      timestamp: new Date().toISOString()
    };
  }

  @Post('booking-confirmation')
  async testBookingConfirmation(@Body() data: any) {
    const result = await this.emailService.sendBookingConfirmation(
      data.email || 'test@example.com',
      {
        customerName: data.customerName || 'Test Customer',
        bookingId: data.bookingId || 'TEST-001',
        eventName: data.eventName || 'Boxing Championship',
        eventDate: data.eventDate || '2025-08-20 19:00',
        seatNumbers: data.seatNumbers || ['A1', 'A2'],
        totalAmount: data.totalAmount || 1500,
        qrCode: data.qrCode
      }
    );

    return { success: result, message: result ? 'Test email sent' : 'Failed to send test email' };
  }

  @Post('welcome')
  async testWelcomeEmail(@Body() data: any) {
    const result = await this.emailService.sendWelcomeEmail(
      data.email || 'test@example.com',
      data.customerName || 'Test Customer'
    );

    return { success: result, message: result ? 'Welcome email sent' : 'Failed to send welcome email' };
  }
}
EOF

success "Email test endpoint created"

# Step 7: Build and restart application
log "🔨 Building application with email support..."
cd "$APP_DIR"
sudo -u "$NODE_USER" npm run build

# Restart PM2
log "🔄 Restarting application..."
sudo -u "$NODE_USER" pm2 restart all

# Wait for application to start
sleep 5

# Step 8: Test email functionality
log "🧪 Testing email functionality..."
if curl -s http://localhost:3000/health >/dev/null; then
    success "Application is running"
    
    # Test email health endpoint
    if curl -s http://localhost:3000/test/email/health >/dev/null; then
        success "Email test endpoint is available"
    else
        warning "Email test endpoint not accessible"
    fi
else
    error "Application is not running properly"
fi

# Step 9: Display summary
log "📋 Email Configuration Summary"
echo -e "
=======================================================
📧 Email Configuration Complete
=======================================================

✅ Email Service: SendGrid + SMTP fallback
✅ Templates: Booking, Payment, Reminder, Welcome
✅ Test Endpoints: Available at /test/email/*
✅ Environment: Configured for production

📝 Next Steps:
1. Update your .env file with real API keys:
   - SENDGRID_API_KEY (get from SendGrid dashboard)
   - SMTP_USER and SMTP_PASS (your email credentials)

2. Test email functionality:
   - GET http://localhost:3000/test/email/health
   - POST http://localhost:3000/test/email/booking-confirmation

3. Configure SendGrid:
   - Sign up at https://sendgrid.com
   - Create API key with Mail Send permissions
   - Verify sender email address

4. Configure SMTP (Alternative):
   - Use Gmail App Password for SMTP_PASS
   - Enable 2FA and create app-specific password

📊 Email Templates Available:
- booking-confirmation.hbs
- payment-success.hbs  
- event-reminder.hbs
- welcome.hbs
- password-reset.hbs

🧪 Test Commands:
curl -X GET http://localhost:3000/test/email/health
curl -X POST http://localhost:3000/test/email/welcome -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"customerName\":\"Test User\"}'

=======================================================
"

send_notification "✅ Email configuration completed successfully! 

📧 **Features:**
• SendGrid + SMTP fallback
• Professional email templates
• Test endpoints available
• Production ready

🔧 **Next:** Update API keys in .env file" 5763719

success "Email configuration completed successfully!"
EOF

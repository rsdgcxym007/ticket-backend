#!/usr/bin/env node

/**
 * 📧 Direct SMTP Email Test Script
 * ทดสอบการส่งอีเมลผ่าน SMTP โดยตรงโดยไม่ผ่าน API
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

console.log('🔧 Starting Direct SMTP Email Test...\n');

// ตรวจสอบและโหลด environment variables
function loadEnvVars() {
  const envFiles = ['.env.production', '.env.development', '.env'];

  let envVars = {};

  for (const file of envFiles) {
    const envPath = path.join(__dirname, '..', file);
    if (fs.existsSync(envPath)) {
      console.log(`📄 Loading environment from: ${file}`);
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts
              .join('=')
              .trim()
              .replace(/^["']|["']$/g, '');
          }
        }
      }
      break;
    }
  }

  return envVars;
}

async function testSMTP() {
  try {
    const envVars = loadEnvVars();

    console.log('🔍 SMTP Configuration:');
    console.log(`   Host: ${envVars.SMTP_HOST || 'localhost'}`);
    console.log(`   Port: ${envVars.SMTP_PORT || 25}`);
    console.log(`   User: ${envVars.SMTP_USER || 'not set'}`);
    console.log(`   Pass: ${envVars.SMTP_PASS ? '***' : 'not set'}`);
    console.log();

    // กำหนดค่า transporter สำหรับ local SMTP
    const transporter = nodemailer.createTransport({
      host: envVars.SMTP_HOST || 'localhost',
      port: parseInt(envVars.SMTP_PORT) || 25,
      secure: false, // true for 465, false for other ports
      auth: envVars.SMTP_USER
        ? {
            user: envVars.SMTP_USER,
            pass: envVars.SMTP_PASS,
          }
        : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    });

    console.log('⚡ Testing transporter connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // ส่งอีเมลทดสอบ
    console.log('📧 Sending test email...');
    const info = await transporter.sendMail({
      from: 'noreply@patongboxingstadiumticket.com',
      to: 'rsdgcxym@gmail.com',
      subject: `🧪 Direct SMTP Test - ${new Date().toLocaleString('th-TH')}`,
      text: 'This is a test email from Patong Boxing Stadium Ticket System via direct SMTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">🥊 Patong Boxing Stadium</h2>
          <h3 style="color: #1976d2;">📧 Direct SMTP Test Result</h3>
          <p>This email was sent successfully via direct SMTP connection!</p>
          <hr>
          <p><strong>Test Details:</strong></p>
          <ul>
            <li>Date: ${new Date().toLocaleString('th-TH')}</li>
            <li>Method: Direct SMTP (Nodemailer)</li>
            <li>SMTP Host: ${envVars.SMTP_HOST || 'localhost'}</li>
            <li>SMTP Port: ${envVars.SMTP_PORT || 25}</li>
          </ul>
          <p style="color: #4caf50; font-weight: bold;">✅ Email system is working!</p>
        </div>
      `,
    });

    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log('\n📬 Please check your inbox for the test email.');
  } catch (error) {
    console.error('❌ SMTP Test failed:');
    console.error(`   Error: ${error.message}`);

    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }

    if (error.command) {
      console.error(`   Command: ${error.command}`);
    }

    console.log('\n🔍 Troubleshooting tips:');
    console.log('   1. Check if Postfix is running: systemctl status postfix');
    console.log('   2. Check SMTP port: ss -tlnp | grep :25');
    console.log('   3. Check mail logs: tail -f /var/log/mail.log');
    console.log('   4. Test local delivery: echo "test" | mail -s "test" root');
  }
}

// เรียกใช้ function
testSMTP().catch(console.error);

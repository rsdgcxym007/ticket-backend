#!/usr/bin/env node

/**
 * 📧 Email System Diagnostic & Test
 * ตรวจสอบและทดสอบระบบอีเมลแบบครบวงจร
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

console.log('🔧 Email System Diagnostic Starting...\n');

// โหลด environment variables
function loadEnvVars() {
  const envFiles = ['.env.production', '.env.development', '.env'];
  let envVars = {};

  for (const file of envFiles) {
    const envPath = path.join(__dirname, '..', file);
    if (fs.existsSync(envPath)) {
      console.log(`📄 Loading: ${file}`);
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

// ทดสอบ Gmail SMTP
async function testGmailSMTP() {
  try {
    const envVars = loadEnvVars();

    console.log('🔍 Gmail SMTP Configuration:');
    console.log(`   Host: ${envVars.SMTP_HOST || 'Not set'}`);
    console.log(`   Port: ${envVars.SMTP_PORT || 'Not set'}`);
    console.log(`   User: ${envVars.SMTP_USER || 'Not set'}`);
    console.log(
      `   Pass: ${envVars.SMTP_PASS ? '***' + envVars.SMTP_PASS.slice(-4) : 'Not set'}`,
    );
    console.log();

    if (!envVars.SMTP_USER || !envVars.SMTP_PASS) {
      throw new Error('SMTP credentials not configured');
    }

    // สร้าง transporter
    const transporter = nodemailer.createTransport({
      host: envVars.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(envVars.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: envVars.SMTP_USER,
        pass: envVars.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    console.log('⚡ Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    console.log('📧 Sending test email...');
    const testResult = await transporter.sendMail({
      from: `"Patong Boxing Stadium" <${envVars.SMTP_USER}>`,
      to: 'rsdgcxym@gmail.com',
      subject: `🧪 Email System Test - ${new Date().toLocaleString('th-TH')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d32f2f; text-align: center;">🥊 Patong Boxing Stadium</h2>
          <h3 style="color: #1976d2; text-align: center;">📧 Email System Test</h3>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4>✅ Email System Status: WORKING</h4>
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>Date: ${new Date().toLocaleString('th-TH')}</li>
              <li>SMTP Host: ${envVars.SMTP_HOST}</li>
              <li>SMTP User: ${envVars.SMTP_USER}</li>
              <li>Method: Gmail SMTP Direct</li>
            </ul>
          </div>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #2e7d32; font-weight: bold; margin: 0;">
              🎉 อีเมลระบบทำงานปกติแล้ว! ลูกค้าจะได้รับการยืนยันการสั่งซื้อตั๋วผ่านอีเมลนี้
            </p>
          </div>
          
          <hr style="margin: 30px 0;">
          <p style="text-align: center; color: #666; font-size: 12px;">
            Patong Boxing Stadium Ticket System<br>
            Server: 43.229.133.51 | Time: ${new Date().toISOString()}
          </p>
        </div>
      `,
      text: `Email System Test - ${new Date().toLocaleString('th-TH')}\n\nEmail system is working correctly!\nSMTP: ${envVars.SMTP_HOST}\nUser: ${envVars.SMTP_USER}`,
    });

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${testResult.messageId}`);
    console.log(`   Response: ${testResult.response || 'No response'}`);

    return true;
  } catch (error) {
    console.error('❌ Gmail SMTP test failed:');
    console.error(`   Error: ${error.message}`);

    if (error.code === 'EAUTH') {
      console.error('\n🔑 Authentication Error Solutions:');
      console.error(
        '   1. Check Gmail App Password: https://myaccount.google.com/apppasswords',
      );
      console.error('   2. Ensure 2-Step Verification is enabled');
      console.error('   3. Generate new App Password if needed');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n🌐 Connection Error Solutions:');
      console.error('   1. Check internet connection');
      console.error('   2. Verify SMTP host and port');
      console.error('   3. Check firewall settings');
    }

    return false;
  }
}

// ตรวจสอบการกำหนดค่าในแอป
async function checkAppConfiguration() {
  try {
    console.log('🔍 Checking NestJS application configuration...');

    // ตรวจสอบว่าแอปรันอยู่หรือไม่
    const http = require('http');

    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: 4000,
          path: '/api/v1',
          method: 'GET',
          timeout: 5000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode === 200 || data.includes('Backend is running')) {
              console.log('✅ NestJS application is running');
              resolve(true);
            } else {
              console.log('⚠️ NestJS application response unclear');
              resolve(false);
            }
          });
        },
      );

      req.on('error', (error) => {
        console.log('❌ NestJS application is not responding');
        console.log(`   Error: ${error.message}`);
        resolve(false);
      });

      req.on('timeout', () => {
        console.log('❌ NestJS application timeout');
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  } catch (error) {
    console.error('❌ App configuration check failed:', error.message);
    return false;
  }
}

// Main function
async function runDiagnostic() {
  console.log('🚀 Starting comprehensive email diagnostic...\n');

  const results = {
    smtp: false,
    app: false,
  };

  // ทดสอบ SMTP
  results.smtp = await testGmailSMTP();
  console.log();

  // ตรวจสอบแอป
  results.app = await checkAppConfiguration();
  console.log();

  // สรุปผลลัพธ์
  console.log('📊 DIAGNOSTIC SUMMARY:');
  console.log('════════════════════════');
  console.log(`   SMTP Connection: ${results.smtp ? '✅ OK' : '❌ FAILED'}`);
  console.log(`   NestJS App: ${results.app ? '✅ OK' : '❌ FAILED'}`);
  console.log();

  if (results.smtp && results.app) {
    console.log('🎉 EMAIL SYSTEM IS FULLY OPERATIONAL!');
    console.log('📧 Check your inbox: rsdgcxym@gmail.com');
  } else {
    console.log('⚠️ EMAIL SYSTEM NEEDS ATTENTION:');
    if (!results.smtp) console.log('   - Fix SMTP configuration');
    if (!results.app) console.log('   - Check NestJS application status');
  }

  console.log();
  console.log('🔍 Next steps:');
  console.log('   1. Check PM2 logs: pm2 logs ticket-backend-prod');
  console.log('   2. Monitor system: watch -n 1 "pm2 status && free -m"');
  console.log('   3. Test user journey: Create test order and check email');
}

// Run diagnostic
runDiagnostic().catch((error) => {
  console.error('❌ Diagnostic failed:', error.message);
  process.exit(1);
});

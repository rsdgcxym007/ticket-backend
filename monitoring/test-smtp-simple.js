#!/usr/bin/env node

/**
 * 📧 Simple SMTP Test (No Auth)
 * ทดสอบการส่งอีเมลผ่าน local Postfix โดยไม่ใช้ authentication
 */

const nodemailer = require('nodemailer');

console.log('🔧 Starting Simple SMTP Test (No Auth)...\n');

async function testSimpleSMTP() {
  try {
    // กำหนดค่า transporter สำหรับ local SMTP (ไม่ต้อง auth)
    const transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 25,
      secure: false,
      // ไม่ใช้ auth สำหรับ local postfix
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('⚡ Testing transporter connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // ส่งอีเมลทดสอบ
    console.log('📧 Sending test email...');
    const info = await transporter.sendMail({
      from: 'noreply@patongboxingstadiumticket.com',
      to: 'rsdgcxym@gmail.com',
      subject: `🧪 Local SMTP Test - ${new Date().toLocaleString('th-TH')}`,
      text: 'This is a test email from Patong Boxing Stadium Ticket System via local SMTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">🥊 Patong Boxing Stadium</h2>
          <h3 style="color: #1976d2;">📧 Local SMTP Test Result</h3>
          <p>This email was sent successfully via local SMTP connection!</p>
          <hr>
          <p><strong>Test Details:</strong></p>
          <ul>
            <li>Date: ${new Date().toLocaleString('th-TH')}</li>
            <li>Method: Local SMTP (No Auth)</li>
            <li>SMTP Host: localhost</li>
            <li>SMTP Port: 25</li>
          </ul>
          <p style="color: #4caf50; font-weight: bold;">✅ Local email system is working!</p>
        </div>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log('\n📬 Please check your inbox and mail logs.');
    
  } catch (error) {
    console.error('❌ SMTP Test failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
  }
}

// ทดสอบ Gmail SMTP ด้วย
async function testGmailSMTP() {
  try {
    console.log('\n🔧 Testing Gmail SMTP as fallback...\n');
    
    // กำหนดค่า Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'rsdgcxym@gmail.com',
        pass: 'jvwj gklh evbg kbnv' // App password
      }
    });

    console.log('⚡ Testing Gmail transporter connection...');
    await transporter.verify();
    console.log('✅ Gmail SMTP connection successful!\n');

    console.log('📧 Sending Gmail test email...');
    const info = await transporter.sendMail({
      from: '"Patong Boxing Stadium" <rsdgcxym@gmail.com>',
      to: 'rsdgcxym@gmail.com',
      subject: `🧪 Gmail SMTP Test - ${new Date().toLocaleString('th-TH')}`,
      text: 'This is a test email from Patong Boxing Stadium via Gmail SMTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">🥊 Patong Boxing Stadium</h2>
          <h3 style="color: #1976d2;">📧 Gmail SMTP Test Result</h3>
          <p>This email was sent successfully via Gmail SMTP!</p>
          <hr>
          <p><strong>Test Details:</strong></p>
          <ul>
            <li>Date: ${new Date().toLocaleString('th-TH')}</li>
            <li>Method: Gmail SMTP</li>
            <li>From: rsdgcxym@gmail.com</li>
          </ul>
          <p style="color: #4caf50; font-weight: bold;">✅ Gmail backup email system is working!</p>
        </div>
      `
    });

    console.log('✅ Gmail email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    
  } catch (error) {
    console.error('❌ Gmail SMTP Test failed:');
    console.error(`   Error: ${error.message}`);
  }
}

// เรียกใช้ทั้งสองการทดสอบ
async function runAllTests() {
  await testSimpleSMTP();
  await testGmailSMTP();
}

runAllTests().catch(console.error);

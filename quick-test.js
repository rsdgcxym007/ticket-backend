#!/usr/bin/env node

/**
 * 🚀 Quick Test Runner สำหรับระบบส่งอีเมลตั๋ว
 * รันทดสอบพื้นฐานและแสดงผลอย่างง่าย
 */

const axios = require('axios');

// Configuration
const CONFIG = {
  // Environment-aware base URL
  baseUrl:
    process.env.NODE_ENV === 'production'
      ? 'https://api-patongboxingstadiumticket.com'
      : 'http://localhost:4000',
  timeout: 30000,
  testEmail: 'info@patongboxingstadiumticket.com', // Production email
  domains: {
    production: {
      frontend: 'https://patongboxingstadiumticket.com',
      backend: 'https://api-patongboxingstadiumticket.com',
      api: 'https://api-patongboxingstadiumticket.com/api',
    },
    development: {
      frontend: 'http://localhost:3000',
      backend: 'http://localhost:4000',
      api: 'http://localhost:4000/api',
    },
  },
};

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function header(message) {
  console.log('\n' + '='.repeat(50));
  log(message, colors.bold + colors.cyan);
  console.log('='.repeat(50));
}

// HTTP Request Helper
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method: method.toLowerCase(),
      url: `${CONFIG.baseUrl}${endpoint}`,
      timeout: CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
      status: err.response?.status || 500,
    };
  }
}

// Test Cases
async function testApiHealth() {
  header('🏥 API Health Check');

  const response = await makeRequest('GET', '/health');

  if (response.success) {
    success('API server is running');
    info(`Status: ${response.status}`);
    return true;
  } else {
    error('API server is not responding');
    error(`Error: ${response.error}`);
    return false;
  }
}

async function testDirectEmailSending() {
  header('📧 Direct Email Test');

  const emailData = {
    orderId: `TEST-${Date.now()}`,
    recipientEmail: CONFIG.testEmail,
    recipientName: 'ผู้ทดสอบระบบ',
    ticketType: 'ตั๋วทดสอบระบบ',
    quantity: 2,
    showDate: '25 สิงหาคม 2568',
    totalAmount: 3000,
    seatNumbers: ['A1', 'A2'],
    includeQRCode: true,
    notes: 'นี่คือการทดสอบระบบส่งอีเมลอัตโนมัติ',
  };

  info('กำลังส่งอีเมลทดสอบ...');
  info(`ส่งไปยัง: ${CONFIG.testEmail}`);

  const response = await makeRequest(
    'POST',
    '/api/email/send-ticket',
    emailData,
  );

  if (response.success) {
    success('ส่งอีเมลทดสอบสำเร็จ!');
    info('กรุณาตรวจสอบอีเมลใน inbox');
    info(`Order ID: ${emailData.orderId}`);
    return true;
  } else {
    error('ส่งอีเมลทดสอบไม่สำเร็จ');
    error(`Error: ${JSON.stringify(response.error, null, 2)}`);
    return false;
  }
}

async function testEmailTemplates() {
  header('🎨 Email Templates Test');

  const response = await makeRequest('GET', '/api/email/templates');

  if (response.success) {
    success('ดึง Email Templates สำเร็จ');

    if (response.data.data && Array.isArray(response.data.data)) {
      info(`จำนวน Templates: ${response.data.data.length}`);
      response.data.data.forEach((template, index) => {
        info(`${index + 1}. ${template.name} (${template.type})`);
      });
    }
    return true;
  } else {
    error('ไม่สามารถดึง Email Templates ได้');
    error(`Error: ${response.error}`);
    return false;
  }
}

async function testSeatedTicketEmail() {
  header('🎫 Seated Ticket Email Test');

  const emailData = {
    orderId: `SEATED-${Date.now()}`,
    recipientEmail: CONFIG.testEmail,
    recipientName: 'คุณลูกค้าตั๋วที่นั่ง',
    ticketType: 'ตั๋วที่นั่ง VIP',
    quantity: 2,
    showDate: '20 สิงหาคม 2568',
    totalAmount: 4500,
    seatNumbers: ['VIP-A1', 'VIP-A2'],
    includeQRCode: true,
    notes: 'ตั๋วที่นั่ง VIP พร้อมสิทธิพิเศษ',
  };

  info('กำลังทดสอบอีเมลตั๋วที่นั่ง...');

  const response = await makeRequest(
    'POST',
    '/api/email/send-ticket',
    emailData,
  );

  if (response.success) {
    success('ส่งอีเมลตั๋วที่นั่งสำเร็จ!');
    info('✨ ควรมีข้อมูล: ชื่อลูกค้า, ที่นั่ง VIP-A1, VIP-A2, QR Code');
    return true;
  } else {
    error('ส่งอีเมลตั๋วที่นั่งไม่สำเร็จ');
    error(`Error: ${JSON.stringify(response.error, null, 2)}`);
    return false;
  }
}

async function testStandingTicketEmail() {
  header('🎪 Standing Ticket Email Test');

  const emailData = {
    orderId: `STANDING-${Date.now()}`,
    recipientEmail: CONFIG.testEmail,
    recipientName: 'คุณลูกค้าตั๋วยืน',
    ticketType: 'ตั๋วยืน',
    quantity: 3,
    showDate: '22 สิงหาคม 2568',
    totalAmount: 2400,
    seatNumbers: [],
    includeQRCode: true,
    notes: 'ขอบคุณที่ใช้บริการของเรา | ผู้ใหญ่ 2 คน, เด็ก 1 คน',
  };

  info('กำลังทดสอบอีเมลตั๋วยืน...');

  const response = await makeRequest(
    'POST',
    '/api/email/send-ticket',
    emailData,
  );

  if (response.success) {
    success('ส่งอีเมลตั๋วยืนสำเร็จ!');
    info(
      '✨ ควรมีข้อมูล: ชื่อลูกค้า, จำนวน 3 ใบ, ผู้ใหญ่ 2 คน เด็ก 1 คน, QR Code',
    );
    return true;
  } else {
    error('ส่งอีเมลตั๋วยืนไม่สำเร็จ');
    error(`Error: ${JSON.stringify(response.error, null, 2)}`);
    return false;
  }
}

async function testEmailWithoutQR() {
  header('📄 Email Without QR Test');

  const emailData = {
    orderId: `NO-QR-${Date.now()}`,
    recipientEmail: CONFIG.testEmail,
    recipientName: 'ทดสอบไม่มี QR',
    ticketType: 'ตั๋วธรรมดา',
    quantity: 1,
    showDate: '24 สิงหาคม 2568',
    totalAmount: 1200,
    seatNumbers: ['B10'],
    includeQRCode: false,
    notes: 'ทดสอบอีเมลที่ไม่มี QR Code',
  };

  info('กำลังทดสอบอีเมลไม่มี QR Code...');

  const response = await makeRequest(
    'POST',
    '/api/email/send-ticket',
    emailData,
  );

  if (response.success) {
    success('ส่งอีเมลไม่มี QR สำเร็จ!');
    info('✨ อีเมลนี้ไม่ควรมี QR Code section');
    return true;
  } else {
    error('ส่งอีเมลไม่มี QR ไม่สำเร็จ');
    error(`Error: ${JSON.stringify(response.error, null, 2)}`);
    return false;
  }
}

async function testLargeAmountFormatting() {
  header('💰 Large Amount Formatting Test');

  const emailData = {
    orderId: `LARGE-${Date.now()}`,
    recipientEmail: CONFIG.testEmail,
    recipientName: 'ทดสอบยอดเงินใหญ่',
    ticketType: 'ตั๋ว Premium',
    quantity: 5,
    showDate: '26 สิงหาคม 2568',
    totalAmount: 123456.78,
    seatNumbers: ['P1', 'P2', 'P3', 'P4', 'P5'],
    includeQRCode: true,
    notes: 'ทดสอบการแสดงผลยอดเงินขนาดใหญ่',
  };

  info('กำลังทดสอบการจัดรูปแบบยอดเงินใหญ่...');

  const response = await makeRequest(
    'POST',
    '/api/email/send-ticket',
    emailData,
  );

  if (response.success) {
    success('ส่งอีเมลยอดเงินใหญ่สำเร็จ!');
    info('✨ ยอดเงินควรแสดงเป็น ฿123,456.78');
    return true;
  } else {
    error('ส่งอีเมลยอดเงินใหญ่ไม่สำเร็จ');
    error(`Error: ${JSON.stringify(response.error, null, 2)}`);
    return false;
  }
}

// Main Test Runner
async function runAllTests() {
  console.clear();

  header('� PATONG BOXING STADIUM - EMAIL SYSTEM TESTS');
  log('ระบบทดสอบอีเมลตั๋วสำหรับสนามมวยป่าตอง', colors.bold);

  const currentEnv = process.env.NODE_ENV || 'development';
  const currentDomain =
    CONFIG.domains[currentEnv] || CONFIG.domains.development;

  info(`� Environment: ${currentEnv}`);
  info(`�🎯 Target Email: ${CONFIG.testEmail}`);
  info(`🌐 Frontend: ${currentDomain.frontend}`);
  info(`🔗 Backend: ${currentDomain.backend}`);
  info(`📱 API: ${currentDomain.api}`);
  info(`⏱️  Timeout: ${CONFIG.timeout}ms`);
  const testResults = [];

  try {
    // Test 1: API Health
    const healthCheck = await testApiHealth();
    testResults.push({ name: 'API Health Check', success: healthCheck });

    if (!healthCheck) {
      warning('⚠️  API server ไม่ทำงาน - หยุดการทดสอบ');
      showSummary(testResults);
      return;
    }

    // Test 2: Email Templates
    const templatesTest = await testEmailTemplates();
    testResults.push({ name: 'Email Templates', success: templatesTest });

    // Test 3: Direct Email
    const directEmailTest = await testDirectEmailSending();
    testResults.push({
      name: 'Direct Email Sending',
      success: directEmailTest,
    });

    // Test 4: Seated Ticket Email
    const seatedTest = await testSeatedTicketEmail();
    testResults.push({ name: 'Seated Ticket Email', success: seatedTest });

    // Test 5: Standing Ticket Email
    const standingTest = await testStandingTicketEmail();
    testResults.push({ name: 'Standing Ticket Email', success: standingTest });

    // Test 6: Email without QR
    const noQrTest = await testEmailWithoutQR();
    testResults.push({ name: 'Email without QR', success: noQrTest });

    // Test 7: Large Amount Formatting
    const largeAmountTest = await testLargeAmountFormatting();
    testResults.push({
      name: 'Large Amount Formatting',
      success: largeAmountTest,
    });
  } catch (error) {
    error(`🚨 เกิดข้อผิดพลาดในการทดสอบ: ${error.message}`);
    testResults.push({
      name: 'Overall Test',
      success: false,
      error: error.message,
    });
  }

  showSummary(testResults);
}

function showSummary(results) {
  header('📊 สรุปผลการทดสอบ');

  const passed = results.filter((r) => r.success).length;
  const total = results.length;

  if (passed === total) {
    success(`🎉 ผ่านทั้งหมด: ${passed}/${total}`);
  } else {
    warning(`⚠️  ผ่าน: ${passed}/${total}`);
  }

  console.log('\nรายละเอียด:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? colors.green : colors.red;
    log(`${index + 1}. ${result.name}: ${status}`, color);
  });

  console.log('\n' + '='.repeat(50));
  info('📧 กรุณาตรวจสอบอีเมลใน inbox ของ ' + CONFIG.testEmail);
  info('🎨 ตรวจสอบ design ว่าสวยงามและ responsive');
  info('📱 ทดสอบเปิดบนมือถือด้วย');
  info('📋 ตรวจสอบข้อมูลครบถ้วนตามที่ระบุ');

  if (passed < total) {
    warning('\n⚠️  หากมีการทดสอบไม่ผ่าน:');
    warning('1. ตรวจสอบ Gmail SMTP configuration');
    warning('2. ตรวจสอบ .env file');
    warning('3. ดู server logs สำหรับรายละเอียด error');
  } else {
    success('\n🚀 ระบบพร้อมใช้งานแล้ว!');
  }

  console.log('='.repeat(50));
}

// Run tests if called directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 Ticket Email System - Quick Test Runner

Usage:
  node quick-test.js [options]

Options:
  --help, -h          Show this help message
  --email <email>     Set test email address (default: ${CONFIG.testEmail})
  --url <url>         Set API base URL (default: ${CONFIG.baseUrl})

Examples:
  node quick-test.js
  node quick-test.js --email test@gmail.com
  node quick-test.js --url http://localhost:4000
    `);
    process.exit(0);
  }

  // Parse custom email
  const emailIndex = args.indexOf('--email');
  if (emailIndex !== -1 && args[emailIndex + 1]) {
    CONFIG.testEmail = args[emailIndex + 1];
  }

  // Parse custom URL
  const urlIndex = args.indexOf('--url');
  if (urlIndex !== -1 && args[urlIndex + 1]) {
    CONFIG.baseUrl = args[urlIndex + 1];
  }

  runAllTests().catch((err) => {
    error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testApiHealth,
  testDirectEmailSending,
  testSeatedTicketEmail,
  testStandingTicketEmail,
  CONFIG,
};

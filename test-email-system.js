#!/usr/bin/env node

/**
 * 🧪 Test Script สำหรับระบบส่งอีเมลตั๋วอัตโนมัติ
 * ทดสอบการส่งอีเมลหลังชำระเงินครบสำหรับตั๋วที่นั่งและตั๋วยืน
 */

const axios = require('axios');
const readline = require('readline');

// กำหนด Base URL ของ API
const BASE_URL = 'http://localhost:3000';
const API_ENDPOINTS = {
  // Order endpoints
  createSeatedOrder: '/api/order/seated',
  createStandingOrder: '/api/order/standing',

  // Payment endpoints
  makePayment: '/api/payment',

  // Email endpoints
  sendTicketEmail: '/api/email/send-ticket',
  getEmailTemplates: '/api/email/templates',

  // Test endpoints
  testEmail: '/api/email/test',
};

// ข้อมูลทดสอบ
const TEST_DATA = {
  // ข้อมูลลูกค้าสำหรับทดสอบ
  customers: [
    {
      name: 'ทดสอบ สมิท',
      email: 'test@example.com',
      phone: '0812345678',
    },
    {
      name: 'John Doe',
      email: 'john.doe@gmail.com',
      phone: '0823456789',
    },
    {
      name: 'นางสาวทดสอบ ระบบ',
      email: 'system.test@yahoo.com',
      phone: '0834567890',
    },
  ],

  // ข้อมูลตั๋วที่นั่ง
  seatedTickets: [
    {
      zoneId: 'zone-vip',
      seatNumbers: ['A1', 'A2'],
      quantity: 2,
      pricePerSeat: 1500,
      showDate: '2025-08-20',
    },
    {
      zoneId: 'zone-premium',
      seatNumbers: ['B5', 'B6', 'B7'],
      quantity: 3,
      pricePerSeat: 1200,
      showDate: '2025-08-21',
    },
  ],

  // ข้อมูลตั๋วยืน
  standingTickets: [
    {
      adultQty: 2,
      childQty: 1,
      adultPrice: 800,
      childPrice: 400,
      showDate: '2025-08-22',
    },
    {
      adultQty: 4,
      childQty: 0,
      adultPrice: 800,
      childPrice: 400,
      showDate: '2025-08-23',
    },
  ],
};

// สี ANSI สำหรับ console
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// ฟังก์ชัน Helper สำหรับการแสดงผล
function log(message, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, COLORS.green);
}

function logError(message) {
  log(`❌ ${message}`, COLORS.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, COLORS.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, COLORS.yellow);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  log(`${message}`, COLORS.bright + COLORS.cyan);
  console.log('='.repeat(60));
}

// ฟังก์ชันสำหรับรอ user input
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// ฟังก์ชันสำหรับ delay
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ฟังก์ชันสำหรับสร้าง HTTP request
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method: method.toLowerCase(),
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
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
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
    };
  }
}

// ✅ ทดสอบการเชื่อมต่อ API
async function testApiConnection() {
  logHeader('🔗 ทดสอบการเชื่อมต่อ API');

  try {
    const response = await makeRequest('GET', '/health');
    if (response.success) {
      logSuccess('API เชื่อมต่อสำเร็จ');
      logInfo(`Status: ${response.status}`);
      return true;
    } else {
      logError('API เชื่อมต่อไม่สำเร็จ');
      return false;
    }
  } catch (error) {
    logError(`ไม่สามารถเชื่อมต่อ API: ${error.message}`);
    return false;
  }
}

// 📧 ทดสอบระบบอีเมล
async function testEmailSystem() {
  logHeader('📧 ทดสอบระบบส่งอีเมล');

  // ทดสอบ Email Templates
  logInfo('กำลังทดสอบ Email Templates...');
  const templatesResponse = await makeRequest(
    'GET',
    API_ENDPOINTS.getEmailTemplates,
  );

  if (templatesResponse.success) {
    logSuccess('ดึง Email Templates สำเร็จ');
    console.log(JSON.stringify(templatesResponse.data, null, 2));
  } else {
    logError('ไม่สามารถดึง Email Templates');
    console.log(templatesResponse.error);
  }

  // ทดสอบส่งอีเมลตั๋ว
  const testCustomer = TEST_DATA.customers[0];
  const ticketEmailData = {
    orderId: 'TEST-001',
    recipientEmail: testCustomer.email,
    recipientName: testCustomer.name,
    ticketType: 'ตั๋วทดสอบ',
    quantity: 2,
    showDate: '2025-08-20',
    totalAmount: 3000,
    seatNumbers: ['A1', 'A2'],
    includeQRCode: true,
    notes: 'นี่คือการทดสอบระบบส่งอีเมล',
  };

  logInfo('กำลังทดสอบส่งอีเมลตั๋ว...');
  const emailResponse = await makeRequest(
    'POST',
    API_ENDPOINTS.sendTicketEmail,
    ticketEmailData,
  );

  if (emailResponse.success) {
    logSuccess(`ส่งอีเมลทดสอบสำเร็จไปยัง ${testCustomer.email}`);
  } else {
    logError('ส่งอีเมลทดสอบไม่สำเร็จ');
    console.log(emailResponse.error);
  }
}

// 🎫 ทดสอบการสร้างออเดอร์ตั๋วที่นั่ง
async function testSeatedTicketOrder() {
  logHeader('🎫 ทดสอบออเดอร์ตั๋วที่นั่ง');

  const customer = TEST_DATA.customers[0];
  const ticketInfo = TEST_DATA.seatedTickets[0];

  const orderData = {
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    zoneId: ticketInfo.zoneId,
    seatNumbers: ticketInfo.seatNumbers,
    quantity: ticketInfo.quantity,
    pricePerSeat: ticketInfo.pricePerSeat,
    showDate: ticketInfo.showDate,
    notes: 'ทดสอบการสั่งซื้อตั๋วที่นั่ง',
  };

  logInfo('กำลังสร้างออเดอร์ตั๋วที่นั่ง...');
  const orderResponse = await makeRequest(
    'POST',
    API_ENDPOINTS.createSeatedOrder,
    orderData,
  );

  if (orderResponse.success) {
    logSuccess('สร้างออเดอร์ตั๋วที่นั่งสำเร็จ');
    logInfo(`Order ID: ${orderResponse.data.orderId}`);
    logInfo(`Order Number: ${orderResponse.data.orderNumber}`);
    logInfo(`Total Amount: ฿${orderResponse.data.totalAmount}`);

    return {
      orderId: orderResponse.data.orderId,
      orderNumber: orderResponse.data.orderNumber,
      totalAmount: orderResponse.data.totalAmount,
      customerEmail: customer.email,
      flow: 'SEATED',
    };
  } else {
    logError('สร้างออเดอร์ตั๋วที่นั่งไม่สำเร็จ');
    console.log(orderResponse.error);
    return null;
  }
}

// 🎪 ทดสอบการสร้างออเดอร์ตั๋วยืน
async function testStandingTicketOrder() {
  logHeader('🎪 ทดสอบออเดอร์ตั๋วยืน');

  const customer = TEST_DATA.customers[1];
  const ticketInfo = TEST_DATA.standingTickets[0];

  const orderData = {
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    standingAdultQty: ticketInfo.adultQty,
    standingChildQty: ticketInfo.childQty,
    adultPrice: ticketInfo.adultPrice,
    childPrice: ticketInfo.childPrice,
    showDate: ticketInfo.showDate,
    notes: 'ทดสอบการสั่งซื้อตั๋วยืน',
  };

  logInfo('กำลังสร้างออเดอร์ตั๋วยืน...');
  const orderResponse = await makeRequest(
    'POST',
    API_ENDPOINTS.createStandingOrder,
    orderData,
  );

  if (orderResponse.success) {
    logSuccess('สร้างออเดอร์ตั๋วยืนสำเร็จ');
    logInfo(`Order ID: ${orderResponse.data.orderId}`);
    logInfo(`Order Number: ${orderResponse.data.orderNumber}`);
    logInfo(`Total Amount: ฿${orderResponse.data.totalAmount}`);

    return {
      orderId: orderResponse.data.orderId,
      orderNumber: orderResponse.data.orderNumber,
      totalAmount: orderResponse.data.totalAmount,
      customerEmail: customer.email,
      flow: 'STANDING',
    };
  } else {
    logError('สร้างออเดอร์ตั๋วยืนไม่สำเร็จ');
    console.log(orderResponse.error);
    return null;
  }
}

// 💳 ทดสอบการชำระเงินและส่งอีเมลอัตโนมัติ
async function testPaymentAndEmail(orderInfo) {
  logHeader(`💳 ทดสอบการชำระเงิน ${orderInfo.flow}`);

  // ชำระเงินครึ่งหนึ่งก่อน (ไม่ควรส่งอีเมล)
  const partialAmount = Math.floor(orderInfo.totalAmount / 2);

  logInfo(`กำลังชำระเงินบางส่วน: ฿${partialAmount}`);
  const partialPaymentData = {
    orderId: orderInfo.orderId,
    amount: partialAmount,
    method: 'CASH',
    notes: 'ชำระเงินบางส่วน - ทดสอบ',
  };

  const partialPaymentResponse = await makeRequest(
    'POST',
    API_ENDPOINTS.makePayment,
    partialPaymentData,
  );

  if (partialPaymentResponse.success) {
    logSuccess('ชำระเงินบางส่วนสำเร็จ (ไม่ควรส่งอีเมล)');
    logInfo(`จำนวนที่ชำระ: ฿${partialAmount}`);
    logInfo(`ยอดคงเหลือ: ฿${orderInfo.totalAmount - partialAmount}`);
  } else {
    logError('ชำระเงินบางส่วนไม่สำเร็จ');
    console.log(partialPaymentResponse.error);
    return false;
  }

  // รอสักครู่แล้วชำระส่วนที่เหลือ (ควรส่งอีเมล)
  await delay(2000);

  const remainingAmount = orderInfo.totalAmount - partialAmount;
  logInfo(`กำลังชำระเงินส่วนที่เหลือ: ฿${remainingAmount}`);

  const finalPaymentData = {
    orderId: orderInfo.orderId,
    amount: remainingAmount,
    method: 'TRANSFER',
    notes: 'ชำระเงินครบ - ควรส่งอีเมลตั๋ว',
  };

  const finalPaymentResponse = await makeRequest(
    'POST',
    API_ENDPOINTS.makePayment,
    finalPaymentData,
  );

  if (finalPaymentResponse.success) {
    logSuccess('✨ ชำระเงินครบสำเร็จ (ควรส่งอีเมลตั๋วแล้ว)');
    logInfo(`จำนวนที่ชำระครั้งนี้: ฿${remainingAmount}`);
    logInfo(`ยอดรวมที่ชำระ: ฿${orderInfo.totalAmount}`);
    logInfo(`📧 อีเมลตั๋วควรส่งไปยัง: ${orderInfo.customerEmail}`);

    // แสดงข้อมูลการชำระเงิน
    if (finalPaymentResponse.data.payment) {
      const payment = finalPaymentResponse.data.payment;
      logInfo(`Payment ID: ${payment.id}`);
      logInfo(`Payment Status: ${payment.status || 'COMPLETED'}`);
      logInfo(
        `Is Fully Paid: ${finalPaymentResponse.data.isFullyPaid ? 'YES' : 'NO'}`,
      );
    }

    return true;
  } else {
    logError('ชำระเงินครบไม่สำเร็จ');
    console.log(finalPaymentResponse.error);
    return false;
  }
}

// 📊 สรุปผลการทดสอบ
function showTestSummary(results) {
  logHeader('📊 สรุปผลการทดสอบ');

  const passed = results.filter((r) => r.success).length;
  const total = results.length;

  log(
    `ผลการทดสอบ: ${passed}/${total} ผ่าน`,
    passed === total ? COLORS.green : COLORS.yellow,
  );

  console.log('\nรายละเอียดการทดสอบ:');
  results.forEach((result, index) => {
    const status = result.success ? '✅ ผ่าน' : '❌ ไม่ผ่าน';
    const color = result.success ? COLORS.green : COLORS.red;
    log(`${index + 1}. ${result.name}: ${status}`, color);
    if (!result.success && result.error) {
      log(`   Error: ${result.error}`, COLORS.red);
    }
  });

  if (passed === total) {
    logSuccess('\n🎉 ระบบส่งอีเมลตั๋วทำงานได้สมบูรณ์!');
  } else {
    logWarning('\n⚠️  มีบางส่วนที่ต้องตรวจสอบและแก้ไข');
  }
}

// 🚀 Main Test Function
async function runAllTests() {
  console.clear();
  logHeader('🧪 TICKET EMAIL SYSTEM - COMPREHENSIVE TEST');
  log('ระบบทดสอบการส่งอีเมลตั๋วอัตโนมัติ', COLORS.bright);

  const testResults = [];

  try {
    // 1. ทดสอบการเชื่อมต่อ API
    logInfo('เริ่มการทดสอบระบบ...\n');
    const apiConnected = await testApiConnection();
    testResults.push({
      name: 'การเชื่อมต่อ API',
      success: apiConnected,
    });

    if (!apiConnected) {
      logError(
        'ไม่สามารถเชื่อมต่อ API ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่',
      );
      showTestSummary(testResults);
      return;
    }

    // 2. ทดสอบระบบอีเมล
    try {
      await testEmailSystem();
      testResults.push({
        name: 'ระบบส่งอีเมล',
        success: true,
      });
    } catch (error) {
      testResults.push({
        name: 'ระบบส่งอีเมล',
        success: false,
        error: error.message,
      });
    }

    // 3. ทดสอบออเดอร์ตั๋วที่นั่ง
    let seatedOrderInfo = null;
    try {
      seatedOrderInfo = await testSeatedTicketOrder();
      testResults.push({
        name: 'สร้างออเดอร์ตั๋วที่นั่ง',
        success: !!seatedOrderInfo,
      });
    } catch (error) {
      testResults.push({
        name: 'สร้างออเดอร์ตั๋วที่นั่ง',
        success: false,
        error: error.message,
      });
    }

    // 4. ทดสอบออเดอร์ตั๋วยืน
    let standingOrderInfo = null;
    try {
      standingOrderInfo = await testStandingTicketOrder();
      testResults.push({
        name: 'สร้างออเดอร์ตั๋วยืน',
        success: !!standingOrderInfo,
      });
    } catch (error) {
      testResults.push({
        name: 'สร้างออเดอร์ตั๋วยืน',
        success: false,
        error: error.message,
      });
    }

    // 5. ทดสอบการชำระเงินและส่งอีเมลสำหรับตั๋วที่นั่ง
    if (seatedOrderInfo) {
      try {
        const seatedPaymentSuccess = await testPaymentAndEmail(seatedOrderInfo);
        testResults.push({
          name: 'ชำระเงินและส่งอีเมล (ตั๋วที่นั่ง)',
          success: seatedPaymentSuccess,
        });
      } catch (error) {
        testResults.push({
          name: 'ชำระเงินและส่งอีเมล (ตั๋วที่นั่ง)',
          success: false,
          error: error.message,
        });
      }
    }

    // 6. ทดสอบการชำระเงินและส่งอีเมลสำหรับตั๋วยืน
    if (standingOrderInfo) {
      try {
        const standingPaymentSuccess =
          await testPaymentAndEmail(standingOrderInfo);
        testResults.push({
          name: 'ชำระเงินและส่งอีเมล (ตั๋วยืน)',
          success: standingPaymentSuccess,
        });
      } catch (error) {
        testResults.push({
          name: 'ชำระเงินและส่งอีเมล (ตั๋วยืน)',
          success: false,
          error: error.message,
        });
      }
    }
  } catch (error) {
    logError(`เกิดข้อผิดพลาดในการทดสอบ: ${error.message}`);
  }

  // แสดงสรุปผลการทดสอบ
  showTestSummary(testResults);

  // คำแนะนำสำหรับขั้นตอนถัดไป
  console.log('\n' + '='.repeat(60));
  logInfo('📋 คำแนะนำหลังการทดสอบ:');
  console.log('1. ตรวจสอบอีเมลใน inbox ของผู้ทดสอบ');
  console.log('2. ตรวจสอบ logs ในเซิร์ฟเวอร์สำหรับรายละเอียดการส่งอีเมล');
  console.log('3. ทดสอบ QR Code ว่าสามารถสแกนได้');
  console.log('4. ตรวจสอบ responsive design ของอีเมลบนมือถือ');
  console.log('='.repeat(60));
}

// Interactive Menu
async function showInteractiveMenu() {
  while (true) {
    console.log('\n' + '='.repeat(50));
    log('🎯 เลือกการทดสอบ:', COLORS.bright + COLORS.cyan);
    console.log('1. ทดสอบทั้งหมดอัตโนมัติ');
    console.log('2. ทดสอบเฉพาะระบบอีเมล');
    console.log('3. ทดสอบเฉพาะออเดอร์ตั๋วที่นั่ง');
    console.log('4. ทดสอบเฉพาะออเดอร์ตั๋วยืน');
    console.log('5. ทดสอบ API Connection');
    console.log('0. ออกจากโปรแกรม');
    console.log('='.repeat(50));

    const choice = await askQuestion('เลือกหมายเลข (0-5): ');

    switch (choice) {
      case '1':
        await runAllTests();
        break;
      case '2':
        await testEmailSystem();
        break;
      case '3':
        const seatedOrder = await testSeatedTicketOrder();
        if (seatedOrder) {
          await testPaymentAndEmail(seatedOrder);
        }
        break;
      case '4':
        const standingOrder = await testStandingTicketOrder();
        if (standingOrder) {
          await testPaymentAndEmail(standingOrder);
        }
        break;
      case '5':
        await testApiConnection();
        break;
      case '0':
        log('👋 ขอบคุณที่ใช้ระบบทดสอบ!', COLORS.green);
        process.exit(0);
      default:
        logWarning('กรุณาเลือกหมายเลข 0-5');
    }

    await askQuestion('\nกด Enter เพื่อดำเนินการต่อ...');
  }
}

// เริ่มโปรแกรม
if (require.main === module) {
  console.log('🚀 เริ่มต้นระบบทดสอบ...');

  // ตรวจสอบ arguments
  const args = process.argv.slice(2);
  if (args.includes('--auto') || args.includes('-a')) {
    runAllTests();
  } else {
    showInteractiveMenu();
  }
}

module.exports = {
  runAllTests,
  testEmailSystem,
  testSeatedTicketOrder,
  testStandingTicketOrder,
  testPaymentAndEmail,
};

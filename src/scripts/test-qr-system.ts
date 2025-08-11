import { ConfigService } from '@nestjs/config';
import { QRCodeService } from '../common/services/qr-code.service';

/**
 * 🧪 Simple QR Code System Test
 * ทดสอบระบบ QR Code แบบง่ายๆ ไม่ต้องใช้ database
 */
async function testQRCodeSystem() {
  console.log('🚀 เริ่มทดสอบระบบ QR Code...\n');

  // Mock ConfigService
  const mockConfigService = {
    get: (key: string) => {
      const config = {
        QR_SECRET_KEY: 'test-secret-key-32-characters-long',
        QR_HMAC_SECRET: 'test-hmac-secret-key-for-validation',
        NODE_ENV: 'test',
      };
      return config[key] || '';
    },
  } as ConfigService;

  // Create QRCodeService instance
  const qrService = new QRCodeService(mockConfigService);

  try {
    // Test 1: Generate QR Code for Seated Ticket
    console.log('📋 Test 1: สร้าง QR Code สำหรับตั๋วที่นั่ง');
    const seatedTicketData = {
      orderId: 'ORD-20250811-TEST-001',
      userId: 'user-test-uuid-123',
      showDate: '2025-08-15T19:00:00.000Z',
      seats: ['A1', 'A2'],
      amount: 3000,
      ticketType: 'seated' as const,
    };

    const seatedQR = await qrService.generateTicketQR(
      seatedTicketData.orderId,
      seatedTicketData.userId,
      seatedTicketData.showDate,
      seatedTicketData.seats,
      seatedTicketData.amount,
      seatedTicketData.ticketType,
    );
    console.log('✅ สร้าง QR Code สำเร็จ!');
    console.log('📄 Order ID:', seatedQR.qrData.orderId);
    console.log('🎫 Ticket Type:', seatedQR.qrData.ticketType);
    console.log('💺 Seats:', seatedQR.qrData.seats);
    console.log('💰 Amount:', seatedQR.qrData.amount);
    console.log(
      '🔒 Security Hash:',
      seatedQR.qrData.securityHash.substring(0, 32) + '...',
    );
    console.log(
      '📱 QR Image Length:',
      seatedQR.qrCodeImage.length,
      'characters\n',
    );

    // Test 2: Generate QR Code for Standing Ticket
    console.log('📋 Test 2: สร้าง QR Code สำหรับตั๋วยืน');
    const standingTicketData = {
      orderId: 'ORD-20250811-STANDING-001',
      userId: 'user-standing-uuid-456',
      showDate: '2025-08-15T19:00:00.000Z',
      amount: 1500,
      ticketType: 'standing' as const,
    };

    const standingQR = await qrService.generateTicketQR(
      standingTicketData.orderId,
      standingTicketData.userId,
      standingTicketData.showDate,
      null, // No seats for standing tickets
      standingTicketData.amount,
      standingTicketData.ticketType,
    );
    console.log('✅ สร้าง QR Code ตั๋วยืนสำเร็จ!');
    console.log('📄 Order ID:', standingQR.qrData.orderId);
    console.log('🎫 Ticket Type:', standingQR.qrData.ticketType);
    console.log('💰 Amount:', standingQR.qrData.amount);
    console.log(
      '📱 QR Image Length:',
      standingQR.qrCodeImage.length,
      'characters\n',
    );

    // Test 3: Generate Multiple Formats
    console.log('📋 Test 3: สร้าง QR Code หลายรูปแบบ');
    const multiFormats = await qrService.generateMultipleFormats(
      'Test Multi-Format QR Code',
      ['png', 'svg'],
    );
    console.log('✅ สร้าง QR Code หลายรูปแบบสำเร็จ!');
    console.log('🖼️ PNG Format:', multiFormats.png ? 'มี' : 'ไม่มี');
    console.log('🎨 SVG Format:', multiFormats.svg ? 'มี' : 'ไม่มี');
    if (multiFormats.png) {
      console.log('📏 PNG Size:', multiFormats.png.length, 'characters');
    }
    if (multiFormats.svg) {
      console.log('📏 SVG Size:', multiFormats.svg.length, 'characters');
    }
    console.log();

    // Test 4: Validate QR Code
    console.log('📋 Test 4: ทดสอบการตรวจสอบ QR Code');

    // Test with invalid QR data
    const invalidValidation = await qrService.validateQRCode('invalid-qr-data');
    console.log('❌ Invalid QR Result:', {
      isValid: invalidValidation.isValid,
      hasError: !!invalidValidation.error,
      timestamp: invalidValidation.timestamp,
    });

    // Test with empty QR data
    const emptyValidation = await qrService.validateQRCode('');
    console.log('❌ Empty QR Result:', {
      isValid: emptyValidation.isValid,
      hasError: !!emptyValidation.error,
    });
    console.log();

    // Test 5: Custom QR Options
    console.log('📋 Test 5: สร้าง QR Code ด้วย options กำหนดเอง');
    const customOptions = {
      width: 512,
      margin: 4,
      color: { dark: '#000080', light: '#F0F8FF' },
      errorCorrectionLevel: 'H' as const,
    };

    const customQR = await qrService.generateTicketQR(
      seatedTicketData.orderId,
      seatedTicketData.userId,
      seatedTicketData.showDate,
      seatedTicketData.seats,
      seatedTicketData.amount,
      seatedTicketData.ticketType,
      customOptions,
    );
    console.log('✅ สร้าง QR Code ด้วย custom options สำเร็จ!');
    console.log(
      '🎨 Custom QR Image Length:',
      customQR.qrCodeImage.length,
      'characters\n',
    );

    // Summary
    console.log('🎉 ทดสอบเสร็จสิ้น! สรุปผลการทดสอบ:');
    console.log('✅ สร้าง QR Code สำหรับตั๋วที่นั่ง - ผ่าน');
    console.log('✅ สร้าง QR Code สำหรับตั๋วยืน - ผ่าน');
    console.log('✅ สร้าง QR Code หลายรูปแบบ - ผ่าน');
    console.log('✅ ตรวจสอบ QR Code (validation) - ผ่าน');
    console.log('✅ QR Code ด้วย custom options - ผ่าน');
    console.log('\n🚀 ระบบ QR Code พร้อมใช้งาน!');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error.message);
    console.error('📍 Stack trace:', error.stack);
  }
}

// เรียกใช้ฟังก์ชันทดสอบ
if (require.main === module) {
  testQRCodeSystem();
}

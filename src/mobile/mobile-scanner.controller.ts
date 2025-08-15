import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
  Query,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, AttendanceStatus } from '../common/enums';
import { QRCodeService } from '../common/services/qr-code.service';
import { OrderService } from '../order/order.service';
import {
  ScanQRCodeDto,
  BulkScanDto,
  ScanHistoryDto,
  ScanStatsDto,
} from './dto/mobile-scanner.dto';

@ApiTags('📱 Mobile Scanner API')
@Controller('api/v1/mobile/scanner')
export class MobileScannerController {
  private readonly logger = new Logger(MobileScannerController.name);

  constructor(
    private readonly qrCodeService: QRCodeService,
    private readonly orderService: OrderService,
  ) {}

  /**
   * 🌐 Public QR Code Handler - แสดงข้อมูลลูกค้า (ไม่ต้อง Auth)
   */
  @Get('check-in/:orderId')
  @ApiOperation({
    summary: 'แสดงข้อมูลลูกค้าจาก QR Code (Public Access)',
    description: 'แสดงข้อมูลลูกค้าและฟอร์ม Staff Login เพื่อเช็คอิน',
  })
  async publicCheckIn(
    @Param('orderId') orderId: string,
    @Query('qr') qrData: string,
    @Res() res: any,
  ) {
    try {
      // 📋 Log scan activity
      this.logger.log(
        `🔍 QR Code Scan: orderId=${orderId}, path=/mobile/scanner/check-in/${orderId}, qr=${qrData ? 'present' : 'missing'}`,
      );

      // ตรวจสอบ QR Code
      const validation = await this.qrCodeService.validateQRCode(qrData);

      if (!validation.isValid) {
        this.logger.warn(
          `❌ QR Code validation failed: orderId=${orderId}, error=${validation.error}`,
        );
        const errorHtml = this.generateCustomerInfoHTML({
          status: 'error',
          title: 'QR Code ไม่ถูกต้อง',
          message: validation.error || 'QR Code หมดอายุหรือไม่ถูกต้อง',
          orderId,
        });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(errorHtml);
      }

      // ดึงข้อมูลออเดอร์
      const order = await this.orderService.findById(orderId);

      if (!order) {
        this.logger.warn(`❌ Order not found: orderId=${orderId}`);
        const errorHtml = this.generateCustomerInfoHTML({
          status: 'error',
          title: 'ไม่พบข้อมูลออเดอร์',
          message: 'ไม่พบข้อมูลออเดอร์ในระบบ',
          orderId,
        });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(errorHtml);
      }

      this.logger.log(
        `✅ QR Code scan successful: orderId=${orderId}, customerName=${order.customerName}, attendanceStatus=${order.attendanceStatus}`,
      );

      // แสดงข้อมูลลูกค้าและฟอร์มสำหรับ Staff Login
      const html = this.generateCustomerInfoHTML({
        status:
          order.attendanceStatus === AttendanceStatus.CHECKED_IN
            ? 'checked'
            : 'info',
        title:
          order.attendanceStatus === AttendanceStatus.CHECKED_IN
            ? 'เช็คอินแล้ว'
            : 'ข้อมูลลูกค้า',
        message:
          order.attendanceStatus === AttendanceStatus.CHECKED_IN
            ? 'ลูกค้าได้เช็คอินเรียบร้อยแล้ว'
            : 'กรุณาให้เจ้าหน้าที่ทำการเช็คอิน',
        orderId,
        order,
        qrData,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการเข้าถึง Public Check-in: ${error.message}`,
      );
      const errorHtml = this.generateCustomerInfoHTML({
        status: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง',
        orderId,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(errorHtml);
    }
  }

  /**
   * 🔐 Staff Login และเช็คอิน (Protected)
   */
  @Post('staff-checkin')
  @ApiOperation({
    summary: 'Staff Login และเช็คอิน',
    description: 'Staff Login ด้วย username/password และทำการเช็คอิน',
  })
  async staffCheckIn(
    @Body()
    body: {
      orderId: string;
      qrData: string;
      username: string;
      password: string;
    },
    @Res() res: any,
  ) {
    try {
      const { orderId, qrData, username, password } = body;

      // 📋 Log staff checkin attempt with path
      this.logger.log(
        `🔐 Staff Check-in attempt: orderId=${orderId}, username=${username}, path=/mobile/scanner/staff-checkin`,
      );

      // ตรวจสอบ Staff credentials
      if (!this.validateStaffCredentials(username, password)) {
        this.logger.warn(
          `❌ Staff login failed: username=${username}, orderId=${orderId}, path=/mobile/scanner/staff-checkin`,
        );
        const errorHtml = this.generateCustomerInfoHTML({
          status: 'error',
          title: 'การเข้าสู่ระบบไม่สำเร็จ',
          message: 'Username หรือ Password ไม่ถูกต้อง',
          orderId,
        });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(errorHtml);
      }

      // ตรวจสอบ QR Code
      const validation = await this.qrCodeService.validateQRCode(qrData);

      if (!validation.isValid) {
        const errorHtml = this.generateCustomerInfoHTML({
          status: 'error',
          title: 'เช็คอินไม่สำเร็จ',
          message: validation.error || 'QR Code ไม่ถูกต้อง',
          orderId,
        });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(errorHtml);
      }

      // อัพเดท Attendance Status
      const updatedOrder = await this.orderService.updateAttendanceStatus(
        orderId,
        AttendanceStatus.CHECKED_IN,
        username, // ใช้ username เป็น Staff ID
      );

      this.logger.log(
        `✅ Staff Check-in สำเร็จ - Order: ${orderId}, Staff: ${username}`,
      );

      // แสดงผลสำเร็จ
      const successHtml = this.generateCustomerInfoHTML({
        status: 'success',
        title: 'เช็คอินสำเร็จ! 🎉',
        message: `เช็คอินโดย: ${username}`,
        orderId,
        order: updatedOrder,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(successHtml);
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการ Staff Check-in: ${error.message}`,
      );
      const errorHtml = this.generateCustomerInfoHTML({
        status: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง',
        orderId: body?.orderId || 'Unknown',
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(errorHtml);
    }
  }

  /**
   * 📱 สแกน QR Code ด้วย Mobile App (Staff Only)
   */
  @Post('scan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({
    summary: 'สแกน QR Code ด้วย Mobile App',
    description:
      'สแกนและตรวจสอบ QR Code จากบัตรลูกค้า (สำหรับ Staff และ Admin เท่านั้น)',
  })
  async scanQRCode(@Body() scanDto: ScanQRCodeDto, @Req() req: any) {
    try {
      const staffId = req.user.id;
      const staffName = req.user.name || 'Unknown Staff';

      // 📋 Log scan activity with full path
      this.logger.log(
        `🔍 QR Code Scan: staffId=${staffId}, staffName=${staffName}, path=/mobile/scanner/scan, qrData=${scanDto.qrData.substring(0, 30)}...`,
      );

      this.logger.log(
        `📱 Staff ${staffName} กำลังสแกน QR Code: ${scanDto.qrData.substring(0, 20)}...`,
      );

      // ตรวจสอบ QR Code
      const validation = await this.qrCodeService.validateQRCode(
        scanDto.qrData,
      );

      if (!validation.isValid) {
        this.logger.warn(
          `❌ QR Code ไม่ถูกต้อง - Staff: ${staffName}, Error: ${validation.error}, path=/mobile/scanner/scan`,
        );
        return {
          success: false,
          data: null,
          message: validation.error || 'QR Code ไม่ถูกต้อง',
          timestamp: new Date().toISOString(),
        };
      }

      // อัพเดท Attendance Status
      const updatedOrder = await this.orderService.updateAttendanceStatus(
        validation.data.orderId,
        AttendanceStatus.CHECKED_IN,
        staffId,
      );

      this.logger.log(
        `✅ เช็คอินสำเร็จ - Order: ${validation.data?.orderId}, Staff: ${staffName}, path=/mobile/scanner/scan`,
      );

      return {
        success: true,
        data: {
          orderId: validation.data?.orderId,
          isValid: true,
          attendanceStatus: updatedOrder.attendanceStatus,
          customerName: updatedOrder.customerName,
          customerPhone: updatedOrder.customerPhone || '',
          ticketType: validation.data?.ticketType,
          seats: validation.data?.seats,
          checkInTime: new Date().toISOString(),
        },
        message: 'เช็คอินสำเร็จ',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ เกิดข้อผิดพลาดในการสแกน QR Code: ${error.message}`);
      throw new HttpException(
        'เกิดข้อผิดพลาดในการสแกน QR Code',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 🔍 ตรวจสอบ Staff credentials
   */
  private validateStaffCredentials(
    username: string,
    password: string,
  ): boolean {
    // TODO: เชื่อมต่อกับระบบ Authentication จริง
    // สำหรับตอนนี้ใช้ข้อมูลง่ายๆ
    const validCredentials = [
      { username: 'staff1', password: 'staff123' },
      { username: 'staff2', password: 'staff456' },
      { username: 'admin', password: 'admin123' },
    ];

    return validCredentials.some(
      (cred) => cred.username === username && cred.password === password,
    );
  }

  /**
   * 🎨 สร้าง HTML สำหรับแสดงข้อมูลลูกค้า
   */
  private generateCustomerInfoHTML(params: {
    status: 'info' | 'error' | 'success' | 'checked';
    title: string;
    message: string;
    orderId: string;
    order?: any;
    qrData?: string;
  }): string {
    const { status, title, message, orderId, order, qrData } = params;

    // สีและไอคอนตามสถานะ
    const statusConfig = {
      info: {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        buttonColor: 'bg-blue-600 hover:bg-blue-700',
        icon: `<svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
      },
      error: {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600',
        buttonColor: 'bg-red-600 hover:bg-red-700',
        icon: `<svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>`,
      },
      success: {
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600',
        buttonColor: 'bg-green-600 hover:bg-green-700',
        icon: `<svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>`,
      },
      checked: {
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600',
        buttonColor: 'bg-green-600 hover:bg-green-700',
        icon: `<svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
      },
    };

    const config = statusConfig[status];

    return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - ${orderId}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Prompt', sans-serif; }
            .pulse-animation {
                animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
        </style>
    </head>
    <body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
        <div class="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
            <!-- Header -->
            <div class="${config.bgColor} ${config.borderColor} border-b px-6 py-4">
                <div class="flex items-center space-x-3">
                    <div class="${config.iconColor}">
                        ${config.icon}
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-gray-800">${title}</h1>
                        <p class="text-sm text-gray-600">Order: ${orderId}</p>
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div class="p-6">
                <p class="text-gray-700 mb-6">${message}</p>

                ${
                  order
                    ? `
                <!-- Customer Info -->
                <div class="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 class="font-semibold text-gray-800 mb-3">ข้อมูลลูกค้า</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">ชื่อ:</span>
                            <span class="font-medium">${order.customerName || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">โทรศัพท์:</span>
                            <span class="font-medium">${order.customerPhone || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">ประเภทตั๋ว:</span>
                            <span class="font-medium">${order.ticketType || 'N/A'}</span>
                        </div>
                        ${
                          order.seats && order.seats.length > 0
                            ? `
                        <div class="flex justify-between">
                            <span class="text-gray-600">ที่นั่ง:</span>
                            <span class="font-medium">${order.seats.join(', ')}</span>
                        </div>
                        `
                            : ''
                        }
                        <div class="flex justify-between">
                            <span class="text-gray-600">จำนวนเงิน:</span>
                            <span class="font-medium">${(order.total || 0).toLocaleString()} บาท</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">สถานะ:</span>
                            <span class="font-medium ${order.attendanceStatus === 'CHECKED_IN' ? 'text-green-600' : 'text-yellow-600'}">
                                ${order.attendanceStatus === 'CHECKED_IN' ? '✅ เช็คอินแล้ว' : '⏳ รอเช็คอิน'}
                            </span>
                        </div>
                    </div>
                </div>
                `
                    : ''
                }

                <!-- Actions -->
                <div class="space-y-3">
                    ${
                      status === 'info' &&
                      qrData &&
                      order?.attendanceStatus !== 'CHECKED_IN'
                        ? `
                    <!-- Staff Login Form -->
                    <form id="staffLoginForm" class="space-y-3">
                        <input type="hidden" name="orderId" value="${orderId}">
                        <input type="hidden" name="qrData" value="${qrData}">
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input type="text" name="username" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="ใส่ username">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input type="password" name="password" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="ใส่ password">
                        </div>
                        
                        <button type="submit" class="${config.buttonColor} w-full text-white font-medium py-3 px-4 rounded-lg transition duration-200">
                            🔐 เข้าสู่ระบบและเช็คอิน
                        </button>
                    </form>
                    `
                        : ''
                    }
                    
                    <button onclick="window.close()" class="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200">
                        ปิดหน้านี้
                    </button>
                </div>

                <!-- Timestamp -->
                <div class="mt-6 pt-4 border-t border-gray-200 text-center">
                    <p class="text-xs text-gray-500">
                        ${new Date().toLocaleString('th-TH')}
                    </p>
                </div>
            </div>
        </div>

        <script>
            document.getElementById('staffLoginForm')?.addEventListener('submit', function(e) {
                e.preventDefault();
                const button = this.querySelector('button[type="submit"]');
                const formData = new FormData(this);
                
                button.disabled = true;
                button.innerHTML = '⏳ กำลังเข้าสู่ระบบ...';
                
                fetch('/api/v1/mobile/scanner/staff-checkin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        orderId: formData.get('orderId'),
                        qrData: formData.get('qrData'),
                        username: formData.get('username'),
                        password: formData.get('password')
                    })
                })
                .then(response => response.text())
                .then(html => {
                    document.body.innerHTML = html;
                })
                .catch(error => {
                    alert('เกิดข้อผิดพลาด: ' + error.message);
                    button.disabled = false;
                    button.innerHTML = '🔐 เข้าสู่ระบบและเช็คอิน';
                });
            });
        </script>
    </body>
    </html>
    `;
  }
}

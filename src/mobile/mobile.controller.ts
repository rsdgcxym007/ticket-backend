import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  Put,
} from '@nestjs/common';
import { MobileService } from './mobile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThailandTimeHelper } from '../common/utils/thailand-time.helper';
import { Throttle } from '@nestjs/throttler';

@ApiTags('📱 Mobile API')
@Controller('mobile')
export class MobileController {
  private readonly logger = new Logger(MobileController.name);

  constructor(private readonly mobileService: MobileService) {}

  /**
   * 🏠 หน้าหลักแอปมือถือ
   */
  @Get('home')
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
  @ApiOperation({
    summary: 'ข้อมูลหน้าหลักแอปมือถือ',
    description:
      'ข้อมูลแสดงในหน้าแรกของแอปมือถือ รวมถึงโปรโมชั่น ข่าวสาร และสถิติพื้นฐาน',
  })
  @ApiResponse({
    status: 200,
    description: 'ข้อมูลหน้าหลักแอปมือถือ',
    schema: {
      type: 'object',
      properties: {
        announcements: {
          type: 'array',
          description: 'ประกาศและข่าวสาร',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              content: { type: 'string' },
              type: { type: 'string' },
              priority: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string' },
            },
          },
        },
        promotions: {
          type: 'array',
          description: 'โปรโมชั่นปัจจุบัน',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              discountPercent: { type: 'number' },
              validUntil: { type: 'string' },
              imageUrl: { type: 'string' },
            },
          },
        },
        upcomingEvents: {
          type: 'array',
          description: 'กิจกรรมที่จะมาถึง',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              eventDate: { type: 'string' },
              venue: { type: 'string' },
              ticketPrice: { type: 'number' },
              availableSeats: { type: 'number' },
            },
          },
        },
        quickStats: {
          type: 'object',
          description: 'สถิติพื้นฐาน',
          properties: {
            totalEvents: { type: 'number' },
            totalSeats: { type: 'number' },
            availableSeats: { type: 'number' },
            popularZones: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  async getHomeData() {
    this.logger.log('🏠 ดึงข้อมูลหน้าหลักแอปมือถือ');
    return this.mobileService.getHomeData();
  }

  /**
   * 🎫 โซนที่นั่งที่พร้อมใช้งาน
   */
  @Get('zones/available')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute for zone data
  @ApiOperation({
    summary: 'โซนที่นั่งที่พร้อมจอง',
    description:
      'รายการโซนที่นั่งทั้งหมดที่พร้อมให้จอง พร้อมข้อมูลราคาและที่นั่งว่าง',
  })
  @ApiResponse({
    status: 200,
    description: 'รายการโซนที่นั่งที่พร้อมใช้งาน',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          totalSeats: { type: 'number' },
          availableSeats: { type: 'number' },
          bookedSeats: { type: 'number' },
          occupancyRate: { type: 'number' },
          zone: { type: 'string' },
          isActive: { type: 'boolean' },
          features: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  })
  async getAvailableZones() {
    this.logger.log('🎫 ดึงโซนที่นั่งที่พร้อมใช้งาน');
    return this.mobileService.getAvailableZones();
  }

  /**
   * 📍 รายละเอียดโซน
   */
  //  * 📍 รายละเอียดโซน
  //
  @Get('zones/:id')
  @ApiOperation({
    summary: 'รายละเอียดโซนที่นั่ง',
    description:
      'ข้อมูลโซนที่นั่งแต่ละโซนอย่างละเอียด รวมถึงแผนผังที่นั่งและข้อมูลราคา',
  })
  @ApiResponse({
    status: 200,
    description: 'รายละเอียดโซนที่นั่ง',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        totalSeats: { type: 'number' },
        availableSeats: { type: 'number' },
        bookedSeats: { type: 'number' },
        seatMap: {
          type: 'object',
          description: 'แผนผังที่นั่ง',
          properties: {
            rows: { type: 'array', items: { type: 'string' } },
            columns: { type: 'array', items: { type: 'number' } },
            unavailableSeats: { type: 'array', items: { type: 'string' } },
            bookedSeats: { type: 'array', items: { type: 'string' } },
            premiumSeats: { type: 'array', items: { type: 'string' } },
          },
        },
        features: { type: 'array', items: { type: 'string' } },
        policies: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async getZoneDetails(
    @Param('id') id: string,
    @Query('eventDate') eventDate?: string,
  ) {
    this.logger.log(`📍 ดึงรายละเอียดโซน ${id}`);
    const targetDate =
      eventDate || ThailandTimeHelper.format(ThailandTimeHelper.now());
    return this.mobileService.getZoneDetails(id, targetDate);
  }

  /**
   * 🗺️ แผนผังที่นั่ง
   */
  @Get('zones/:id/seat-map')
  @ApiOperation({
    summary: 'แผนผังที่นั่งของโซน',
    description: 'แผนผังที่นั่งแบบละเอียดสำหรับการเลือกที่นั่งในแอปมือถือ',
  })
  @ApiResponse({
    status: 200,
    description: 'แผนผังที่นั่งของโซน',
    schema: {
      type: 'object',
      properties: {
        zoneId: { type: 'string' },
        zoneName: { type: 'string' },
        seatMap: {
          type: 'object',
          properties: {
            rows: { type: 'array', items: { type: 'string' } },
            columns: { type: 'array', items: { type: 'number' } },
            seats: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  row: { type: 'string' },
                  column: { type: 'number' },
                  seatNumber: { type: 'string' },
                  status: {
                    type: 'string',
                    enum: ['available', 'booked', 'occupied', 'unavailable'],
                  },
                  price: { type: 'number' },
                  isPremium: { type: 'boolean' },
                },
              },
            },
            legend: {
              type: 'object',
              properties: {
                available: { type: 'string' },
                booked: { type: 'string' },
                occupied: { type: 'string' },
                unavailable: { type: 'string' },
                premium: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  async getSeatMap(
    @Param('id') zoneId: string,
    @Query('eventDate') eventDate?: string,
  ) {
    this.logger.log(`🗺️ ดึงแผนผังที่นั่งโซน ${zoneId}`);
    const targetDate =
      eventDate || ThailandTimeHelper.format(ThailandTimeHelper.now());
    return this.mobileService.getSeatMap(zoneId, targetDate);
  }

  /**
   * 👤 ออเดอร์ของผู้ใช้
   */
  @Get('orders')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute for order data
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'ออเดอร์ของผู้ใช้',
    description: 'รายการออเดอร์ทั้งหมดของผู้ใช้ที่ล็อกอิน',
  })
  @ApiResponse({
    status: 200,
    description: 'รายการออเดอร์ของผู้ใช้',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          orderNumber: { type: 'string' },
          status: { type: 'string' },
          totalAmount: { type: 'number' },
          ticketType: { type: 'string' },
          eventDate: { type: 'string' },
          seatDetails: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                zoneName: { type: 'string' },
                seatNumber: { type: 'string' },
                price: { type: 'number' },
              },
            },
          },
          qrCode: { type: 'string' },
          createdAt: { type: 'string' },
          paymentMethod: { type: 'string' },
          paymentStatus: { type: 'string' },
        },
      },
    },
  })
  async getUserOrders(@Request() req: any) {
    this.logger.log(`👤 ดึงออเดอร์ของผู้ใช้ ${req.user.id}`);
    return this.mobileService.getUserOrders(req.user.id);
  }

  /**
   * 📋 ประวัติการใช้งาน
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'ประวัติการใช้งานของผู้ใช้',
    description: 'ประวัติการจองและการใช้งานทั้งหมดของผู้ใช้',
  })
  @ApiResponse({
    status: 200,
    description: 'ประวัติการใช้งานของผู้ใช้',
    schema: {
      type: 'object',
      properties: {
        totalOrders: { type: 'number' },
        totalSpent: { type: 'number' },
        totalEvents: { type: 'number' },
        favoriteZones: { type: 'array', items: { type: 'string' } },
        recentOrders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              orderNumber: { type: 'string' },
              eventDate: { type: 'string' },
              totalAmount: { type: 'number' },
              status: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getUserHistory(@Request() req: any) {
    this.logger.log(`📋 ดึงประวัติการใช้งานของผู้ใช้ ${req.user.id}`);
    return this.mobileService.getUserHistory(req.user.id);
  }

  /**
   * 🔍 สถานะออเดอร์
   */
  @Get('orders/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'ตรวจสอบสถานะออเดอร์',
    description: 'ตรวจสอบสถานะออเดอร์แบบ Real-time',
  })
  @ApiResponse({
    status: 200,
    description: 'สถานะออเดอร์',
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        orderNumber: { type: 'string' },
        status: { type: 'string' },
        statusText: { type: 'string' },
        paymentStatus: { type: 'string' },
        paymentMethod: { type: 'string' },
        totalAmount: { type: 'number' },
        eventDate: { type: 'string' },
        timeline: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
        nextAction: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            description: { type: 'string' },
            actionUrl: { type: 'string' },
          },
        },
      },
    },
  })
  async getOrderStatus(@Param('id') orderId: string, @Request() req: any) {
    this.logger.log(`🔍 ตรวจสอบสถานะออเดอร์ ${orderId}`);
    return this.mobileService.getOrderStatus(orderId, req.user.id);
  }

  /**
   * 📱 QR Code สำหรับออเดอร์
   */
  @Get('orders/:id/qr')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'QR Code สำหรับออเดอร์',
    description: 'สร้าง QR Code สำหรับออเดอร์เพื่อใช้เข้างาน',
  })
  @ApiResponse({
    status: 200,
    description: 'QR Code ของออเดอร์',
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        qrCode: { type: 'string' },
        qrCodeUrl: { type: 'string' },
        expiresAt: { type: 'string' },
        instructions: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async getOrderQR(@Param('id') orderId: string, @Request() req: any) {
    this.logger.log(`📱 สร้าง QR Code สำหรับออเดอร์ ${orderId}`);
    return this.mobileService.getOrderQR(orderId, req.user.id);
  }

  /**
   * 📊 สถิติผู้ใช้
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'สถิติการใช้งานของผู้ใช้',
    description: 'สถิติการใช้งานและข้อมูลผู้ใช้งาน',
  })
  @ApiResponse({
    status: 200,
    description: 'สถิติการใช้งานของผู้ใช้',
    schema: {
      type: 'object',
      properties: {
        totalOrders: { type: 'number' },
        totalSpent: { type: 'number' },
        totalEvents: { type: 'number' },
        currentMonth: {
          type: 'object',
          properties: {
            orders: { type: 'number' },
            spent: { type: 'number' },
            events: { type: 'number' },
          },
        },
        favoriteZones: { type: 'array', items: { type: 'string' } },
        membershipLevel: { type: 'string' },
        pointsEarned: { type: 'number' },
        pointsAvailable: { type: 'number' },
        achievements: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async getUserStats(@Request() req: any) {
    this.logger.log(`📊 ดึงสถิติผู้ใช้ ${req.user.id}`);
    return this.mobileService.getUserStats(req.user.id);
  }

  /**
   * 📢 ประกาศและข่าวสาร
   */
  @Get('announcements')
  @ApiOperation({
    summary: 'ประกาศและข่าวสาร',
    description: 'ประกาศและข่าวสารทั้งหมดสำหรับแอปมือถือ',
  })
  @ApiResponse({
    status: 200,
    description: 'รายการประกาศและข่าวสาร',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          type: {
            type: 'string',
            enum: ['INFO', 'WARNING', 'PROMOTION', 'MAINTENANCE'],
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          },
          isActive: { type: 'boolean' },
          showUntil: { type: 'string' },
          createdAt: { type: 'string' },
          imageUrl: { type: 'string' },
          actionUrl: { type: 'string' },
        },
      },
    },
  })
  async getAnnouncements(@Query('type') type?: string) {
    this.logger.log('📢 ดึงประกาศและข่าวสาร');
    return this.mobileService.getAnnouncements(type);
  }

  /**
   * 📝 อัปเดตโปรไฟล์ผู้ใช้
   */
  @Put('profile')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 profile updates per minute
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'อัปเดตโปรไฟล์ผู้ใช้',
    description: 'อัปเดตข้อมูลโปรไฟล์ผู้ใช้สำหรับแอปมือถือ',
  })
  @ApiResponse({
    status: 200,
    description: 'อัปเดตโปรไฟล์สำเร็จ',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phoneNumber: { type: 'string' },
            preferences: { type: 'object' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  })
  async updateProfile(
    @Request() req: any,
    @Body()
    updateData: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      preferences?: any;
    },
  ) {
    this.logger.log(`📝 อัปเดตโปรไฟล์ผู้ใช้ ${req.user.id}`);
    return this.mobileService.updateUserProfile(req.user.id, updateData);
  }

  /**
   * 🔔 การตั้งค่าการแจ้งเตือน
   */
  @Post('notifications/settings')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 notification updates per minute
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'ตั้งค่าการแจ้งเตือน',
    description: 'ตั้งค่าการแจ้งเตือนสำหรับแอปมือถือ',
  })
  @ApiResponse({
    status: 200,
    description: 'ตั้งค่าการแจ้งเตือนสำเร็จ',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        settings: {
          type: 'object',
          properties: {
            pushNotifications: { type: 'boolean' },
            emailNotifications: { type: 'boolean' },
            smsNotifications: { type: 'boolean' },
            promotionNotifications: { type: 'boolean' },
            orderUpdates: { type: 'boolean' },
            eventReminders: { type: 'boolean' },
          },
        },
      },
    },
  })
  async updateNotificationSettings(
    @Request() req: any,
    @Body()
    settings: {
      pushNotifications?: boolean;
      emailNotifications?: boolean;
      smsNotifications?: boolean;
      promotionNotifications?: boolean;
      orderUpdates?: boolean;
      eventReminders?: boolean;
    },
  ) {
    this.logger.log(`🔔 ตั้งค่าการแจ้งเตือนผู้ใช้ ${req.user.id}`);
    return this.mobileService.updateNotificationSettings(req.user.id, settings);
  }
}

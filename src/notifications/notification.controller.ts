import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { success } from '../common/responses';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Notifications - ระบบแจ้งเตือน')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({
    summary: 'ดึงการแจ้งเตือนของผู้ใช้',
    description: 'แสดงการแจ้งเตือนทั้งหมดของผู้ใช้ที่ล็อกอิน',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'จำนวนการแจ้งเตือนที่ต้องการ (ค่าเริ่มต้น 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'รายการการแจ้งเตือนของผู้ใช้',
  })
  async getUserNotifications(@Req() req: any, @Query('limit') limit?: number) {
    const userId = req.user.id;
    const notifications = await this.notificationService.getUserNotifications(
      userId,
      limit || 50,
    );
    return success(notifications, 'ดึงการแจ้งเตือนสำเร็จ', req);
  }

  @Get('/unread-count')
  @ApiOperation({
    summary: 'นับการแจ้งเตือนที่ยังไม่ได้อ่าน',
    description: 'แสดงจำนวนการแจ้งเตือนที่ผู้ใช้ยังไม่ได้อ่าน',
  })
  @ApiResponse({
    status: 200,
    description: 'จำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน',
  })
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.id;
    const count = await this.notificationService.getUnreadCount(userId);
    return success({ count }, 'นับการแจ้งเตือนสำเร็จ', req);
  }

  @Patch('/:id/read')
  @ApiOperation({
    summary: 'ทำเครื่องหมายการแจ้งเตือนว่าอ่านแล้ว',
    description: 'ทำเครื่องหมายการแจ้งเตือนเฉพาะว่าผู้ใช้อ่านแล้ว',
  })
  @ApiResponse({
    status: 200,
    description: 'ทำเครื่องหมายสำเร็จ',
  })
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    const notification = await this.notificationService.markAsRead(id, userId);
    return success(notification, 'ทำเครื่องหมายอ่านแล้วสำเร็จ', req);
  }

  @Patch('/mark-all-read')
  @ApiOperation({
    summary: 'ทำเครื่องหมายการแจ้งเตือนทั้งหมดว่าอ่านแล้ว',
    description: 'ทำเครื่องหมายการแจ้งเตือนทั้งหมดของผู้ใช้ว่าอ่านแล้ว',
  })
  @ApiResponse({
    status: 200,
    description: 'ทำเครื่องหมายทั้งหมดสำเร็จ',
  })
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.id;
    await this.notificationService.markAllAsRead(userId);
    return success(null, 'ทำเครื่องหมายอ่านทั้งหมดสำเร็จ', req);
  }

  @Post('/promotional')
  @Throttle({ email: { limit: 10, ttl: 3600000 } }) // 10 promotional emails per hour
  @ApiOperation({
    summary: 'ส่งการแจ้งเตือนโปรโมชั่น (Admin)',
    description: 'ส่งการแจ้งเตือนโปรโมชั่นให้ผู้ใช้ทั้งหมด',
  })
  @ApiResponse({
    status: 200,
    description: 'ส่งโปรโมชั่นสำเร็จ',
  })
  async sendPromotionalNotification(
    @Body()
    body: {
      title: string;
      message: string;
      metadata?: Record<string, any>;
    },
    @Req() req: any,
  ) {
    await this.notificationService.sendPromotionalNotification(
      body.title,
      body.message,
      body.metadata,
    );
    return success(null, 'ส่งการแจ้งเตือนโปรโมชั่นสำเร็จ', req);
  }

  @Get('/stats')
  @ApiOperation({
    summary: 'สถิติการแจ้งเตือน (Admin)',
    description: 'แสดงสถิติการแจ้งเตือนของระบบ',
  })
  @ApiResponse({
    status: 200,
    description: 'สถิติการแจ้งเตือน',
  })
  async getNotificationStats(@Req() req: any) {
    const stats = await this.notificationService.getNotificationStats();
    return success(stats, 'ดึงสถิติการแจ้งเตือนสำเร็จ', req);
  }
}

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Seat } from '../../seats/seat.entity';
import { Repository, In } from 'typeorm';

/**
 * 🚀 WebSocket Gateway สำหรับ Real-time Order Updates
 * ส่งข้อมูลแบบ real-time ไปยัง frontend เมื่อมีการเปลี่ยนแปลง order หรือ seat
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'order-updates',
})
export class OrderUpdatesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  @InjectRepository(Seat)
  private readonly seatRepo: Repository<Seat>;

  private logger: Logger = new Logger('OrderUpdatesGateway');

  afterInit() {
    this.logger.log('🚀 WebSocket Gateway initialized for order updates');
  }

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client disconnected: ${client.id}`);
  }

  /**
   * 📢 ส่งข้อมูลการสร้าง order ใหม่ไปยัง clients ทั้งหมด
   */
  notifyOrderCreated(orderData: any) {
    this.logger.log(`📢 Broadcasting order created: ${orderData.orderNumber}`);
    this.server.emit('order_created', {
      type: 'ORDER_CREATED',
      data: orderData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 📢 ส่งข้อมูลการอัปเดต order ไปยัง clients ทั้งหมด
   */
  notifyOrderUpdated(orderData: any) {
    this.logger.log(`📢 Broadcasting order updated: ${orderData.orderNumber}`);
    this.server.emit('order_updated', {
      type: 'ORDER_UPDATED',
      data: orderData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 📢 ส่งข้อมูลการยกเลิก order ไปยัง clients ทั้งหมด
   */
  notifyOrderCancelled(orderData: any) {
    this.logger.log(
      `📢 Broadcasting order cancelled: ${orderData.orderNumber}`,
    );
    this.server.emit('order_cancelled', {
      type: 'ORDER_CANCELLED',
      data: orderData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 📢 ส่งข้อมูลการล็อก seat ไปยัง clients ทั้งหมด
   */
  async notifySeatLocked(seatData: any) {
    this.logger.log(
      `📢 Broadcasting seat locked: ${seatData.seatIds?.join(', ')}`,
    );

    // Fetch zone information for the given seat IDs
    const seatDetails = await this.seatRepo.find({
      where: { id: In(seatData.seatIds) },
      relations: ['zone'],
      select: ['id'],
    });

    const enrichedSeatData = seatDetails.map((seat) => ({
      seatId: seat.id,
      zoneName: seat.zone.name,
    }));

    this.server.emit('seat_locked', {
      type: 'SEAT_LOCKED',
      data: {
        ...seatData,
        userId: seatData.userId, // Ensure correct user ID is included
        zoneKey: enrichedSeatData[0].zoneName,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 📢 ส่งข้อมูลการปลดล็อก seat ไปยัง clients ทั้งหมด
   */
  async notifySeatUnlocked(seatData: any) {
    this.logger.log(
      `📢 Broadcasting seat unlocked: ${seatData.seatIds?.join(', ')}`,
    );

    // Fetch zone information for the given seat IDs
    const seatDetails = await this.seatRepo.find({
      where: { id: In(seatData.seatIds) },
      relations: ['zone'],
      select: ['id'],
    });

    const enrichedSeatData = seatDetails.map((seat) => ({
      seatId: seat.id,
      zoneName: seat.zone.name,
    }));

    this.server.emit('seat_unlocked', {
      type: 'SEAT_UNLOCKED',
      data: {
        ...seatData,
        userId: seatData.userId, // Ensure correct user ID is included
        zoneKey: enrichedSeatData[0].zoneName,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 📢 ส่งข้อมูลการอัปเดตสถานะระบบ
   */
  notifySystemUpdate(systemData: any) {
    this.logger.log(`📢 Broadcasting system update`);
    this.server.emit('system_update', {
      type: 'SYSTEM_UPDATE',
      data: systemData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 📢 ส่งข้อมูลความผิดพลาด concurrency ไปยัง clients
   */
  notifyConcurrencyError(errorData: any) {
    this.logger.log(`📢 Broadcasting concurrency error: ${errorData.message}`);
    this.server.emit('concurrency_error', {
      type: 'CONCURRENCY_ERROR',
      data: errorData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 📢 ส่งข้อมูลการเปลี่ยนแปลงสถานะ seat แบบ real-time
   */
  notifySeatAvailabilityChanged(availabilityData: any) {
    this.logger.log(`📢 Broadcasting seat availability changed`);
    this.server.emit('seat_availability_changed', {
      type: 'SEAT_AVAILABILITY_CHANGED',
      data: availabilityData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 🎯 ส่งข้อมูลไปยัง client เฉพาะ (ตาม user ID)
   */
  notifyUser(userId: string, eventType: string, data: any) {
    this.logger.log(`🎯 Sending notification to user: ${userId}`);
    this.server.emit(`user_${userId}`, {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 📊 ส่งข้อมูล analytics แบบ real-time
   */
  notifyAnalyticsUpdate(analyticsData: any) {
    this.logger.log(`📊 Broadcasting analytics update`);
    this.server.emit('analytics_update', {
      type: 'ANALYTICS_UPDATE',
      data: analyticsData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 💓 Heart beat สำหรับตรวจสอบการเชื่อมต่อ
   */
  @SubscribeMessage('heartbeat')
  handleHeartbeat(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    client.emit('heartbeat_response', {
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 📝 รับข้อมูลจาก client และส่งต่อไปยัง clients อื่น
   */
  @SubscribeMessage('client_message')
  handleClientMessage(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`📝 Received message from client: ${client.id}`);
    client.broadcast.emit('client_broadcast', {
      from: client.id,
      data: data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 🏠 Join room สำหรับ show date เฉพาะ
   */
  @SubscribeMessage('join_show_room')
  handleJoinShowRoom(
    @MessageBody() data: { showDate: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `show_${data.showDate}`;
    client.join(roomName);
    this.logger.log(`🏠 Client ${client.id} joined room: ${roomName}`);
    client.emit('joined_room', { room: roomName });
  }

  /**
   * 🚪 Leave room
   */
  @SubscribeMessage('leave_show_room')
  handleLeaveShowRoom(
    @MessageBody() data: { showDate: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `show_${data.showDate}`;
    client.leave(roomName);
    this.logger.log(`🚪 Client ${client.id} left room: ${roomName}`);
    client.emit('left_room', { room: roomName });
  }

  /**
   * 📢 ส่งข้อมูลไปยัง room เฉพาะ (show date)
   */
  notifyShowRoom(showDate: string, eventType: string, data: any) {
    const roomName = `show_${showDate}`;
    this.logger.log(`📢 Broadcasting to room ${roomName}: ${eventType}`);
    this.server.to(roomName).emit(eventType, {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString(),
    });
  }
}

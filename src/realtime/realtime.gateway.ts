import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private connectedUsers = new Map<string, Socket>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove from connected users
    for (const [userId, socket] of this.connectedUsers.entries()) {
      if (socket.id === client.id) {
        this.connectedUsers.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('join-user')
  handleJoinUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    this.connectedUsers.set(data.userId, client);
    client.join(`user-${data.userId}`);
    this.logger.log(`User ${data.userId} joined realtime updates`);

    return {
      event: 'user-joined',
      data: { userId: data.userId, success: true },
    };
  }

  @SubscribeMessage('join-zone')
  handleJoinZone(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { zoneId: string },
  ) {
    client.join(`zone-${data.zoneId}`);
    this.logger.log(`Client joined zone updates: ${data.zoneId}`);

    return {
      event: 'zone-joined',
      data: { zoneId: data.zoneId, success: true },
    };
  }

  @SubscribeMessage('seat-selection')
  handleSeatSelection(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      seatId: string;
      userId: string;
      zoneId: string;
      action: 'select' | 'deselect';
    },
  ) {
    // Broadcast seat selection to others in the zone
    client.to(`zone-${data.zoneId}`).emit('seat-update', {
      seatId: data.seatId,
      userId: data.userId,
      action: data.action,
      timestamp: new Date().toISOString(),
    });

    return {
      event: 'seat-selection-confirmed',
      data: { seatId: data.seatId, action: data.action },
    };
  }

  @SubscribeMessage('request-live-updates')
  handleRequestLiveUpdates(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { types: string[] },
  ) {
    const supportedTypes = [
      'seat-availability',
      'pricing-updates',
      'recommendations',
      'booking-alerts',
    ];

    const subscribedTypes = data.types.filter((type) =>
      supportedTypes.includes(type),
    );

    for (const type of subscribedTypes) {
      client.join(`updates-${type}`);
    }

    this.logger.log(
      `Client subscribed to updates: ${subscribedTypes.join(', ')}`,
    );

    return {
      event: 'subscriptions-confirmed',
      data: { subscribedTypes },
    };
  }

  // Server-side methods to broadcast updates
  broadcastSeatAvailability(zoneId: string, seatData: any) {
    this.server.to(`zone-${zoneId}`).emit('seat-availability-update', {
      zoneId,
      seatData,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastPricingUpdate(zoneId: string, pricingData: any) {
    this.server.to(`zone-${zoneId}`).emit('pricing-update', {
      zoneId,
      pricingData,
      timestamp: new Date().toISOString(),
    });
  }

  sendPersonalizedRecommendation(userId: string, recommendations: any) {
    const userSocket = this.connectedUsers.get(userId);
    if (userSocket) {
      userSocket.emit('personalized-recommendations', {
        userId,
        recommendations,
        timestamp: new Date().toISOString(),
      });
    }
  }

  broadcastBookingAlert(zoneId: string, alert: any) {
    this.server.to(`zone-${zoneId}`).emit('booking-alert', {
      zoneId,
      alert,
      timestamp: new Date().toISOString(),
    });
  }

  // System-wide notifications
  broadcastSystemNotification(notification: {
    type: 'maintenance' | 'announcement' | 'alert';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }) {
    this.server.emit('system-notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  // Analytics and monitoring
  getConnectionStats() {
    const totalConnections = this.server.sockets.sockets.size;
    const userConnections = this.connectedUsers.size;

    return {
      totalConnections,
      userConnections,
      anonymousConnections: totalConnections - userConnections,
      rooms: Array.from(this.server.sockets.adapter.rooms.keys()),
      timestamp: new Date().toISOString(),
    };
  }
}

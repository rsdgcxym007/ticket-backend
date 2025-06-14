// src/payment/payment.gateway.ts
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class PaymentGateway {
  @WebSocketServer()
  server: Server;

  notifyPaid(orderId: number) {
    this.server.emit('payment-success', { orderId });
  }
}

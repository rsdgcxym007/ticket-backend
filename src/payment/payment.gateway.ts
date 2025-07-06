import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Order } from '../order/order.entity';

@WebSocketGateway({
  cors: {
    origin: '*', // 🔓 เปิดให้ทุก origin เรียกได้ (ใน production ควรกำหนด origin ที่ปลอดภัย)
  },
})
export class PaymentGateway {
  @WebSocketServer()
  server: Server;

  /**
   * 🎉 ส่ง Event "order-created" ไปยัง Client ทุกคน
   */
  serverToClientOrderCreated(order: Order) {
    this.server.emit('order-created', {
      event: 'order-created',
      ...order,
    });
  }

  serverToClientUpdate(order: Order) {
    this.server.emit('order-cancelled', {
      event: 'order-cancelled',
      ...order,
    });
  }

  @SubscribeMessage('client:order-cancelled')
  handleClientCancel(@MessageBody() data: { orderId: string }) {
    this.server.emit('order-cancelled', {
      event: 'order-cancelled',
      orderId: data.orderId,
    });
  }
}

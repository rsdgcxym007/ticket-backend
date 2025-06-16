import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Order } from 'src/order/order.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class PaymentGateway {
  @WebSocketServer()
  server: Server;

  serverToClientUpdate(order: Order) {
    this.server.emit('order-cancelled', {
      event: 'order-cancelled',
      orderId: order.orderId,
      status: order.status,
    });
  }
  @SubscribeMessage('client:order-cancelled')
  handleClientCancel(@MessageBody() data: { orderId: string }) {
    console.log('📨 Client แจ้งยกเลิก', data.orderId);

    // ✅ กระจายให้ client อื่น ๆ รู้
    this.server.emit('order-cancelled', {
      orderId: data.orderId,
      event: 'order-cancelled',
    });
  }
}

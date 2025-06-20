import { Injectable } from '@nestjs/common';
import { DataSource, LessThan, Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus } from './enums/order-status.enum';

@Injectable()
export class OrderRepository extends Repository<Order> {
  constructor(private readonly dataSource: DataSource) {
    super(Order, dataSource.createEntityManager());
  }

  async isSeatBooked(seats: string[]): Promise<string | null> {
    const activeOrders = await this.find({
      where: [{ status: OrderStatus.PENDING }, { status: OrderStatus.PAID }],
    });
    const allBooked = activeOrders.flatMap((o) =>
      o.seats.map((seat) => seat.id),
    );

    return seats.find((seat) => allBooked.includes(seat)) || null;
  }

  async findByOrderId(orderId: string): Promise<Order | null> {
    return this.findOne({ where: { id: orderId } });
  }

  async findRecent(limit = 10): Promise<Order[]> {
    return this.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return this.find({ where: { status } });
  }

  async findExpired(before: Date): Promise<Order[]> {
    return this.find({
      where: {
        status: OrderStatus.PENDING,
        expiresAt: LessThan(before),
      },
    });
  }
}

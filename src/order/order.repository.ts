import { Injectable } from '@nestjs/common';
import { DataSource, LessThan, Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus } from './order.service';

@Injectable()
export class OrderRepository extends Repository<Order> {
  constructor(private readonly dataSource: DataSource) {
    super(Order, dataSource.createEntityManager());
  }

  async isSeatBooked(seats: string[]): Promise<string | null> {
    const activeOrders = await this.find({
      where: [{ status: 'PENDING' }, { status: 'PAID' }],
    });
    const allBooked = activeOrders.flatMap((o) => o.seats.split(','));
    return seats.find((seat) => allBooked.includes(seat)) || null;
  }

  async findByOrderId(orderId: string): Promise<Order | null> {
    return this.findOne({ where: { orderId } });
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
        status: 'PENDING',
        expiresAt: LessThan(before),
      },
    });
  }
}

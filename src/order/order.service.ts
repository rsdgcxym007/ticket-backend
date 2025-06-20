import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus } from './order.entity';
import { Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { Seat } from '../seats/seat.entity';
import { User } from '../user/user.entity';
import { Referrer } from '../referrer/referrer.entity';
import { UpdateOrderDto } from './dto/update-order.dto';
import { SeatStatus } from 'src/seats/eat-status.enum';
import { DeepPartial } from 'typeorm';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Seat) private seatRepo: Repository<Seat>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Referrer) private referrerRepo: Repository<Referrer>,
  ) {}

  async create(dto: CreateOrderDto) {
    if (!dto.seatIds || dto.seatIds.length === 0) {
      throw new Error('Seat IDs are required');
    }
    if (!dto.showDate) {
      throw new Error('Show date is required');
    }

    const seats = await this.seatRepo.findByIds(dto.seatIds);

    if (seats.length !== dto.seatIds.length) {
      const foundIds = seats.map((s) => s.id);
      const missing = dto.seatIds.filter((id) => !foundIds.includes(id));
      throw new Error(`Some seats not found: ${missing.join(', ')}`);
    }

    const bookedInDate = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.seats', 'seat')
      .where('order.showDate = :date', { date: dto.showDate })
      .andWhere('seat.id IN (:...seatIds)', { seatIds: dto.seatIds })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.PENDING, OrderStatus.PAID], // ✅
      })
      .getMany();

    if (bookedInDate.length > 0) {
      const conflictSeats = bookedInDate
        .flatMap((o) => o.seats)
        .filter((s) => dto.seatIds.includes(s.id));
      const numbers = conflictSeats.map((s) => s.seatNumber);
      throw new Error(
        `Seats already booked on ${dto.showDate}: ${numbers.join(', ')}`,
      );
    }

    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new Error('User not found');

    const validMethods = ['QR', 'TRANSFER', 'CASH'];
    if (!validMethods.includes(dto.method)) {
      throw new Error(`Invalid payment method: ${dto.method}`);
    }

    let referrer = null;
    if (dto.referrerCode) {
      referrer = await this.referrerRepo.findOne({
        where: { code: dto.referrerCode },
      });
      if (!referrer) {
        throw new Error(`Invalid referrerCode: ${dto.referrerCode}`);
      }
    }

    const total = seats.length * 1800;

    const order = this.orderRepo.create({
      user,
      method: dto.method,
      seats,
      total,
      referrerCode: dto.referrerCode,
      referrer,
      showDate: dto.showDate,
    } as DeepPartial<Order>);

    const saved = await this.orderRepo.save(order);

    await this.seatRepo.update(dto.seatIds, {
      status: SeatStatus.BOOKED,
      order: saved,
    });

    return saved;
  }

  async findAll() {
    return this.orderRepo.find({ relations: ['seats', 'user', 'referrer'] });
  }

  async findById(id: string) {
    return this.orderRepo.findOne({
      where: { id },
      relations: ['seats', 'user', 'referrer'],
    });
  }

  async changeSeats(orderId: string, newSeatIds: string[]) {
    if (!newSeatIds || newSeatIds.length === 0) {
      throw new Error('❌ ต้องระบุรายการที่นั่งใหม่');
    }

    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['seats', 'referrer'],
    });

    if (!order) throw new Error('❌ ไม่พบออเดอร์ที่ต้องการเปลี่ยนที่นั่ง');

    const showDate = order.showDate;
    const isPaid = order.status === OrderStatus.PAID;

    const newSeats = await this.seatRepo.findByIds(newSeatIds);

    if (newSeats.length !== newSeatIds.length) {
      const foundIds = newSeats.map((s) => s.id);
      const missing = newSeatIds.filter((id) => !foundIds.includes(id));
      throw new Error(`❌ ที่นั่งใหม่บางตัวไม่พบ: ${missing.join(', ')}`);
    }

    const conflict = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.seats', 'seat')
      .where('order.showDate = :showDate', { showDate })
      .andWhere('seat.id IN (:...seatIds)', { seatIds: newSeatIds })
      .andWhere('order.status = :paid', { paid: OrderStatus.PAID })
      .andWhere('order.id != :orderId', { orderId })
      .getCount();

    if (conflict > 0) {
      throw new Error('❌ ที่นั่งใหม่มีบางตัวถูกจองแล้วในวันเดียวกัน');
    }

    if (!isPaid) {
      await this.seatRepo.update(
        order.seats.map((s) => s.id),
        {
          status: SeatStatus.AVAILABLE,
          order: null,
        },
      );
    }

    order.seats = newSeats;

    if (!isPaid) {
      order.total = newSeats.length * 1200;
      if (order.referrer) {
        order.referrerCommission = newSeats.length * 400;

        order.referrer.totalCommission = order.referrerCommission;
        await this.referrerRepo.save(order.referrer);
      }
    }

    await this.orderRepo.save(order);

    await this.seatRepo.update(newSeatIds, {
      status: isPaid ? SeatStatus.PAID : SeatStatus.BOOKED,
      order,
    });

    return order;
  }

  async update(id: string, dto: UpdateOrderDto) {
    await this.orderRepo.update(id, dto);

    const order = await this.findById(id);

    if (dto.status === 'PAID') {
      const seatIds = order.seats.map((s) => s.id);
      await this.seatRepo.update(seatIds, { status: SeatStatus.PAID });

      if (order.referrerCode && order.referrer) {
        const referrer = await this.referrerRepo.findOneBy({
          id: order.referrer.id,
        });
        if (referrer) {
          referrer.totalCommission += seatIds.length * 400;
          await this.referrerRepo.save(referrer);
        }
      }
    }

    return order;
  }

  async remove(id: string) {
    return this.orderRepo.delete(id);
  }
}

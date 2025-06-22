import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus } from './order.entity';
import { In, Not, Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { Seat } from '../seats/seat.entity';
import { User } from '../user/user.entity';
import { Referrer } from '../referrer/referrer.entity';
import { UpdateOrderDto } from './dto/update-order.dto';
import { SeatStatus } from 'src/seats/eat-status.enum';
import { DeepPartial } from 'typeorm';
import { BookingStatus, SeatBooking } from 'src/seats/seat-booking.entity';
import { PaginateOptions } from '../utils/pagination.util';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Seat) private seatRepo: Repository<Seat>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Referrer) private referrerRepo: Repository<Referrer>,
    @InjectRepository(SeatBooking)
    private seatBookingRepo: Repository<SeatBooking>,
  ) {}

  async create(dto: CreateOrderDto) {
    if (!dto.seatIds?.length) throw new Error('Seat IDs are required');
    if (!dto.showDate) throw new Error('Show date is required');

    const seats = await this.seatRepo.findByIds(dto.seatIds);
    if (seats.length !== dto.seatIds.length) throw new Error('Invalid seatIds');

    const conflicts = await this.seatBookingRepo.find({
      where: {
        seat: seats,
        showDate: dto.showDate,
        status: In([SeatStatus.BOOKED, SeatStatus.PAID]),
      },
      relations: ['seat'],
    });

    if (conflicts.length) {
      const conflictNumbers = conflicts.map((b) => b.seat.seatNumber);
      throw new Error(`ที่นั่ง ${conflictNumbers.join(', ')} ถูกจองแล้ว`);
    }

    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new Error('User not found');

    let referrer = null;
    if (dto.referrerCode) {
      referrer = await this.referrerRepo.findOne({
        where: { code: dto.referrerCode },
      });
      if (!referrer) throw new Error('Invalid referrerCode');
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

    const savedOrder = await this.orderRepo.save(order);

    const bookings = seats.map((seat) =>
      this.seatBookingRepo.create({
        seat,
        order: savedOrder,
        showDate: dto.showDate,
        bookingStatus: SeatStatus.BOOKED,
      } as DeepPartial<SeatBooking>),
    );

    await this.seatBookingRepo.save(bookings);

    return savedOrder;
  }
  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['seats', 'referrer'],
    });
    if (!order) throw new Error('Order not found');

    if (dto.referrerCode && !order.referrerCode) {
      const ref = await this.referrerRepo.findOne({
        where: { code: dto.referrerCode },
      });
      if (!ref) throw new Error('Invalid referrerCode');
      order.referrerCode = dto.referrerCode;
      order.referrer = ref;
    } else if (dto.referrerCode && order.referrerCode) {
      throw new Error('referrerCode already set');
    }

    const bookings = await this.seatBookingRepo.find({
      where: { order: { id } },
      relations: ['seat'],
    });

    if (dto.status === OrderStatus.PAID) {
      for (const booking of bookings) {
        booking.status = BookingStatus.PAID;
      }
      await this.seatBookingRepo.save(bookings);

      if (order.referrer) {
        order.referrer.totalCommission += bookings.length * 400;
        await this.referrerRepo.save(order.referrer);
      }

      order.status = OrderStatus.PAID;
    } else if (dto.status === OrderStatus.CANCELLED) {
      for (const booking of bookings) {
        booking.status = BookingStatus.AVAILABLE;
        booking.order = null;
      }
      await this.seatBookingRepo.save(bookings);
      order.status = OrderStatus.CANCELLED;
    }

    return this.orderRepo.save(order);
  }

  async findAll(options: PaginateOptions) {
    const { page, limit, status, zone, search } = options;
    const query = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.seats', 'seats')
      .leftJoinAndSelect('order.seatBookings', 'seatBookings')
      .leftJoinAndSelect('seatBookings.seat', 'bookingSeat')
      .leftJoinAndSelect('seats.zone', 'seatZone')
      .leftJoinAndSelect('bookingSeat.zone', 'bookingSeatZone')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('order.createdAt', 'DESC');

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    if (zone) {
      const isUUID = /^[0-9a-fA-F-]{36}$/.test(zone);
      if (isUUID) {
        query.andWhere(
          '(seatZone.id = :zoneId OR bookingSeatZone.id = :zoneId)',
          { zoneId: zone },
        );
      }
    }

    if (search?.trim()) {
      query.andWhere('CAST(order.id AS text) ILIKE :search', {
        search: `%${search.trim()}%`,
      });
    }

    const [items, total] = await query.getManyAndCount();

    items.forEach((order) => {
      const zoneNamesFromSeats = order.seats
        ?.map((seat) => seat.zone?.name)
        .filter(Boolean);

      const zoneNamesFromBookings = order.seatBookings
        ?.map((booking) => booking.seat?.zone?.name)
        .filter(Boolean);

      const allZones = [...zoneNamesFromSeats, ...zoneNamesFromBookings];
      const uniqueZoneNames = [...new Set(allZones)];

      (order as any).zoneName = uniqueZoneNames.join(', ');
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
      relations: ['seatBookings', 'referrer'],
    });

    if (!order) {
      throw new Error('ไม่พบออเดอร์ที่ต้องการเปลี่ยนที่นั่ง');
    }

    const isPaid = order.status === OrderStatus.PAID;

    // ✅ แปลง showDate ให้เป็น string (YYYY-MM-DD)
    const showDateStr =
      order.showDate instanceof Date
        ? order.showDate.toISOString().slice(0, 10)
        : (order.showDate as string);

    // ตรวจสอบ seat ใหม่
    const newSeats = await this.seatRepo.findByIds(newSeatIds);
    if (newSeats.length !== newSeatIds.length) {
      const foundIds = newSeats.map((s) => s.id);
      const missing = newSeatIds.filter((id) => !foundIds.includes(id));
      throw new Error(`ที่นั่งใหม่บางตัวไม่พบ: ${missing.join(', ')}`);
    }

    // ตรวจสอบว่า seat ใหม่ไม่ถูกจองแล้ว (ในวันเดียวกัน)
    const conflict = await this.seatBookingRepo.count({
      where: {
        seat: In(newSeatIds),
        showDate: showDateStr,
        status: BookingStatus.PAID,
        order: Not(orderId),
      },
    });

    if (conflict > 0) {
      throw new Error('ที่นั่งใหม่มีบางตัวถูกจองแล้วในวันเดียวกัน');
    }

    // ลบ seatBooking เดิมทั้งหมดของ order นี้
    await this.seatBookingRepo.delete({ order: { id: orderId } });

    // สร้าง seatBooking ใหม่
    const newBookings = newSeats.map((seat) => {
      const booking = new SeatBooking();
      booking.seat = seat;
      booking.order = order;
      booking.showDate = showDateStr;
      booking.status = isPaid ? BookingStatus.PAID : BookingStatus.BOOKED;
      return booking;
    });

    await this.seatBookingRepo.save(newBookings);

    // อัปเดตค่าหากยังไม่จ่าย
    if (!isPaid) {
      order.total = newSeats.length * 1200;

      if (order.referrer) {
        order.referrerCommission = newSeats.length * 400;
        order.referrer.totalCommission = order.referrerCommission;
        await this.referrerRepo.save(order.referrer);
      }

      await this.orderRepo.save(order);
    }

    return order;
  }

  async cancel(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new Error('ไม่พบออเดอร์');

    order.status = OrderStatus.CANCELLED;
    await this.orderRepo.save(order);

    const bookings = await this.seatBookingRepo.find({
      where: { order: { id: orderId } },
      relations: ['order'],
    });

    for (const booking of bookings) {
      booking.status = BookingStatus.CANCELLED;
      booking.order = null;
    }

    await this.seatBookingRepo.save(bookings);

    return order;
  }

  async remove(id: string) {
    return this.orderRepo.delete(id);
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderMethod, OrderStatus } from './order.entity';
import { Between, In, Not, Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { Seat } from '../seats/seat.entity';
import { User } from '../user/user.entity';
import { Referrer } from '../referrer/referrer.entity';
import { UpdateOrderDto } from './dto/update-order.dto';
import { SeatStatus } from 'src/seats/eat-status.enum';
import { DeepPartial } from 'typeorm';
import { BookingStatus, SeatBooking } from 'src/seats/seat-booking.entity';
import { PaginateOptions } from '../utils/pagination.util';
import { UpdateBookedOrderDto } from './dto/update-booked-order.dto';
import dayjs from 'dayjs';
import { PaymentMethod } from 'src/payment/payment.entity';
import { createPdfBuffer } from 'src/utils/createPdfBuffer';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
const STANDING_ADULT_PRICE = 1500;
const STANDING_CHILD_PRICE = 1300;
const ADULT_COMMISSION = 300;
const CHILD_COMMISSION = 200;
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
      status: dto.status ?? OrderStatus.PENDING,
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

  async createOrderStanding(dto: CreateOrderDto, user: User) {
    const { standingAdultQty = 0, standingChildQty = 0, referrerCode } = dto;

    const total =
      standingAdultQty * STANDING_ADULT_PRICE +
      standingChildQty * STANDING_CHILD_PRICE;
    const commission =
      standingAdultQty * ADULT_COMMISSION + standingChildQty * CHILD_COMMISSION;

    let referrer: Referrer | null = null;
    if (referrerCode) {
      referrer = await this.referrerRepo.findOne({
        where: { code: referrerCode },
      });
      if (!referrer) {
        throw new BadRequestException('Referrer code ไม่ถูกต้อง');
      }
    }

    const order = this.orderRepo.create({
      standingAdultQty,
      standingChildQty,
      standingTotal: total,
      customerName: dto.customerName,
      standingCommission: commission,
      status: OrderStatus.BOOKED,
      method: dto.method || PaymentMethod.CASH,
      total,
      user,
      referrer,
      referrerCode: dto.referrerCode,
      referrerCommission: 0,
      showDate: dto.showDate,
    } as DeepPartial<Order>);

    return this.orderRepo.save(order);
  }

  async updateOrderStanding(orderId: string, dto: CreateOrderDto, user: User) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['referrer'],
    });

    if (!order) {
      throw new NotFoundException('ไม่พบคำสั่งซื้อ');
    }

    // ✅ อัปเดตข้อมูลลูกค้า
    order.customerName = dto.customerName || order.customerName;
    if (
      dto.method &&
      Object.values(OrderMethod).includes(dto.method as OrderMethod)
    ) {
      order.method = dto.method as OrderMethod;
    }
    if (dto.showDate) {
      order.showDate = new Date(dto.showDate);
    }

    // ✅ อัปเดตจำนวนและคำนวณยอดรวม
    const standingAdultQty = dto.standingAdultQty ?? order.standingAdultQty;
    const standingChildQty = dto.standingChildQty ?? order.standingChildQty;

    order.standingAdultQty = standingAdultQty;
    order.standingChildQty = standingChildQty;

    order.standingTotal =
      standingAdultQty * STANDING_ADULT_PRICE +
      standingChildQty * STANDING_CHILD_PRICE;

    order.standingCommission =
      standingAdultQty * ADULT_COMMISSION + standingChildQty * CHILD_COMMISSION;

    order.total = order.standingTotal;

    // ✅ อัปเดต Referrer (หากส่งมาใหม่)
    if (dto.referrerCode && dto.referrerCode !== order.referrerCode) {
      const referrer = await this.referrerRepo.findOne({
        where: { code: dto.referrerCode },
      });

      if (!referrer) {
        throw new BadRequestException('Referrer code ไม่ถูกต้อง');
      }

      order.referrer = referrer;
      order.referrerCode = referrer.code;
    }

    order.user = user; // เผื่ออยาก track ว่าใครเป็นคนอัปเดตล่าสุด

    return this.orderRepo.save(order);
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
      .leftJoinAndSelect('seats.zone', 'seatZone')
      .leftJoinAndSelect('order.seatBookings', 'seatBookings')
      .leftJoinAndSelect('seatBookings.seat', 'bookingSeat')
      .leftJoinAndSelect('bookingSeat.zone', 'bookingSeatZone')
      .leftJoinAndSelect('order.payment', 'payment')
      .leftJoinAndSelect('payment.user', 'paymentUser')
      .leftJoin('order.referrer', 'referrer')
      .addSelect(['referrer.name', 'referrer.code'])
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
      const zoneNamesFromBookings = order.seatBookings
        ?.map((booking) => booking.seat?.zone?.name)
        .filter(Boolean);

      const uniqueZoneNames = [...new Set(zoneNamesFromBookings)];
      (order as any).zoneName = uniqueZoneNames[0] || '-';
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
  async changeSeats(
    orderId: string,
    newSeatIds: string[],
    newShowDate?: string,
  ) {
    if (!newSeatIds || newSeatIds.length === 0) {
      throw new Error('❌ ต้องระบุรายการที่นั่งใหม่');
    }

    const showDateStr = dayjs(newShowDate)
      .tz('Asia/Bangkok')
      .format('YYYY-MM-DD');

    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['seatBookings', 'referrer'],
    });

    if (!order) throw new Error('❌ ไม่พบออเดอร์ที่ต้องการเปลี่ยนที่นั่ง');

    const isPaid = order.status === OrderStatus.PAID;
    const showDate = newShowDate
      ? new Date(newShowDate)
      : new Date(order.showDate);

    // 🔍 โหลดข้อมูลที่นั่งใหม่
    const newSeats = await this.seatRepo.find({
      where: { id: In(newSeatIds) },
      relations: ['zone'],
    });

    if (newSeats.length !== newSeatIds.length) {
      const foundIds = newSeats.map((s) => s.id);
      const missing = newSeatIds.filter((id) => !foundIds.includes(id));
      throw new Error(`❌ ที่นั่งใหม่บางตัวไม่พบในระบบ: ${missing.join(', ')}`);
    }

    // ❌ ป้องกันที่นั่งใหม่ซ้ำกับออเดอร์อื่นที่จ่ายเงินแล้ว
    const conflict = await this.seatBookingRepo.count({
      where: {
        seat: In(newSeatIds),
        showDate: showDateStr,
        status: BookingStatus.PAID,
        order: Not(orderId),
      },
    });

    if (conflict > 0) {
      throw new Error('❌ ที่นั่งใหม่บางตัวถูกจองแล้วในวันเดียวกัน');
    }

    // ✅ ลบ booking เดิมให้หมดก่อน (ถ้ามี)
    await this.seatBookingRepo
      .createQueryBuilder()
      .delete()
      .where('orderId = :orderId', { orderId })
      .execute();
    order.seatBookings = [];
    // ✅ อัปเดตวันที่ใหม่
    order.showDate = showDate;

    // ✅ ถ้าไม่ใช่จ่ายเงินแล้ว ต้องคำนวณ total และค่าคอมใหม่
    if (!isPaid) {
      order.total = newSeats.length * 1200;

      if (order.referrer) {
        const commission = newSeats.length * 400;
        order.referrerCommission = commission;
        order.referrer.totalCommission = commission;
        await this.referrerRepo.save(order.referrer);
      }
    }

    await this.orderRepo.save(order);

    // ✅ สร้าง booking ใหม่ทั้งหมด
    const newBookings = newSeats.map((seat) => {
      const booking = new SeatBooking();
      booking.seat = seat;
      booking.order = order;
      booking.showDate = showDateStr;
      booking.status = isPaid ? BookingStatus.PAID : BookingStatus.BOOKED;
      return booking;
    });

    await this.seatBookingRepo.save(newBookings);

    // ✅ return order พร้อม seatBookings ใหม่ทั้งหมด
    return this.orderRepo.findOne({
      where: { id: order.id },
      relations: ['seatBookings', 'seatBookings.seat'],
    });
  }

  async updateBookedOrder(orderId: string, dto: UpdateBookedOrderDto) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['seats', 'seatBookings'],
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.BOOKED)
      throw new BadRequestException('Only BOOKED orders can be updated');

    const existingSeatIds = order.seats.map((seat) => seat.id);
    const mergedSeatIds = Array.from(
      new Set([...existingSeatIds, ...dto.seatIds]),
    );

    const seats = await this.seatRepo.findByIds(mergedSeatIds);
    if (seats.length !== mergedSeatIds.length)
      throw new BadRequestException('Some seatIds are invalid');

    await this.seatBookingRepo.delete({ order: { id: orderId } });

    const conflictBookings = await this.seatBookingRepo.find({
      where: {
        seat: seats,
        showDate: dto.showDate,
        status: In([SeatStatus.BOOKED, SeatStatus.PAID]),
        order: Not(orderId), // ห้ามชนกับ order อื่น
      },
      relations: ['seat'],
    });

    if (conflictBookings.length > 0) {
      const seatNumbers = conflictBookings.map((b) => b.seat.seatNumber);
      throw new BadRequestException(
        `ที่นั่ง ${seatNumbers.join(', ')} ถูกจองแล้ว`,
      );
    }

    const newBookings = seats.map((seat) =>
      this.seatBookingRepo.create({
        seat,
        order,
        showDate: dto.showDate,
        bookingStatus: SeatStatus.BOOKED,
      } as DeepPartial<SeatBooking>),
    );
    await this.seatBookingRepo.save(newBookings);

    order.seats = seats;
    order.total = seats.length * 1800;
    order.showDate = new Date(dto.showDate);
    if (dto.method) order.method = OrderMethod[dto.method];

    return this.orderRepo.save(order);
  }

  async generateReferrerPdf(
    referrerId: string,
    startDate: string,
    endDate: string,
  ) {
    const orders = await this.orderRepo.find({
      where: {
        referrerId,
        status: OrderStatus.PAID,
        createdAt: Between(
          dayjs(startDate).tz('Asia/Bangkok').startOf('day').toDate(),
          dayjs(endDate).tz('Asia/Bangkok').endOf('day').toDate(),
        ),
      },
      relations: ['user', 'payment', 'payment.user', 'seats'],
      order: { createdAt: 'ASC' },
    });

    const rows = orders.map((order) => {
      const total = +order.total || 0;
      const commission =
        Number(order.referrerCommission || 0) +
        Number(order.standingCommission || 0);
      const netTotal = total - commission;
      const qty =
        (order.seats?.length || 0) +
        order.standingAdultQty +
        order.standingChildQty;
      const unitPrice = qty > 0 ? netTotal / qty : 0;

      return [
        {
          text: dayjs(order.createdAt).tz('Asia/Bangkok').format('DD/MM/YYYY'),
          alignment: 'center',
        },
        { text: 'THAI BOXING', alignment: 'center' },
        { text: '', alignment: 'center' },
        { text: `${qty}`, alignment: 'center' },
        { text: unitPrice.toFixed(2), alignment: 'right' },
        { text: netTotal.toLocaleString(), alignment: 'right' },
      ];
    });

    const MAX_ROWS = 124;
    const emptyRow = [
      { text: '', alignment: 'center' },
      { text: '', alignment: 'center' },
      { text: '', alignment: 'center' },
      { text: '', alignment: 'center' },
      { text: '', alignment: 'right' },
      { text: '', alignment: 'right' },
    ];

    const offset = rows.length * 5;

    const rowsToFill = Math.max(0, MAX_ROWS - rows.length - offset);

    for (let i = 0; i < rowsToFill; i++) {
      rows.push(emptyRow);
    }

    const total = orders.reduce((sum, o) => sum + +o.total, 0);
    const commission = orders.reduce(
      (sum, o) =>
        sum +
        Number(o.referrerCommission || 0) +
        Number(o.standingCommission || 0),
      0,
    );
    const netTotal = total - commission;
    const randomInvoice = Math.floor(Math.random() * 900000 + 100000);

    const docDefinition = {
      pageOrientation: 'portrait',
      pageMargins: [20, 40, 20, 30], // เว้นขอบ ซ บ ข ล
      content: [
        {
          text: 'BOXING STADIUM PATONG BEACH',
          alignment: 'center',
          bold: true,
          fontSize: 45,
          margin: [0, 0, 0, 2],
        },
        {
          text:
            '2/59 Soi Keb Sub 2, Sai Nam Yen RD, Patong Beach, Phuket 83150\n' +
            'Tel. 076-345578, 086-4761724, 080-5354042',
          alignment: 'center',
          fontSize: 20,
          margin: [0, -10, 0, 0], //ซ บ ข ล
        },
        {
          table: {
            widths: ['*', 'auto'], // ซ้ายขวา
            body: [
              [
                {
                  stack: [
                    {
                      text: 'Invoice',
                      alignment: 'center',
                      bold: true,
                      fontSize: 20,
                      margin: [0, 0, 0, 4],
                    },
                    {
                      text: `DATE ${dayjs(startDate).tz('Asia/Bangkok').format('D MMMM YYYY').toUpperCase()}`,
                      bold: true,
                      margin: [0, 0, 0, 2],
                    },
                    { text: 'FRESHY TOUR', bold: true },
                    { text: 'PHUKET THAILAND', bold: true },
                  ],
                },
                {
                  text: `NO. ${randomInvoice}`,
                  alignment: 'right',
                  bold: true,
                  margin: [0, 20, 0, 0],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: (i) => {
              // แสดงเฉพาะเส้นขอบบนเท่านั้น
              return i === 0 ? 0.5 : 0;
            },

            vLineWidth: (i, node) => {
              // ซ้ายสุด (i=0) และขวาสุด (i=columns.length): แสดงเส้น
              // คอลัมน์ตรงกลาง (i=1): ไม่ต้องแสดง
              return i === 0 || i === node.table.widths.length ? 0.5 : 0;
            },
          },
          margin: [0, 0, 0, 0],
        },
        {
          table: {
            headerRows: 1,
            widths: ['15%', '15%', '15%', '10%', '22.5%', '22.5%'],
            body: [
              [
                { text: 'วันที่', bold: true, alignment: 'center' },
                { text: 'รายการ', bold: true, alignment: 'center' },
                { text: 'V/C', bold: true, alignment: 'center' },
                { text: 'จำนวน', bold: true, alignment: 'center' },
                { text: 'ราคา', bold: true, alignment: 'center' },
                { text: 'ราคารวม', bold: true, alignment: 'center' },
              ],
              ...rows,
            ],
          },
          layout: {
            hLineWidth: (i) => {
              // เฉพาะ header บนเท่านั้น
              return i === 0 || i === 1 ? 0.5 : 0;
            },
            vLineWidth: () => 0.5,
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
          },
        },
        {
          margin: [0, 0, 0, 0],
          table: {
            widths: ['*', '*'],
            body: [
              [
                { text: 'CASH ON TOUR', bold: true, color: 'red' },
                {
                  text: `${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  alignment: 'right',
                  color: 'red',
                },
              ],
              [
                { text: '' },
                {
                  text: `${netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  alignment: 'right',
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
          },
        },
      ],
      defaultStyle: {
        font: 'THSarabunNew',
        fontSize: 14,
      },
    };

    return await createPdfBuffer(docDefinition);
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

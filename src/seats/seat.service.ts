import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Zone } from '../zone/zone.entity';
import { Seat } from './seat.entity';
import { SeatBooking } from './seat-booking.entity';
import { CreateSeatDto } from './dto/create-seat.dto';
import { SeatStatus, BookingStatus } from '../common/enums';
import { SeatFilterDto } from './dto/seat-filter.dto';
import {
  LoggingHelper,
  ErrorHandlingHelper,
  AuditHelper,
} from '../common/utils';

@Injectable()
export class SeatService {
  constructor(
    @InjectRepository(Seat) private readonly seatRepo: Repository<Seat>,
    @InjectRepository(Zone) private readonly zoneRepo: Repository<Zone>,
    @InjectRepository(SeatBooking)
    private readonly seatBookingRepo: Repository<SeatBooking>,
  ) {}

  async create(dto: CreateSeatDto): Promise<Seat> {
    const logger = LoggingHelper.createContextLogger('SeatService');

    try {
      const zone = await this.zoneRepo.findOneByOrFail({ id: dto.zoneId });

      const seat = this.seatRepo.create({
        seatNumber: dto.seatNumber,
        rowIndex: dto.rowIndex,
        columnIndex: dto.columnIndex,
        status: dto.status ?? SeatStatus.AVAILABLE,
        zone,
      });

      const savedSeat = await this.seatRepo.save(seat);

      // 📝 Audit logging for seat creation
      await AuditHelper.logCreate(
        'Seat',
        savedSeat.id,
        dto,
        AuditHelper.createSystemContext({
          source: 'SeatService.create',
          zoneId: dto.zoneId,
        }),
      );

      LoggingHelper.logBusinessEvent(logger, 'Seat created', {
        seatId: savedSeat.id,
        seatNumber: dto.seatNumber,
        zoneId: dto.zoneId,
      });

      return savedSeat;
    } catch (error) {
      throw ErrorHandlingHelper.logAndTransformError(error, 'Create seat', {
        metadata: { dto },
      });
    }
  }

  async findByZone(zoneId: string, showDate: string) {
    const logger = LoggingHelper.createContextLogger('SeatService');
    const startTime = Date.now();

    try {
      // 1. ดึงที่นั่งทั้งหมดในโซน
      const seats = await this.seatRepo.find({
        where: { zone: { id: zoneId } },
        relations: ['zone'],
      });

      // 🔧 RESET ที่นั่งทั้งหมดให้เป็น AVAILABLE (ยกเว้น EMPTY)
      // เพื่อป้องกันปัญหาสถานะติดค้าง
      for (const seat of seats) {
        if (seat.status !== SeatStatus.EMPTY) {
          await this.seatRepo.update(seat.id, { status: SeatStatus.AVAILABLE });
          seat.status = SeatStatus.AVAILABLE;
        }
      }

      // 2. ดึง bookings ที่ตรงกับ showDate และที่นั่งในโซนนั้น
      const bookings = await this.seatBookingRepo.find({
        where: {
          seat: In(seats.map((s) => s.id)),
          showDate,
          status: In([
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.PAID,
          ]),
        },
        relations: ['seat'],
      });

      // 3. Map seatId → bookingStatus ('PENDING', 'PAID', 'BOOKED')
      const bookingMap = new Map<string, string>();
      for (const booking of bookings) {
        bookingMap.set(booking.seat.id, booking.status);
      }

      // 4. return seat พร้อม bookingStatus
      const result = seats.map((seat) => ({
        ...seat,
        bookingStatus: bookingMap.get(seat.id) || 'AVAILABLE',
      }));

      LoggingHelper.logPerformance(logger, 'seat.findByZone', startTime, {
        zoneId,
        showDate,
        seatsCount: seats.length,
        bookingsCount: bookings.length,
      });

      return result;
    } catch (error) {
      throw ErrorHandlingHelper.logAndTransformError(
        error,
        'Find seats by zone',
        {
          metadata: { zoneId, showDate },
        },
      );
    }
  }

  async findAll(filter?: SeatFilterDto): Promise<Seat[]> {
    const where: any = {};
    if (filter?.zoneId) where.zone = { id: filter.zoneId };
    if (filter?.status) where.status = filter.status;

    return await this.seatRepo.find({
      where,
      relations: ['zone'],
    });
  }

  async findById(id: string): Promise<Seat | null> {
    return await this.seatRepo.findOne({
      where: { id },
      relations: ['zone'],
    });
  }

  async update(id: string, dto: Partial<Seat>): Promise<Seat> {
    // Get old data for audit
    const oldSeat = await this.seatRepo.findOneByOrFail({ id });

    await this.seatRepo.update(id, dto);
    const updatedSeat = await this.seatRepo.findOneByOrFail({ id });

    // 📝 Audit logging for seat update
    await AuditHelper.logUpdate(
      'Seat',
      id,
      oldSeat,
      dto,
      AuditHelper.createSystemContext({
        source: 'SeatService.update',
        changes: Object.keys(dto),
      }),
    );

    return updatedSeat;
  }

  async updateStatus(id: string, status: SeatStatus): Promise<Seat> {
    // Get old data for audit
    const oldSeat = await this.seatRepo.findOneByOrFail({ id });

    await this.seatRepo.update(id, { status });
    const updatedSeat = await this.seatRepo.findOneByOrFail({ id });

    // 📝 Audit logging for seat status update
    await AuditHelper.logUpdate(
      'Seat',
      id,
      { status: oldSeat.status },
      { status },
      AuditHelper.createSystemContext({
        source: 'SeatService.updateStatus',
        oldStatus: oldSeat.status,
        newStatus: status,
      }),
    );

    return updatedSeat;
  }

  async remove(id: string): Promise<void> {
    // Get old data for audit
    const oldSeat = await this.seatRepo.findOneByOrFail({ id });

    await this.seatRepo.delete(id);

    // 📝 Audit logging for seat removal
    await AuditHelper.logDelete(
      'Seat',
      id,
      oldSeat,
      AuditHelper.createSystemContext({
        source: 'SeatService.remove',
      }),
    );
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from '../zone/zone.entity';
import { Seat } from './seat.entity';
import { SeatBooking } from './seat-booking.entity';
import { CreateSeatDto } from './dto/create-seat.dto';
import { SeatStatus } from '../common/enums';
import { SeatFilterDto } from './dto/seat-filter.dto';
import { CacheService } from '../common/services/cache.service';
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
    private readonly cacheService: CacheService,
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
      // 1. ตรวจสอบ Cache ก่อน
      const cacheKey = this.cacheService.getSeatAvailabilityKey(
        zoneId,
        showDate,
      );
      const cached = this.cacheService.get(cacheKey);

      if (cached) {
        logger.debug('🚀 Cache hit for seat availability');
        LoggingHelper.logPerformance(
          logger,
          'seat.findByZone.cached',
          startTime,
          {
            zoneId,
            showDate,
            seatsCount: Array.isArray(cached) ? cached.length : 0,
          },
        );
        return cached;
      }

      logger.debug(
        `💾 Cache miss - fetching from database: ${zoneId}:${showDate}`,
      );

      // 2. ใช้ Raw Query เพื่อประสิทธิภาพสูงสุด
      const result = await this.seatRepo.query(
        `
        SELECT 
          s.id,
          s."seatNumber",
          s."rowIndex",
          s."columnIndex", 
          s."isLockedUntil",
          s.status,
          s."createdAt",
          s."updatedAt",
          z.id as "zone_id",
          z.name as "zone_name",
          COALESCE(sb.status, 'AVAILABLE') as "bookingStatus"
        FROM seat s
        INNER JOIN zones z ON s."zoneId" = z.id
        LEFT JOIN seat_booking sb ON s.id = sb."seatId" 
          AND sb."showDate" = $2
          AND sb.status IN ('PENDING', 'CONFIRMED', 'PAID')
        WHERE s."zoneId" = $1
        ORDER BY s."rowIndex" ASC, s."columnIndex" ASC
      `,
        [zoneId, showDate],
      );

      // 3. แปลงผลลัพธ์ให้ตรงกับ Format เดิม
      const formattedSeats = result.map((row: any) => ({
        id: row.id,
        isLockedUntil: row.isLockedUntil,
        seatNumber: row.seatNumber,
        rowIndex: row.rowIndex,
        columnIndex: row.columnIndex,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        zone: {
          id: row.zone_id,
          name: row.zone_name,
        },
        bookingStatus: row.bookingStatus,
      }));

      // 4. เก็บใน Cache (10 วินาที)
      this.cacheService.setSeatAvailability(zoneId, showDate, formattedSeats);
      LoggingHelper.logPerformance(
        logger,
        'seat.findByZone.database',
        startTime,
        {
          zoneId,
          showDate,
          seatsCount: formattedSeats.length,
        },
      );

      return formattedSeats;
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

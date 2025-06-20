import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Zone } from 'src/zone/zone.entity';
import { Seat } from './seat.entity';
import { SeatBooking } from './seat-booking.entity';
import { CreateSeatDto } from './dto/create-seat.dto';
import { SeatStatus } from './eat-status.enum';
import { SeatFilterDto } from './dto/seat-filter.dto';

@Injectable()
export class SeatService {
  constructor(
    @InjectRepository(Seat) private readonly seatRepo: Repository<Seat>,
    @InjectRepository(Zone) private readonly zoneRepo: Repository<Zone>,
    @InjectRepository(SeatBooking)
    private readonly seatBookingRepo: Repository<SeatBooking>,
  ) {}

  async create(dto: CreateSeatDto): Promise<Seat> {
    const zone = await this.zoneRepo.findOneByOrFail({ id: dto.zoneId });

    const seat = this.seatRepo.create({
      seatNumber: dto.seatNumber,
      rowIndex: dto.rowIndex,
      columnIndex: dto.columnIndex,
      status: dto.status ?? SeatStatus.AVAILABLE,
      zone,
    });

    return await this.seatRepo.save(seat);
  }

  async findByZone(zoneId: string, showDate: string) {
    // 1. ดึงที่นั่งทั้งหมดในโซน
    const seats = await this.seatRepo.find({
      where: { zone: { id: zoneId } },
      relations: ['zone'],
    });

    // 2. ดึง bookings ที่ตรงกับ showDate และที่นั่งในโซนนั้น
    const bookings = await this.seatBookingRepo.find({
      where: {
        seat: In(seats.map((s) => s.id)),
        showDate,
      },
      relations: ['seat'],
    });

    // 3. Map seatId → bookingStatus ('PAID', 'BOOKED')
    const bookingMap = new Map<string, string>();
    for (const booking of bookings) {
      bookingMap.set(booking.seat.id, booking.status);
    }

    // 4. return seat พร้อม bookingStatus
    return seats.map((seat) => ({
      ...seat,
      bookingStatus: bookingMap.get(seat.id) || 'AVAILABLE',
    }));
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
    await this.seatRepo.update(id, dto);
    return await this.seatRepo.findOneByOrFail({ id });
  }

  async updateStatus(id: string, status: SeatStatus): Promise<Seat> {
    await this.seatRepo.update(id, { status });
    return await this.seatRepo.findOneByOrFail({ id });
  }

  async remove(id: string): Promise<void> {
    await this.seatRepo.delete(id);
  }
}

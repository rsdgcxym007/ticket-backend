import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Zone } from 'src/zone/zone.entity';
import { Repository } from 'typeorm';
import { CreateSeatDto } from './dto/create-seat.dto';
import { Seat } from './seat.entity';
import { SeatStatus } from './eat-status.enum';
import { SeatFilterDto } from './dto/seat-filter.dto';

@Injectable()
export class SeatService {
  constructor(
    @InjectRepository(Seat) private readonly repo: Repository<Seat>,
    @InjectRepository(Zone) private readonly zoneRepo: Repository<Zone>,
  ) {}

  async create(dto: CreateSeatDto): Promise<Seat> {
    const zone = await this.zoneRepo.findOneByOrFail({ id: dto.zoneId });

    const seat = this.repo.create({
      seatNumber: dto.seatNumber,
      rowIndex: dto.rowIndex,
      columnIndex: dto.columnIndex,
      status: dto.status ?? SeatStatus.AVAILABLE,
      zone,
    });

    return await this.repo.save(seat);
  }

  async findByZone(zoneId: string): Promise<Seat[]> {
    return await this.repo.find({
      where: { zone: { id: zoneId } },
      relations: ['zone'],
    });
  }

  async findAll(filter?: SeatFilterDto): Promise<Seat[]> {
    const where: any = {};
    if (filter?.zoneId) where.zone = { id: filter.zoneId };
    if (filter?.status) where.status = filter.status;

    return await this.repo.find({
      where,
      relations: ['zone'],
    });
  }

  async findById(id: string): Promise<Seat | null> {
    return await this.repo.findOne({
      where: { id },
      relations: ['zone'],
    });
  }

  async update(id: string, dto: Partial<Seat>): Promise<Seat> {
    await this.repo.update(id, dto);
    return await this.repo.findOneByOrFail({ id });
  }

  async updateStatus(id: string, status: SeatStatus): Promise<Seat> {
    await this.repo.update(id, { status });
    return await this.repo.findOneByOrFail({ id });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

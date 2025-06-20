// src/zone/zone.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Zone } from './zone.entity';
import { Repository } from 'typeorm';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class ZoneService {
  constructor(
    @InjectRepository(Zone)
    private readonly repo: Repository<Zone>,
  ) {}

  async create(dto: CreateZoneDto) {
    const zone = this.repo.create(dto);
    return await this.repo.save(zone);
  }

  async findAll() {
    return await this.repo.find();
  }

  async findOne(id: string) {
    const zone = await this.repo.findOne({ where: { id } });
    if (!zone) throw new NotFoundException('Zone not found');
    return zone;
  }

  async update(id: string, dto: UpdateZoneDto) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const zone = await this.findOne(id);
    return await this.repo.remove(zone);
  }
}

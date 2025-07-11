// src/zone/zone.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Zone } from './zone.entity';
import { Repository } from 'typeorm';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { AuditHelper } from '../common/utils';

@Injectable()
export class ZoneService {
  constructor(
    @InjectRepository(Zone)
    private readonly repo: Repository<Zone>,
  ) {}

  async create(dto: CreateZoneDto) {
    const zone = this.repo.create(dto);
    const savedZone = await this.repo.save(zone);

    // 📝 Audit logging for zone creation
    await AuditHelper.logCreate(
      'Zone',
      savedZone.id,
      dto,
      AuditHelper.createSystemContext({
        source: 'ZoneService.create',
      }),
    );

    return savedZone;
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
    const oldZone = await this.findOne(id);
    await this.repo.update(id, dto);
    const updatedZone = await this.findOne(id);

    // 📝 Audit logging for zone update
    await AuditHelper.logUpdate(
      'Zone',
      id,
      oldZone,
      dto,
      AuditHelper.createSystemContext({
        source: 'ZoneService.update',
        changes: Object.keys(dto),
      }),
    );

    return updatedZone;
  }

  async remove(id: string) {
    const zone = await this.findOne(id);
    const removedZone = await this.repo.remove(zone);

    // 📝 Audit logging for zone removal
    await AuditHelper.logDelete(
      'Zone',
      id,
      zone,
      AuditHelper.createSystemContext({
        source: 'ZoneService.remove',
      }),
    );

    return removedZone;
  }
}

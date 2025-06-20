import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referrer } from './referrer.entity';
import { CreateReferrerDto } from './dto/create-referrer.dto';
import { UpdateReferrerDto } from './dto/update-referrer.dto';

@Injectable()
export class ReferrerService {
  constructor(@InjectRepository(Referrer) private repo: Repository<Referrer>) {}

  async create(dto: CreateReferrerDto) {
    const ref = this.repo.create(dto);
    return this.repo.save(ref);
  }

  async findAll() {
    return this.repo.find();
  }

  async findOne(id: string) {
    return this.repo.findOneByOrFail({ id });
  }

  async update(id: string, dto: UpdateReferrerDto) {
    await this.repo.update(id, dto);
    return this.repo.findOneByOrFail({ id });
  }

  async remove(id: string) {
    return this.repo.delete(id);
  }

  async addCommission(referrerId: string, seatCount: number) {
    const ref = await this.repo.findOneByOrFail({ id: referrerId });
    ref.totalCommission += seatCount * 400;
    return this.repo.save(ref);
  }
}

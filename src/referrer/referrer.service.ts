import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { Referrer } from './referrer.entity';
import { CreateReferrerDto } from './dto/create-referrer.dto';
import { UpdateReferrerDto } from './dto/update-referrer.dto';
import { Order } from 'src/order/order.entity';
import dayjs from 'dayjs';

@Injectable()
export class ReferrerService {
  constructor(
    @InjectRepository(Referrer) private repo: Repository<Referrer>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
  ) {}

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

  async findAllWithPagination({
    page = 1,
    limit = 10,
    status,
    search,
  }: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('referrer');

    if (status !== undefined) {
      qb.andWhere('referrer.active = :status', {
        status: status === 'true' || status === '1',
      });
    }

    if (search) {
      qb.andWhere(
        '(referrer.name ILIKE :search OR referrer.code ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [items, total] = await qb
      .orderBy('referrer.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

  async getReferrerOrders(
    referrerId: string,
    query: { startDate?: string; endDate?: string },
  ) {
    const where: FindOptionsWhere<Order> = {
      referrer: { id: referrerId },
    };

    if (query.startDate && query.endDate) {
      const startDate = dayjs(query.startDate).startOf('day').toDate();
      const end = dayjs(query.endDate).endOf('day').toDate();
      where.createdAt = Between(startDate, end);
    }

    const orders = await this.orderRepo.find({
      where,
      relations: ['user', 'seats', 'referrer', 'payment', 'payment.user'],
      order: {
        createdAt: 'DESC',
      },
    });

    return orders.map((order) => ({
      id: order.id,
      total: order.total,
      status: order.status,
      method: order.method,
      createdAt: order.createdAt,
      showDate: order.showDate,
      customerName: order.customerName,
      standingAdultQty: order.standingAdultQty,
      standingChildQty: order.standingChildQty,
      standingTotal: order.standingTotal,
      standingCommission: order.standingCommission,
      referrerCommission: order.referrerCommission,
      user: order.user
        ? {
            name: order.user.name,
            role: order.user.role,
          }
        : null,
      referrer: {
        name: order.referrer?.name,
        code: order.referrer?.code,
      },
      seats: order.seats?.map((s) => ({
        seatNumber: s.seatNumber,
      })),
      payment: order.payment
        ? {
            method: order.payment.method,
            amount: order.payment.amount,
            paidAt: order.payment.paidAt,
            user: order.payment.user
              ? {
                  name: order.payment.user.name,
                }
              : null,
          }
        : null,
    }));
  }
}

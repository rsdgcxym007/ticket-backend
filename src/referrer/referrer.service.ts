import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Referrer } from './referrer.entity';
import { CreateReferrerDto } from './dto/create-referrer.dto';
import { UpdateReferrerDto } from './dto/update-referrer.dto';
import { Order } from '../order/order.entity';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { OrderStatus } from '../common/enums';
import { createPdfBuffer } from '../utils/createPdfBuffer';
import { getImageBase64 } from '../utils/imageBase64';
import * as path from 'path';
import ThaiBahtText from 'thai-baht-text';
dayjs.extend(utc);
dayjs.extend(timezone);
@Injectable()
export class ReferrerService {
  /**
   * สร้าง PDF ใบเสร็จความร้อน 57x38mm ขาวดำ
   * @param order ข้อมูลออเดอร์เดียว (Order entity)
   */

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
    // Removed exclusion of isActive property
    const filteredDto = { ...dto };
    delete filteredDto.createdAt;
    delete filteredDto.updatedAt;

    await this.repo.update(id, filteredDto);
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
    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.referrer', 'referrer')
      .leftJoinAndSelect('order.payment', 'payment')
      .leftJoinAndSelect('payment.user', 'paymentUser')
      .leftJoinAndSelect('order.seatBookings', 'seatBookings')
      .leftJoinAndSelect('seatBookings.seat', 'seat')
      .leftJoinAndSelect('seat.zone', 'zone')
      .where('referrer.id = :referrerId', { referrerId })
      .orderBy('order.createdAt', 'DESC');

    if (query.startDate && query.endDate) {
      const startDate = dayjs(query.startDate)
        .tz('Asia/Bangkok')
        .startOf('day')
        .toDate();
      const endDate = dayjs(query.endDate)
        .tz('Asia/Bangkok')
        .endOf('day')
        .toDate();
      qb.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const orders = await qb.getMany();

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
      seatBookings:
        order.seatBookings?.map((seatBooking) => ({
          seatNumber: seatBooking.seat?.seatNumber,
          zone: seatBooking.seat?.zone?.name,
          bookingId: seatBooking.id,
          bookingDate: seatBooking.createdAt,
        })) || [],
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
      relations: [
        'user',
        'payment',
        'payment.user',
        'seatBookings',
        'seatBookings.seat',
        'referrer',
      ],
      order: { createdAt: 'ASC' },
    });
    console.log('orders', orders);

    const rows = orders
      .filter((e) => e.status === OrderStatus.PAID)
      .map((order) => {
        const total = +order.total || 0;
        const commission =
          Number(order.referrerCommission || 0) +
          Number(order.standingCommission || 0);
        const netTotal = total - commission;
        const commissionStaring = order.standingCommission || 0;
        const commissionRingside = order.referrerCommission || 0;
        const qty =
          (order.seatBookings?.length || 0) +
          order.standingAdultQty +
          order.standingChildQty;
        const unitPrice =
          order.ticketType === 'STANDING'
            ? commissionStaring
            : commissionRingside;
        return [
          {
            text: dayjs(order.createdAt)
              .tz('Asia/Bangkok')
              .format('DD/MM/YYYY'),
            alignment: 'center',
          },
          { text: 'THAI BOXING', alignment: 'center' },
          { text: order.orderNumber, alignment: 'center' },
          { text: `${qty}`, alignment: 'center' },
          {
            text: unitPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            }),
            alignment: 'right',
          },
          {
            text: netTotal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            }),
            alignment: 'right',
          },
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
                      margin: [0, 0, 0, 0], //ซ บ ข ล
                    },
                    { text: orders[0]?.referrer?.name, bold: true },
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
            widths: ['15%', '15%', '20%', '10%', '20%', '20%'],
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
                {
                  text: 'CASH ON TOUR',
                  bold: true,
                  color: 'red',
                  alignment: 'center',
                },
                {
                  text: `${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  alignment: 'right',
                  color: 'red',
                },
              ],
              [
                {
                  text: ThaiBahtText(netTotal),
                  bold: true,
                  alignment: 'center',
                },
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

  /**
   * สร้าง PDF ใบเสร็จความร้อน 57x38mm ขาวดำ จาก tickets array
   * @param tickets array of ticket objects
   */
  async generateThermalReceiptPdf(tickets: any[]) {
    if (!tickets || tickets.length === 0) {
      throw new Error('No tickets data');
    }
    // โหลดโลโก้เป็น base64 จาก images/ ที่ root
    const logoPath = path.join(process.cwd(), 'images/LOGOST.png');
    let logoBase64 = '';
    try {
      logoBase64 = getImageBase64(logoPath);
    } catch {
      logoBase64 = '';
    }
    console.log('logoBase64', logoBase64);

    // thermal receipt PDF แบบหลายหน้า (1 หน้า/1 ตั๋ว)
    const pages = tickets.map((ticket, idx) => {
      const isStanding = ticket.type === 'STANDING';
      let seatText = '';
      if (isStanding) {
        seatText = 'Type: Standing';
      } else {
        seatText =
          (ticket.seatNumber ? `Seat ${ticket.seatNumber}` : '') +
          (ticket.zone?.name ? ` | Zone ${ticket.zone?.name}` : '');
        seatText = seatText.trim() || '-';
      }
      const stack = [
        ...(logoBase64
          ? [
              {
                image: logoBase64,
                width: 24,
                alignment: 'center',
                margin: [0, 2, 0, 0],
                ...(idx > 0 ? { pageBreak: 'before' } : {}),
              },
            ]
          : []),
        {
          text: 'PATONG BOXING STADIUM',
          alignment: 'center',
          bold: true,
          fontSize: 8,
          color: '#000',
          margin: [0, 0, 0, 0],
          ...(logoBase64 === '' && idx > 0 ? { pageBreak: 'before' } : {}),
        },
        {
          text:
            '2/59 Soi Keb Sub 2, Sai Nam Yen RD, Patong Beach, Phuket 83150\n' +
            'Tel. 076-345578, 086-4761724, 080-5354042',
          alignment: 'center',
          fontSize: 8,
          color: '#000',
          margin: [0, 0, 0, 0],
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 140,
              y2: 0,
              lineWidth: 0.5,
              lineColor: '#333',
            },
          ],
          margin: [0, 0, 0, 0],
        },
        {
          columns: [
            { text: 'Order No:', width: 38, fontSize: 8, bold: true },
            { text: ticket.orderNumber || '-', fontSize: 8, alignment: 'left' },
          ],
          margin: [0, 0, 0, 0],
        },
        {
          columns: [
            { text: 'Show Date:', width: 38, fontSize: 8, bold: true },
            { text: ticket.showDate || '-', fontSize: 8, alignment: 'left' },
          ],
          margin: [0, 0, 0, 0],
        },
        {
          columns: [
            { text: 'Customer:', width: 38, fontSize: 8, bold: true },
            {
              text: ticket.customerName || '-',
              fontSize: 8,
              alignment: 'left',
            },
          ],
          margin: [0, 0, 0, 0],
        },
        {
          columns: [
            { text: 'Seat/Zone:', width: 38, fontSize: 8, bold: true },
            { text: seatText, fontSize: 8, alignment: 'left', bold: false },
          ],
          margin: [0, 0, 0, 0],
        },
        {
          columns: [
            { text: 'Ticket Type:', width: 38, fontSize: 8, bold: true },
            {
              text:
                ticket.type === 'STANDING'
                  ? 'Standing'
                  : ticket.ticketCategory || '-',
              fontSize: 6,
              alignment: 'left',
            },
          ],
          margin: [0, 0, 0, 0],
        },
      ];
      return { stack };
    });

    // 1 mm = 2.83465 pt, 2x4 นิ้ว = 50.8mm x 101.6mm
    // 50.8mm = 144 pt, 101.6mm = 288 pt
    const docDefinition = {
      pageSize: {
        width: 144, // 2 นิ้ว
        height: 288, // 4 นิ้ว
      },
      pageMargins: [2, 2, 2, 2], // ลด margin ให้เหมาะกับ thermal
      content: pages,
      defaultStyle: {
        font: 'THSarabunNew',
        fontSize: 7,
      },
    };

    return await createPdfBuffer(docDefinition);
  }
}

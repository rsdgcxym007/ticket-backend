import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, In } from 'typeorm';
import { Referrer } from './referrer.entity';
import { CreateReferrerDto } from './dto/create-referrer.dto';
import { UpdateReferrerDto } from './dto/update-referrer.dto';
import { Order } from '../order/order.entity';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { OrderStatus, AttendanceStatus } from '../common/enums';
import { createPdfBuffer } from '../utils/createPdfBuffer';
import { getImageBase64 } from '../utils/imageBase64';
import { QRCodeService } from '../common/services/qr-code.service';
import * as path from 'path';
import ThaiBahtText from 'thai-baht-text';
dayjs.extend(utc);
dayjs.extend(timezone);
@Injectable()
export class ReferrerService {
  private readonly logger = new Logger(ReferrerService.name);

  /**
   * สร้าง PDF ใบเสร็จความร้อน 57x38mm ขาวดำ จาก tickets array
   * @param tickets array of ticket objects
   */

  constructor(
    @InjectRepository(Referrer) private repo: Repository<Referrer>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    private qrCodeService: QRCodeService,
  ) {}

  async create(dto: CreateReferrerDto) {
    const ref = this.repo.create(dto);
    return this.repo.save(ref);
  }

  async findAll() {
    return this.repo.find();
  }

  async findAllActive() {
    return this.repo.find({ where: { isActive: true } });
  }
  async findOne(id: string) {
    return this.repo.findOneByOrFail({ id });
  }

  async findAllWithPagination({
    page = 1,
    limit = 10,
    status,
    search,
    sortBy = 'latest',
  }: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sortBy?: string;
  }) {
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('referrer');

    if (status !== undefined) {
      qb.andWhere('referrer.isActive = :isActive', {
        isActive: status === 'true' || status === '1',
      });
    }

    if (search) {
      const searchValue = `%${search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(referrer.name) LIKE :search OR LOWER(referrer.code) LIKE :search)',
        { search: searchValue },
      );
    }

    // Sorting
    switch (sortBy) {
      case 'latest':
        qb.orderBy('referrer.createdAt', 'DESC');
        break;
      case 'oldest':
        qb.orderBy('referrer.createdAt', 'ASC');
        break;
      case 'name_asc':
        qb.orderBy('referrer.name', 'ASC');
        break;
      case 'name_desc':
        qb.orderBy('referrer.name', 'DESC');
        break;
      default:
        qb.orderBy('referrer.createdAt', 'DESC');
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

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
    filters: {
      startDate?: string;
      endDate?: string;
      status?: string;
      paymentMethod?: string;
    },
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

    if (filters.startDate && filters.endDate) {
      const startDate = dayjs(filters.startDate)
        .tz('Asia/Bangkok')
        .startOf('day')
        .toDate();
      const endDate = dayjs(filters.endDate)
        .tz('Asia/Bangkok')
        .endOf('day')
        .toDate();
      qb.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (filters.status) {
      qb.andWhere('order.status = :status', { status: filters.status });
    }
    if (filters.paymentMethod) {
      qb.andWhere('payment.method = :paymentMethod', {
        paymentMethod: filters.paymentMethod,
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
    referrerIds: string[],
    startDate: string,
    endDate: string,
  ) {
    const orders = await this.orderRepo.find({
      where: {
        referrerId: In(referrerIds),
        // status: OrderStatus.PAID,
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
    let totalOrdres = 0;
    const rows = orders
      .filter((e) => e.status !== OrderStatus.CANCELLED)
      .map((order) => {
        const qty =
          (order.seatBookings?.length || 0) +
          order.standingAdultQty +
          order.standingChildQty;
        const rsPrice = 1400;
        const stdPrice = 1200;
        const stdChiPrice = 1000;

        let unitPrice = 0;
        if (order.ticketType === 'STANDING') {
          unitPrice = stdPrice + order.standingChildQty * stdChiPrice;
        } else {
          unitPrice = rsPrice;
        }

        let netTotal = 0;
        if (order.ticketType === 'STANDING') {
          netTotal =
            order.standingAdultQty * stdPrice +
            order.standingChildQty * stdChiPrice;
        } else {
          netTotal = (order.seatBookings?.length || 0) * rsPrice;
        }
        totalOrdres += netTotal;
        return [
          {
            text: dayjs(order.createdAt)
              .tz('Asia/Bangkok')
              .format('DD/MM/YYYY'),
            alignment: 'center',
          },
          { text: 'THAI BOXING', alignment: 'center' },
          { text: order.voucherNumber, alignment: 'center' },
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

    const total = orders.reduce((sum, o) => sum + +o.actualPaidAmount, 0);
    // const negrandTotal = orders.reduce(
    //   (sum, o) => sum + +Number(o.totalAmount),
    //   0,
    // );
    const netTotal = totalOrdres - total;
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
            widths: ['auto', '*', 'auto'],
            body: [
              [
                {
                  text: orders[0]?.referrer?.name || '',
                  bold: true,
                  alignment: 'left',
                  fontSize: 20,
                },
                {
                  text: 'Invoice',
                  alignment: 'center',
                  bold: true,
                  fontSize: 20,
                },
                {
                  text: `NO. ${randomInvoice}`,
                  alignment: 'right',
                  bold: true,
                  fontSize: 20,
                },
              ],
              [
                {
                  text: `DATE ${dayjs(startDate).tz('Asia/Bangkok').format('D MMMM YYYY').toUpperCase()}`,
                  colSpan: 3,
                  alignment: 'left',
                  bold: true,
                },
                {},
                {},
              ],
              [
                {
                  text: 'PHUKET THAILAND',
                  colSpan: 3,
                  alignment: 'left',
                  bold: true,
                },
                {},
                {},
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
                  text: `- ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
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

  async generateReferrerPdfByOrderIds(orderIds: string[]) {
    const orders = await this.orderRepo.find({
      where: {
        id: In(orderIds),
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

    let totalOrdres = 0;
    const rows = orders
      .filter((e) => e.status !== OrderStatus.CANCELLED)
      .map((order) => {
        const qty =
          (order.seatBookings?.length || 0) +
          order.standingAdultQty +
          order.standingChildQty;
        const rsPrice = 1400;
        const stdPrice = 1200;
        const stdChiPrice = 1000;

        let unitPrice = 0;
        if (order.ticketType === 'STANDING') {
          unitPrice = stdPrice + order.standingChildQty * stdChiPrice;
        } else {
          unitPrice = rsPrice;
        }

        let netTotal = 0;
        if (order.ticketType === 'STANDING') {
          netTotal =
            order.standingAdultQty * stdPrice +
            order.standingChildQty * stdChiPrice;
        } else {
          netTotal = (order.seatBookings?.length || 0) * rsPrice;
        }
        totalOrdres += netTotal;
        return [
          {
            text: dayjs(order.createdAt)
              .tz('Asia/Bangkok')
              .format('DD/MM/YYYY'),
            alignment: 'center',
          },
          { text: 'THAI BOXING', alignment: 'center' },
          { text: order.voucherNumber, alignment: 'center' },
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

    const total = orders.reduce((sum, o) => sum + +o.actualPaidAmount, 0);
    // const negrandTotal = orders.reduce(
    //   (sum, o) => sum + +Number(o.totalAmount),
    //   0,
    // );
    const netTotal = totalOrdres - total;
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
            widths: ['auto', '*', 'auto'],
            body: [
              [
                {
                  text: orders[0]?.referrer?.name || '',
                  bold: true,
                  alignment: 'left',
                  fontSize: 20,
                },
                {
                  text: 'Invoice',
                  alignment: 'center',
                  bold: true,
                  fontSize: 20,
                },
                {
                  text: `NO. ${randomInvoice}`,
                  alignment: 'right',
                  bold: true,
                  fontSize: 20,
                },
              ],
              [
                {
                  text: `DATE ${dayjs(new Date()).tz('Asia/Bangkok').format('D MMMM YYYY').toUpperCase()}`,
                  colSpan: 3,
                  alignment: 'left',
                  bold: true,
                },
                {},
                {},
              ],
              [
                {
                  text: 'PHUKET THAILAND',
                  colSpan: 3,
                  alignment: 'left',
                  bold: true,
                },
                {},
                {},
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
                  text: `- ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
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
    if (!tickets || tickets.length === 0)
      throw new BadRequestException('ไม่พบข้อมูลบัตรสำหรับออกใบเสร็จ');

    const printedAt = new Date();
    const printedDate = printedAt.toLocaleDateString('en-GB');
    const printedTime = printedAt.toLocaleTimeString('en-GB');

    const pages = await Promise.all(
      tickets.map(async (ticket, idx) => {
        const seat = ticket.seatNumber || '-';
        const type =
          ticket.type === 'STANDING' ? 'STANDING' : ticket.type || '-';

        // สร้าง QR Code สำหรับแต่ละตั๋ว
        let qrCodeBase64 = '';
        try {
          if (ticket.orderNumber && ticket.orderId) {
            // ใช้ generateTicketQR แทน generateQRCode
            const qrResult = await this.qrCodeService.generateTicketQR(
              ticket.orderId,
              ticket.userId || 'guest',
              ticket.showDate,
              seat !== '-' ? [seat] : null,
              ticket.amount || 0,
              type === 'STANDING' ? 'standing' : 'seated',
              {
                width: 150,
                margin: 1,
                errorCorrectionLevel: 'M',
                color: {
                  dark: '#000000',
                  light: '#FFFFFF',
                },
              },
            );

            qrCodeBase64 = qrResult.qrCodeImage;
          }
        } catch (error) {
          this.logger.warn(`ไม่สามารถสร้าง QR Code ได้: ${error.message}`);
          qrCodeBase64 = '';
        }

        return {
          stack: [
            ...(qrCodeBase64
              ? [
                  {
                    image: qrCodeBase64,
                    width: 50,
                    alignment: 'center',
                    margin: [0, 0, 0, 10],
                    ...(idx > 0 ? { pageBreak: 'before' } : {}),
                  },
                ]
              : []),

            {
              text: 'PATONG BOXING STADIUM',
              alignment: 'center',
              bold: true,
              fontSize: 11,
              margin: [0, 0, 0, 2],
            },
            {
              text: '2/59 Soi Keb Sub 2 Sai Nam Yen RD.\nPatong Beach , Phuket 83150',
              alignment: 'center',
              fontSize: 8,
              margin: [0, 0, 0, 2],
            },
            {
              text: 'Tel. 076-345578,086-4761724,080-5354042',
              alignment: 'center',
              fontSize: 7,
              margin: [0, 0, 0, 3],
            },

            {
              table: {
                widths: ['auto', '*'],
                body: [
                  ['Order', ticket.orderNumber || '-'],
                  ['Date', ticket.showDate || '-'],
                  ['Name', ticket.customerName || '-'],
                ].map(([label, value]) => [
                  {
                    text: `${label} :`,
                    bold: true,
                    fontSize: 12,
                    alignment: 'center',
                  },
                  { text: value, fontSize: 12, alignment: 'center' },
                ]),
              },
              layout: 'noBorders',
              margin: [10, 0, 3, -3],
            },

            ...(type === 'STANDING'
              ? [
                  {
                    text: 'STADIUM',
                    alignment: 'center',
                    fontSize: 22,
                    bold: true,
                    margin: [0, 0, 0, -10],
                  },
                  {
                    text: 'SEAT',
                    alignment: 'center',
                    fontSize: 18,
                    bold: true,
                    margin: [0, 0, 0, 0],
                  },
                ]
              : [
                  {
                    text: type?.toUpperCase() || 'ZONE',
                    alignment: 'center',
                    fontSize: 16,
                    bold: true,
                    margin: [0, 0, 0, -4],
                  },
                  {
                    text: 'SEAT NO :',
                    alignment: 'center',
                    fontSize: 10,
                    margin: [0, 0, 0, -4],
                  },
                  {
                    text: seat,
                    alignment: 'center',
                    fontSize: 24,
                    bold: true,
                    margin: [0, 0, 0, -4],
                  },
                ]),

            {
              text: 'NON REFUNDABLE',
              alignment: 'center',
              fontSize: 10,
              bold: true,
              margin: [0, 0, 0, 2],
            },
            {
              text: 'VALID ON SHOW DATE ONLY',
              alignment: 'center',
              fontSize: 8,
              margin: [0, 0, 0, 2],
            },
            {
              text: `Printed ${printedDate} ${printedTime}`,
              alignment: 'center',
              fontSize: 7,
              color: 'gray',
              margin: [0, 0, 0, 0],
            },
          ],
          margin: [2, 2, 2, 2],
        };
      }),
    );

    const docDefinition = {
      pageSize: { width: 162, height: 288 }, // 57mm x 101.6mm (1mm = 2.83465pt)
      pageMargins: [0, 0, 0, 0],
      content: pages,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 8,
        lineHeight: 1.25,
      },
    };

    return await createPdfBuffer(docDefinition);
  }
}

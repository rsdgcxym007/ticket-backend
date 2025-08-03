import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { Order } from '../order/order.entity';
import { Seat } from '../seats/seat.entity';
import { Referrer } from '../referrer/referrer.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { User } from '../user/user.entity';
import {
  OrderStatus,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  OrderPurchaseType,
} from '../common/enums';
import {
  LoggingHelper,
  ErrorHandlingHelper,
  AuditHelper,
} from '../common/utils';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Seat) private seatRepo: Repository<Seat>,
    @InjectRepository(Referrer) private referrerRepo: Repository<Referrer>,
    @InjectRepository(SeatBooking) private bookingRepo: Repository<SeatBooking>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  // ========================================
  // 💰 ชำระเงินสำหรับตั๋วนั่ง (RINGSIDE/STADIUM)
  // ========================================

  async payWithCashStanding(dto: CreatePaymentDto, user: User) {
    const logger = LoggingHelper.createContextLogger('PaymentService');
    const startTime = Date.now();

    return ErrorHandlingHelper.retry(async () => {
      const order = await this.orderRepo.findOne({
        where: { id: dto.orderId },
        relations: ['referrer'],
      });

      if (!order) {
        throw ErrorHandlingHelper.createError(
          'ไม่พบคำสั่งซื้อ (Order not found)',
          404,
          'ORDER_NOT_FOUND',
        );
      }

      if (order.status === OrderStatus.PAID) {
        throw ErrorHandlingHelper.createError(
          'คำสั่งซื้อนี้ถูกชำระเงินไปแล้ว',
          400,
          'ORDER_ALREADY_PAID',
        );
      }

      // ✅ ตรวจสอบว่า order นี้เป็นตั๋วยืน
      if (
        (order.standingAdultQty || 0) === 0 &&
        (order.standingChildQty || 0) === 0
      ) {
        throw ErrorHandlingHelper.createError(
          'ออเดอร์นี้ไม่มีตั๋วยืน',
          400,
          'NO_STANDING_TICKETS',
        );
      }

      // ✅ ผูก referrer ถ้ายังไม่มี
      if (!order.referrer && dto.referrerCode) {
        const referrer = await this.referrerRepo.findOne({
          where: { code: dto.referrerCode },
        });
        if (!referrer) {
          throw ErrorHandlingHelper.createError(
            'ไม่พบผู้แนะนำ (Referrer not found)',
            404,
            'REFERRER_NOT_FOUND',
          );
        }
        order.referrer = referrer;
        order.referrerCode = referrer.code;
      }

      // ✅ อัปเดตชื่อผู้สั่ง (ถ้ามี)
      if (dto.customerName) {
        order.customerName = dto.customerName;
        LoggingHelper.logBusinessEvent(logger, 'Customer name updated', {
          orderId: dto.orderId,
          customerName: dto.customerName,
        });
      }

      // ✅ อัปเดตค่าคอมรวมของ referrer (ถ้ามี)
      if (order.referrer) {
        await this.referrerRepo.save(order.referrer);
      }

      // ✅ อัปเดตสถานะ order
      order.paymentMethod = dto.method || PaymentMethod.CASH;
      order.status = OrderStatus.PAID;
      await this.orderRepo.save(order);

      // ✅ สร้าง payment
      const payment = this.paymentRepo.create({
        order,
        amount: dto.amount || order.total,
        method: dto.method || PaymentMethod.CASH,
        paidAt: new Date(),
        createdBy: user,
        user,
      } as DeepPartial<Payment>);

      const savedPayment = await this.paymentRepo.save(payment);
      order.payment = savedPayment;
      await this.orderRepo.save(order);

      // 📝 Audit logging for payment creation
      await AuditHelper.logCreate(
        'Payment',
        savedPayment.id,
        {
          orderId: dto.orderId,
          amount: savedPayment.amount,
          method: dto.method || PaymentMethod.CASH,
          ticketType: 'STANDING',
        },
        AuditHelper.createSystemContext({
          source: 'PaymentService.payWithCashStanding',
          userId: user.id,
          orderNumber: order.orderNumber,
        }),
      );

      LoggingHelper.logBusinessEvent(
        logger,
        'Standing ticket payment completed',
        {
          orderId: dto.orderId,
          paymentId: savedPayment.id,
          amount: savedPayment.amount,
        },
      );

      LoggingHelper.logPerformance(
        logger,
        'payment.payWithCashStanding',
        startTime,
        {
          orderId: dto.orderId,
          amount: savedPayment.amount,
        },
      );

      return savedPayment;
    }, 2);
  }

  // ========================================
  // 🎯 NEW ENHANCED METHODS
  // ========================================

  /**
   * ชำระเงินสำหรับตั๋วนั่ง - รูปแบบใหม่ที่ชัดเจน
   */
  async paySeatedTicket(dto: CreatePaymentDto, user: User) {
    const logger = LoggingHelper.createContextLogger('PaymentService');
    const startTime = Date.now();

    return ErrorHandlingHelper.retry(async () => {
      const order = await this.orderRepo.findOne({
        where: { id: dto.orderId },
        relations: ['referrer', 'seatBookings', 'seatBookings.seat'],
      });

      if (!order) {
        throw ErrorHandlingHelper.createError(
          'ไม่พบคำสั่งซื้อ',
          404,
          'ORDER_NOT_FOUND',
        );
      }

      if (order.status === OrderStatus.PAID) {
        throw ErrorHandlingHelper.createError(
          'คำสั่งซื้อนี้ถูกชำระเงินไปแล้ว',
          400,
          'ORDER_ALREADY_PAID',
        );
      }

      // ตรวจสอบว่าเป็นตั๋วนั่งหรือไม่
      if (order.ticketType === 'STANDING') {
        throw ErrorHandlingHelper.createError(
          'คำสั่งซื้อนี้เป็นตั๋วยืน กรุณาใช้ endpoint สำหรับตั๋วยืน',
          400,
          'INVALID_TICKET_TYPE',
        );
      }

      // ตรวจสอบว่ามี seat bookings หรือไม่
      if (!order.seatBookings || order.seatBookings.length === 0) {
        throw ErrorHandlingHelper.createError(
          'ไม่พบการจองที่นั่งในคำสั่งซื้อนี้',
          400,
          'NO_SEAT_BOOKINGS',
        );
      }

      // ตรวจสอบ purchaseType ถ้าไม่ใช่ ONSITE ต้องกรอกข้อมูลลูกค้า
      if (dto.purchaseType !== OrderPurchaseType.ONSITE && !dto.customerName) {
        throw new BadRequestException(
          'กรุณากรอกข้อมูลลูกค้า (ชื่อ, เบอร์โทร, email) สำหรับการซื้อที่ไม่ใช่ ONSITE',
        );
      }

      // อัปเดตข้อมูลลูกค้าและผู้แนะนำ
      await this.updateOrderInfo(order, dto);

      // อัปเดตสถานะการจอง
      for (const booking of order.seatBookings) {
        booking.status = BookingStatus.PAID;
        booking.updatedAt = new Date();
      }
      await this.bookingRepo.save(order.seatBookings);

      // คำนวณค่าคอมมิชชั่น
      if (order.referrer) {
        const commission = order.seatBookings.length * 400;
        order.referrerCommission = commission;
        order.referrer.totalCommission =
          (order.referrer.totalCommission || 0) + commission;
        await this.referrerRepo.save(order.referrer);
      }

      // อัปเดตสถานะคำสั่งซื้อ
      order.paymentMethod = dto.method || PaymentMethod.CASH;
      order.status = OrderStatus.PAID;
      order.updatedBy = user.id;
      await this.orderRepo.save(order);

      // สร้างการชำระเงิน
      const payment = this.paymentRepo.create({
        order,
        orderId: order.id,
        amount: dto.amount || order.totalAmount,
        method: dto.method,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        user,
        userId: user.id,
        createdBy: user,
      } as DeepPartial<Payment>);

      const savedPayment = await this.paymentRepo.save(payment);
      order.payment = savedPayment;
      await this.orderRepo.save(order);

      LoggingHelper.logBusinessEvent(
        logger,
        'Seated ticket payment completed',
        {
          orderId: dto.orderId,
          orderNumber: order.orderNumber,
          paymentId: savedPayment.id,
          amount: savedPayment.amount,
          seatCount: order.seatBookings.length,
        },
      );

      LoggingHelper.logPerformance(
        logger,
        'payment.paySeatedTicket',
        startTime,
        {
          orderId: dto.orderId,
          amount: savedPayment.amount,
          seatCount: order.seatBookings.length,
        },
      );

      return savedPayment;
    }, 2);
  }

  /**
   * ชำระเงินสำหรับตั๋วยืน - รูปแบบใหม่ที่ชัดเจน
   */
  async payStandingTicket(dto: CreatePaymentDto, user: User) {
    const logger = LoggingHelper.createContextLogger('PaymentService');
    logger.log(
      `🎫 Processing standing ticket payment for order: ${dto.orderId} by user: ${user.id}`,
    );

    try {
      const order = await this.orderRepo.findOne({
        where: { id: dto.orderId },
        relations: ['referrer'],
      });

      if (!order) {
        throw new NotFoundException('ไม่พบคำสั่งซื้อ');
      }

      if (order.status === OrderStatus.PAID) {
        throw new BadRequestException('คำสั่งซื้อนี้ถูกชำระเงินไปแล้ว');
      }

      // ตรวจสอบว่าเป็นตั๋วยืนหรือไม่
      if (order.ticketType !== 'STANDING') {
        throw new BadRequestException(
          'คำสั่งซื้อนี้ไม่ใช่ตั๋วยืน กรุณาใช้ endpoint สำหรับตั๋วนั่ง',
        );
      }

      // ตรวจสอบจำนวนตั๋วยืน
      if (
        (order.standingAdultQty || 0) === 0 &&
        (order.standingChildQty || 0) === 0
      ) {
        throw new BadRequestException('ไม่พบจำนวนตั๋วยืนในคำสั่งซื้อนี้');
      }

      // ตรวจสอบ purchaseType ถ้าไม่ใช่ ONSITE ต้องกรอกข้อมูลลูกค้า
      if (dto.purchaseType !== OrderPurchaseType.ONSITE && !dto.customerName) {
        throw new BadRequestException(
          'กรุณากรอกข้อมูลลูกค้า (ชื่อ, เบอร์โทร, email) สำหรับการซื้อที่ไม่ใช่ ONSITE',
        );
      }

      // อัปเดตข้อมูลลูกค้าและผู้แนะนำ
      await this.updateOrderInfo(order, dto);

      // คำนวณค่าคอมมิชชั่น
      if (order.referrer) {
        const adultCommission = (order.standingAdultQty || 0) * 300;
        const childCommission = (order.standingChildQty || 0) * 200;
        const totalCommission = adultCommission + childCommission;

        order.referrerCommission = 0;
        order.standingCommission = totalCommission;
        order.referrer.totalCommission =
          (order.referrer.totalCommission || 0) + totalCommission;
        await this.referrerRepo.save(order.referrer);
      }

      // อัปเดตสถานะคำสั่งซื้อ
      order.paymentMethod = dto.method || PaymentMethod.CASH;
      order.status = OrderStatus.PAID;
      order.updatedBy = user.id;
      await this.orderRepo.save(order);

      // สร้างการชำระเงิน
      const payment = this.paymentRepo.create({
        order,
        orderId: order.id,
        amount: dto.amount || order.totalAmount,
        method: dto.method,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        user,
        userId: user.id,
        createdBy: user,
      } as DeepPartial<Payment>);

      const savedPayment = await this.paymentRepo.save(payment);
      order.payment = savedPayment;
      await this.orderRepo.save(order);

      logger.log(
        `✅ Standing ticket payment completed for order: ${order.orderNumber}`,
      );
      return savedPayment;
    } catch (err) {
      logger.error(`❌ Error in payStandingTicket: ${err.message}`, err.stack);
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการชำระเงินตั๋วยืน: ${err.message}`,
      );
    }
  }

  /**
   * ดึงข้อมูลการชำระเงินของคำสั่งซื้อ
   */
  async getOrderPaymentInfo(orderId: string): Promise<any> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['payment', 'referrer', 'seatBookings', 'seatBookings.seat'],
    });

    if (!order) {
      throw new NotFoundException('ไม่พบคำสั่งซื้อ');
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      ticketType: order.ticketType,
      totalAmount: order.totalAmount,
      isPaid: order.status === OrderStatus.PAID,
      payment: order.payment
        ? {
            id: order.payment.id,
            amount: order.payment.amount,
            method: order.payment.method,
            paidAt: order.payment.paidAt,
            status: order.payment.status,
          }
        : null,
      commission: {
        referrerCode: order.referrerCode,
        referrerCommission: order.referrerCommission,
        standingCommission: order.standingCommission,
      },
      tickets:
        order.ticketType === 'STANDING'
          ? {
              adultQty: order.standingAdultQty,
              childQty: order.standingChildQty,
              total:
                (order.standingAdultQty || 0) + (order.standingChildQty || 0),
            }
          : {
              seatCount: order.seatBookings?.length || 0,
              seats:
                order.seatBookings?.map((booking) => ({
                  seatNumber: booking.seat?.seatNumber,
                  zone: booking.seat?.zone,
                  status: booking.status,
                })) || [],
            },
    };
  }

  /**
   * ยกเลิกการชำระเงิน (สำหรับ admin เท่านั้น)
   */
  async cancelPayment(
    orderId: string,
    userId: string,
    reason: string,
  ): Promise<{ success: boolean; message: string }> {
    const logger = LoggingHelper.createContextLogger('PaymentService');
    logger.log(`🚫 Canceling payment for order: ${orderId} by user: ${userId}`);

    try {
      const order = await this.orderRepo.findOne({
        where: { id: orderId },
        relations: ['payment', 'seatBookings'],
      });

      if (!order) {
        throw new NotFoundException('ไม่พบคำสั่งซื้อ');
      }

      if (order.status !== OrderStatus.PAID) {
        throw new BadRequestException('คำสั่งซื้อนี้ยังไม่ได้ชำระเงิน');
      }

      // อัปเดตสถานะคำสั่งซื้อ
      order.status = OrderStatus.CANCELLED;
      order.updatedBy = userId;
      order.updatedAt = new Date();
      order.cancelReason = reason;

      // อัปเดตสถานะการจอง (หากมี)
      if (order.seatBookings) {
        for (const booking of order.seatBookings) {
          booking.status = BookingStatus.CANCELLED;
          booking.updatedAt = new Date();
        }
        await this.bookingRepo.save(order.seatBookings);
      }

      await this.orderRepo.save(order);

      // 📝 Audit logging for payment cancellation
      await AuditHelper.logCancel(
        'Payment',
        order.payment?.id || order.id,
        reason,
        AuditHelper.createSystemContext({
          source: 'PaymentService.cancelPayment',
          userId,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
        }),
      );

      logger.log(`✅ Payment cancelled for order: ${order.orderNumber}`);
      return {
        success: true,
        message: 'ยกเลิกการชำระเงินสำเร็จ',
      };
    } catch (err) {
      logger.error(`❌ Error in cancelPayment: ${err.message}`, err.stack);
      throw new InternalServerErrorException(
        `เกิดข้อผิดพลาดในการยกเลิกการชำระเงิน: ${err.message}`,
      );
    }
  }

  // ========================================
  // 🔧 HELPER METHODS
  // ========================================

  /**
   * อัปเดตข้อมูลลูกค้าและผู้แนะนำในคำสั่งซื้อ
   */
  private async updateOrderInfo(
    order: Order,
    dto: CreatePaymentDto,
  ): Promise<void> {
    const logger = LoggingHelper.createContextLogger('PaymentService');
    let orderUpdated = false;

    // อัปเดตชื่อลูกค้า
    if (dto.customerName && dto.customerName !== order.customerName) {
      order.customerName = dto.customerName;
      orderUpdated = true;
      logger.log(`📝 Updated customer name to: ${dto.customerName}`);
    }

    // อัปเดตผู้แนะนำ
    if (dto.referrerCode && !order.referrer) {
      const referrer = await this.referrerRepo.findOne({
        where: { code: dto.referrerCode, isActive: true },
      });

      if (!referrer) {
        throw new NotFoundException(
          `ไม่พบผู้แนะนำที่มีรหัส: ${dto.referrerCode}`,
        );
      }

      order.referrer = referrer;
      order.referrerId = referrer.id;
      order.referrerCode = dto.referrerCode;
      orderUpdated = true;
      logger.log(`👥 Added referrer: ${dto.referrerCode}`);
    }

    // บันทึกการเปลี่ยนแปลง
    if (orderUpdated) {
      await this.orderRepo.save(order);
    }
  }
}

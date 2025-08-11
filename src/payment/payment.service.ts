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
  // 🎯 NEW ENHANCED METHODS
  // ========================================

  /**
   * ตรวจสอบและกำหนดสถานะการชำระเงินตามยอดที่จ่าย
   */
  private validateAndApplyPaymentStatus(order: Order, amount: number) {
    const totalRequired = Number(order.total ?? 0);
    const paidAmount = Number(amount || 0);
    const previouslyPaid = Number(order.actualPaidAmount || 0);
    const totalAfterPayment = previouslyPaid + paidAmount;

    // ตรวจสอบยอดเงินที่ส่งเข้ามา (อนุญาตให้ส่ง 0 ได้)
    if (paidAmount < 0) {
      throw new BadRequestException('ยอดเงินที่ชำระต้องไม่น้อยกว่า 0');
    }

    if (totalAfterPayment > totalRequired) {
      throw new BadRequestException(
        `ยอดเงินที่ชำระเกินกว่าที่ต้องชำระ (ต้องชำระ: ${totalRequired}, ชำระแล้ว: ${previouslyPaid}, จะชำระ: ${paidAmount})`,
      );
    }

    // กำหนดสถานะตามยอดเงิน
    if (totalAfterPayment < totalRequired) {
      // ชำระไม่ครบ
      return {
        paymentStatus: PaymentStatus.PARTIAL,
        orderStatus: OrderStatus.PARTIAL_ORDER,
        isFullyPaid: false,
        totalRequired,
        totalAfterPayment,
        remainingAmount: totalRequired - totalAfterPayment,
      };
    }

    // ชำระครบ
    return {
      paymentStatus: PaymentStatus.PAID,
      orderStatus: OrderStatus.PAID,
      isFullyPaid: true,
      totalRequired,
      totalAfterPayment,
      remainingAmount: 0,
    };
  }

  /**
   * จัดการอัปเดตการชำระเงินให้ครบวงจร (partial/full), อัปเดตสถานะ, คอมมิชชั่น และบันทึก Payment
   */
  private async handlePayment(
    order: Order,
    amount: number,
    method: PaymentMethod,
    user: User,
    flow: 'SEATED' | 'STANDING',
    commissionToCredit: number,
    auditSource: string,
    ticketTypeLabel: 'SEATED' | 'STANDING',
  ): Promise<Payment> {
    const logger = LoggingHelper.createContextLogger('PaymentService');

    // ตรวจสอบและกำหนดสถานะการชำระเงิน
    const paymentValidation = this.validateAndApplyPaymentStatus(order, amount);
    const wasFullyPaidBefore = order.status === OrderStatus.PAID;

    // อัปเดตข้อมูลการชำระเงิน
    order.paymentMethod = method || PaymentMethod.CASH;
    order.status = paymentValidation.orderStatus;
    order.updatedBy = user.id;

    // สะสมยอดที่จ่ายจริง
    const previouslyPaid = Number(order.actualPaidAmount || 0);
    order.actualPaidAmount = previouslyPaid + Number(amount);

    logger.log(
      `💰 Payment validation: ${JSON.stringify({
        totalRequired: paymentValidation.totalRequired,
        previouslyPaid,
        currentPayment: amount,
        totalAfterPayment: paymentValidation.totalAfterPayment,
        isFullyPaid: paymentValidation.isFullyPaid,
        remainingAmount: paymentValidation.remainingAmount,
      })}`,
    );

    // หากชำระครบแล้ว
    if (paymentValidation.isFullyPaid) {
      order.paymentAmountVerified = true;
      order.status = OrderStatus.PAID;

      // อัปเดต booking เฉพาะกรณีตั๋วนั่ง
      if (flow === 'SEATED' && order.seatBookings?.length) {
        for (const booking of order.seatBookings) {
          booking.status = BookingStatus.PAID;
          booking.updatedAt = new Date();
        }
        await this.bookingRepo.save(order.seatBookings);
        logger.log(
          `🪑 Updated ${order.seatBookings.length} seat bookings to PAID`,
        );
      }

      // อัปเดตค่าคอมมิชชั่นบนออเดอร์เมื่อชำระครบเท่านั้น
      if (order.referrer && commissionToCredit > 0) {
        if (flow === 'SEATED') {
          order.referrerCommission = commissionToCredit;
          order.standingCommission = 0;
        } else {
          order.referrerCommission = 0;
          order.standingCommission = commissionToCredit;
        }

        // เครดิตค่าคอมให้ referrer เมื่อชำระครบครั้งแรกเท่านั้น
        if (!wasFullyPaidBefore) {
          const oldCommission = order.referrer.totalCommission || 0;
          order.referrer.totalCommission = oldCommission + commissionToCredit;
          await this.referrerRepo.save(order.referrer);

          logger.log(
            `💰 Commission credited: ${commissionToCredit} to referrer ${order.referrer.code} (${oldCommission} → ${order.referrer.totalCommission})`,
          );

          // บันทึก audit log สำหรับการเครดิตค่าคอม
          await AuditHelper.logUpdate(
            'Referrer',
            order.referrer.id,
            { totalCommission: oldCommission },
            { totalCommission: order.referrer.totalCommission },
            AuditHelper.createSystemContext({
              source: `${auditSource}.commission`,
              userId: user.id,
              orderNumber: order.orderNumber,
              commissionAmount: commissionToCredit,
            }),
          );
        }
      }
    } else {
      // กรณีชำระไม่ครบ ให้เคลียร์ค่าคอมมิชชั่นบนออเดอร์เพื่อไม่ให้อัปเดตก่อนเวลา
      order.referrerCommission = 0;
      order.standingCommission = 0;
      logger.log(
        `⏳ Partial payment recorded. Remaining: ${paymentValidation.remainingAmount} THB`,
      );
    }

    await this.orderRepo.save(order);

    // อัปเดต/สร้าง payment record
    let savedPayment: Payment;
    if (order.payment) {
      const oldAmount = Number(order.payment.amount || 0);
      order.payment.amount = oldAmount + Number(amount);
      order.payment.status = paymentValidation.paymentStatus;
      order.payment.paidAt = new Date();
      savedPayment = await this.paymentRepo.save(order.payment);

      logger.log(
        `🔄 Updated existing payment: ${oldAmount} + ${amount} = ${savedPayment.amount}`,
      );
    } else {
      const payment = this.paymentRepo.create({
        order,
        orderId: order.id,
        amount: amount,
        method,
        status: paymentValidation.paymentStatus,
        paidAt: new Date(),
        user,
        userId: user.id,
        createdBy: user,
      } as DeepPartial<Payment>);
      savedPayment = await this.paymentRepo.save(payment);
      order.payment = savedPayment;
      await this.orderRepo.save(order);

      logger.log(`✨ Created new payment record: ${amount} THB`);
    }

    // Audit log สร้าง/อัปเดตการชำระเงิน
    await AuditHelper.logCreate(
      'Payment',
      savedPayment.id,
      {
        orderId: order.id,
        amount: savedPayment.amount,
        method: method || PaymentMethod.CASH,
        ticketType: ticketTypeLabel,
        isFullyPaid: paymentValidation.isFullyPaid,
        remainingAmount: paymentValidation.remainingAmount,
      },
      AuditHelper.createSystemContext({
        source: auditSource,
        userId: user.id,
        orderNumber: order.orderNumber,
      }),
    );

    return savedPayment;
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
        relations: ['referrer', 'seatBookings', 'seatBookings.seat', 'payment'],
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
      if (order.ticketType === 'STANDING') {
        throw ErrorHandlingHelper.createError(
          'คำสั่งซื้อนี้เป็นตั๋วยืน กรุณาใช้ endpoint สำหรับตั๋วยืน',
          400,
          'INVALID_TICKET_TYPE',
        );
      }
      if (!order.seatBookings || order.seatBookings.length === 0) {
        throw ErrorHandlingHelper.createError(
          'ไม่พบการจองที่นั่งในคำสั่งซื้อนี้',
          400,
          'NO_SEAT_BOOKINGS',
        );
      }

      // อัปเดตข้อมูลลูกค้าและผู้แนะนำ
      await this.updateOrderInfo(order, dto);

      // คำนวณค่าคอมมิชชั่นสำหรับตั๋วนั่ง (เครดิตเมื่อชำระครบเท่านั้น)
      const seatedCommission = order.referrer
        ? this.calculateSeatedCommission(order)
        : 0;
      // ไม่อัปเดตค่าคอมบนออเดอร์ที่นี่ รออัปเดตเมื่อชำระครบใน handlePayment

      // ใช้ยอดเงินที่ส่งมา หรือยอด default จาก order.total
      const amount = dto.amount ?? Number(order.total ?? 0);

      const savedPayment = await this.handlePayment(
        order,
        amount,
        dto.method,
        user,
        'SEATED',
        seatedCommission,
        'PaymentService.paySeatedTicket',
        'SEATED',
      );

      LoggingHelper.logBusinessEvent(
        logger,
        'Seated ticket payment completed',
        {
          orderId: dto.orderId,
          orderNumber: order.orderNumber,
          paymentId: savedPayment.id,
          amount: savedPayment.amount,
          seatCount: order.seatBookings.length,
          isFullyPaid: savedPayment.status === PaymentStatus.PAID,
          commissionCredited:
            savedPayment.status === PaymentStatus.PAID ? seatedCommission : 0,
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
    try {
      const order = await this.orderRepo.findOne({
        where: { id: dto.orderId },
        relations: ['referrer', 'payment'],
      });

      if (!order) {
        throw new NotFoundException('ไม่พบคำสั่งซื้อ');
      }
      if (order.status === OrderStatus.PAID) {
        throw new BadRequestException('คำสั่งซื้อนี้ถูกชำระเงินไปแล้ว');
      }
      if (order.ticketType !== 'STANDING') {
        throw new BadRequestException(
          'คำสั่งซื้อนี้ไม่ใช่ตั๋วยืน กรุณาใช้ endpoint สำหรับตั๋วนั่ง',
        );
      }
      if (
        (order.standingAdultQty || 0) === 0 &&
        (order.standingChildQty || 0) === 0
      ) {
        throw new BadRequestException('ไม่พบจำนวนตั๋วยืนในคำสั่งซื้อนี้');
      }

      // อัปเดตข้อมูลลูกค้าและผู้แนะนำ
      await this.updateOrderInfo(order, dto);

      // คำนวณค่าคอมมิชชั่นสำหรับตั๋วยืน (เครดิตเมื่อชำระครบเท่านั้น)
      const standingCommission = order.referrer
        ? this.calculateStandingCommission(order)
        : 0;
      // ไม่อัปเดตค่าคอมบนออเดอร์ที่นี่ รออัปเดตเมื่อชำระครบใน handlePayment

      // ใช้ยอดเงินที่ส่งมา หรือยอด default จาก order.total
      const amount = dto.amount ?? Number(order.total ?? 0);

      const savedPayment = await this.handlePayment(
        order,
        amount,
        dto.method,
        user,
        'STANDING',
        standingCommission,
        'PaymentService.payStandingTicket',
        'STANDING',
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

    const totalRequired = Number(order.total ?? 0);
    const actualPaid = Number(order.actualPaidAmount || 0);
    const remainingAmount = Math.max(0, totalRequired - actualPaid);
    const isFullyPaid =
      actualPaid >= totalRequired && order.status === OrderStatus.PAID;

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      ticketType: order.ticketType,

      // ข้อมูลการชำระเงิน
      totalAmount: totalRequired,
      actualPaidAmount: actualPaid,
      remainingAmount,
      isFullyPaid,
      paymentStatus: order.payment?.status || 'UNPAID',

      payment: order.payment
        ? {
            id: order.payment.id,
            amount: order.payment.amount,
            method: order.payment.method,
            paidAt: order.payment.paidAt,
            status: order.payment.status,
          }
        : null,

      // ข้อมูลค่าคอมมิชชั่น
      commission: {
        referrerCode: order.referrerCode,
        referrerCommission: order.referrerCommission || 0,
        standingCommission: order.standingCommission || 0,
        totalCommission:
          (order.referrerCommission || 0) + (order.standingCommission || 0),
        isCommissionCredited: isFullyPaid && order.referrer ? true : false,
      },

      // ข้อมูลตั๋ว
      tickets:
        order.ticketType === 'STANDING'
          ? {
              type: 'STANDING',
              adultQty: order.standingAdultQty || 0,
              childQty: order.standingChildQty || 0,
              total:
                (order.standingAdultQty || 0) + (order.standingChildQty || 0),
            }
          : {
              type: 'SEATED',
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
    }

    // อัปเดตข้อมูลเพิ่มเติม ถ้ามีใน DTO
    if (dto.customerEmail && dto.customerEmail !== order.customerEmail) {
      order.customerEmail = dto.customerEmail;
      orderUpdated = true;
    }
    if (dto.customerPhone && dto.customerPhone !== order.customerPhone) {
      order.customerPhone = dto.customerPhone;
      orderUpdated = true;
    }
    if (dto.purchaseType && dto.purchaseType !== order.purchaseType) {
      order.purchaseType = dto.purchaseType;
      orderUpdated = true;
    }
    if (dto.hotelName && dto.hotelName !== order.hotelName) {
      order.hotelName = dto.hotelName;
      orderUpdated = true;
    }
    if (dto.hotelDistrict && dto.hotelDistrict !== order.hotelDistrict) {
      order.hotelDistrict = dto.hotelDistrict;
      orderUpdated = true;
    }
    if (dto.roomNumber && dto.roomNumber !== order.roomNumber) {
      order.roomNumber = dto.roomNumber;
      orderUpdated = true;
    }
    if (
      typeof dto.adultCount === 'number' &&
      dto.adultCount !== order.adultCount
    ) {
      order.adultCount = dto.adultCount;
      orderUpdated = true;
      logger.log(`📝 Updated adult count to: ${dto.adultCount}`);
    }
    if (
      typeof dto.childCount === 'number' &&
      dto.childCount !== order.childCount
    ) {
      order.childCount = dto.childCount;
      orderUpdated = true;
      logger.log(`📝 Updated child count to: ${dto.childCount}`);
    }
    if (
      typeof dto.infantCount === 'number' &&
      dto.infantCount !== order.infantCount
    ) {
      order.infantCount = dto.infantCount;
      orderUpdated = true;
    }
    if (dto.voucherNumber && dto.voucherNumber !== order.voucherNumber) {
      order.voucherNumber = dto.voucherNumber;
      orderUpdated = true;
      logger.log(`📝 Updated voucher number to: ${dto.voucherNumber}`);
    }
    if (
      dto.pickupScheduledTime &&
      dto.pickupScheduledTime !== order.pickupScheduledTime
    ) {
      order.pickupScheduledTime = dto.pickupScheduledTime;
      orderUpdated = true;
    }
    if (dto.bookerName && dto.bookerName !== order.bookerName) {
      order.bookerName = dto.bookerName;
      orderUpdated = true;
    }
    if (
      typeof dto.includesPickup === 'boolean' &&
      dto.includesPickup !== order.includesPickup
    ) {
      order.includesPickup = dto.includesPickup;
      orderUpdated = true;
    }
    if (
      typeof dto.includesDropoff === 'boolean' &&
      dto.includesDropoff !== order.includesDropoff
    ) {
      order.includesDropoff = dto.includesDropoff;
      orderUpdated = true;
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

  // คำนวณค่าคอมมิชชั่นแบบแยกฟังก์ชัน เพื่อให้ใช้ซ้ำและทดสอบง่าย
  private calculateSeatedCommission(order: Order): number {
    return (order.seatBookings?.length || 0) * 400;
  }

  private calculateStandingCommission(order: Order): number {
    const adult = order.standingAdultQty || 0;
    const child = order.standingChildQty || 0;
    return adult * 300 + child * 300;
  }
}

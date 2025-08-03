import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, In } from 'typeorm';
import { Order } from '../../order/order.entity';
import { User } from '../../user/user.entity';
import { Seat } from '../../seats/seat.entity';
import { SeatBooking } from '../../seats/seat-booking.entity';
import { Referrer } from '../../referrer/referrer.entity';
import { ConcurrencyService } from './concurrency.service';
import { DuplicateOrderPreventionService } from './duplicate-order-prevention.service';
import { ThailandTimeHelper } from '../utils/thailand-time.helper';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  SeatStatus,
  BookingStatus,
  TicketType,
  PaymentMethod,
  OrderSource,
  OrderPurchaseType,
} from '../enums';
import { OrderUpdatesGateway } from '../gateways/order-updates.gateway';
import {
  TICKET_PRICES,
  COMMISSION_RATES,
  BOOKING_LIMITS,
  TIME_LIMITS,
} from '../constants';
import { BusinessLogicHelper, ReferenceGenerator } from '../utils';

/**
 * 🚀 Enhanced Order Service with Concurrency Control
 * บริการออเดอร์ที่มีการจัดการ concurrency และป้องกันออเดอร์ซ้ำกัน
 */
@Injectable()
export class EnhancedOrderService {
  private readonly logger = new Logger(EnhancedOrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,
    @InjectRepository(SeatBooking)
    private readonly seatBookingRepo: Repository<SeatBooking>,
    @InjectRepository(Referrer)
    private readonly referrerRepo: Repository<Referrer>,
    private readonly concurrencyService: ConcurrencyService,
    private readonly duplicatePreventionService: DuplicateOrderPreventionService,
    private readonly dataSource: DataSource,
    private readonly orderUpdatesGateway: OrderUpdatesGateway,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 🎫 Create order with full concurrency control
   * สร้างออเดอร์พร้อมการจัดการ concurrency ที่สมบูรณ์ - ใช้ logic เดียวกับ createOrder
   */
  async createOrderWithConcurrencyControl(
    userId: string,
    orderData: any,
  ): Promise<any> {
    let lockKey: string | null = null;
    let seatLocks: string[] = [];

    try {
      this.logger.log(
        `🎫 Creating order with concurrency control for user: ${userId}`,
      );

      // 1. Validate user exists - เหมือน createOrder
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new BadRequestException('ไม่พบข้อมูลผู้ใช้');
      }

      // 2. Validate booking limits - เพิ่มจาก createOrder
      try {
        await this.validateBookingLimits(user, orderData);
      } catch (e) {
        throw new BadRequestException(e?.message || 'Booking limit error');
      }
      this.logger.log(`Booking limits validated for user: ${user.id}`);

      // 3. Prevent duplicate orders
      const duplicateCheck =
        await this.duplicatePreventionService.preventDuplicateOrder(
          userId,
          orderData,
        );
      lockKey = duplicateCheck.lockKey;

      // 4. Validate seat availability - เหมือน createOrder
      if (orderData.seatIds && orderData.seatIds.length > 0) {
        await this.validateSeatAvailability(
          orderData.seatIds,
          orderData.showDate,
        );

        // Lock seats if required
        const seatLockResult = await this.concurrencyService.lockSeatsForOrder(
          orderData.seatIds,
          orderData.showDate,
          5, // 5 minutes lock
        );
        seatLocks = seatLockResult.lockedSeats;
      }

      // 5. Validate referrer - เหมือน createOrder
      let referrer = null;
      if (orderData.referrerCode) {
        this.logger.log(`Validating referrer code: ${orderData.referrerCode}`);
        referrer = await this.referrerRepo.findOne({
          where: { code: orderData.referrerCode, isActive: true },
        });

        if (!referrer) {
          this.logger.warn(`Invalid referrer code: ${orderData.referrerCode}`);
          throw new BadRequestException(
            'ไม่พบผู้แนะนำที่มีรหัส: ' + orderData.referrerCode,
          );
        }
      }

      // 6. Calculate pricing - ใช้ logic เดียวกับ createOrder
      const pricing = this.calculateOrderPricing(orderData);
      this.logger.log('Order pricing calculated:', pricing);

      // 7. Generate order number - เหมือน createOrder
      const orderNumber = ReferenceGenerator.generateOrderNumber();
      this.logger.log('Generated order number:', orderNumber);

      // 8. Validate customer info by purchaseType
      const purchaseType = orderData.purchaseType || OrderPurchaseType.ONSITE;
      // if (purchaseType === OrderPurchaseType.ONSITE) {
      //   // ไม่บังคับกรอกข้อมูลลูกค้า
      // } else {
      //   // ถ้าไม่ใช่ ONSITE ต้องกรอก customerName
      //   if (!orderData.customerName) {
      //     throw new BadRequestException('กรุณากรอกชื่อผู้สั่งซื้อ');
      //   }
      // }
      // 8. Prepare order data - ใช้ logic เดียวกับ createOrder
      const finalOrderData: any = {
        orderNumber,
        userId: user.id,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerEmail: orderData.customerEmail,
        ticketType: orderData.ticketType,
        quantity: orderData.quantity || 0,
        total: pricing.totalAmount,
        totalAmount: pricing.totalAmount,
        status: orderData.status || OrderStatus.PENDING,
        paymentMethod: orderData.paymentMethod || PaymentMethod.CASH,
        method: PaymentMethod.CASH,
        showDate: ThailandTimeHelper.toThailandTime(orderData.showDate),
        referrerCode: orderData.referrerCode,
        referrerId: referrer?.id,
        referrerCommission: referrer ? pricing.commission : 0, // ✅ คำนวณเฉพาะเมื่อมี referrer
        note: orderData.note,
        source: (orderData.source as OrderSource) || OrderSource.DIRECT,
        purchaseType,
        attendanceStatus:
          orderData.attendanceStatus ||
          (purchaseType === OrderPurchaseType.ONSITE
            ? 'CHECKED_IN'
            : 'PENDING'),
        expiresAt: BusinessLogicHelper.calculateExpiryTime(
          ThailandTimeHelper.now(),
          this.configService.get(
            'RESERVATION_TIMEOUT_MINUTES',
            TIME_LIMITS.RESERVATION_MINUTES,
          ),
        ),
        createdAt: ThailandTimeHelper.now(),
        updatedAt: ThailandTimeHelper.now(),
        // Always set createdBy for all roles
        createdBy: orderData.createdBy || user.id,
      };

      // 9. Handle BOOKED status expiry - เหมือน createOrder
      if (orderData.status === OrderStatus.BOOKED) {
        const showDate = ThailandTimeHelper.toThailandTime(orderData.showDate);
        const expiryDate =
          ThailandTimeHelper.format(showDate, 'YYYY-MM-DD') + ' 21:00:00';
        finalOrderData.expiresAt =
          ThailandTimeHelper.toThailandTime(expiryDate);
        this.logger.log(
          `🕘 BOOKED order expiry set to 21:00 on show date: ${ThailandTimeHelper.toISOString(finalOrderData.expiresAt)}`,
        );
      }

      // 10. Handle standing tickets - เหมือน createOrder
      if (orderData.ticketType === TicketType.STANDING) {
        const adultQty = orderData.standingAdultQty || 0;
        const childQty = orderData.standingChildQty || 0;

        // Validate constants
        if (
          typeof TICKET_PRICES.STANDING_ADULT !== 'number' ||
          typeof TICKET_PRICES.STANDING_CHILD !== 'number' ||
          typeof COMMISSION_RATES.STANDING_ADULT !== 'number' ||
          typeof COMMISSION_RATES.STANDING_CHILD !== 'number'
        ) {
          this.logger.error(
            `Invalid constants: TICKET_PRICES.STANDING_ADULT=${TICKET_PRICES.STANDING_ADULT}, TICKET_PRICES.STANDING_CHILD=${TICKET_PRICES.STANDING_CHILD}`,
          );
          throw new InternalServerErrorException(
            'ข้อมูลราคาตั๋วหรือค่าคอมมิชชั่นไม่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่',
          );
        }

        const adultTotal = adultQty * TICKET_PRICES.STANDING_ADULT;
        const childTotal = childQty * TICKET_PRICES.STANDING_CHILD;
        const standingTotal = adultTotal + childTotal;

        // Validate calculations
        if (isNaN(adultTotal) || isNaN(childTotal) || isNaN(standingTotal)) {
          throw new BadRequestException(
            'คำนวณราคาตั๋วยืนผิดพลาด กรุณาตรวจสอบจำนวนตั๋วและราคา',
          );
        }

        // Set standing ticket fields
        finalOrderData.standingAdultQty = adultQty;
        finalOrderData.standingChildQty = childQty;
        finalOrderData.standingTotal = standingTotal;
        if (finalOrderData.referrerCode) {
          finalOrderData.referrerCommission =
            adultQty * COMMISSION_RATES.STANDING_ADULT +
            childQty * COMMISSION_RATES.STANDING_CHILD;
        }
        finalOrderData.quantity = adultQty + childQty;
        finalOrderData.total = standingTotal;
        finalOrderData.totalAmount = standingTotal;

        this.logger.log(
          `Standing Adult Qty: ${adultQty}, Standing Child Qty: ${childQty}`,
        );
        this.logger.log(
          `Standing Total: ${standingTotal}, Standing Commission: ${finalOrderData.standingCommission}`,
        );

        // Handle standing ticket status logic - เหมือน createOrder
        if (!orderData.status) {
          if (
            ThailandTimeHelper.isSameDay(
              orderData.showDate,
              ThailandTimeHelper.now(),
            )
          ) {
            finalOrderData.status = OrderStatus.PENDING;
          } else {
            finalOrderData.status = OrderStatus.BOOKED;
          }
        }

        // Set expiry for standing BOOKED tickets
        if (
          finalOrderData.status === OrderStatus.BOOKED &&
          orderData.status !== OrderStatus.BOOKED
        ) {
          const showDate = ThailandTimeHelper.toThailandTime(
            orderData.showDate,
          );
          const expiryDate =
            ThailandTimeHelper.format(showDate, 'YYYY-MM-DD') + ' 21:00:00';
          finalOrderData.expiresAt =
            ThailandTimeHelper.toThailandTime(expiryDate);
        }
      }

      // 11. Set final quantity - เหมือน createOrder
      if (orderData.ticketType !== TicketType.STANDING) {
        finalOrderData.quantity = orderData.seatIds?.length || 0;
      }

      // 12. Create order atomically
      const order = await this.concurrencyService.atomicCreateOrderWithSeats(
        finalOrderData,
        orderData.seatIds || [],
        orderData.showDate,
      );

      // 13. Release duplicate prevention lock
      await this.duplicatePreventionService.releaseDuplicateOrderLock(lockKey);

      // 14. Load order with relations - เหมือน createOrder
      const reloadedOrder = await this.orderRepo.findOne({
        where: { id: order.id },
        relations: [
          'seatBookings',
          'seatBookings.seat',
          'seatBookings.seat.zone',
        ],
      });

      if (!reloadedOrder) {
        throw new NotFoundException(
          'ไม่พบข้อมูลออเดอร์หลังโหลดใหม่ กรุณาตรวจสอบอีกครั้ง',
        );
      }

      // 15. Send real-time notifications
      this.orderUpdatesGateway.notifyOrderCreated({
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        showDate: orderData.showDate,
        seatIds: orderData.seatIds || [],
        status: order.status,
        message: 'Order created successfully with concurrency protection',
      });

      if (orderData.seatIds && orderData.seatIds.length > 0) {
        this.orderUpdatesGateway.notifySeatAvailabilityChanged({
          seatIds: orderData.seatIds,
          showDate: orderData.showDate,
          status: 'LOCKED',
          message: 'Seats are now locked for this order',
        });
      }

      this.logger.log(`✅ Successfully created order: ${order.id}`);

      // 16. Return data in same format as createOrder
      return {
        ...reloadedOrder,
        customerName: reloadedOrder.customerName,
        ticketType: reloadedOrder.ticketType,
        price: reloadedOrder.totalAmount,
        paymentStatus: 'PENDING',
        showDate: ThailandTimeHelper.toISOString(reloadedOrder.showDate),
        seats:
          reloadedOrder.seatBookings?.map((booking) => {
            return {
              id: booking.seat.id,
              seatNumber: booking.seat.seatNumber,
              zone: booking.seat.zone
                ? {
                    id: booking.seat.zone.id,
                    name: booking.seat.zone.name,
                  }
                : null,
            };
          }) || [],
      };
    } catch (error) {
      this.logger.error(`❌ Failed to create order: ${error.message}`);

      // Cleanup on error
      if (lockKey) {
        await this.duplicatePreventionService.releaseDuplicateOrderLock(
          lockKey,
        );
      }
      if (seatLocks.length > 0) {
        await this.concurrencyService.releaseSeatLocks(seatLocks);
      }

      // ถ้าเป็น HttpException อยู่แล้ว ให้ throw ทิ้งไปเลย (NestJS จะจัดการ message ให้เอง)
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw error;
    }
  }
  private async validateSeatAvailability(
    seatIds: string[],
    showDate: string,
  ): Promise<void> {
    const seats = await this.seatRepo.findByIds(seatIds);

    if (!seats || seats.length !== seatIds.length) {
      throw new BadRequestException(
        'ไม่พบข้อมูลที่นั่งบางที่ กรุณาตรวจสอบอีกครั้ง',
      );
    }

    const bookedSeats = await this.seatBookingRepo.find({
      where: {
        seat: { id: In(seatIds) },
        showDate: showDate,
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
      },
    });

    if (bookedSeats.length > 0) {
      throw new BadRequestException('ที่นั่งบางที่ถูกจองไปแล้ว กรุณาเลือกใหม่');
    }
  }
  /**
   * 🔄 Update order with concurrency control
   * อัปเดตออเดอร์พร้อมการจัดการ concurrency
   */
  async updateOrderWithConcurrencyControl(
    orderId: string,
    userId: string,
    updateData: any,
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`🔄 Updating order ${orderId} with concurrency control`);

      // 1. Lock order for update
      const order = await queryRunner.query(
        `SELECT * FROM "order" WHERE id = $1 FOR UPDATE`,
        [orderId],
      );

      if (!order || order.length === 0) {
        throw new BadRequestException('ไม่พบข้อมูลออเดอร์ที่ต้องการแก้ไข');
      }

      // 2. Validate update permissions
      const currentOrder = order[0];
      if (currentOrder.userId !== userId) {
        throw new BadRequestException('คุณสามารถแก้ไขออเดอร์ของตนเองเท่านั้น');
      }

      if (currentOrder.status === OrderStatus.CONFIRMED) {
        throw new BadRequestException('ไม่สามารถแก้ไขออเดอร์ที่ยืนยันแล้ว');
      }

      // 3. Handle seat changes if needed
      if (updateData.seatIds && updateData.seatIds.length > 0) {
        await this.handleSeatChanges(
          queryRunner,
          orderId,
          updateData.seatIds,
          updateData.showDate,
        );
      }

      // 4. Update order
      await queryRunner.query(
        `UPDATE "order" 
         SET ${Object.keys(updateData)
           .map((key, index) => `"${key}" = $${index + 2}`)
           .join(', ')}, 
             "updatedAt" = $1 
         WHERE id = $${Object.keys(updateData).length + 2}`,
        [ThailandTimeHelper.now(), ...Object.values(updateData), orderId],
      );

      await queryRunner.commitTransaction();
      this.logger.log(`✅ Successfully updated order: ${orderId}`);

      // Return updated order
      return await this.orderRepo.findOne({
        where: { id: orderId },
        relations: ['seatBookings', 'seatBookings.seat'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Failed to update order: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * ❌ Cancel order with concurrency control
   * ยกเลิกออเดอร์พร้อมการจัดการ concurrency
   */
  async cancelOrderWithConcurrencyControl(
    orderId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    id: string;
    status: string;
    message: string;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(
        `❌ Cancelling order ${orderId} with concurrency control`,
      );

      // 1. Lock order for update
      const order = await queryRunner.query(
        `SELECT * FROM "order" WHERE id = $1 FOR UPDATE`,
        [orderId],
      );

      if (!order || order.length === 0) {
        throw new BadRequestException('ไม่พบข้อมูลออเดอร์ที่ต้องการยกเลิก');
      }

      const currentOrder = order[0];

      // ถ้า userId ไม่ได้ส่งมา (undefined) ให้ข้ามการตรวจสอบนี้ (เช่น admin หรือระบบ)
      if (userId && currentOrder.userId !== userId) {
        throw new BadRequestException('คุณสามารถยกเลิกออเดอร์ของตนเองเท่านั้น');
      }

      // 2. Cancel order + ลบค่าคอมมิชชั่นถ้ามี referrer (คืนค่าคอมมิชชั่นเฉพาะออเดอร์ที่ยังไม่ถูกยกเลิก)
      this.logger.debug('currentOrder (before cancel):', currentOrder);
      if (currentOrder.status !== OrderStatus.CANCELLED) {
        // ต้องใช้ snake_case เพราะ queryRunner.query คืนค่ามาเป็น snake_case
        const oldRefCommission = Number(currentOrder.referrerCommission || 0);
        const oldStandingCommission = Number(
          currentOrder.standingCommission || 0,
        );
        const totalToSubtract = oldRefCommission + oldStandingCommission;

        await queryRunner.query(
          `UPDATE "order" 
           SET status = $1, "updatedAt" = $2, "referrerCommission" = 0, "standingCommission" = 0 
           WHERE id = $3`,
          [OrderStatus.CANCELLED, ThailandTimeHelper.now(), orderId],
        );

        // ตรวจสอบสถานะการจ่ายเงินก่อนลบค่าคอมมิชชั่น
        // ถ้าออเดอร์นี้จ่ายเงินแล้ว (เช่น status เป็น PAID หรือ CONFIRMED) ให้ลบค่าคอมมิชชั่น
        const paidStatuses = [OrderStatus.PAID, OrderStatus.CONFIRMED];
        if (
          currentOrder.referrerId &&
          totalToSubtract > 0 &&
          paidStatuses.includes(currentOrder.status)
        ) {
          this.logger.log(
            `Updating referrer totalCommission: referrerId=${currentOrder.referrerId}, subtract=${totalToSubtract}`,
          );
          await queryRunner.query(
            `UPDATE referrer SET "totalCommission" = COALESCE("totalCommission",0) - $1 WHERE id = $2`,
            [totalToSubtract, currentOrder.referrerId],
          );
        } else if (currentOrder.referrerId && totalToSubtract > 0) {
          this.logger.log(
            `Skip subtract commission for referrerId=${currentOrder.referrerId} because order is not paid (status=${currentOrder.status})`,
          );
        }
      } else {
        this.logger.warn(`Order already cancelled, skip subtract commission.`);
        // Throw 409 Conflict
        throw new ConflictException('ออเดอร์นี้ถูกยกเลิกไปแล้ว');
      }

      // 2.1 อัปเดต payment ที่เกี่ยวข้องกับ order นี้ให้เป็น CANCELLED ด้วย
      await queryRunner.query(
        `UPDATE payment SET status = $1, "updatedAt" = $2 WHERE "orderId" = $3`,
        [OrderStatus.CANCELLED, ThailandTimeHelper.now(), orderId],
      );

      // 3. Cancel seat bookings
      await queryRunner.query(
        `UPDATE seat_booking 
         SET status = $1, "updatedAt" = $2 
         WHERE "orderId" = $3`,
        [BookingStatus.CANCELLED, ThailandTimeHelper.now(), orderId],
      );

      // 4. Release seats
      const seatBookings = await queryRunner.query(
        `SELECT "seatId" FROM seat_booking WHERE "orderId" = $1`,
        [orderId],
      );

      if (seatBookings.length > 0) {
        const seatIds = seatBookings.map((b: any) => b.seatId);
        await queryRunner.query(
          `UPDATE seat 
           SET status = $1, "isLockedUntil" = NULL, "updatedAt" = $2 
           WHERE id = ANY($3)`,
          [SeatStatus.AVAILABLE, ThailandTimeHelper.now(), seatIds],
        );
      }

      await queryRunner.commitTransaction();

      // 5. ✅ Send real-time notification to frontend
      this.orderUpdatesGateway.notifyOrderCancelled({
        orderId: orderId,
        orderNumber: currentOrder.orderNumber,
        userId: currentOrder.userId,
        showDate: currentOrder.showDate,
        message: 'Order cancelled successfully with concurrency protection',
      });

      // 6. ✅ Update seat availability for other users
      if (seatBookings.length > 0) {
        const seatIds = seatBookings.map((b: any) => b.seatId);
        this.orderUpdatesGateway.notifySeatAvailabilityChanged({
          seatIds: seatIds,
          showDate: currentOrder.showDate,
          status: 'AVAILABLE',
          message: 'Seats are now available again',
        });
      }

      this.logger.log(`✅ Successfully cancelled order: ${orderId}`);

      return {
        success: true,
        id: orderId,
        status: OrderStatus.CANCELLED,
        message: 'Order cancelled successfully',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Failed to cancel order: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 🎯 Handle seat changes with concurrency control
   * จัดการการเปลี่ยนที่นั่งพร้อมการจัดการ concurrency
   */
  private async handleSeatChanges(
    queryRunner: any,
    orderId: string,
    newSeatIds: string[],
    showDate: string,
  ): Promise<void> {
    // 1. Get current seat bookings
    const currentBookings = await queryRunner.query(
      `SELECT "seatId" FROM seat_booking WHERE "orderId" = $1`,
      [orderId],
    );

    const currentSeatIds = currentBookings.map((b: any) => b.seatId);

    // 2. Find seats to remove and add
    const seatsToRemove = currentSeatIds.filter(
      (seatId: string) => !newSeatIds.includes(seatId),
    );
    const seatsToAdd = newSeatIds.filter(
      (seatId: string) => !currentSeatIds.includes(seatId),
    );

    // 3. Lock new seats
    if (seatsToAdd.length > 0) {
      const lockedSeats = await queryRunner.query(
        `SELECT id FROM seat WHERE id = ANY($1) AND status = $2 FOR UPDATE`,
        [seatsToAdd, SeatStatus.AVAILABLE],
      );

      if (lockedSeats.length !== seatsToAdd.length) {
        throw new BadRequestException(
          'ที่นั่งใหม่บางที่ไม่สามารถจองได้ กรุณาเลือกใหม่',
        );
      }

      // Check for conflicting bookings
      const conflicts = await queryRunner.query(
        `SELECT "seatId" FROM seat_booking 
         WHERE "seatId" = ANY($1) AND "showDate" = $2 AND status IN ($3, $4, $5)`,
        [
          seatsToAdd,
          showDate,
          BookingStatus.PENDING,
          BookingStatus.CONFIRMED,
          BookingStatus.PAID,
        ],
      );

      if (conflicts.length > 0) {
        throw new BadRequestException(
          'ที่นั่งใหม่บางที่ถูกจองไปแล้ว กรุณาเลือกใหม่',
        );
      }
    }

    // 4. Remove old seat bookings
    if (seatsToRemove.length > 0) {
      await queryRunner.query(
        `DELETE FROM seat_booking WHERE "orderId" = $1 AND "seatId" = ANY($2)`,
        [orderId, seatsToRemove],
      );

      await queryRunner.query(
        `UPDATE seat SET status = $1, "updatedAt" = $2 WHERE id = ANY($3)`,
        [SeatStatus.AVAILABLE, ThailandTimeHelper.now(), seatsToRemove],
      );
    }

    // 5. Add new seat bookings
    if (seatsToAdd.length > 0) {
      const bookings = seatsToAdd.map((seatId: string) => ({
        orderId,
        seatId,
        showDate,
        status: BookingStatus.PENDING,
        createdAt: ThailandTimeHelper.now(),
        updatedAt: ThailandTimeHelper.now(),
      }));

      await queryRunner.query(
        `INSERT INTO seat_booking (id, "orderId", "seatId", "showDate", status, "createdAt", "updatedAt") 
         VALUES ${bookings.map(() => '(gen_random_uuid(), $1, $2, $3, $4, $5, $6)').join(', ')}`,
        bookings.flatMap((b) => [
          b.orderId,
          b.seatId,
          b.showDate,
          b.status,
          b.createdAt,
          b.updatedAt,
        ]),
      );

      await queryRunner.query(
        `UPDATE seat SET status = $1, "updatedAt" = $2 WHERE id = ANY($3)`,
        [SeatStatus.BOOKED, ThailandTimeHelper.now(), seatsToAdd],
      );
    }
  }

  private async validateBookingLimits(user: User, request: any): Promise<void> {
    const limits = BOOKING_LIMITS[user.role];
    const totalSeats = (request.quantity || 0) + (request.seatIds?.length || 0);

    this.logger.log(
      `Validating booking limits for user: ${user.id}, role: ${user.role}, totalSeats: ${totalSeats}`,
    );

    if (totalSeats > limits.maxSeatsPerOrder) {
      this.logger.warn(
        `User ${user.id} exceeded max seats per order: ${totalSeats} > ${limits.maxSeatsPerOrder}`,
      );
      throw new BadRequestException(
        `สิทธิ์ของ${user.role} สามารถจองได้สูงสุด ${limits.maxSeatsPerOrder} ที่นั่งต่อคำสั่ง`,
      );
    }

    const today = ThailandTimeHelper.startOfDay(ThailandTimeHelper.now());
    const todayOrders = await this.orderRepo.count({
      where: {
        userId: user.id,
        createdAt: Between(today, ThailandTimeHelper.now()),
      },
    });

    this.logger.log(
      `User ${user.id} has made ${todayOrders} orders today, max allowed: ${limits.maxOrdersPerDay}`,
    );

    if (todayOrders >= limits.maxOrdersPerDay) {
      this.logger.warn(
        `User ${user.id} exceeded max orders per day: ${todayOrders} >= ${limits.maxOrdersPerDay}`,
      );
      throw new BadRequestException(
        `สิทธิ์ของ${user.role} สามารถทำรายการได้สูงสุด ${limits.maxOrdersPerDay} ครั้งต่อวัน`,
      );
    }
  }

  /**
   * 🔢 Generate unique order number
   * สร้างเลขออเดอร์ที่ไม่ซ้ำกัน
   */

  private generateOrderNumber(): string {
    const now = ThailandTimeHelper.now();
    const timestamp = now.getTime().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `ORD${timestamp}${random}`;
  }

  /**
   * ⏰ Calculate order expiry time
   * คำนวณเวลาหมดอายุของออเดอร์
   */
  private calculateExpiryTime(orderData: any): Date {
    const now = ThailandTimeHelper.now();

    // Standing tickets expire at 9 PM on show date
    if (orderData.ticketType === 'STANDING') {
      const showDate = new Date(orderData.showDate);
      showDate.setHours(21, 0, 0, 0); // 9 PM
      return showDate;
    }

    // Regular tickets expire in 5 minutes
    return new Date(now.getTime() + 5 * 60 * 1000);
  }

  private calculateOrderPricing(request: any): {
    totalAmount: number;
    commission: number;
  } {
    const { ticketType, quantity = 0, seatIds = [] } = request;
    let pricePerSeat;
    let commissionPerTicket = 0;
    let totalAmount = 0;
    let commission = 0;

    if (ticketType === TicketType.STANDING) {
      pricePerSeat = TICKET_PRICES.STANDING_ADULT;
      commissionPerTicket = COMMISSION_RATES.STANDING_ADULT;
      totalAmount = quantity * pricePerSeat;
      commission = quantity * commissionPerTicket;
    } else {
      pricePerSeat = TICKET_PRICES[ticketType];
      commissionPerTicket = COMMISSION_RATES.SEAT;
      totalAmount = seatIds.length * pricePerSeat;
      commission = seatIds.length * commissionPerTicket;
    }

    // Validate constants
    if (
      typeof pricePerSeat !== 'number' ||
      typeof commissionPerTicket !== 'number'
    ) {
      this.logger.error(
        `Invalid constants: pricePerSeat=${pricePerSeat}, commissionPerTicket=${commissionPerTicket}`,
      );
      throw new InternalServerErrorException(
        'Invalid ticket pricing or commission rates. Please contact support.',
      );
    }

    this.logger.log(`Calculating pricing for ticketType: ${ticketType}`);
    this.logger.log(`TICKET_PRICES: ${JSON.stringify(TICKET_PRICES)}`);
    this.logger.log(`COMMISSION_RATES: ${JSON.stringify(COMMISSION_RATES)}`);

    return { totalAmount, commission };
  }
  /**
   * 💰 Calculate order total amount
   * คำนวณจำนวนเงินรวมของออเดอร์
   */
  private async calculateOrderTotal(orderData: any): Promise<{
    total: number;
    totalAmount: number;
  }> {
    // If total is already provided, use it
    if (orderData.total || orderData.totalAmount) {
      const total = orderData.total || orderData.totalAmount;
      return {
        total,
        totalAmount: total,
      };
    } // Calculate based on ticket type and quantity
    let basePrice = 0;

    switch (orderData.ticketType) {
      case TicketType.RINGSIDE:
        basePrice = 1800;
        break;
      case TicketType.STADIUM:
        basePrice = 1800;
        break;
      case TicketType.STANDING:
        basePrice = 1500;
        break;
      default:
        basePrice = 1200;
    }

    // Calculate total based on seats or standing tickets
    let totalAmount = 0;

    if (orderData.seatIds && orderData.seatIds.length > 0) {
      // Seat-based pricing
      totalAmount = basePrice * orderData.seatIds.length;
    } else {
      // Standing ticket pricing
      const adultQty = orderData.standingAdultQty || 0;
      const childQty = orderData.standingChildQty || 0;
      const quantity = orderData.quantity || 1;

      totalAmount = basePrice * (adultQty + childQty + quantity);
    }

    return {
      total: totalAmount,
      totalAmount,
    };
  }

  /**
   * 📊 Get system health and concurrency statistics
   * ได้สถิติสุขภาพระบบและการจัดการ concurrency
   */
  async getSystemHealth(): Promise<any> {
    const [
      concurrencyStats,
      duplicatePreventionStats,
      activeOrders,
      lockedSeats,
    ] = await Promise.all([
      this.concurrencyService.getConcurrencyStats(),
      this.duplicatePreventionService.getDuplicatePreventionStats(),
      this.orderRepo.count({ where: { status: OrderStatus.PENDING } }),
      this.seatRepo.count({ where: { status: SeatStatus.RESERVED } }),
    ]);

    return {
      concurrency: concurrencyStats,
      duplicatePrevention: duplicatePreventionStats,
      activeOrders,
      lockedSeats,
      timestamp: ThailandTimeHelper.now(),
    };
  }
}

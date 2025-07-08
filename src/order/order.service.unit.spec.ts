/**
 * 🧪 คู่มือ Testing ในระบบ Order - สำหรับมือใหม่
 *
 * การทดสอบซอฟต์แวร์มี 3 ประเภทหลัก:
 *
 * 1. 📘 Unit Test (การทดสอบหน่วยย่อย)
 *    - ทดสอบ function หรือ method แต่ละตัวแยกกัน
 *    - ใช้ Mock/Stub แทนการเชื่อมต่อจริง (Database, API)
 *    - เร็ว, เขียนง่าย, หาปัญหาได้แม่นยำ
 *    - ตัวอย่าง: ทดสอบ function createOrder ว่าสร้าง order ได้ถูกต้องหรือไม่
 *
 * 2. 📗 Integration Test (การทดสอบการทำงานร่วมกัน)
 *    - ทดสอบการทำงานร่วมกันระหว่าง components หลายตัว
 *    - ใช้ Database จริง หรือ Test Database
 *    - ช้ากว่า Unit Test แต่ใกล้เคียงการใช้งานจริงมากกว่า
 *    - ตัวอย่าง: ทดสอบ OrderService + Database ร่วมกัน
 *
 * 3. 📙 E2E Test (End-to-End Testing - การทดสอบแบบครบวงจร)
 *    - ทดสอบระบบทั้งหมดตั้งแต่ต้นจนจบ ผ่าน API
 *    - ใช้ HTTP Request จริง เหมือนผู้ใช้งานจริง
 *    - ช้าที่สุด แต่มั่นใจได้มากที่สุดว่าระบบทำงานได้จริง
 *    - ตัวอย่าง: POST /orders, GET /orders/:id ผ่าน HTTP
 *
 * 🎯 กลยุทธ์การทดสอบ (Test Pyramid):
 *    - Unit Tests (70%) - มากที่สุด เพราะเร็วและหาปัญหาได้แม่นยำ
 *    - Integration Tests (20%) - ปานกลาง เพื่อทดสอบการทำงานร่วมกัน
 *    - E2E Tests (10%) - น้อยที่สุด เพราะช้าและซับซ้อน
 */

import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import { Seat } from '../seats/seat.entity';
import { User } from '../user/user.entity';
import { Referrer } from '../referrer/referrer.entity';
import { Payment } from '../payment/payment.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  TicketType,
  UserRole,
  SeatStatus,
  BookingStatus,
} from '../common/enums';
import { CreateOrderRequest } from './order.service';

/**
 * 📘 UNIT TESTS - การทดสอบหน่วยย่อย
 *
 * จุดประสงค์: ทดสอบ OrderService แต่ละ method แยกกัน
 * วิธีการ: ใช้ Mock Repository แทน Database จริง
 * ข้อดี: เร็ว, แยกปัญหาได้ชัด, ไม่ต้องพึ่ง Database
 */
describe('📘 OrderService - Unit Tests', () => {
  let service: OrderService;

  // 🎭 Mock Data - ข้อมูลปลอมสำหรับการทดสอบ
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'นายทดสอบ',
    phone: '0812345678',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrder = {
    id: 'order-123',
    userId: 'user-123',
    status: OrderStatus.PENDING,
    paymentMethod: PaymentMethod.QR_CODE,
    ticketType: TicketType.RINGSIDE,
    customerName: 'นายทดสอบ',
    customerEmail: 'test@example.com',
    customerPhone: '0812345678',
    total: 1500,
    totalAmount: 1500,
    quantity: 1,
    showDate: new Date('2024-12-31T19:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
    seatBookings: [],
    payments: [],
    referrer: null,
    reference: 'ORD-001',
    commission: 0,
    commissionRate: 0,
    notes: '',
    source: 'ONLINE',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  };

  const mockSeat = {
    id: 'seat-123',
    seatNumber: 'A1',
    row: 'A',
    section: '1',
    status: SeatStatus.AVAILABLE,
    zoneId: 'zone-1',
    zone: null,
    price: 1500,
    tier: 'premium',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 🎭 Mock Repositories - การจำลอง Database
  const mockOrderRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: 0 }),
    })),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockSeatRepository = {
    find: jest.fn(),
    findByIds: jest.fn(),
    update: jest.fn(),
  };

  const mockSeatBookingRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockAuditLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockReferrerRepository = {
    findOne: jest.fn(),
  };

  const mockPaymentRepository = {
    find: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  // 🏗️ Setup การทดสอบ - เตรียมสภาพแวดล้อมก่อนทดสอบ
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Seat),
          useValue: mockSeatRepository,
        },
        {
          provide: getRepositoryToken(SeatBooking),
          useValue: mockSeatBookingRepository,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
        {
          provide: getRepositoryToken(Referrer),
          useValue: mockReferrerRepository,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  // 🧹 Cleanup การทดสอบ - ล้างข้อมูลหลังทดสอบ
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ✅ ทดสอบการสร้าง Service
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // 🎯 ทดสอบการสร้าง Order
  describe('createOrder', () => {
    it('✅ ควรสร้าง order ได้สำเร็จ', async () => {
      // 📝 Arrange: เตรียมข้อมูลทดสอบ
      const createOrderRequest: CreateOrderRequest = {
        userId: 'user-123',
        ticketType: TicketType.RINGSIDE,
        quantity: 1,
        seatIds: ['seat-123'],
        showDate: '2024-12-31T19:00:00Z',
        customerName: 'นายทดสอบ',
        customerEmail: 'test@example.com',
        customerPhone: '0812345678',
        paymentMethod: PaymentMethod.QR_CODE,
      };

      // 🎭 จำลองการตอบกลับจาก Repository
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockSeatRepository.findByIds.mockResolvedValue([mockSeat]);
      mockSeatBookingRepository.find.mockResolvedValue([]); // ไม่มีที่นั่งที่จองแล้ว
      mockOrderRepository.create.mockReturnValue(mockOrder);
      mockOrderRepository.save.mockResolvedValue(mockOrder);
      mockOrderRepository.findOne.mockResolvedValue(mockOrder); // สำหรับ reload
      mockSeatBookingRepository.create.mockReturnValue({});
      mockSeatBookingRepository.save.mockResolvedValue({});
      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockResolvedValue({});

      // 🚀 Act: เรียกใช้ function ที่ต้องการทดสอบ
      const result = await service.createOrder(createOrderRequest, 'user-123');

      // 🔍 Assert: ตรวจสอบผลลัพธ์
      expect(result).toBeDefined();
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(mockOrderRepository.create).toHaveBeenCalled();
      expect(mockOrderRepository.save).toHaveBeenCalled();
    });

    it('❌ ควร throw BadRequestException เมื่อไม่พบ user', async () => {
      // 📝 Arrange: เตรียมข้อมูลทดสอบ
      const createOrderRequest: CreateOrderRequest = {
        userId: 'user-404',
        ticketType: TicketType.RINGSIDE,
        quantity: 1,
        seatIds: ['seat-123'],
        showDate: '2024-12-31T19:00:00Z',
        customerName: 'นายทดสอบ',
        customerEmail: 'test@example.com',
        customerPhone: '0812345678',
        paymentMethod: PaymentMethod.QR_CODE,
      };

      // 🎭 จำลองการไม่พบ user
      mockUserRepository.findOne.mockResolvedValue(null);

      // 🚀 Act & Assert: ทดสอบว่า error ถูก throw ออกมา
      await expect(
        service.createOrder(createOrderRequest, 'user-404'),
      ).rejects.toThrow(BadRequestException);
    });

    it('❌ ควร throw BadRequestException เมื่อที่นั่งไม่ว่าง', async () => {
      // 📝 Arrange: เตรียมข้อมูลทดสอบ
      const createOrderRequest: CreateOrderRequest = {
        userId: 'user-123',
        ticketType: TicketType.RINGSIDE,
        quantity: 1,
        seatIds: ['seat-booked'],
        showDate: '2024-12-31T19:00:00Z',
        customerName: 'นายทดสอบ',
        customerEmail: 'test@example.com',
        customerPhone: '0812345678',
        paymentMethod: PaymentMethod.QR_CODE,
      };

      const bookedSeatBooking = {
        id: 'booking-123',
        seat: mockSeat,
        showDate: new Date('2024-12-31T19:00:00Z'),
        status: BookingStatus.CONFIRMED,
      };

      // 🎭 จำลองการตอบกลับ
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockSeatRepository.findByIds.mockResolvedValue([mockSeat]);
      mockSeatBookingRepository.find.mockResolvedValue([bookedSeatBooking]); // มีที่นั่งที่จองแล้ว

      // 🚀 Act & Assert
      await expect(
        service.createOrder(createOrderRequest, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // 🔍 ทดสอบการค้นหา Orders
  describe('findAll', () => {
    it('✅ ควรคืน orders แบบ pagination', async () => {
      // 📝 Arrange & 🚀 Act
      const result = await service.findAll({ page: 1, limit: 10 });

      // 🔍 Assert
      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });

    it('✅ ควรกรอง orders ตาม status', async () => {
      // 📝 Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({}),
      };

      mockOrderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // 🚀 Act
      await service.findAll({
        page: 1,
        limit: 10,
        status: OrderStatus.PENDING,
      });

      // 🔍 Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.status = :status',
        { status: OrderStatus.PENDING },
      );
    });
  });

  // 🔍 ทดสอบการค้นหา Order ตาม ID
  describe('findById', () => {
    it('✅ ควรคืน order เมื่อพบ', async () => {
      // 📝 Arrange
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      // 🚀 Act
      const result = await service.findById('order-123');

      // 🔍 Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('order-123');
      expect(result.customerName).toBe('นายทดสอบ');
      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        relations: [
          'user',
          'referrer',
          'seatBookings',
          'seatBookings.seat',
          'seatBookings.seat.zone',
          'payment',
        ],
      });
    });

    it('✅ ควรคืน null เมื่อไม่พบ order', async () => {
      // 📝 Arrange
      mockOrderRepository.findOne.mockResolvedValue(null);

      // 🚀 Act
      const result = await service.findById('order-404');

      // 🔍 Assert
      expect(result).toBeNull();
    });
  });

  // ✏️ ทดสอบการแก้ไข Order
  describe('update', () => {
    it('✅ ควรแก้ไข order ได้สำเร็จ', async () => {
      // 📝 Arrange
      const updateData = {
        customerName: 'นายทดสอบใหม่',
        customerPhone: '0898765432',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockOrderRepository.update.mockResolvedValue({});
      mockOrderRepository.findOne.mockResolvedValueOnce({
        ...mockOrder,
        ...updateData,
      });
      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockResolvedValue({});

      // 🚀 Act
      const result = await service.update('order-123', updateData, 'user-123');

      // 🔍 Assert
      expect(result).toBeDefined();
      expect(mockOrderRepository.update).toHaveBeenCalledWith(
        'order-123',
        expect.objectContaining(updateData),
      );
    });
  });

  // ❌ ทดสอบการยกเลิก Order
  describe('cancel', () => {
    it('✅ ควรยกเลิก order ได้สำเร็จ', async () => {
      // 📝 Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockOrderRepository.update.mockResolvedValue({});
      mockSeatBookingRepository.find.mockResolvedValue([]);
      mockSeatBookingRepository.update.mockResolvedValue({});
      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockResolvedValue({});

      // 🚀 Act
      const result = await service.cancel('order-123', 'user-123');

      // 🔍 Assert
      expect(result).toEqual({
        success: true,
        message: 'Order cancelled successfully',
      });
      expect(mockOrderRepository.update).toHaveBeenCalledWith(
        'order-123',
        expect.objectContaining({ status: OrderStatus.CANCELLED }),
      );
    });
  });

  // ✅ ทดสอบการยืนยันการชำระเงิน
  describe('confirmPayment', () => {
    it('✅ staff ควรยืนยันการชำระเงินได้สำเร็จ', async () => {
      // 📝 Arrange
      const staffUser = { ...mockUser, role: UserRole.STAFF };
      mockUserRepository.findOne.mockResolvedValue(staffUser);
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockOrderRepository.update.mockResolvedValue({});
      mockSeatBookingRepository.update.mockResolvedValue({});
      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockResolvedValue({});

      // 🚀 Act
      const result = await service.confirmPayment('order-123', 'staff-123');

      // 🔍 Assert
      expect(result).toEqual({
        success: true,
        message: 'Payment confirmed successfully',
      });
      expect(mockOrderRepository.update).toHaveBeenCalledWith(
        'order-123',
        expect.objectContaining({ status: OrderStatus.CONFIRMED }),
      );
    });

    it('❌ user ธรรมดาไม่ควรยืนยันการชำระเงินได้', async () => {
      // 📝 Arrange: ตั้งค่า user ให้เป็น 'user' ธรรมดา (ไม่ใช่ staff/admin)
      const regularUser = { ...mockUser, role: 'user' };
      mockUserRepository.findOne.mockResolvedValue(regularUser);
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      // 🚀 Act & Assert
      await expect(
        service.confirmPayment('order-123', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // 📊 ทดสอบสстатistics
  describe('getOrderStats', () => {
    it('✅ ควรคืนสถิติ orders', async () => {
      // 📝 Arrange
      mockOrderRepository.count.mockResolvedValue(0);

      // 🚀 Act
      const result = await service.getOrderStats();

      // 🔍 Assert
      expect(result).toBeDefined();
      expect(result.totalOrders).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.pendingOrders).toBe(0);
      expect(result.confirmedOrders).toBe(0);
      expect(result.cancelledOrders).toBe(0);
      expect(result.expiredOrders).toBe(0);
    });
  });

  // 🔄 ทดสอบการเปลี่ยนที่นั่ง
  describe('changeSeats', () => {
    it('✅ staff ควรเปลี่ยนที่นั่งได้สำเร็จ', async () => {
      // 📝 Arrange
      const staffUser = { ...mockUser, role: UserRole.STAFF };
      const newSeatNumbers = ['A2'];

      mockUserRepository.findOne.mockResolvedValue(staffUser);
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockSeatRepository.find.mockResolvedValue([
        { ...mockSeat, seatNumber: 'A2', status: SeatStatus.AVAILABLE },
      ]);
      mockSeatBookingRepository.find.mockResolvedValue([]);
      mockSeatBookingRepository.delete.mockResolvedValue({});
      mockSeatBookingRepository.create.mockReturnValue({});
      mockSeatBookingRepository.save.mockResolvedValue({});
      mockOrderRepository.update.mockResolvedValue({});
      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockResolvedValue({});

      // 🚀 Act
      const result = await service.changeSeats(
        'order-123',
        newSeatNumbers,
        'staff-123',
      );

      // 🔍 Assert
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('Seats changed successfully'),
        }),
      );
    });
  });

  // 🗑️ ทดสอบการลบ Order
  describe('remove', () => {
    it('✅ admin ควรลบ order ได้สำเร็จ', async () => {
      // 📝 Arrange
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      mockUserRepository.findOne.mockResolvedValue(adminUser);
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockSeatBookingRepository.find.mockResolvedValue([]);
      mockSeatBookingRepository.delete.mockResolvedValue({});
      mockOrderRepository.delete.mockResolvedValue({});
      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockResolvedValue({});

      // 🚀 Act
      const result = await service.remove('order-123', 'admin-123');

      // 🔍 Assert
      expect(result).toEqual({
        success: true,
        message: 'Order removed successfully',
      });
      expect(mockOrderRepository.delete).toHaveBeenCalledWith('order-123');
    });
  });

  // 🚨 ทดสอบการจัดการ Error
  describe('Error Handling', () => {
    it('❌ ควรจัดการ database connection error', async () => {
      // 📝 Arrange
      mockOrderRepository.findOne.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // 🚀 Act & Assert
      await expect(service.findById('order-123')).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('❌ ควรจัดการ invalid payment method', async () => {
      // 📝 Arrange
      const createOrderRequest: CreateOrderRequest = {
        userId: 'user-123',
        ticketType: TicketType.RINGSIDE,
        quantity: 1,
        seatIds: ['seat-123'],
        showDate: '2024-12-31T19:00:00Z',
        customerName: 'นายทดสอบ',
        customerEmail: 'test@example.com',
        customerPhone: '0812345678',
        paymentMethod: 'INVALID_METHOD' as PaymentMethod,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // 🚀 Act & Assert
      await expect(
        service.createOrder(createOrderRequest, 'user-123'),
      ).rejects.toThrow();
    });
  });
});

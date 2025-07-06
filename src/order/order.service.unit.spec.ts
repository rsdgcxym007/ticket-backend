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
import { BusinessService } from '../common/services/business.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  PaymentMethod,
  TicketType,
  SeatStatus,
} from '../common/enums';
import { CreateOrderDto } from './dto/create-order.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrderService', () => {
  let service: OrderService;

  const mockOrder = {
    id: 'order-1',
    userId: 'user-1',
    status: OrderStatus.PENDING,
    paymentMethod: PaymentMethod.QR_CODE,
    ticketType: TicketType.RINGSIDE,
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    customerPhone: '0123456789',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSeat = {
    id: 'seat-1',
    seatNumber: 'A1',
    row: 'A',
    section: '1',
    status: SeatStatus.AVAILABLE,
    zoneId: 'zone-1',
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockOrderRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSeatBookingRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockSeatRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findByIds: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockReferrerRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockPaymentRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAuditLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockBusinessService = {
    calculateOrderTotal: jest.fn(),
    calculateCommission: jest.fn(),
    generateOrderReference: jest.fn(),
    validateBusinessRules: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(SeatBooking),
          useValue: mockSeatBookingRepository,
        },
        {
          provide: getRepositoryToken(Seat),
          useValue: mockSeatRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
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
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
        {
          provide: BusinessService,
          useValue: mockBusinessService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create a new order successfully', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: 'user-1',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '0123456789',
        ticketType: TicketType.RINGSIDE,
        paymentMethod: PaymentMethod.QR_CODE,
        seatIds: ['seat-1'],
        quantity: 1,
        showDate: '2024-01-01T19:00:00Z',
      };

      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockSeatRepository.findByIds.mockResolvedValue([mockSeat]);
      mockBusinessService.validateBusinessRules.mockResolvedValue(true);
      mockBusinessService.calculateOrderTotal.mockResolvedValue(1500);
      mockBusinessService.generateOrderReference.mockResolvedValue('ORD-001');
      mockOrderRepository.create.mockReturnValue(mockOrder);
      mockOrderRepository.save.mockResolvedValue(mockOrder);
      mockSeatBookingRepository.create.mockReturnValue({});
      mockSeatBookingRepository.save.mockResolvedValue({});
      mockSeatRepository.save.mockResolvedValue({});

      const result = await service.createOrder(createOrderDto, 'user-1');

      expect(result).toEqual(mockOrder);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        id: 'user-1',
      });
      expect(mockSeatRepository.findByIds).toHaveBeenCalledWith(['seat-1']);
      expect(mockBusinessService.validateBusinessRules).toHaveBeenCalled();
      expect(mockOrderRepository.save).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: 'non-existent-user',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '0123456789',
        ticketType: TicketType.RINGSIDE,
        paymentMethod: PaymentMethod.QR_CODE,
        seatIds: ['seat-1'],
        quantity: 1,
        showDate: '2024-01-01T19:00:00Z',
      };

      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.createOrder(createOrderDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when seats not available', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: 'user-1',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '0123456789',
        ticketType: TicketType.RINGSIDE,
        paymentMethod: PaymentMethod.QR_CODE,
        seatIds: ['seat-1'],
        quantity: 1,
        showDate: '2024-01-01T19:00:00Z',
      };

      const unavailableSeat = { ...mockSeat, status: SeatStatus.RESERVED };

      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockSeatRepository.findByIds.mockResolvedValue([unavailableSeat]);

      await expect(
        service.createOrder(createOrderDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllOrders', () => {
    it('should return paginated orders', async () => {
      const mockOrders = [mockOrder];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockOrders, 1]),
      };

      mockOrderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: mockOrders,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter orders by status', async () => {
      const mockOrders = [mockOrder];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockOrders, 1]),
      };

      mockOrderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        status: OrderStatus.PENDING,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.status = :status',
        { status: OrderStatus.PENDING },
      );
      expect(result.data).toEqual(mockOrders);
    });
  });

  describe('findOrderById', () => {
    it('should return an order by id', async () => {
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.findById('order-1');

      expect(result).toEqual(mockOrder);
      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        relations: [
          'user',
          'seatBookings',
          'seatBookings.seat',
          'seatBookings.seat.zone',
        ],
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent-order')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateOrder', () => {
    it('should update an order successfully', async () => {
      const updateData = {
        customerName: 'Updated Customer',
        customerPhone: '0987654321',
      };

      const updatedOrder = { ...mockOrder, ...updateData };

      mockOrderRepository.findOneBy.mockResolvedValue(mockOrder);
      mockOrderRepository.save.mockResolvedValue(updatedOrder);

      const result = await service.update('order-1', updateData, 'user-1');

      expect(result).toEqual(updatedOrder);
      expect(mockOrderRepository.save).toHaveBeenCalledWith({
        ...mockOrder,
        ...updateData,
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order not found', async () => {
      const updateData = {
        customerName: 'Updated Customer',
      };

      mockOrderRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('non-existent-order', updateData, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order successfully', async () => {
      const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockOrderRepository.save.mockResolvedValue(cancelledOrder);
      mockSeatBookingRepository.find.mockResolvedValue([{ seatId: 'seat-1' }]);
      mockSeatRepository.update.mockResolvedValue(undefined);

      const result = await service.cancel('order-1', 'user-1');

      expect(result).toEqual(cancelledOrder);
      expect(mockOrderRepository.save).toHaveBeenCalledWith({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      });
      expect(mockSeatRepository.update).toHaveBeenCalledWith('seat-1', {
        status: SeatStatus.AVAILABLE,
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancel('non-existent-order', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order already cancelled', async () => {
      const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };

      mockOrderRepository.findOne.mockResolvedValue(cancelledOrder);

      await expect(service.cancel('order-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      const confirmedOrder = { ...mockOrder, status: OrderStatus.CONFIRMED };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockOrderRepository.save.mockResolvedValue(confirmedOrder);
      mockSeatBookingRepository.find.mockResolvedValue([{ seatId: 'seat-1' }]);
      mockSeatRepository.update.mockResolvedValue(undefined);

      const result = await service.confirmPayment('order-1', 'user-1');

      expect(result).toEqual(confirmedOrder);
      expect(mockOrderRepository.save).toHaveBeenCalledWith({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      });
      expect(mockSeatRepository.update).toHaveBeenCalledWith('seat-1', {
        status: SeatStatus.RESERVED,
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.confirmPayment('non-existent-order', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order already confirmed', async () => {
      const confirmedOrder = { ...mockOrder, status: OrderStatus.CONFIRMED };

      mockOrderRepository.findOne.mockResolvedValue(confirmedOrder);

      await expect(service.confirmPayment('order-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getOrderStats', () => {
    it('should return order statistics', async () => {
      const mockStats = {
        totalOrders: 10,
        totalRevenue: 15000,
        pendingOrders: 3,
        confirmedOrders: 7,
        cancelledOrders: 0,
        averageOrderValue: 1500,
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalOrders: '10',
          totalRevenue: '15000',
          pendingOrders: '3',
          confirmedOrders: '7',
          cancelledOrders: '0',
          averageOrderValue: '1500',
        }),
      };

      mockOrderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getOrderStats();

      expect(result).toEqual(mockStats);
    });
  });
});

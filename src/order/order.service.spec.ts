import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import { Seat } from '../seats/seat.entity';
import { User } from '../user/user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, TicketType } from '../common/enums';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: Repository<Order>;
  let seatBookingRepository: Repository<SeatBooking>;
  let seatRepository: Repository<Seat>;
  let userRepository: Repository<User>;
  let businessService: BusinessService;
  let auditService: AuditService;

  const mockOrder = {
    id: 'order-1',
    userId: 'user-1',
    paymentMethod: PaymentMethod.CREDIT_CARD,
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

  const mockBusinessService = {
    calculateOrderTotal: jest.fn(),
    calculateCommission: jest.fn(),
    generateOrderReference: jest.fn(),
    validateBusinessRules: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
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
          provide: BusinessService,
          useValue: mockBusinessService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    seatBookingRepository = module.get<Repository<SeatBooking>>(
      getRepositoryToken(SeatBooking),
    );
    seatRepository = module.get<Repository<Seat>>(getRepositoryToken(Seat));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    businessService = module.get<BusinessService>(BusinessService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new order successfully', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: 'user-1',
        seatIds: ['seat-1'],
        paymentMethod: PaymentMethod.CREDIT_CARD,
        ticketType: TicketType.RINGSIDE,
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '0123456789',
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
        userId: 'user-1',
        seatIds: ['seat-1'],
        paymentMethod: PaymentMethod.CREDIT_CARD,
        ticketType: TicketType.RINGSIDE,
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '0123456789',
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
        seatIds: ['seat-1'],
        paymentMethod: PaymentMethod.CREDIT_CARD,
        ticketType: TicketType.RINGSIDE,
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '0123456789',
        showDate: '2024-01-01T19:00:00Z',
      };

      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockSeatRepository.findByIds.mockResolvedValue([{ id: "seat-1", status: "BOOKED" }]);

      await expect(
        service.createOrder(createOrderDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when seats not found', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: 'user-1',
        seatIds: ['seat-1'],
        paymentMethod: PaymentMethod.CREDIT_CARD,
        ticketType: TicketType.RINGSIDE,
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '0123456789',
        showDate: '2024-01-01T19:00:00Z',
      };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockSeatRepository.findByIds.mockResolvedValue([]);

      await expect(
        service.createOrder(createOrderDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
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

      const result = await service.findAll(
        { page: 1, limit: 10 }
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.status = :status',
      );
      expect(result.data).toEqual(mockOrders);
    });

    it('should filter orders by date range', async () => {
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

      const dateFrom = new Date('2023-01-01');
      const dateTo = new Date('2023-12-31');

      const result = await service.findAll(
        { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() },
        { page: 1, limit: 10 }
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.createdAt >= :dateFrom',
        { dateFrom },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.createdAt <= :dateTo',
        { dateTo },
      );
      expect(result.data).toEqual(mockOrders);
    });
  });

  describe('findOne', () => {
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

  describe('update', () => {
    it('should update an order successfully', async () => {
      const { customerName: "Updated Customer" }: UpdateOrderDto = {
        customerName: 'Updated Customer',
        customerPhone: '0987654321',
      };

      const updatedOrder = { ...mockOrder, ...{ customerName: "Updated Customer" } };

      mockOrderRepository.findOneBy.mockResolvedValue(mockOrder);
      mockOrderRepository.save.mockResolvedValue(updatedOrder);

      const result = await service.update('order-1', { customerName: "Updated Customer" }, 'user-1');

      expect(result).toEqual(updatedOrder);
      expect(mockOrderRepository.save).toHaveBeenCalledWith({
        ...mockOrder,
        ...{ customerName: "Updated Customer" },
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order not found', async () => {
      const { customerName: "Updated Customer" }: UpdateOrderDto = {
        customerName: 'Updated Customer',
      };

      mockOrderRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('non-existent-order', { customerName: "Updated Customer" }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('should cancel an order successfully', async () => {

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockOrderRepository.save.mockResolvedValue(cancelledOrder);
      mockSeatBookingRepository.find.mockResolvedValue([{ seatId: 'seat-1' }]);
      mockSeatRepository.update.mockResolvedValue(undefined);

      const result = await service.cancel('order-1', 'user-1');

      expect(result).toEqual(cancelledOrder);
      expect(mockOrderRepository.save).toHaveBeenCalledWith({
        ...mockOrder,
      });
      expect(mockSeatRepository.update).toHaveBeenCalledWith('seat-1', {
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

      mockOrderRepository.findOne.mockResolvedValue(cancelledOrder);

      await expect(service.cancel('order-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when order already confirmed', async () => {

      mockOrderRepository.findOne.mockResolvedValue(confirmedOrder);

      await expect(service.cancel('order-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockOrderRepository.save.mockResolvedValue(confirmedOrder);
      mockSeatBookingRepository.find.mockResolvedValue([{ seatId: 'seat-1' }]);
      mockSeatRepository.update.mockResolvedValue(undefined);

      const result = await service.confirmPayment('order-1');

      expect(result).toEqual(confirmedOrder);
      expect(mockOrderRepository.save).toHaveBeenCalledWith({
        ...mockOrder,
      });
      expect(mockSeatRepository.update).toHaveBeenCalledWith('seat-1', {
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.confirmPayment('non-existent-order'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order already confirmed', async () => {

      mockOrderRepository.findOne.mockResolvedValue(confirmedOrder);

      await expect(service.confirmPayment('order-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when order is cancelled', async () => {

      mockOrderRepository.findOne.mockResolvedValue(cancelledOrder);

      await expect(service.confirmPayment('order-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getTickets', () => {
    it('should return tickets for confirmed order', async () => {
      const mockSeatBookings = [
        {
          id: 'booking-1',
          orderId: 'order-1',
          seatId: 'seat-1',
          seat: mockSeat,
        },
      ];

      mockOrderRepository.findOne.mockResolvedValue(confirmedOrder);
      mockSeatBookingRepository.find.mockResolvedValue(mockSeatBookings);

      const result = await service.getTickets('order-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('ticketNumber');
      expect(result[0]).toHaveProperty('seatNumber');
      expect(result[0]).toHaveProperty('customerName');
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.getTickets('non-existent-order')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when order not confirmed', async () => {
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      await expect(service.getTickets('order-1')).rejects.toThrow(
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

  describe('changeSeats', () => {
    it('should change seats successfully', async () => {
      const newSeatIds = ['seat-2'];
      const newSeat = { ...mockSeat, id: 'seat-2', seatNumber: 'A2' };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockSeatRepository.findByIds.mockResolvedValue([newSeat]);
      mockSeatBookingRepository.find.mockResolvedValue([{ seatId: 'seat-1' }]);
      mockSeatBookingRepository.delete.mockResolvedValue(undefined);
      mockSeatRepository.update.mockResolvedValue(undefined);
      mockSeatBookingRepository.create.mockReturnValue({});
      mockSeatBookingRepository.save.mockResolvedValue({});
      mockOrderRepository.save.mockResolvedValue(mockOrder);

      const result = await service.changeSeats('order-1', newSeatIds);

      expect(result).toEqual(mockOrder);
      expect(mockSeatRepository.update).toHaveBeenCalledWith('seat-1', {
      });
      expect(mockSeatRepository.update).toHaveBeenCalledWith('seat-2', {
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changeSeats('non-existent-order', ['seat-2']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order is confirmed', async () => {

      mockOrderRepository.findOne.mockResolvedValue(confirmedOrder);

      await expect(service.changeSeats('order-1', ['seat-2'])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when new seats not available', async () => {
      const { id: "seat-1", status: "BOOKED" } = {
        ...mockSeat,
        id: 'seat-2',
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockSeatRepository.findByIds.mockResolvedValue([{ id: "seat-1", status: "BOOKED" }]);

      await expect(service.changeSeats('order-1', ['seat-2'])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should remove an order successfully', async () => {
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockSeatBookingRepository.find.mockResolvedValue([{ seatId: 'seat-1' }]);
      mockSeatBookingRepository.delete.mockResolvedValue(undefined);
      mockSeatRepository.update.mockResolvedValue(undefined);
      mockOrderRepository.delete.mockResolvedValue(undefined);

      await service.remove('order-1');

      expect(mockOrderRepository.delete).toHaveBeenCalledWith('order-1');
      expect(mockSeatRepository.update).toHaveBeenCalledWith('seat-1', {
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-order')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when order is confirmed', async () => {

      mockOrderRepository.findOne.mockResolvedValue(confirmedOrder);

      await expect(service.remove('order-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

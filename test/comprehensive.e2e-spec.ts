import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { OrderService } from '../src/order/order.service';
import { AuthService } from '../src/auth/auth.service';
import { UserService } from '../src/user/user.service';
import { SeatService } from '../src/seats/seat.service';
import { PaymentService } from '../src/payment/payment.service';
import { ReferrerService } from '../src/referrer/referrer.service';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { AuditService } from '../src/audit/audit.service';
import { ConfigService } from '../src/config/config.service';
import { ZoneService } from '../src/zone/zone.service';
import {
  OrderStatus,
  PaymentMethod,
  SeatStatus,
  TicketType,
} from '../src/common/enums';
import { CreateOrderDto } from '../src/order/dto/create-order.dto';
import { UpdateOrderDto } from '../src/order/dto/update-order.dto';
import { CreateUserDto } from '../src/user/dto/create-user.dto';
import { LoginDto } from '../src/auth/dto/login.dto';
import { RegisterDto } from '../src/auth/dto/register.dto';

describe('Ticket Booking System E2E Tests', () => {
  let app: INestApplication;
  let orderService: OrderService;
  let authService: AuthService;
  let userService: UserService;
  let seatService: SeatService;
  let paymentService: PaymentService;
  let referrerService: ReferrerService;
  let analyticsService: AnalyticsService;
  let auditService: AuditService;
  let configService: ConfigService;
  let zoneService: ZoneService;

  let adminToken: string;
  let userToken: string;
  let testUser: any;
  let testAdmin: any;
  let testOrder: any;
  let testSeat: any;
  let testZone: any;
  let testReferrer: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Get service instances
    orderService = moduleFixture.get<OrderService>(OrderService);
    authService = moduleFixture.get<AuthService>(AuthService);
    userService = moduleFixture.get<UserService>(UserService);
    seatService = moduleFixture.get<SeatService>(SeatService);
    paymentService = moduleFixture.get<PaymentService>(PaymentService);
    referrerService = moduleFixture.get<ReferrerService>(ReferrerService);
    analyticsService = moduleFixture.get<AnalyticsService>(AnalyticsService);
    auditService = moduleFixture.get<AuditService>(AuditService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    zoneService = moduleFixture.get<ZoneService>(ZoneService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication & Authorization', () => {
    describe('POST /api/v1/auth/register', () => {
      it('should register a new user successfully', async () => {
        const registerDto: RegisterDto = {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerDto)
          .expect(201);

        expect(response.body).toHaveProperty('access_token');
        expect(response.body.user.email).toBe(registerDto.email);
        testUser = response.body.user;
        userToken = response.body.access_token;
      });

      it('should fail with invalid email format', async () => {
        const registerDto = {
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        };

        await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerDto)
          .expect(400);
      });

      it('should fail with weak password', async () => {
        const registerDto = {
          email: 'test2@example.com',
          password: '123',
          name: 'Test User',
        };

        await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerDto)
          .expect(400);
      });

      it('should fail with duplicate email', async () => {
        const registerDto: RegisterDto = {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User 2',
        };

        await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerDto)
          .expect(409);
      });
    });

    describe('POST /api/v1/auth/login', () => {
      it('should login successfully with valid credentials', async () => {
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'password123',
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(loginDto)
          .expect(200);

        expect(response.body).toHaveProperty('access_token');
        expect(response.body.user.email).toBe(loginDto.email);
      });

      it('should fail with invalid credentials', async () => {
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'wrongpassword',
        };

        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(loginDto)
          .expect(401);
      });

      it('should fail with non-existent user', async () => {
        const loginDto: LoginDto = {
          email: 'nonexistent@example.com',
          password: 'password123',
        };

        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(loginDto)
          .expect(401);
      });
    });

    describe('GET /api/v1/auth/profile', () => {
      it('should get user profile with valid token', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.email).toBe('test@example.com');
        expect(response.body.name).toBe('Test User');
      });

      it('should fail without token', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/auth/profile')
          .expect(401);
      });

      it('should fail with invalid token', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/auth/profile')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });
  });

  describe('Zone Management', () => {
    describe('POST /api/v1/zones', () => {
      it('should create a new zone', async () => {
        const createZoneDto = {
          name: 'VIP Zone',
          description: 'Premium seating area',
          capacity: 100,
          price: 1500,
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/zones')
          .set('Authorization', `Bearer ${userToken}`)
          .send(createZoneDto)
          .expect(201);

        expect(response.body.name).toBe(createZoneDto.name);
        expect(response.body.capacity).toBe(createZoneDto.capacity);
        testZone = response.body;
      });

      it('should fail with invalid capacity', async () => {
        const createZoneDto = {
          name: 'Invalid Zone',
          description: 'Invalid zone',
          capacity: -10,
          price: 1000,
        };

        await request(app.getHttpServer())
          .post('/api/v1/zones')
          .set('Authorization', `Bearer ${userToken}`)
          .send(createZoneDto)
          .expect(400);
      });
    });

    describe('GET /api/v1/zones', () => {
      it('should get all zones', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/zones')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/v1/zones/:id', () => {
      it('should get zone by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/zones/${testZone.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.id).toBe(testZone.id);
        expect(response.body.name).toBe(testZone.name);
      });

      it('should fail with non-existent zone id', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/zones/non-existent-id')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(404);
      });
    });
  });

  describe('Seat Management', () => {
    describe('POST /api/v1/seats', () => {
      it('should create a new seat', async () => {
        const createSeatDto = {
          seatNumber: 'A1',
          rowIndex: 1,
          columnIndex: 1,
          zoneId: testZone.id,
          status: SeatStatus.AVAILABLE,
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/seats')
          .set('Authorization', `Bearer ${userToken}`)
          .send(createSeatDto)
          .expect(201);

        expect(response.body.seatNumber).toBe(createSeatDto.seatNumber);
        expect(response.body.status).toBe(createSeatDto.status);
        testSeat = response.body;
      });

      it('should fail with duplicate seat number in same zone', async () => {
        const createSeatDto = {
          seatNumber: 'A1',
          rowIndex: 1,
          columnIndex: 1,
          zoneId: testZone.id,
          status: SeatStatus.AVAILABLE,
        };

        await request(app.getHttpServer())
          .post('/api/v1/seats')
          .set('Authorization', `Bearer ${userToken}`)
          .send(createSeatDto)
          .expect(409);
      });
    });

    describe('GET /api/v1/seats', () => {
      it('should get all seats', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/seats')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter seats by zone', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/seats?zoneId=${testZone.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
        response.body.data.forEach((seat: any) => {
          expect(seat.zoneId).toBe(testZone.id);
        });
      });
    });

    describe('GET /api/v1/seats/by-zone/:zoneId', () => {
      it('should get seats by zone id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/seats/by-zone/${testZone.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('PATCH /api/v1/seats/:id/status', () => {
      it('should update seat status', async () => {
        const updateStatusDto = {
          status: SeatStatus.RESERVED,
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/seats/${testSeat.id}/status`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateStatusDto)
          .expect(200);

        expect(response.body.status).toBe(SeatStatus.RESERVED);
      });

      it('should fail with invalid status', async () => {
        const updateStatusDto = {
          status: 'INVALID_STATUS',
        };

        await request(app.getHttpServer())
          .patch(`/api/v1/seats/${testSeat.id}/status`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateStatusDto)
          .expect(400);
      });
    });
  });

  describe('Order Management', () => {
    describe('POST /api/v1/orders', () => {
      it('should create a new order', async () => {
        const createOrderDto: CreateOrderDto = {
          userId: testUser.id,
          seatIds: [testSeat.id],
          paymentMethod: PaymentMethod.CREDIT_CARD,
          ticketType: TicketType.RINGSIDE,
          customerName: 'Test Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '0123456789',
          showDate: '2024-01-01T19:00:00Z',
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(createOrderDto)
          .expect(201);

        expect(response.body.userId).toBe(createOrderDto.userId);
        expect(response.body.status).toBe(OrderStatus.PENDING);
        testOrder = response.body;
      });

      it('should fail with invalid seat ids', async () => {
        const createOrderDto: CreateOrderDto = {
          userId: testUser.id,
          seatIds: ['non-existent-seat'],
          paymentMethod: PaymentMethod.CREDIT_CARD,
          ticketType: TicketType.RINGSIDE,
          customerName: 'Test Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '0123456789',
          showDate: '2024-01-01T19:00:00Z',
        };

        await request(app.getHttpServer())
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(createOrderDto)
          .expect(400);
      });

      it('should fail with unavailable seats', async () => {
        // Create another seat and mark it as sold
        const soldSeat = await seatService.create({
          seatNumber: 'A2',
          rowIndex: 1,
          columnIndex: 1,
          zoneId: testZone.id,
          status: SeatStatus.BOOKED,
        });

        const createOrderDto: CreateOrderDto = {
          userId: testUser.id,
          seatIds: [soldSeat.id],
          paymentMethod: PaymentMethod.CREDIT_CARD,
          ticketType: TicketType.RINGSIDE,
          customerName: 'Test Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '0123456789',
          showDate: '2024-01-01T19:00:00Z',
        };

        await request(app.getHttpServer())
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(createOrderDto)
          .expect(400);
      });
    });

    describe('GET /api/v1/orders', () => {
      it('should get all orders', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should filter orders by status', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/orders?status=${OrderStatus.PENDING}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
        response.body.data.forEach((order: any) => {
          expect(order.status).toBe(OrderStatus.PENDING);
        });
      });

      it('should filter orders by date range', async () => {
        const today = new Date().toISOString().split('T')[0];
        const response = await request(app.getHttpServer())
          .get(`/api/v1/orders?startDate=${today}&endDate=${today}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/v1/orders/:id', () => {
      it('should get order by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.id).toBe(testOrder.id);
        expect(response.body.userId).toBe(testOrder.userId);
      });

      it('should fail with non-existent order id', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/orders/non-existent-id')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(404);
      });
    });

    describe('PATCH /api/v1/orders/:id', () => {
      it('should update order', async () => {
        const updateOrderDto: UpdateOrderDto = {
          customerName: 'Updated Customer Name',
          customerPhone: '0987654321',
          showDate: '2024-01-01T19:00:00Z',
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/orders/${testOrder.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateOrderDto)
          .expect(200);

        expect(response.body.customerName).toBe(updateOrderDto.customerName);
        expect(response.body.customerPhone).toBe(updateOrderDto.customerPhone);
      });

      it('should fail with invalid order id', async () => {
        const updateOrderDto: UpdateOrderDto = {
          customerName: 'Updated Customer Name',
        };

        await request(app.getHttpServer())
          .patch('/api/v1/orders/non-existent-id')
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateOrderDto)
          .expect(404);
      });
    });

    describe('PATCH /api/v1/orders/:id/cancel', () => {
      it('should cancel order', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/v1/orders/${testOrder.id}/cancel`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.status).toBe(OrderStatus.CANCELLED);
      });

      it('should fail to cancel already cancelled order', async () => {
        await request(app.getHttpServer())
          .patch(`/api/v1/orders/${testOrder.id}/cancel`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(400);
      });
    });

    describe('PATCH /api/v1/orders/:id/confirm-payment', () => {
      it('should confirm payment for order', async () => {
        // Create a new order first
        const createOrderDto: CreateOrderDto = {
          userId: testUser.id,
          seatIds: [testSeat.id],
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          ticketType: TicketType.RINGSIDE,
          customerName: 'Test Customer 2',
          customerEmail: 'customer2@example.com',
          customerPhone: '0123456788',
          showDate: '2024-01-01T19:00:00Z',
        };

        const orderResponse = await request(app.getHttpServer())
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(createOrderDto);

        const newOrder = orderResponse.body;

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/orders/${newOrder.id}/confirm-payment`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.status).toBe(OrderStatus.CONFIRMED);
      });
    });

    describe('GET /api/v1/orders/:id/tickets', () => {
      it('should get tickets for confirmed order', async () => {
        // Create and confirm an order first
        const createOrderDto: CreateOrderDto = {
          userId: testUser.id,
          seatIds: [testSeat.id],
          paymentMethod: PaymentMethod.CASH,
          ticketType: TicketType.RINGSIDE,
          customerName: 'Test Customer 3',
          customerEmail: 'customer3@example.com',
          customerPhone: '0123456787',
          showDate: '2024-01-01T19:00:00Z',
        };

        const orderResponse = await request(app.getHttpServer())
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(createOrderDto);

        const newOrder = orderResponse.body;

        // Confirm the order
        await request(app.getHttpServer())
          .patch(`/api/v1/orders/${newOrder.id}/confirm-payment`)
          .set('Authorization', `Bearer ${userToken}`);

        const response = await request(app.getHttpServer())
          .get(`/api/v1/orders/${newOrder.id}/tickets`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/v1/orders/stats/overview', () => {
      it('should get order statistics', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/orders/stats/overview')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('totalOrders');
        expect(response.body).toHaveProperty('totalRevenue');
        expect(response.body).toHaveProperty('pendingOrders');
        expect(response.body).toHaveProperty('confirmedOrders');
      });
    });
  });

  describe('Payment Processing', () => {
    describe('POST /api/v1/payments', () => {
      it('should process payment successfully', async () => {
        const paymentDto = {
          orderId: testOrder.id,
          amount: 1500,
          method: PaymentMethod.CREDIT_CARD,
          currency: 'THB',
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/payments')
          .set('Authorization', `Bearer ${userToken}`)
          .send(paymentDto)
          .expect(201);

        expect(response.body.orderId).toBe(paymentDto.orderId);
        expect(response.body.amount).toBe(paymentDto.amount);
        expect(response.body.method).toBe(paymentDto.method);
      });

      it('should fail with invalid payment amount', async () => {
        const paymentDto = {
          orderId: testOrder.id,
          amount: -100,
          method: PaymentMethod.CREDIT_CARD,
          currency: 'THB',
        };

        await request(app.getHttpServer())
          .post('/api/v1/payments')
          .set('Authorization', `Bearer ${userToken}`)
          .send(paymentDto)
          .expect(400);
      });
    });

    describe('POST /api/v1/payments/pay-standing', () => {
      it('should process standing ticket payment', async () => {
        const paymentDto = {
          quantity: 2,
          amount: 1000,
          method: PaymentMethod.CASH,
          customerName: 'Standing Customer',
          customerPhone: '0123456786',
          showDate: '2024-01-01T19:00:00Z',
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/payments/pay-standing')
          .set('Authorization', `Bearer ${userToken}`)
          .send(paymentDto)
          .expect(201);

        expect(response.body.quantity).toBe(paymentDto.quantity);
        expect(response.body.amount).toBe(paymentDto.amount);
      });
    });
  });

  describe('User Management', () => {
    describe('GET /api/v1/users', () => {
      it('should get all users', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/v1/users/:id', () => {
      it('should get user by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/users/${testUser.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.id).toBe(testUser.id);
        expect(response.body.email).toBe(testUser.email);
      });
    });

    describe('PATCH /api/v1/users/:id', () => {
      it('should update user', async () => {
        const updateUserDto = {
          name: 'Updated User Name',
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/users/${testUser.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateUserDto)
          .expect(200);

        expect(response.body.name).toBe(updateUserDto.name);
      });
    });
  });

  describe('Referrer Management', () => {
    describe('POST /api/v1/referrers', () => {
      it('should create a new referrer', async () => {
        const createReferrerDto = {
          name: 'Test Referrer',
          email: 'referrer@example.com',
          commissionRate: 0.1,
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/referrers')
          .set('Authorization', `Bearer ${userToken}`)
          .send(createReferrerDto)
          .expect(201);

        expect(response.body.name).toBe(createReferrerDto.name);
        expect(response.body.commissionRate).toBe(
          createReferrerDto.commissionRate,
        );
        testReferrer = response.body;
      });
    });

    describe('GET /api/v1/referrers', () => {
      it('should get all referrers', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/referrers')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/v1/referrers/:id/orders', () => {
      it('should get referrer orders', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/referrers/${testReferrer.id}/orders`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  describe('Analytics', () => {
    describe('GET /api/v1/analytics/daily-sales', () => {
      it('should get daily sales analytics', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/analytics/daily-sales')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('totalSales');
        expect(response.body).toHaveProperty('orderCount');
      });
    });

    describe('GET /api/v1/analytics/monthly-sales', () => {
      it('should get monthly sales analytics', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/analytics/monthly-sales')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('totalSales');
        expect(response.body).toHaveProperty('orderCount');
      });
    });

    describe('GET /api/v1/analytics/seat-utilization', () => {
      it('should get seat utilization analytics', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/analytics/seat-utilization')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('totalSeats');
        expect(response.body).toHaveProperty('occupiedSeats');
        expect(response.body).toHaveProperty('utilizationRate');
      });
    });

    describe('GET /api/v1/analytics/revenue', () => {
      it('should get revenue analytics', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/analytics/revenue')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('totalRevenue');
        expect(response.body).toHaveProperty('averageOrderValue');
      });
    });
  });

  describe('Audit Logs', () => {
    describe('GET /api/v1/audit', () => {
      it('should get audit logs', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/audit')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/v1/audit/stats', () => {
      it('should get audit statistics', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/audit/stats')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('totalLogs');
        expect(response.body).toHaveProperty('recentActivity');
      });
    });

    describe('GET /api/v1/audit/user-activity', () => {
      it('should get user activity logs', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/audit/user-activity')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  describe('Configuration', () => {
    describe('POST /api/v1/config', () => {
      it('should create a new configuration', async () => {
        const createConfigDto = {
          key: 'test.setting',
          value: 'test value',
          description: 'Test configuration setting',
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/config')
          .set('Authorization', `Bearer ${userToken}`)
          .send(createConfigDto)
          .expect(201);

        expect(response.body.key).toBe(createConfigDto.key);
        expect(response.body.value).toBe(createConfigDto.value);
      });
    });

    describe('GET /api/v1/config', () => {
      it('should get all configurations', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/config')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/v1/config/key/:key', () => {
      it('should get configuration by key', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/config/key/test.setting')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.key).toBe('test.setting');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/non-existent')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should handle concurrent requests', async () => {
      const promises = Array(10)
        .fill(0)
        .map(() =>
          request(app.getHttpServer())
            .get('/api/v1/zones')
            .set('Authorization', `Bearer ${userToken}`),
        );

      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });
    });

    it('should validate input sanitization', async () => {
      const maliciousInput = {
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
      };

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send(maliciousInput)
        .expect(400);
    });
  });
});

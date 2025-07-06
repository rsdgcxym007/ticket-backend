import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  OrderStatus,
  PaymentMethod,
  TicketType,
  SeatStatus,
} from '../src/common/enums';

describe('Ticket Booking API (E2E)', () => {
  let app: INestApplication;
  let authToken: string;
  let testUserId: string;
  let testOrderId: string;
  let testZoneId: string;
  let testSeatId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('🔐 Authentication Flow', () => {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      name: 'Test User',
      phone: '0123456789',
    };

    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.email).toBe(testUser.email);
      authToken = response.body.access_token;
      testUserId = response.body.user.id;
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should fail with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should get user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.email).toBe(testUser.email);
    });

    it('should fail without authentication token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });
  });

  describe('🏟️ Zone Management', () => {
    const testZone = {
      name: 'VIP Test Zone',
      description: 'Test VIP seating area',
      capacity: 50,
      price: 2000,
    };

    it('should create a new zone', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/zones')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testZone)
        .expect(201);

      expect(response.body.name).toBe(testZone.name);
      expect(response.body.price).toBe(testZone.price);
      testZoneId = response.body.id;
    });

    it('should get all zones', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/zones')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get zone by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/zones/${testZoneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testZoneId);
      expect(response.body.name).toBe(testZone.name);
    });

    it('should update zone', async () => {
      const updateData = { name: 'Updated VIP Zone' };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/zones/${testZoneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
    });
  });

  describe('💺 Seat Management', () => {
    const testSeat = {
      seatNumber: 'VIP-A1',
      row: 'A',
      section: '1',
      zoneId: '', // Will be set in test
      status: SeatStatus.AVAILABLE,
    };

    it('should create a new seat', async () => {
      testSeat.zoneId = testZoneId;

      const response = await request(app.getHttpServer())
        .post('/api/v1/seats')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testSeat)
        .expect(201);

      expect(response.body.seatNumber).toBe(testSeat.seatNumber);
      expect(response.body.zoneId).toBe(testZoneId);
      testSeatId = response.body.id;
    });

    it('should get all seats', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/seats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get seats by zone', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/seats/by-zone/${testZoneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((seat: any) => {
        expect(seat.zoneId).toBe(testZoneId);
      });
    });

    it('should update seat status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/seats/${testSeatId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: SeatStatus.RESERVED })
        .expect(200);

      expect(response.body.status).toBe(SeatStatus.RESERVED);
    });

    it('should update seat details', async () => {
      const updateData = { seatNumber: 'VIP-A1-Updated' };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/seats/${testSeatId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.seatNumber).toBe(updateData.seatNumber);
    });
  });

  describe('🎫 Order Management', () => {
    const testOrder = {
      userId: '',
      customerName: 'Test Customer',
      customerEmail: 'customer@example.com',
      customerPhone: '0987654321',
      ticketType: TicketType.RINGSIDE,
      paymentMethod: PaymentMethod.QR_CODE,
      seatIds: [],
      quantity: 1,
    };

    it('should create a new order', async () => {
      // Reset seat to available first
      await request(app.getHttpServer())
        .patch(`/api/v1/seats/${testSeatId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: SeatStatus.AVAILABLE });

      testOrder.userId = testUserId;
      testOrder.seatIds = [testSeatId];

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrder)
        .expect(201);

      expect(response.body.userId).toBe(testUserId);
      expect(response.body.customerName).toBe(testOrder.customerName);
      expect(response.body.status).toBe(OrderStatus.PENDING);
      testOrderId = response.body.id;
    });

    it('should get all orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get order by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testOrderId);
      expect(response.body.customerName).toBe(testOrder.customerName);
    });

    it('should update order details', async () => {
      const updateData = {
        customerName: 'Updated Customer Name',
        customerPhone: '0111111111',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.customerName).toBe(updateData.customerName);
      expect(response.body.customerPhone).toBe(updateData.customerPhone);
    });

    it('should confirm payment for order', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${testOrderId}/confirm-payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should get tickets for confirmed order', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/orders/${testOrderId}/tickets`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('ticketNumber');
    });

    it('should get order statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/stats/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('pendingOrders');
      expect(response.body).toHaveProperty('confirmedOrders');
    });
  });

  describe('💳 Payment Processing', () => {
    it('should process a payment', async () => {
      // Create another order for payment testing
      const orderResponse = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: testUserId,
          customerName: 'Payment Test Customer',
          customerEmail: 'payment@example.com',
          customerPhone: '0999999999',
          ticketType: TicketType.RINGSIDE,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          seatIds: [],
          quantity: 1,
        });

      const paymentDto = {
        orderId: orderResponse.body.id,
        amount: 2000,
        method: PaymentMethod.BANK_TRANSFER,
        currency: 'THB',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentDto)
        .expect(201);

      expect(response.body.orderId).toBe(paymentDto.orderId);
      expect(response.body.amount).toBe(paymentDto.amount);
    });

    it('should process standing ticket payment', async () => {
      const paymentDto = {
        quantity: 3,
        amount: 1500,
        method: PaymentMethod.CASH,
        customerName: 'Standing Customer',
        customerPhone: '0888888888',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/pay-standing')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentDto)
        .expect(201);

      expect(response.body.quantity).toBe(paymentDto.quantity);
      expect(response.body.amount).toBe(paymentDto.amount);
    });
  });

  describe('👥 User Management', () => {
    it('should get all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get user by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testUserId);
    });

    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Test User',
        phone: '0777777777',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.phone).toBe(updateData.phone);
    });
  });

  describe('🔍 Analytics', () => {
    it('should get daily sales analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/daily-sales')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalSales');
      expect(response.body).toHaveProperty('orderCount');
    });

    it('should get monthly sales analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/monthly-sales')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalSales');
    });

    it('should get seat utilization analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/seat-utilization')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalSeats');
      expect(response.body).toHaveProperty('utilizationRate');
    });

    it('should get revenue analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/revenue')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
    });
  });

  describe('📋 Audit Logs', () => {
    it('should get audit logs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/audit')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get audit statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/audit/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalLogs');
    });

    it('should get user activity logs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/audit/user-activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('⚙️ Configuration', () => {
    let configId: string;

    it('should create a configuration', async () => {
      const configDto = {
        key: 'test.automated.setting',
        value: 'automated test value',
        description: 'Automated test configuration',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send(configDto)
        .expect(201);

      expect(response.body.key).toBe(configDto.key);
      expect(response.body.value).toBe(configDto.value);
      configId = response.body.id;
    });

    it('should get all configurations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get configuration by key', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/config/key/test.automated.setting')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.key).toBe('test.automated.setting');
    });

    it('should update configuration', async () => {
      const updateData = {
        value: 'updated automated test value',
        description: 'Updated automated test configuration',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/config/${configId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.value).toBe(updateData.value);
    });
  });

  describe('🛡️ Security & Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/non-existent-endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should handle unauthorized access', async () => {
      await request(app.getHttpServer()).get('/api/v1/orders').expect(401);
    });

    it('should handle invalid tokens', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should validate enum values', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: testUserId,
          customerName: 'Test',
          ticketType: 'INVALID_TYPE',
          paymentMethod: PaymentMethod.QR_CODE,
          seatIds: [],
          quantity: 1,
        })
        .expect(400);
    });
  });

  describe('🚀 Performance & Load Tests', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array(5)
        .fill(0)
        .map(() =>
          request(app.getHttpServer())
            .get('/api/v1/zones')
            .set('Authorization', `Bearer ${authToken}`),
        );

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should respond within reasonable time', async () => {
      const start = Date.now();

      await request(app.getHttpServer()).get('/api/v1').expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('🧹 Cleanup Tests', () => {
    it('should delete the test order', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should delete the test seat', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/seats/${testSeatId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should delete the test zone', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/zones/${testZoneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should delete the test user', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});

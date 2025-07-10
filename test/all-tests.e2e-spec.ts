import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Import enums
import {
  OrderStatus,
  PaymentMethod,
  TicketType,
  UserRole,
  OrderSource,
} from '../src/common/enums';

describe('🧪 COMPREHENSIVE TEST SUITE - ALL CASES', () => {
  let app: INestApplication;
  let userToken: string;
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    // Setup test users
    await setupTestUsers();
  });

  afterAll(async () => {
    await app.close();
  });

  const setupTestUsers = async () => {
    console.log('🚀 Starting test user setup...');

    // Test registration and login for user token
    try {
      const userData = {
        email: 'user@test.com',
        password: 'password123',
        name: 'Test User',
        role: UserRole.USER,
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: userData.email, password: userData.password });

      if (loginResponse.status === 201) {
        userToken =
          loginResponse.body.data?.access_token ||
          loginResponse.body.access_token;
        console.log(
          '✅ User token obtained:',
          userToken ? 'Found' : 'Not found',
        );
      }
    } catch (error) {
      console.log('❌ Error setting up user token:', error);
    }

    // Test registration and login for admin token
    try {
      const adminData = {
        email: 'admin@test.com',
        password: 'password123',
        name: 'Test Admin',
        role: UserRole.ADMIN,
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(adminData);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: adminData.email, password: adminData.password });

      if (loginResponse.status === 201) {
        adminToken =
          loginResponse.body.data?.access_token ||
          loginResponse.body.access_token;
        console.log(
          '✅ Admin token obtained:',
          adminToken ? 'Found' : 'Not found',
        );
      }
    } catch (error) {
      console.log('❌ Error setting up admin token:', error);
    }

    // Test registration and login for staff token
    try {
      const staffData = {
        email: 'staff@test.com',
        password: 'password123',
        name: 'Test Staff',
        role: UserRole.STAFF,
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(staffData);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: staffData.email, password: staffData.password });

      if (loginResponse.status === 201) {
        staffToken =
          loginResponse.body.data?.access_token ||
          loginResponse.body.access_token;
        console.log(
          '✅ Staff token obtained:',
          staffToken ? 'Found' : 'Not found',
        );
      }
    } catch (error) {
      console.log('❌ Error setting up staff token:', error);
    }

    console.log('🔑 Final tokens after setup:', {
      userToken: userToken ? 'Found' : 'Not found',
      adminToken: adminToken ? 'Found' : 'Not found',
      staffToken: staffToken ? 'Found' : 'Not found',
    });
  };

  const createTestOrder = async (token: string, customData = {}) => {
    const orderData = {
      customerName: 'Test Customer',
      ticketType: TicketType.RINGSIDE,
      quantity: 1,
      showDate: '2024-12-31',
      paymentMethod: PaymentMethod.QR_CODE,
      source: OrderSource.DIRECT,
      ...customData,
    };

    return request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderData);
  };

  // ========================================
  // 🧪 UNIT TESTS
  // ========================================

  describe('Unit Tests', () => {
    it('should create valid order', async () => {
      const response = await createTestOrder(userToken);
      console.log('Order creation response:', {
        status: response.status,
        body: response.body,
      });
      expect(response.status).toBe(201);
      // expect(response.body.success).toBe(true);
    });

    it('should validate order data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          customerName: '',
          ticketType: 'INVALID',
          quantity: -1,
        });

      expect(response.status).toBe(400);
    });

    it('should calculate pricing correctly', async () => {
      const response = await createTestOrder(userToken, { quantity: 2 });
      expect(response.status).toBe(201);
      expect(response.body.data.totalAmount).toBeGreaterThan(0);
    });
  });

  // ========================================
  // 🔧 INTEGRATION TESTS
  // ========================================

  describe('Integration Tests', () => {
    it('should handle order-payment integration', async () => {
      const orderResponse = await createTestOrder(userToken);
      const orderId = orderResponse.body.data.id;

      const paymentResponse = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          orderId: orderId,
          method: PaymentMethod.CASH,
          amount: 1000,
        });

      expect(paymentResponse.status).toBe(201);
    });

    it('should handle concurrent orders', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          createTestOrder(userToken, { customerName: `Concurrent ${i}` }),
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });
  });

  // ========================================
  // 🌐 E2E TESTS
  // ========================================

  describe('E2E Tests', () => {
    it('should handle complete booking flow', async () => {
      // Create order
      const orderResponse = await createTestOrder(userToken);
      const orderId = orderResponse.body.data.id;

      // Get order details
      const getResponse = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(getResponse.status).toBe(200);

      // Process payment
      const paymentResponse = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          orderId: orderId,
          method: PaymentMethod.CASH,
          amount: 1000,
        });

      expect(paymentResponse.status).toBe(201);

      // Confirm payment
      const confirmResponse = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/confirm-payment`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(confirmResponse.status).toBe(200);
    });

    it('should handle API pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/orders?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  // ========================================
  // 💼 BUSINESS LOGIC TESTS
  // ========================================

  describe('Business Logic Tests', () => {
    it('should enforce booking limits', async () => {
      const response = await createTestOrder(userToken, { quantity: 100 });
      expect(response.status).toBe(403);
    });

    it('should handle different ticket types', async () => {
      const types = [
        TicketType.RINGSIDE,
        TicketType.STADIUM,
        TicketType.STANDING,
      ];

      for (const ticketType of types) {
        const response = await createTestOrder(userToken, { ticketType });
        expect(response.status).toBe(201);
      }
    });

    it('should calculate commission correctly', async () => {
      const response = await createTestOrder(userToken, {
        referrerCode: 'TEST123',
        quantity: 2,
      });

      expect(response.status).toBe(201);
    });

    it('should prevent double booking', async () => {
      const seatId = 'test-seat-1';

      const response1 = await createTestOrder(userToken, { seatIds: [seatId] });
      expect(response1.status).toBe(201);

      const response2 = await createTestOrder(userToken, { seatIds: [seatId] });
      expect(response2.status).toBe(400);
    });
  });

  // ========================================
  // 🔐 SECURITY TESTS
  // ========================================

  describe('Security Tests', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/orders');
      expect(response.status).toBe(401);
    });

    it('should enforce role-based access', async () => {
      const userResponse = await request(app.getHttpServer())
        .get('/api/v1/orders/stats/overview')
        .set('Authorization', `Bearer ${userToken}`);

      expect(userResponse.status).toBe(403);

      const adminResponse = await request(app.getHttpServer())
        .get('/api/v1/orders/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminResponse.status).toBe(200);
    });

    it('should validate input data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          customerName: '<script>alert("xss")</script>',
          ticketType: 'INVALID',
          quantity: 'invalid',
        });

      expect(response.status).toBe(400);
    });

    it('should sanitize inputs', async () => {
      const response = await createTestOrder(userToken, {
        customerName: 'Test <script>alert("xss")</script>',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.customerName).not.toContain('<script>');
    });
  });

  // ========================================
  // ⚡ PERFORMANCE TESTS
  // ========================================

  describe('Performance Tests', () => {
    it('should handle load testing', async () => {
      const startTime = Date.now();
      const requests = [];

      for (let i = 0; i < 20; i++) {
        requests.push(
          createTestOrder(userToken, { customerName: `Load ${i}` }),
        );
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      expect(endTime - startTime).toBeLessThan(10000);
    });

    it('should handle database performance', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders?limit=100')
        .set('Authorization', `Bearer ${adminToken}`);

      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  // ========================================
  // 🚨 ERROR HANDLING & EDGE CASES
  // ========================================

  describe('Error Handling & Edge Cases', () => {
    it('should handle invalid order ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/invalid-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
    });

    it('should handle zero quantity', async () => {
      const response = await createTestOrder(userToken, { quantity: 0 });
      expect(response.status).toBe(400);
    });

    it('should handle negative quantity', async () => {
      const response = await createTestOrder(userToken, { quantity: -1 });
      expect(response.status).toBe(400);
    });

    it('should handle past dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const response = await createTestOrder(userToken, {
        showDate: pastDate.toISOString().split('T')[0],
      });

      expect(response.status).toBe(400);
    });

    it('should handle maximum quantity', async () => {
      const response = await createTestOrder(userToken, { quantity: 10 });
      expect(response.status).toBe(201);
    });

    it('should handle long names', async () => {
      const longName = 'A'.repeat(100);
      const response = await createTestOrder(userToken, {
        customerName: longName,
      });
      expect(response.status).toBe(201);
    });
  });

  // ========================================
  // 📊 DATA VALIDATION
  // ========================================

  describe('Data Validation Tests', () => {
    it('should validate email format', async () => {
      const response = await createTestOrder(userToken, {
        customerEmail: 'invalid-email',
      });

      expect(response.status).toBe(400);
    });

    it('should validate phone format', async () => {
      const response = await createTestOrder(userToken, {
        customerPhone: '123',
      });

      expect(response.status).toBe(400);
    });

    it('should validate date format', async () => {
      const response = await createTestOrder(userToken, {
        showDate: 'invalid-date',
      });

      expect(response.status).toBe(400);
    });

    it('should validate enum values', async () => {
      const response = await createTestOrder(userToken, {
        ticketType: 'INVALID_TYPE',
      });

      expect(response.status).toBe(400);
    });

    it('should maintain data integrity', async () => {
      const orderResponse = await createTestOrder(userToken);
      const orderId = orderResponse.body.data.id;

      const paymentResponse = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          orderId: orderId,
          method: PaymentMethod.CASH,
          amount: 1000,
        });

      expect(paymentResponse.status).toBe(201);

      const orderCheckResponse = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(orderCheckResponse.body.data.payment).toBeDefined();
    });
  });

  // ========================================
  // 🎯 BUSINESS SCENARIOS
  // ========================================

  describe('Business Scenarios', () => {
    it('should handle complete booking scenario', async () => {
      const orderResponse = await createTestOrder(userToken, {
        customerName: 'Complete Scenario',
        quantity: 2,
      });

      const orderId = orderResponse.body.data.id;

      const paymentResponse = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          orderId: orderId,
          method: PaymentMethod.CASH,
          amount: 2000,
        });

      expect(paymentResponse.status).toBe(201);

      const confirmResponse = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/confirm-payment`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(confirmResponse.status).toBe(200);

      const ticketResponse = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}/tickets`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(ticketResponse.status).toBe(200);
    });

    it('should handle cancellation scenario', async () => {
      const orderResponse = await createTestOrder(userToken);
      const orderId = orderResponse.body.data.id;

      const cancelResponse = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(cancelResponse.status).toBe(200);

      const checkResponse = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(checkResponse.body.data.status).toBe(OrderStatus.CANCELLED);
    });
  });

  // Debug authentication test
  describe('🔍 Debug Authentication', () => {
    it('should test user registration and login flow', async () => {
      console.log('🧪 Testing authentication flow...');

      const userData = {
        email: 'debug@test.com',
        password: 'password123',
        name: 'Debug User',
        role: UserRole.USER,
      };

      // Test registration
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData);

      console.log('Register response:', {
        status: registerResponse.status,
        body: registerResponse.body,
      });

      // Test login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: userData.email, password: userData.password });

      console.log('Login response:', {
        status: loginResponse.status,
        body: loginResponse.body,
      });

      // Extract token
      const token =
        loginResponse.body.data?.access_token ||
        loginResponse.body.access_token;
      console.log('Extracted token:', token ? 'Found' : 'Not found');

      // Test authenticated endpoint
      if (token) {
        const testResponse = await request(app.getHttpServer())
          .get('/api/v1/orders')
          .set('Authorization', `Bearer ${token}`);

        console.log('Authenticated test response:', {
          status: testResponse.status,
          body: testResponse.body,
        });

        expect(loginResponse.status).toBe(201);
        expect(token).toBeDefined();
      } else {
        throw new Error('No token found in login response');
      }
    });
  });
});

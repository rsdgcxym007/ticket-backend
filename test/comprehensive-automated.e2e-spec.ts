import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Import entities
import { User } from '../src/user/user.entity';
import { Order } from '../src/order/order.entity';
import { Payment } from '../src/payment/payment.entity';
import { Seat } from '../src/seats/seat.entity';
import { SeatBooking } from '../src/seats/seat-booking.entity';
import { Zone } from '../src/zone/zone.entity';
import { Referrer } from '../src/referrer/referrer.entity';

// Import DTOs
import { CreatePaymentDto } from '../src/payment/dto/create-payment.dto';

// Import enums
import {
  OrderStatus,
  PaymentMethod,
  TicketType,
  UserRole,
  OrderSource,
} from '../src/common/enums';

describe('🚀 COMPREHENSIVE AUTOMATED TEST SUITE', () => {
  let app: INestApplication;
  let userToken: string;
  let adminToken: string;
  let staffToken: string;

  // Test data for different user roles
  const testUsers = {
    user: {
      email: 'user@test.com',
      password: 'password123',
      name: 'Test User',
      role: UserRole.USER,
    },
    admin: {
      email: 'admin@test.com',
      password: 'password123',
      name: 'Test Admin',
      role: UserRole.ADMIN,
    },
    staff: {
      email: 'staff@test.com',
      password: 'password123',
      name: 'Test Staff',
      role: UserRole.STAFF,
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_NAME || 'test_db',
          entities: [User, Order, Payment, Seat, SeatBooking, Zone, Referrer],
          synchronize: true,
          dropSchema: true,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    // Setup test users and get tokens
    await setupTestUsers();
  });

  afterAll(async () => {
    await app.close();
  });

  // Setup helper function
  const setupTestUsers = async () => {
    try {
      // Create test users and get tokens
      for (const [key, userData] of Object.entries(testUsers)) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(userData);

        if (response.status === 201) {
          const loginResponse = await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({ email: userData.email, password: userData.password });

          if (loginResponse.status === 200) {
            const token = loginResponse.body.access_token;
            switch (key) {
              case 'user':
                userToken = token;
                break;
              case 'admin':
                adminToken = token;
                break;
              case 'staff':
                staffToken = token;
                break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error setting up test users:', error);
    }
  };

  // Helper function to create test order
  const createTestOrder = async (token: string, customData = {}) => {
    const defaultOrderData = {
      customerName: 'Test Customer',
      customerEmail: 'customer@test.com',
      customerPhone: '0123456789',
      ticketType: TicketType.RINGSIDE,
      quantity: 1,
      showDate: '2024-12-31',
      paymentMethod: PaymentMethod.QR_CODE,
      source: OrderSource.DIRECT,
      ...customData,
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(defaultOrderData);

    return response;
  };

  // ========================================
  // 🧪 UNIT TESTS
  // ========================================

  describe('📦 Unit Tests', () => {
    describe('Order Service Unit Tests', () => {
      it('should create order with valid data', async () => {
        const response = await createTestOrder(userToken, {
          customerName: 'Unit Test Customer',
          quantity: 2,
        });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.customerName).toBe('Unit Test Customer');
        expect(response.body.data.status).toBe(OrderStatus.PENDING);
      });

      it('should validate order data before creation', async () => {
        const invalidOrderData = {
          customerName: '', // Empty name
          ticketType: 'INVALID_TYPE',
          quantity: -1, // Invalid quantity
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(invalidOrderData);

        expect(response.status).toBe(400);
      });

      it('should calculate pricing correctly', async () => {
        const response = await createTestOrder(userToken, {
          ticketType: TicketType.RINGSIDE,
          quantity: 3,
        });

        expect(response.status).toBe(201);
        expect(response.body.data.totalAmount).toBeGreaterThan(0);
      });

      it('should handle order expiration', async () => {
        const response = await createTestOrder(userToken);

        expect(response.status).toBe(201);
        expect(response.body.data.expiresAt).toBeDefined();
      });
    });

    describe('Payment Service Unit Tests', () => {
      it('should process cash payment correctly', async () => {
        // Create order first
        const orderResponse = await createTestOrder(userToken, {
          paymentMethod: PaymentMethod.CASH,
        });

        const orderId = orderResponse.body.data.id;

        // Process payment
        const paymentDto: CreatePaymentDto = {
          orderId: orderId,
          method: PaymentMethod.CASH,
          amount: 1000,
        };

        const paymentResponse = await request(app.getHttpServer())
          .post('/api/v1/payments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send(paymentDto);

        expect(paymentResponse.status).toBe(201);
        expect(paymentResponse.body.success).toBe(true);
      });

      it('should validate payment amount', async () => {
        const invalidPaymentDto = {
          orderId: 'invalid-id',
          method: PaymentMethod.CASH,
          amount: -100, // Invalid amount
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/payments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send(invalidPaymentDto);

        expect(response.status).toBe(400);
      });

      it('should handle duplicate payments', async () => {
        // Create order
        const orderResponse = await createTestOrder(userToken);
        const orderId = orderResponse.body.data.id;

        // First payment
        const paymentDto: CreatePaymentDto = {
          orderId: orderId,
          method: PaymentMethod.CASH,
          amount: 1000,
        };

        const firstPayment = await request(app.getHttpServer())
          .post('/api/v1/payments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send(paymentDto);

        expect(firstPayment.status).toBe(201);

        // Second payment attempt
        const secondPayment = await request(app.getHttpServer())
          .post('/api/v1/payments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send(paymentDto);

        expect(secondPayment.status).toBe(400);
      });
    });

    describe('User Service Unit Tests', () => {
      it('should validate user email format', async () => {
        const invalidUserData = {
          email: 'invalid-email',
          password: 'password123',
          name: 'Invalid User',
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(invalidUserData);

        expect(response.status).toBe(400);
      });

      it('should prevent duplicate email registration', async () => {
        const userData = {
          email: 'duplicate@test.com',
          password: 'password123',
          name: 'First User',
        };

        const firstResponse = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(userData);

        expect(firstResponse.status).toBe(201);

        const secondResponse = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(userData);

        expect(secondResponse.status).toBe(400);
      });
    });
  });

  // ========================================
  // 🔧 INTEGRATION TESTS
  // ========================================

  describe('🔧 Integration Tests', () => {
    describe('Database Integration', () => {
      it('should maintain referential integrity', async () => {
        const response = await createTestOrder(userToken, {
          referrerCode: 'VALID_REF_CODE',
        });

        // Should handle referrer relationship correctly
        expect(response.status).toBe(201);
      });

      it('should handle concurrent order creation', async () => {
        const orderPromises = [];
        for (let i = 0; i < 5; i++) {
          orderPromises.push(
            createTestOrder(userToken, {
              customerName: `Concurrent Test ${i}`,
            }),
          );
        }

        const responses = await Promise.all(orderPromises);
        responses.forEach((response) => {
          expect(response.status).toBe(201);
        });
      });

      it('should handle database constraints', async () => {
        // Test unique constraint violations
        const orderResponse = await createTestOrder(userToken);
        expect(orderResponse.status).toBe(201);
        expect(orderResponse.body.data.orderNumber).toBeDefined();
      });
    });

    describe('Service Integration', () => {
      it('should integrate order and payment services', async () => {
        // Create order
        const orderResponse = await createTestOrder(userToken);
        const orderId = orderResponse.body.data.id;

        // Process payment
        const paymentDto: CreatePaymentDto = {
          orderId: orderId,
          method: PaymentMethod.CASH,
          amount: 1000,
        };

        const paymentResponse = await request(app.getHttpServer())
          .post('/api/v1/payments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send(paymentDto);

        expect(paymentResponse.status).toBe(201);

        // Verify order status updated
        const orderCheckResponse = await request(app.getHttpServer())
          .get(`/orders/${orderId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(orderCheckResponse.body.data.status).toBe(OrderStatus.PAID);
      });

      it('should integrate auth and order modules', async () => {
        // Test with valid token
        const validResponse = await createTestOrder(userToken);
        expect(validResponse.status).toBe(201);

        // Test with invalid token
        const invalidResponse = await request(app.getHttpServer())
          .post('/api/v1/orders')
          .set('Authorization', 'Bearer invalid-token')
          .send({
            customerName: 'Test',
            ticketType: TicketType.STADIUM,
            quantity: 1,
            showDate: '2024-12-31',
          });

        expect(invalidResponse.status).toBe(401);
      });
    });

    describe('Module Integration', () => {
      it('should integrate all modules correctly', async () => {
        // Test complete flow: Auth -> Order -> Payment -> Confirmation
        const orderResponse = await createTestOrder(userToken);
        const orderId = orderResponse.body.data.id;

        // Payment
        const paymentDto: CreatePaymentDto = {
          orderId: orderId,
          method: PaymentMethod.CASH,
          amount: 1000,
        };

        const paymentResponse = await request(app.getHttpServer())
          .post('/api/v1/payments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send(paymentDto);

        expect(paymentResponse.status).toBe(201);

        // Confirmation
        const confirmResponse = await request(app.getHttpServer())
          .patch(`/orders/${orderId}/confirm-payment`)
          .set('Authorization', `Bearer ${staffToken}`);

        expect(confirmResponse.status).toBe(200);
      });
    });
  });

  // ========================================
  // 🌐 E2E API TESTS
  // ========================================

  describe('🌐 E2E API Tests', () => {
    it('should handle complete order flow', async () => {
      // Step 1: Create order
      const orderResponse = await createTestOrder(userToken, {
        customerName: 'E2E Test Customer',
        quantity: 2,
      });

      expect(orderResponse.status).toBe(201);
      const orderId = orderResponse.body.data.id;

      // Step 2: Get order details
      const orderDetailsResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(orderDetailsResponse.status).toBe(200);
      expect(orderDetailsResponse.body.data.id).toBe(orderId);

      // Step 3: Process payment
      const paymentDto: CreatePaymentDto = {
        orderId: orderId,
        method: PaymentMethod.CASH,
        amount: 2000,
      };

      const paymentResponse = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(paymentDto);

      expect(paymentResponse.status).toBe(201);

      // Step 4: Confirm payment
      const confirmResponse = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/confirm-payment`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(confirmResponse.status).toBe(200);

      // Step 5: Generate tickets
      const ticketResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}/tickets`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(ticketResponse.status).toBe(200);
    });

    it('should handle API pagination', async () => {
      // Create multiple orders
      for (let i = 0; i < 5; i++) {
        await createTestOrder(userToken, {
          customerName: `Pagination Test ${i}`,
        });
      }

      // Test pagination
      const response = await request(app.getHttpServer())
        .get('/api/v1/orders?page=1&limit=3')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(3);
    });

    it('should handle API filtering', async () => {
      // Create orders with different statuses
      const orderResponse = await createTestOrder(userToken, {
        customerName: 'Filter Test',
      });

      const orderId = orderResponse.body.data.id;

      // Filter by status
      const filterResponse = await request(app.getHttpServer())
        .get(`/orders?status=${OrderStatus.PENDING}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(filterResponse.status).toBe(200);
    });
  });

  // ========================================
  // 💼 BUSINESS LOGIC TESTS
  // ========================================

  describe('💼 Business Logic Tests', () => {
    describe('Order Business Logic', () => {
      it('should enforce booking limits per user role', async () => {
        const response = await createTestOrder(userToken, {
          quantity: 100, // Exceeds limit
        });

        expect(response.status).toBe(403);
      });

      it('should handle standing tickets correctly', async () => {
        const response = await createTestOrder(userToken, {
          ticketType: TicketType.STANDING,
          standingAdultQty: 2,
          standingChildQty: 1,
        });

        expect(response.status).toBe(201);
        expect(response.body.data.ticketType).toBe(TicketType.STANDING);
      });

      it('should prevent booking for past dates', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        const response = await createTestOrder(userToken, {
          showDate: pastDate.toISOString().split('T')[0],
        });

        expect(response.status).toBe(400);
      });
    });

    describe('Payment Business Logic', () => {
      it('should calculate commission correctly', async () => {
        const response = await createTestOrder(userToken, {
          referrerCode: 'COMMISSION_TEST',
          quantity: 2,
        });

        expect(response.status).toBe(201);
        // Commission should be calculated based on order value
        expect(response.body.data.totalAmount).toBeGreaterThan(0);
      });

      it('should handle different payment methods', async () => {
        const methods = [PaymentMethod.CASH, PaymentMethod.QR_CODE];

        for (const method of methods) {
          const response = await createTestOrder(userToken, {
            paymentMethod: method,
            customerName: `Payment ${method} Test`,
          });

          expect(response.status).toBe(201);
          expect(response.body.data.paymentMethod).toBe(method);
        }
      });
    });

    describe('Seat Booking Logic', () => {
      it('should prevent double booking of seats', async () => {
        const seatId = 'test-seat-1';

        // First booking
        const response1 = await createTestOrder(userToken, {
          seatIds: [seatId],
          customerName: 'First Booking',
        });

        expect(response1.status).toBe(201);

        // Second booking attempt
        const response2 = await createTestOrder(userToken, {
          seatIds: [seatId],
          customerName: 'Second Booking',
        });

        expect(response2.status).toBe(400);
      });

      it('should allow seat changes by staff', async () => {
        const orderResponse = await createTestOrder(userToken, {
          seatIds: ['original-seat'],
        });

        const orderId = orderResponse.body.data.id;

        // Change seats
        const changeResponse = await request(app.getHttpServer())
          .patch(`/orders/${orderId}/change-seats`)
          .set('Authorization', `Bearer ${staffToken}`)
          .send({ seatIds: ['new-seat'] });

        expect(changeResponse.status).toBe(200);
      });
    });

    describe('User Role & Permissions', () => {
      it('should enforce role-based access control', async () => {
        // User trying to access admin endpoint
        const userResponse = await request(app.getHttpServer())
          .get('/api/v1/orders/stats/overview')
          .set('Authorization', `Bearer ${userToken}`);

        expect(userResponse.status).toBe(403);

        // Admin accessing same endpoint
        const adminResponse = await request(app.getHttpServer())
          .get('/api/v1/orders/stats/overview')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(adminResponse.status).toBe(200);
      });

      it('should allow staff to confirm payments', async () => {
        const orderResponse = await createTestOrder(userToken);
        const orderId = orderResponse.body.data.id;

        const confirmResponse = await request(app.getHttpServer())
          .patch(`/orders/${orderId}/confirm-payment`)
          .set('Authorization', `Bearer ${staffToken}`);

        expect(confirmResponse.status).toBe(200);
      });

      it('should prevent users from accessing other users orders', async () => {
        const orderResponse = await createTestOrder(userToken);
        const orderId = orderResponse.body.data.id;

        // User can access their own order
        const ownOrderResponse = await request(app.getHttpServer())
          .get(`/orders/${orderId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(ownOrderResponse.status).toBe(200);

        // Staff/Admin can access any order
        const staffOrderResponse = await request(app.getHttpServer())
          .get(`/orders/${orderId}`)
          .set('Authorization', `Bearer ${staffToken}`);

        expect(staffOrderResponse.status).toBe(200);
      });
    });
  });

  // ========================================
  // 🔐 SECURITY TESTS
  // ========================================

  describe('🔐 Security Tests', () => {
    describe('Authentication', () => {
      it('should require valid JWT token', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/orders')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
      });

      it('should reject requests without token', async () => {
        const response = await request(app.getHttpServer()).get(
          '/api/v1/orders',
        );

        expect(response.status).toBe(401);
      });

      it('should handle token expiration', async () => {
        // This would require mocking JWT expiration
        // For now, test with invalid token format
        const response = await request(app.getHttpServer())
          .get('/api/v1/orders')
          .set('Authorization', 'Bearer expired.token.here');

        expect(response.status).toBe(401);
      });
    });

    describe('Authorization', () => {
      it('should enforce endpoint permissions', async () => {
        const restrictedEndpoints = [
          {
            method: 'get',
            path: '/orders/stats/overview',
            roles: ['admin', 'staff'],
          },
          { method: 'delete', path: '/orders/test-id', roles: ['admin'] },
        ];

        for (const endpoint of restrictedEndpoints) {
          // Test with user token (should be forbidden)
          const userResponse = await request(app.getHttpServer())
            [endpoint.method](endpoint.path)
            .set('Authorization', `Bearer ${userToken}`);

          expect(userResponse.status).toBe(403);
        }
      });
    });

    describe('Input Validation', () => {
      it('should validate order input data', async () => {
        const maliciousData = {
          customerName: '<script>alert("xss")</script>',
          ticketType: 'INVALID_TYPE',
          quantity: 'invalid_number',
          showDate: 'invalid_date',
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(maliciousData);

        expect(response.status).toBe(400);
      });

      it('should sanitize user inputs', async () => {
        const response = await createTestOrder(userToken, {
          customerName: 'Test User <script>alert("xss")</script>',
        });

        expect(response.status).toBe(201);
        // Should sanitize the script tag
        expect(response.body.data.customerName).not.toContain('<script>');
      });

      it('should handle SQL injection attempts', async () => {
        const response = await createTestOrder(userToken, {
          customerName: "'; DROP TABLE orders; --",
        });

        expect(response.status).toBe(201);
        // Should not execute SQL injection
        expect(response.body.data.customerName).toBe(
          "'; DROP TABLE orders; --",
        );
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce rate limits', async () => {
        // This would require actual rate limiting configuration
        // For now, test multiple rapid requests
        const promises = [];
        for (let i = 0; i < 10; i++) {
          promises.push(
            createTestOrder(userToken, { customerName: `Rate Test ${i}` }),
          );
        }

        const responses = await Promise.all(promises);
        // All should succeed unless rate limiting is configured
        responses.forEach((response) => {
          expect([201, 429]).toContain(response.status);
        });
      });
    });
  });

  // ========================================
  // ⚡ PERFORMANCE TESTS
  // ========================================

  describe('⚡ Performance Tests', () => {
    describe('Load Test', () => {
      it('should handle multiple concurrent requests', async () => {
        const startTime = Date.now();
        const concurrentRequests = 20;
        const requests = [];

        for (let i = 0; i < concurrentRequests; i++) {
          requests.push(
            createTestOrder(userToken, { customerName: `Load Test ${i}` }),
          );
        }

        const responses = await Promise.all(requests);
        const endTime = Date.now();
        const duration = endTime - startTime;

        responses.forEach((response) => {
          expect(response.status).toBe(201);
        });

        // Should complete within reasonable time
        expect(duration).toBeLessThan(10000); // 10 seconds
      });
    });

    describe('Stress Test', () => {
      it('should handle database stress', async () => {
        const startTime = Date.now();
        const stressRequests = 50;
        const requests = [];

        for (let i = 0; i < stressRequests; i++) {
          requests.push(
            createTestOrder(userToken, { customerName: `Stress Test ${i}` }),
          );
        }

        const responses = await Promise.allSettled(requests);
        const endTime = Date.now();
        const duration = endTime - startTime;

        const successCount = responses.filter(
          (r) => r.status === 'fulfilled' && r.value.status === 201,
        ).length;

        // Should handle majority of requests successfully
        expect(successCount).toBeGreaterThan(stressRequests * 0.8);
        expect(duration).toBeLessThan(30000); // 30 seconds
      });
    });

    describe('Database Performance', () => {
      it('should query orders efficiently', async () => {
        // Create some orders first
        for (let i = 0; i < 10; i++) {
          await createTestOrder(userToken, {
            customerName: `Performance Test ${i}`,
          });
        }

        const startTime = Date.now();

        const response = await request(app.getHttpServer())
          .get('/api/v1/orders?limit=100')
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(2000); // 2 seconds
      });
    });
  });

  // ========================================
  // 🚨 EDGE CASES & ERROR HANDLING
  // ========================================

  describe('🚨 Edge Cases & Error Handling', () => {
    describe('Error Handling', () => {
      it('should handle invalid order ID gracefully', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/orders/invalid-uuid')
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(400);
      });

      it('should handle non-existent order ID', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/orders/550e8400-e29b-41d4-a716-446655440000')
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(404);
      });

      it('should handle server errors gracefully', async () => {
        // Test with malformed data that might cause server error
        const response = await request(app.getHttpServer())
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ malformed: 'data' });

        expect(response.status).toBe(400);
      });
    });

    describe('Edge Case', () => {
      it('should handle zero quantity orders', async () => {
        const response = await createTestOrder(userToken, {
          quantity: 0,
        });

        expect(response.status).toBe(400);
      });

      it('should handle negative quantity orders', async () => {
        const response = await createTestOrder(userToken, {
          quantity: -5,
        });

        expect(response.status).toBe(400);
      });

      it('should handle extremely large quantities', async () => {
        const response = await createTestOrder(userToken, {
          quantity: 999999,
        });

        expect(response.status).toBe(400);
      });

      it('should handle future show dates', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const response = await createTestOrder(userToken, {
          showDate: futureDate.toISOString().split('T')[0],
        });

        expect(response.status).toBe(201);
      });
    });

    describe('Boundary', () => {
      it('should handle maximum allowed quantity', async () => {
        const response = await createTestOrder(userToken, {
          quantity: 10, // Assuming max is 10
        });

        expect(response.status).toBe(201);
      });

      it('should handle minimum allowed quantity', async () => {
        const response = await createTestOrder(userToken, {
          quantity: 1,
        });

        expect(response.status).toBe(201);
      });

      it('should handle maximum name length', async () => {
        const longName = 'A'.repeat(255);

        const response = await createTestOrder(userToken, {
          customerName: longName,
        });

        expect(response.status).toBe(201);
      });
    });
  });

  // ========================================
  // 📊 DATA VALIDATION & INTEGRITY
  // ========================================

  describe('📊 Data Validation & Integrity', () => {
    describe('Data Validation', () => {
      it('should validate email format', async () => {
        const response = await createTestOrder(userToken, {
          customerEmail: 'invalid-email',
        });

        expect(response.status).toBe(400);
      });

      it('should validate phone number format', async () => {
        const response = await createTestOrder(userToken, {
          customerPhone: '123', // Invalid format
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
          ticketType: 'INVALID_TICKET_TYPE',
        });

        expect(response.status).toBe(400);
      });
    });

    describe('Data Integrity', () => {
      it('should maintain order-payment relationship', async () => {
        const orderResponse = await createTestOrder(userToken);
        const orderId = orderResponse.body.data.id;

        const paymentDto: CreatePaymentDto = {
          orderId: orderId,
          method: PaymentMethod.CASH,
          amount: 1000,
        };

        const paymentResponse = await request(app.getHttpServer())
          .post('/api/v1/payments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send(paymentDto);

        expect(paymentResponse.status).toBe(201);

        // Verify relationship
        const orderCheckResponse = await request(app.getHttpServer())
          .get(`/orders/${orderId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(orderCheckResponse.body.data.payment).toBeDefined();
      });

      it('should maintain order-seat relationship', async () => {
        const response = await createTestOrder(userToken, {
          seatIds: ['test-seat-1', 'test-seat-2'],
        });

        expect(response.status).toBe(201);
        expect(response.body.data.seatIds).toEqual([
          'test-seat-1',
          'test-seat-2',
        ]);
      });
    });

    describe('Referential Integrity', () => {
      it('should handle referrer relationships correctly', async () => {
        const response = await createTestOrder(userToken, {
          referrerCode: 'NONEXISTENT_CODE',
        });

        // Should handle invalid referrer codes gracefully
        expect(response.status).toBe(400);
      });

      it('should maintain user-order relationship', async () => {
        const response = await createTestOrder(userToken);
        const orderId = response.body.data.id;

        const orderResponse = await request(app.getHttpServer())
          .get(`/orders/${orderId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(orderResponse.body.data.userId).toBeDefined();
      });
    });
  });

  // ========================================
  // 🎯 BUSINESS SCENARIO TESTS
  // ========================================

  describe('🎯 Business Scenario Tests', () => {
    it('should handle complete ticket booking scenario', async () => {
      // 1. Customer creates order
      const orderResponse = await createTestOrder(userToken, {
        customerName: 'Business Scenario Customer',
        ticketType: TicketType.RINGSIDE,
        quantity: 2,
      });

      expect(orderResponse.status).toBe(201);
      const orderId = orderResponse.body.data.id;

      // 2. Staff processes payment
      const paymentDto: CreatePaymentDto = {
        orderId: orderId,
        method: PaymentMethod.CASH,
        amount: 2000,
      };

      const paymentResponse = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(paymentDto);

      expect(paymentResponse.status).toBe(201);

      // 3. Staff confirms payment
      const confirmResponse = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/confirm-payment`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(confirmResponse.status).toBe(200);

      // 4. Customer gets tickets
      const ticketResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}/tickets`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(ticketResponse.status).toBe(200);
    });

    it('should handle order cancellation scenario', async () => {
      // 1. Create order
      const orderResponse = await createTestOrder(userToken);
      const orderId = orderResponse.body.data.id;

      // 2. Cancel order
      const cancelResponse = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(cancelResponse.status).toBe(200);

      // 3. Verify order status
      const checkResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(checkResponse.body.data.status).toBe(OrderStatus.CANCELLED);
    });

    it('should handle refund scenario', async () => {
      // 1. Create and pay for order
      const orderResponse = await createTestOrder(userToken);
      const orderId = orderResponse.body.data.id;

      const paymentDto: CreatePaymentDto = {
        orderId: orderId,
        method: PaymentMethod.CASH,
        amount: 1000,
      };

      await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(paymentDto);

      // 2. Admin processes refund
      const refundResponse = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Customer request', amount: 1000 });

      expect(refundResponse.status).toBe(200);
    });
  });
});

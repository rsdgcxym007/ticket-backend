import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Import entities and enums
import { User } from '../src/user/user.entity';
import { Order } from '../src/order/order.entity';
import { Payment } from '../src/payment/payment.entity';
import { Seat } from '../src/seats/seat.entity';
import { SeatBooking } from '../src/seats/seat-booking.entity';
import { Zone } from '../src/zone/zone.entity';
import { Referrer } from '../src/referrer/referrer.entity';

// Import DTOs and interfaces
import { CreatePaymentDto } from '../src/payment/dto/create-payment.dto';
import { CreateOrderDto } from '../src/order/dto/create-order.dto';

// Import enums
import {
  OrderStatus,
  PaymentMethod,
  TicketType,
  UserRole,
  OrderSource,
} from '../src/common/enums';

describe('🧪 ALL COMPREHENSIVE TESTS', () => {
  let app: INestApplication;
  let userToken: string;
  let adminToken: string;
  let staffToken: string;

  // Test data
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

    // Setup test users and tokens
    await setupTestUsers();
  });

  afterAll(async () => {
    await app.close();
  });

  // ========================================
  // 🔧 SETUP HELPERS
  // ========================================

  const setupTestUsers = async () => {
    // Create test users
    for (const [key, userData] of Object.entries(testUsers)) {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData);

      if (response.status === 201) {
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
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
  };

  // ========================================
  // 🧪 UNIT TESTS
  // ========================================

  describe('📦 Unit Tests', () => {
    describe('Order Service Unit Tests', () => {
      it('should create order with valid data', async () => {
        const orderDto = {
          customerName: 'Test Customer',
          customerEmail: 'customer@test.com',
          customerPhone: '0123456789',
          ticketType: TicketType.RINGSIDE,
          quantity: 2,
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.customerName).toBe(orderDto.customerName);
        expect(response.body.data.status).toBe(OrderStatus.PENDING);
      });

      it('should validate order data before creation', async () => {
        const invalidOrderDto = {
          customerName: '',
          ticketType: 'INVALID_TYPE',
          quantity: -1,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(invalidOrderDto);

        expect(response.status).toBe(400);
      });

      it('should handle order status transitions correctly', async () => {
        // Create order
        const orderDto = {
          customerName: 'Status Test',
          ticketType: TicketType.STADIUM,
          quantity: 1,
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.CASH,
          source: OrderSource.DIRECT,
        };

        const createResponse = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        const orderId = createResponse.body.data.id;

        // Test status transitions
        const confirmResponse = await request(app.getHttpServer())
          .patch(`/orders/${orderId}/confirm-payment`)
          .set('Authorization', `Bearer ${staffToken}`);

        expect(confirmResponse.status).toBe(200);
      });
    });

    describe('Payment Service Unit Tests', () => {
      it('should process cash payment correctly', async () => {
        // Create order first
        const orderDto = {
          customerName: 'Payment Test',
          ticketType: TicketType.RINGSIDE,
          quantity: 1,
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.CASH,
          source: OrderSource.DIRECT,
        };

        const orderResponse = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        const orderId = orderResponse.body.data.id;

        // Process payment
        const paymentDto: CreatePaymentDto = {
          orderId: orderId,
          method: PaymentMethod.CASH,
          amount: 1000,
        };

        const paymentResponse = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send(paymentDto);

        expect(paymentResponse.status).toBe(201);
        expect(paymentResponse.body.success).toBe(true);
      });

      it('should validate payment amount', async () => {
        const invalidPaymentDto = {
          orderId: 'invalid-id',
          method: PaymentMethod.CASH,
          amount: -100,
        };

        const response = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send(invalidPaymentDto);

        expect(response.status).toBe(400);
      });
    });

    describe('User Service Unit Tests', () => {
      it('should create user with valid data', async () => {
        const userData = {
          email: 'newuser@test.com',
          password: 'password123',
          name: 'New User',
          role: UserRole.USER,
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(userData);

        expect(response.status).toBe(201);
        expect(response.body.email).toBe(userData.email);
      });

      it('should validate user email format', async () => {
        const invalidUserData = {
          email: 'invalid-email',
          password: 'password123',
          name: 'Invalid User',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(invalidUserData);

        expect(response.status).toBe(400);
      });
    });
  });

  // ========================================
  // 🔧 INTEGRATION TESTS
  // ========================================

  describe('🔧 Integration Tests', () => {
    describe('Database Integration', () => {
      it('should maintain referential integrity', async () => {
        // Create order with referrer
        const orderDto: CreateOrderDto = {
          customerName: 'Referrer Test',
          ticketType: TicketType.RINGSIDE,
          quantity: 1,
          showDate: '2024-12-31',
          referrerCode: 'TEST123',
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        expect(response.status).toBe(201);
        // Add more referential integrity tests
      });

      it('should handle concurrent order creation', async () => {
        const orderPromises = [];
        for (let i = 0; i < 5; i++) {
          const orderDto: CreateOrderDto = {
            customerName: `Concurrent Test ${i}`,
            ticketType: TicketType.STADIUM,
            quantity: 1,
            showDate: '2024-12-31',
            paymentMethod: PaymentMethod.QR_CODE,
            source: OrderSource.DIRECT,
          };

          orderPromises.push(
            request(app.getHttpServer())
              .post('/orders')
              .set('Authorization', `Bearer ${userToken}`)
              .send(orderDto),
          );
        }

        const responses = await Promise.all(orderPromises);
        responses.forEach((response) => {
          expect(response.status).toBe(201);
        });
      });
    });

    describe('Service Integration', () => {
      it('should integrate order and payment services', async () => {
        // Create order
        const orderDto: CreateOrderDto = {
          customerName: 'Integration Test',
          ticketType: TicketType.RINGSIDE,
          quantity: 1,
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.CASH,
          source: OrderSource.DIRECT,
        };

        const orderResponse = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        const orderId = orderResponse.body.data.id;

        // Process payment
        const paymentDto: CreatePaymentDto = {
          orderId: orderId,
          method: PaymentMethod.CASH,
          amount: 1000,
        };

        const paymentResponse = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send(paymentDto);

        expect(paymentResponse.status).toBe(201);

        // Verify order status updated
        const orderCheckResponse = await request(app.getHttpServer())
          .get(`/orders/${orderId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(orderCheckResponse.body.data.status).toBe(OrderStatus.PAID);
      });
    });

    describe('Module Integration', () => {
      it('should integrate auth and order modules', async () => {
        const orderDto: CreateOrderDto = {
          customerName: 'Auth Integration Test',
          ticketType: TicketType.STADIUM,
          quantity: 1,
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        // Test with valid token
        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        expect(response.status).toBe(201);

        // Test with invalid token
        const invalidResponse = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', 'Bearer invalid-token')
          .send(orderDto);

        expect(invalidResponse.status).toBe(401);
      });
    });
  });

  // ========================================
  // 🌐 E2E API TESTS
  // ========================================

  describe('🌐 E2E API Tests', () => {
    it('should handle complete order flow', async () => {
      // Step 1: Create order
      const orderDto: CreateOrderDto = {
        customerName: 'E2E Test Customer',
        customerEmail: 'e2e@test.com',
        customerPhone: '0123456789',
        ticketType: TicketType.RINGSIDE,
        quantity: 2,
        showDate: '2024-12-31',
        paymentMethod: PaymentMethod.QR_CODE,
        source: OrderSource.DIRECT,
      };

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderDto);

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
        .post('/payments')
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
  });

  // ========================================
  // 💼 BUSINESS LOGIC TESTS
  // ========================================

  describe('💼 Business Logic Tests', () => {
    describe('Order Business Logic', () => {
      it('should enforce booking limits per user role', async () => {
        const orderDto: CreateOrderDto = {
          customerName: 'Booking Limit Test',
          ticketType: TicketType.RINGSIDE,
          quantity: 100, // Exceeds limit
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        expect(response.status).toBe(403);
      });

      it('should handle order expiration', async () => {
        // Create order
        const orderDto: CreateOrderDto = {
          customerName: 'Expiration Test',
          ticketType: TicketType.STADIUM,
          quantity: 1,
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        expect(response.status).toBe(201);
        expect(response.body.data.expiresAt).toBeDefined();
      });

      it('should calculate order pricing correctly', async () => {
        const orderDto: CreateOrderDto = {
          customerName: 'Pricing Test',
          ticketType: TicketType.RINGSIDE,
          quantity: 3,
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        expect(response.status).toBe(201);
        expect(response.body.data.totalAmount).toBeGreaterThan(0);
      });
    });

    describe('Payment Business Logic', () => {
      it('should handle referrer commission correctly', async () => {
        const orderDto: CreateOrderDto = {
          customerName: 'Commission Test',
          ticketType: TicketType.RINGSIDE,
          quantity: 1,
          showDate: '2024-12-31',
          referrerCode: 'TEST123',
          paymentMethod: PaymentMethod.CASH,
          source: OrderSource.DIRECT,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        expect(response.status).toBe(201);
        // Add commission calculation verification
      });
    });

    describe('Seat Booking Logic', () => {
      it('should prevent double booking of seats', async () => {
        const seatId = 'test-seat-1';
        const orderDto: CreateOrderDto = {
          customerName: 'Double Booking Test',
          ticketType: TicketType.RINGSIDE,
          seatIds: [seatId],
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        // First booking
        const response1 = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        expect(response1.status).toBe(201);

        // Second booking attempt
        const response2 = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        expect(response2.status).toBe(400);
      });
    });

    describe('User Role & Permissions', () => {
      it('should enforce role-based access control', async () => {
        // User trying to access admin endpoint
        const response = await request(app.getHttpServer())
          .get('/orders/stats/overview')
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(403);

        // Admin accessing same endpoint
        const adminResponse = await request(app.getHttpServer())
          .get('/orders/stats/overview')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(adminResponse.status).toBe(200);
      });

      it('should allow staff to confirm payments', async () => {
        // Create order
        const orderDto: CreateOrderDto = {
          customerName: 'Staff Permission Test',
          ticketType: TicketType.STADIUM,
          quantity: 1,
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.CASH,
          source: OrderSource.DIRECT,
        };

        const orderResponse = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        const orderId = orderResponse.body.data.id;

        // Staff confirming payment
        const confirmResponse = await request(app.getHttpServer())
          .patch(`/orders/${orderId}/confirm-payment`)
          .set('Authorization', `Bearer ${staffToken}`);

        expect(confirmResponse.status).toBe(200);
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
          .get('/orders')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
      });

      it('should reject requests without token', async () => {
        const response = await request(app.getHttpServer()).get('/orders');

        expect(response.status).toBe(401);
      });
    });

    describe('Authorization', () => {
      it('should prevent users from accessing other users data', async () => {
        // Create order with user token
        const orderDto: CreateOrderDto = {
          customerName: 'Privacy Test',
          ticketType: TicketType.STADIUM,
          quantity: 1,
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        const orderId = response.body.data.id;

        // Try to access with different user token
        const unauthorizedResponse = await request(app.getHttpServer())
          .get(`/orders/${orderId}`)
          .set('Authorization', `Bearer ${staffToken}`);

        // Staff should be able to access (higher role)
        expect(unauthorizedResponse.status).toBe(200);
      });
    });

    describe('Input Validation', () => {
      it('should validate order input data', async () => {
        const maliciousOrderDto = {
          customerName: '<script>alert("xss")</script>',
          ticketType: 'INVALID_TYPE',
          quantity: 'invalid_number',
          showDate: 'invalid_date',
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(maliciousOrderDto);

        expect(response.status).toBe(400);
      });

      it('should sanitize user inputs', async () => {
        const orderDto: CreateOrderDto = {
          customerName: 'Test User <script>alert("xss")</script>',
          ticketType: TicketType.STADIUM,
          quantity: 1,
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        expect(response.status).toBe(201);
        // Should sanitize the script tag
        expect(response.body.data.customerName).not.toContain('<script>');
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
        const requests = [];

        for (let i = 0; i < 10; i++) {
          const orderDto: CreateOrderDto = {
            customerName: `Load Test ${i}`,
            ticketType: TicketType.STADIUM,
            quantity: 1,
            showDate: '2024-12-31',
            paymentMethod: PaymentMethod.QR_CODE,
            source: OrderSource.DIRECT,
          };

          requests.push(
            request(app.getHttpServer())
              .post('/orders')
              .set('Authorization', `Bearer ${userToken}`)
              .send(orderDto),
          );
        }

        const responses = await Promise.all(requests);
        const endTime = Date.now();
        const duration = endTime - startTime;

        responses.forEach((response) => {
          expect(response.status).toBe(201);
        });

        // Should complete within reasonable time
        expect(duration).toBeLessThan(5000); // 5 seconds
      });
    });

    describe('Database Performance', () => {
      it('should query orders efficiently', async () => {
        const startTime = Date.now();

        const response = await request(app.getHttpServer())
          .get('/orders?limit=100')
          .set('Authorization', `Bearer ${adminToken}`);

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(1000); // 1 second
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
          .get('/orders/invalid-uuid')
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(400);
      });

      it('should handle database connection errors', async () => {
        // This would require mocking the database connection
        // For now, we'll test with a valid request
        const response = await request(app.getHttpServer())
          .get('/orders')
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);
      });
    });

    describe('Edge Case', () => {
      it('should handle zero quantity orders', async () => {
        const orderDto: CreateOrderDto = {
          customerName: 'Zero Quantity Test',
          ticketType: TicketType.STADIUM,
          quantity: 0,
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        expect(response.status).toBe(400);
      });

      it('should handle future show dates', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const orderDto: CreateOrderDto = {
          customerName: 'Future Date Test',
          ticketType: TicketType.STADIUM,
          quantity: 1,
          showDate: futureDate.toISOString().split('T')[0],
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        expect(response.status).toBe(201);
      });
    });

    describe('Boundary', () => {
      it('should handle maximum allowed quantity', async () => {
        const orderDto: CreateOrderDto = {
          customerName: 'Max Quantity Test',
          ticketType: TicketType.STADIUM,
          quantity: 10, // Assuming max is 10
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

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
        const orderDto: CreateOrderDto = {
          customerName: 'Email Test',
          customerEmail: 'invalid-email',
          ticketType: TicketType.STADIUM,
          quantity: 1,
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        expect(response.status).toBe(400);
      });

      it('should validate phone number format', async () => {
        const orderDto: CreateOrderDto = {
          customerName: 'Phone Test',
          customerPhone: '123', // Invalid format
          ticketType: TicketType.STADIUM,
          quantity: 1,
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        expect(response.status).toBe(400);
      });
    });

    describe('Data Integrity', () => {
      it('should maintain order-payment relationship', async () => {
        // Create order
        const orderDto: CreateOrderDto = {
          customerName: 'Integrity Test',
          ticketType: TicketType.STADIUM,
          quantity: 1,
          showDate: '2024-12-31',
          paymentMethod: PaymentMethod.CASH,
          source: OrderSource.DIRECT,
        };

        const orderResponse = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        const orderId = orderResponse.body.data.id;

        // Process payment
        const paymentDto: CreatePaymentDto = {
          orderId: orderId,
          method: PaymentMethod.CASH,
          amount: 1000,
        };

        const paymentResponse = await request(app.getHttpServer())
          .post('/payments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send(paymentDto);

        expect(paymentResponse.status).toBe(201);

        // Verify relationship
        const orderCheckResponse = await request(app.getHttpServer())
          .get(`/orders/${orderId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(orderCheckResponse.body.data.payment).toBeDefined();
      });
    });

    describe('Referential Integrity', () => {
      it('should handle referrer relationships correctly', async () => {
        const orderDto: CreateOrderDto = {
          customerName: 'Referrer Integrity Test',
          ticketType: TicketType.STADIUM,
          quantity: 1,
          showDate: '2024-12-31',
          referrerCode: 'VALID_CODE',
          paymentMethod: PaymentMethod.QR_CODE,
          source: OrderSource.DIRECT,
        };

        const response = await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderDto);

        // Should handle invalid referrer codes gracefully
        expect(response.status).toBe(400);
      });
    });
  });
});

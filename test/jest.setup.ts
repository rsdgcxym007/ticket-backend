// Jest setup file for test environment
import { config } from 'dotenv';
import * as path from 'path';

// Load test environment variables
const envPath = path.resolve(process.cwd(), '.env.test');
config({ path: envPath });

// Debug: Log database connection details for CI troubleshooting only when needed
if (process.env.CI || process.env.DEBUG_TEST_ENV) {
  console.log('Jest Setup - Environment Variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DATABASE_HOST:', process.env.DATABASE_HOST);
  console.log('DATABASE_PORT:', process.env.DATABASE_PORT);
  console.log('DATABASE_USERNAME:', process.env.DATABASE_USERNAME);
  console.log(
    'DATABASE_PASSWORD:',
    process.env.DATABASE_PASSWORD ? '***' : 'undefined',
  );
  console.log('DATABASE_NAME:', process.env.DATABASE_NAME);
  console.log('DATABASE_SSL:', process.env.DATABASE_SSL);
}

// Global test timeout
jest.setTimeout(30000);

// Mock external services for testing (only if modules exist)
try {
  jest.mock('axios');
} catch {
  // axios not available
}

// Console log suppression for cleaner test output (but keep for debugging)
if (!process.env.DEBUG_TEST_ENV && !process.env.CI) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Global test utilities
global.testUtils = {
  createTestUser: () => ({
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test User',
    phone: '0123456789',
  }),

  createTestOrder: (userId: string, seatIds: string[] = []) => ({
    userId,
    customerName: 'Test Customer',
    customerEmail: 'customer@example.com',
    customerPhone: '0987654321',
    ticketType: 'ADULT',
    paymentMethod: 'QR_CODE',
    seatIds,
    quantity: 1,
  }),

  createTestZone: () => ({
    name: `Test Zone ${Date.now()}`,
    description: 'Test zone for automated testing',
    capacity: 100,
    price: 1500,
  }),

  createTestSeat: (zoneId: string) => ({
    seatNumber: `TEST-${Date.now()}`,
    row: 'T',
    section: '1',
    zoneId,
    status: 'AVAILABLE',
  }),

  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
};

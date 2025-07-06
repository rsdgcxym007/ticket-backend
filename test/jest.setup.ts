// Jest setup file for test environment
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(30000);

// Mock external services for testing
jest.mock('axios');
jest.mock('nodemailer');

// Console log suppression for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

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

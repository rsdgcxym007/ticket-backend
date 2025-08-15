import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { EmailAutomationService } from '../email/email-automation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { Order } from '../order/order.entity';
import { SeatBooking } from '../seats/seat-booking.entity';
import { Seat } from '../seats/seat.entity';
import { Referrer } from '../referrer/referrer.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { Repository } from 'typeorm';
import { OrderStatus, PaymentMethod } from '../common/enums';

describe('PaymentService - Email Integration Tests', () => {
  let paymentService: PaymentService;
  let emailAutomationService: EmailAutomationService;
  let orderRepository: Repository<Order>;
  let paymentRepository: Repository<Payment>;

  // Mock repositories
  const mockOrderRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockPaymentRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  };

  const mockSeatBookingRepository = {
    find: jest.fn(),
  };

  const mockSeatRepository = {
    findOne: jest.fn(),
  };

  const mockReferrerRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockAuditLogRepository = {
    save: jest.fn(),
  };

  // Mock EmailAutomationService
  const mockEmailAutomationService = {
    sendTicketEmail: jest.fn(),
    sendOrderConfirmation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: EmailAutomationService,
          useValue: mockEmailAutomationService,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
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
          provide: getRepositoryToken(Referrer),
          useValue: mockReferrerRepository,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    paymentService = module.get<PaymentService>(PaymentService);
    emailAutomationService = module.get<EmailAutomationService>(
      EmailAutomationService,
    );
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    paymentRepository = module.get<Repository<Payment>>(
      getRepositoryToken(Payment),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('🎫 Seated Ticket Email Integration', () => {
    it('should send email when seated ticket payment is completed', async () => {
      // Arrange
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20250815-001',
        customerEmail: 'test@example.com',
        customerName: 'John Doe',
        totalAmount: 3000,
        quantity: 2,
        showDate: new Date('2025-08-20'),
        seatBookings: [
          {
            seat: {
              seatNumber: 'A1',
              rowIndex: 1,
              columnIndex: 1,
            },
          },
          {
            seat: {
              seatNumber: 'A2',
              rowIndex: 1,
              columnIndex: 2,
            },
          },
        ],
        status: OrderStatus.PENDING,
      };

      const mockUser = { id: 'user-123', email: 'staff@example.com' };

      const mockPayment = {
        id: 'payment-123',
        orderId: 'order-123',
        amount: 3000,
        method: PaymentMethod.CASH,
      };

      // Mock repository responses
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.find.mockResolvedValue([]);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);
      mockAuditLogRepository.save.mockResolvedValue({});

      // Mock email service
      mockEmailAutomationService.sendTicketEmail.mockResolvedValue(true);

      // Act
      await paymentService.handlePayment(
        {
          orderId: 'order-123',
          amount: 3000,
          method: PaymentMethod.CASH,
          notes: 'Test payment',
        },
        mockUser,
        'SEATED',
      );

      // Assert
      expect(mockEmailAutomationService.sendTicketEmail).toHaveBeenCalledWith({
        orderId: 'ORD-20250815-001',
        recipientEmail: 'test@example.com',
        recipientName: 'John Doe',
        ticketType: 'ตั๋วที่นั่ง',
        quantity: 2,
        showDate: expect.any(String),
        totalAmount: 3000,
        seatNumbers: ['A1', 'A2'],
        includeQRCode: true,
        notes: expect.stringContaining('ขอบคุณที่ใช้บริการของเรา'),
      });
    });

    it('should not send email when payment is partial', async () => {
      // Arrange
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20250815-001',
        customerEmail: 'test@example.com',
        totalAmount: 3000,
        status: OrderStatus.PENDING,
      };

      const mockUser = { id: 'user-123', email: 'staff@example.com' };

      const mockExistingPayments = [
        { amount: 1000 }, // Previous payment
      ];

      const mockPayment = {
        id: 'payment-123',
        orderId: 'order-123',
        amount: 1000, // Partial payment (total 2000, still 1000 remaining)
        method: PaymentMethod.CASH,
      };

      // Mock repository responses
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.find.mockResolvedValue(mockExistingPayments);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);
      mockAuditLogRepository.save.mockResolvedValue({});

      // Act
      await paymentService.handlePayment(
        {
          orderId: 'order-123',
          amount: 1000,
          method: PaymentMethod.CASH,
          notes: 'Partial payment',
        },
        mockUser,
        'SEATED',
      );

      // Assert
      expect(mockEmailAutomationService.sendTicketEmail).not.toHaveBeenCalled();
    });
  });

  describe('🎪 Standing Ticket Email Integration', () => {
    it('should send email when standing ticket payment is completed', async () => {
      // Arrange
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20250815-002',
        customerEmail: 'standing@example.com',
        customerName: 'Jane Smith',
        totalAmount: 2000,
        standingAdultQty: 2,
        standingChildQty: 1,
        showDate: new Date('2025-08-22'),
        status: OrderStatus.PENDING,
      };

      const mockUser = { id: 'user-123', email: 'staff@example.com' };

      const mockPayment = {
        id: 'payment-123',
        orderId: 'order-123',
        amount: 2000,
        method: PaymentMethod.TRANSFER,
      };

      // Mock repository responses
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.find.mockResolvedValue([]);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);
      mockAuditLogRepository.save.mockResolvedValue({});

      // Mock email service
      mockEmailAutomationService.sendTicketEmail.mockResolvedValue(true);

      // Act
      await paymentService.handlePayment(
        {
          orderId: 'order-123',
          amount: 2000,
          method: PaymentMethod.TRANSFER,
          notes: 'Standing ticket payment',
        },
        mockUser,
        'STANDING',
      );

      // Assert
      expect(mockEmailAutomationService.sendTicketEmail).toHaveBeenCalledWith({
        orderId: 'ORD-20250815-002',
        recipientEmail: 'standing@example.com',
        recipientName: 'Jane Smith',
        ticketType: 'ตั๋วยืน',
        quantity: 3, // 2 adults + 1 child
        showDate: expect.any(String),
        totalAmount: 2000,
        seatNumbers: [],
        includeQRCode: true,
        notes: expect.stringContaining('ผู้ใหญ่ 2 คน, เด็ก 1 คน'),
      });
    });

    it('should handle email sending failure gracefully', async () => {
      // Arrange
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20250815-003',
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        totalAmount: 1500,
        quantity: 1,
        showDate: new Date('2025-08-25'),
        status: OrderStatus.PENDING,
      };

      const mockUser = { id: 'user-123', email: 'staff@example.com' };

      const mockPayment = {
        id: 'payment-123',
        orderId: 'order-123',
        amount: 1500,
        method: PaymentMethod.QR_CODE,
      };

      // Mock repository responses
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.find.mockResolvedValue([]);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);
      mockAuditLogRepository.save.mockResolvedValue({});

      // Mock email service to fail
      mockEmailAutomationService.sendTicketEmail.mockRejectedValue(
        new Error('Email sending failed'),
      );

      // Act & Assert - Should not throw error even if email fails
      await expect(
        paymentService.handlePayment(
          {
            orderId: 'order-123',
            amount: 1500,
            method: PaymentMethod.QR_CODE,
            notes: 'Payment with email failure',
          },
          mockUser,
          'SEATED',
        ),
      ).resolves.not.toThrow();

      // Payment should still be successful
      expect(mockPaymentRepository.save).toHaveBeenCalled();
      expect(mockEmailAutomationService.sendTicketEmail).toHaveBeenCalled();
    });
  });

  describe('📧 Email Data Validation', () => {
    it('should format seat numbers correctly for email', async () => {
      // Arrange
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20250815-004',
        customerEmail: 'seat@example.com',
        customerName: 'Seat Test',
        totalAmount: 1500,
        quantity: 1,
        showDate: new Date('2025-08-26'),
        seatBookings: [
          {
            seat: {
              seatNumber: null, // No seat number, should use rowIndex/columnIndex
              rowIndex: 5,
              columnIndex: 10,
            },
          },
        ],
        status: OrderStatus.PENDING,
      };

      const mockUser = { id: 'user-123', email: 'staff@example.com' };

      const mockPayment = {
        id: 'payment-123',
        orderId: 'order-123',
        amount: 1500,
        method: PaymentMethod.CASH,
      };

      // Mock repository responses
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.find.mockResolvedValue([]);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);
      mockAuditLogRepository.save.mockResolvedValue({});

      // Mock email service
      mockEmailAutomationService.sendTicketEmail.mockResolvedValue(true);

      // Act
      await paymentService.handlePayment(
        {
          orderId: 'order-123',
          amount: 1500,
          method: PaymentMethod.CASH,
          notes: 'Seat formatting test',
        },
        mockUser,
        'SEATED',
      );

      // Assert
      expect(mockEmailAutomationService.sendTicketEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          seatNumbers: ['R5C10'], // Should format as R{row}C{column}
        }),
      );
    });

    it('should handle missing customer email gracefully', async () => {
      // Arrange
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-20250815-005',
        customerEmail: null, // No email
        customerName: 'No Email User',
        totalAmount: 1000,
        quantity: 1,
        showDate: new Date('2025-08-27'),
        status: OrderStatus.PENDING,
      };

      const mockUser = { id: 'user-123', email: 'staff@example.com' };

      const mockPayment = {
        id: 'payment-123',
        orderId: 'order-123',
        amount: 1000,
        method: PaymentMethod.CASH,
      };

      // Mock repository responses
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.find.mockResolvedValue([]);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);
      mockAuditLogRepository.save.mockResolvedValue({});

      // Act
      await paymentService.handlePayment(
        {
          orderId: 'order-123',
          amount: 1000,
          method: PaymentMethod.CASH,
          notes: 'No email test',
        },
        mockUser,
        'SEATED',
      );

      // Assert - Email should not be sent when no customer email
      expect(mockEmailAutomationService.sendTicketEmail).not.toHaveBeenCalled();
    });
  });

  describe('💰 Payment Validation', () => {
    it('should calculate payment validation correctly', async () => {
      // Arrange
      const mockOrder = {
        id: 'order-123',
        totalAmount: 3000,
        status: OrderStatus.PENDING,
      };

      const mockExistingPayments = [{ amount: 1000 }, { amount: 1500 }]; // Total: 2500

      // Mock repository responses
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.find.mockResolvedValue(mockExistingPayments);

      // Act - Add payment of 500 (total will be 3000, fully paid)
      const result = await paymentService.handlePayment(
        {
          orderId: 'order-123',
          amount: 500,
          method: PaymentMethod.CASH,
          notes: 'Final payment',
        },
        { id: 'user-123' },
        'SEATED',
      );

      // Assert - Should trigger email sending
      expect(mockEmailAutomationService.sendTicketEmail).toHaveBeenCalled();
    });
  });
});

describe('EmailAutomationService - Template Tests', () => {
  let emailService: EmailAutomationService;

  const mockTransporter = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailAutomationService,
        {
          provide: 'MAIL_TRANSPORTER',
          useValue: mockTransporter,
        },
      ],
    }).compile();

    emailService = module.get<EmailAutomationService>(EmailAutomationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('🎨 Email Template Generation', () => {
    it('should generate correct email template for seated tickets', async () => {
      // Arrange
      const ticketData = {
        orderId: 'ORD-20250815-001',
        recipientEmail: 'test@example.com',
        recipientName: 'John Doe',
        ticketType: 'ตั๋วที่นั่ง',
        quantity: 2,
        showDate: '20/8/2568',
        totalAmount: 3000,
        seatNumbers: ['A1', 'A2'],
        includeQRCode: true,
        notes: 'VIP tickets',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      // Act
      await emailService.sendTicketEmail(ticketData);

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: expect.stringContaining('Digital Ticket'),
          html: expect.stringContaining('John Doe'),
          html: expect.stringContaining('ตั๋วที่นั่ง'),
          html: expect.stringContaining('A1, A2'),
          html: expect.stringContaining('฿3,000'),
          attachments: expect.arrayContaining([
            expect.objectContaining({
              cid: 'qrcode',
            }),
          ]),
        }),
      );
    });

    it('should generate correct email template for standing tickets', async () => {
      // Arrange
      const ticketData = {
        orderId: 'ORD-20250815-002',
        recipientEmail: 'standing@example.com',
        recipientName: 'Jane Smith',
        ticketType: 'ตั๋วยืน',
        quantity: 3,
        showDate: '22/8/2568',
        totalAmount: 2000,
        seatNumbers: [],
        includeQRCode: true,
        notes: 'ขอบคุณที่ใช้บริการของเรา | ผู้ใหญ่ 2 คน, เด็ก 1 คน',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id-2',
      });

      // Act
      await emailService.sendTicketEmail(ticketData);

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'standing@example.com',
          subject: expect.stringContaining('Digital Ticket'),
          html: expect.stringContaining('Jane Smith'),
          html: expect.stringContaining('ตั๋วยืน'),
          html: expect.stringContaining('3 ticket'),
          html: expect.stringContaining('ผู้ใหญ่ 2 คน'),
          html: expect.stringContaining('฿2,000'),
        }),
      );
    });

    it('should handle QR code generation correctly', async () => {
      // Arrange
      const ticketData = {
        orderId: 'ORD-20250815-003',
        recipientEmail: 'qr@example.com',
        recipientName: 'QR Test',
        ticketType: 'ตั๋วทดสอบ',
        quantity: 1,
        showDate: '25/8/2568',
        totalAmount: 1500,
        seatNumbers: ['B5'],
        includeQRCode: true,
        notes: 'QR Code test',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-qr-message-id',
      });

      // Act
      await emailService.sendTicketEmail(ticketData);

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: 'qr-code.png',
              content: expect.any(Buffer),
              cid: 'qrcode',
            }),
          ]),
        }),
      );
    });
  });

  describe('🎯 Template Validation', () => {
    it('should include all required sections in email template', async () => {
      // Arrange
      const ticketData = {
        orderId: 'ORD-20250815-004',
        recipientEmail: 'validation@example.com',
        recipientName: 'Validation Test',
        ticketType: 'ตั๋วครบถ้วน',
        quantity: 1,
        showDate: '30/8/2568',
        totalAmount: 2500,
        seatNumbers: ['C10'],
        includeQRCode: true,
        notes: 'Complete template test',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'validation-message-id',
      });

      // Act
      await emailService.sendTicketEmail(ticketData);

      // Assert
      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      // Check for required sections
      expect(htmlContent).toContain('Digital Ticket'); // Header
      expect(htmlContent).toContain('EVENT TICKET'); // Ticket header
      expect(htmlContent).toContain('Ticket Holder'); // Customer info
      expect(htmlContent).toContain('Entry QR Code'); // QR section
      expect(htmlContent).toContain('Important Instructions'); // Instructions
      expect(htmlContent).toContain('Thank you for your purchase'); // Footer
      expect(htmlContent).toContain('rsdgcxym@gmail.com'); // Contact info

      // Check for responsive design elements
      expect(htmlContent).toContain('viewport'); // Mobile viewport
      expect(htmlContent).toContain('@media'); // Media queries
      expect(htmlContent).toContain('prefers-color-scheme'); // Dark mode
    });

    it('should format amount correctly with Thai locale', async () => {
      // Arrange
      const ticketData = {
        orderId: 'ORD-20250815-005',
        recipientEmail: 'format@example.com',
        recipientName: 'Format Test',
        ticketType: 'ตั๋วทดสอบ',
        quantity: 1,
        showDate: '31/8/2568',
        totalAmount: 12345.67,
        seatNumbers: [],
        includeQRCode: false,
        notes: 'Amount formatting test',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'format-message-id',
      });

      // Act
      await emailService.sendTicketEmail(ticketData);

      // Assert
      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      expect(htmlContent).toContain('฿12,345.67'); // Properly formatted amount
    });
  });
});

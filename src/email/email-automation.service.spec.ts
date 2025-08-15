import { Test, TestingModule } from '@nestjs/testing';
import { EmailAutomationService } from './email-automation.service';

describe('Email Integration Tests', () => {
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

  describe('📧 Email Template Tests', () => {
    it('should send ticket email with correct data for seated tickets', async () => {
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
      const result = await emailService.sendTicketEmail(ticketData);

      // Assert
      expect(result).toBeDefined();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: expect.stringContaining('Digital Ticket'),
          attachments: expect.arrayContaining([
            expect.objectContaining({
              cid: 'qrcode',
            }),
          ]),
        }),
      );

      // Check HTML content contains required information
      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      expect(htmlContent).toContain('John Doe');
      expect(htmlContent).toContain('ตั๋วที่นั่ง');
      expect(htmlContent).toContain('A1');
      expect(htmlContent).toContain('A2');
      expect(htmlContent).toContain('3,000');
    });

    it('should send ticket email with correct data for standing tickets', async () => {
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
      const result = await emailService.sendTicketEmail(ticketData);

      // Assert
      expect(result).toBeDefined();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'standing@example.com',
          subject: expect.stringContaining('Digital Ticket'),
        }),
      );

      // Check HTML content
      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      expect(htmlContent).toContain('Jane Smith');
      expect(htmlContent).toContain('ตั๋วยืน');
      expect(htmlContent).toContain('3 ticket');
      expect(htmlContent).toContain('ผู้ใหญ่ 2 คน');
      expect(htmlContent).toContain('2,000');
    });

    it('should include QR code when requested', async () => {
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
      const emailCall = mockTransporter.sendMail.mock.calls[0][0];

      expect(emailCall.attachments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            filename: 'qr-code.png',
            content: expect.any(Buffer),
            cid: 'qrcode',
          }),
        ]),
      );

      // Check HTML contains QR section
      expect(emailCall.html).toContain('Entry QR Code');
      expect(emailCall.html).toContain('cid:qrcode');
    });

    it('should not include QR code when not requested', async () => {
      // Arrange
      const ticketData = {
        orderId: 'ORD-20250815-004',
        recipientEmail: 'no-qr@example.com',
        recipientName: 'No QR Test',
        ticketType: 'ตั๋วธรรมดา',
        quantity: 1,
        showDate: '26/8/2568',
        totalAmount: 1000,
        seatNumbers: [],
        includeQRCode: false,
        notes: 'No QR code needed',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-no-qr-message-id',
      });

      // Act
      await emailService.sendTicketEmail(ticketData);

      // Assert
      const emailCall = mockTransporter.sendMail.mock.calls[0][0];

      expect(emailCall.attachments).toEqual([]);
      expect(emailCall.html).not.toContain('Entry QR Code');
    });

    it('should format amount correctly', async () => {
      // Arrange
      const ticketData = {
        orderId: 'ORD-20250815-005',
        recipientEmail: 'format@example.com',
        recipientName: 'Format Test',
        ticketType: 'ตั๋วทดสอบ',
        quantity: 1,
        showDate: '31/8/2568',
        totalAmount: 12345,
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
      expect(emailCall.html).toContain('12,345');
    });

    it('should handle missing customer name gracefully', async () => {
      // Arrange
      const ticketData = {
        orderId: 'ORD-20250815-006',
        recipientEmail: 'noname@example.com',
        recipientName: undefined,
        ticketType: 'ตั๋วทดสอบ',
        quantity: 1,
        showDate: '28/8/2568',
        totalAmount: 1200,
        seatNumbers: [],
        includeQRCode: false,
        notes: 'No name test',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'no-name-message-id',
      });

      // Act
      await emailService.sendTicketEmail(ticketData);

      // Assert
      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('Guest'); // Default name
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });
  });

  describe('🎨 Template Structure Tests', () => {
    it('should include all required template sections', async () => {
      // Arrange
      const ticketData = {
        orderId: 'ORD-20250815-007',
        recipientEmail: 'structure@example.com',
        recipientName: 'Structure Test',
        ticketType: 'ตั๋วครบถ้วน',
        quantity: 2,
        showDate: '30/8/2568',
        totalAmount: 2500,
        seatNumbers: ['C10', 'C11'],
        includeQRCode: true,
        notes: 'Complete structure test',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'structure-message-id',
      });

      // Act
      await emailService.sendTicketEmail(ticketData);

      // Assert
      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      // Header section
      expect(htmlContent).toContain('Digital Ticket');
      expect(htmlContent).toContain('Your event pass is ready');

      // Ticket card section
      expect(htmlContent).toContain('EVENT TICKET');
      expect(htmlContent).toContain('Ticket Holder');
      expect(htmlContent).toContain('Ticket Type');
      expect(htmlContent).toContain('Quantity');
      expect(htmlContent).toContain('Event Date');
      expect(htmlContent).toContain('Seat Numbers');
      expect(htmlContent).toContain('Total Amount');

      // QR section (when enabled)
      expect(htmlContent).toContain('Entry QR Code');
      expect(htmlContent).toContain('Present this QR code at the entrance');

      // Instructions section
      expect(htmlContent).toContain('Important Instructions');
      expect(htmlContent).toContain('arrive 30 minutes before');

      // Footer section
      expect(htmlContent).toContain('Thank you for your purchase');
      expect(htmlContent).toContain('rsdgcxym@gmail.com');

      // Responsive design elements
      expect(htmlContent).toContain('viewport');
      expect(htmlContent).toContain('@media');
      expect(htmlContent).toContain('max-width');
    });

    it('should use proper CSS for modern design', async () => {
      // Arrange
      const ticketData = {
        orderId: 'ORD-20250815-008',
        recipientEmail: 'css@example.com',
        recipientName: 'CSS Test',
        ticketType: 'ตั๋วสไตล์',
        quantity: 1,
        showDate: '29/8/2568',
        totalAmount: 1800,
        seatNumbers: [],
        includeQRCode: false,
        notes: 'CSS design test',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'css-message-id',
      });

      // Act
      await emailService.sendTicketEmail(ticketData);

      // Assert
      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      const htmlContent = emailCall.html;

      // Modern CSS features
      expect(htmlContent).toContain('linear-gradient');
      expect(htmlContent).toContain('border-radius');
      expect(htmlContent).toContain('box-shadow');
      expect(htmlContent).toContain('grid-template-columns');
      expect(htmlContent).toContain('font-family');

      // Responsive design
      expect(htmlContent).toContain(
        '@media only screen and (max-width: 600px)',
      );

      // Dark mode support
      expect(htmlContent).toContain('prefers-color-scheme: dark');
    });
  });

  describe('🔧 Error Handling Tests', () => {
    it('should handle email sending errors gracefully', async () => {
      // Arrange
      const ticketData = {
        orderId: 'ORD-20250815-009',
        recipientEmail: 'error@example.com',
        recipientName: 'Error Test',
        ticketType: 'ตั๋วข้อผิดพลาด',
        quantity: 1,
        showDate: '27/8/2568',
        totalAmount: 1100,
        seatNumbers: [],
        includeQRCode: false,
        notes: 'Error handling test',
      };

      mockTransporter.sendMail.mockRejectedValue(
        new Error('SMTP connection failed'),
      );

      // Act & Assert
      await expect(emailService.sendTicketEmail(ticketData)).rejects.toThrow(
        'SMTP connection failed',
      );
    });

    it('should validate required email data', async () => {
      // Arrange
      const incompleteData = {
        orderId: 'ORD-20250815-010',
        recipientEmail: '', // Missing email
        recipientName: 'Validation Test',
        ticketType: 'ตั๋วไม่ครบ',
        quantity: 1,
        showDate: '26/8/2568',
        totalAmount: 1000,
        seatNumbers: [],
        includeQRCode: false,
        notes: 'Validation test',
      };

      // Act & Assert
      await expect(
        emailService.sendTicketEmail(incompleteData),
      ).rejects.toThrow();
    });
  });
});

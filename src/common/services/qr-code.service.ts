import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto-js';
import { ConfigService } from '@nestjs/config';

export interface QRCodeData {
  orderId: string;
  userId: string;
  showDate: string;
  seats?: string[];
  amount: number;
  ticketType: 'seated' | 'standing';
  validUntil: string;
  securityHash: string;
}

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  quality?: number;
}

export interface QRValidationResult {
  isValid: boolean;
  data?: QRCodeData;
  error?: string;
  timestamp: string;
}

@Injectable()
export class QRCodeService {
  private readonly logger = new Logger(QRCodeService.name);
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    this.secretKey =
      this.configService.get<string>('QR_SECRET_KEY') ||
      'default-qr-secret-key';
  }

  /**
   * 🎫 สร้าง QR Code สำหรับตั๋ว (URL สำหรับแอปทั่วไป)
   */
  async generateTicketQR(
    orderId: string,
    userId: string,
    showDate: string,
    seats: string[] | null,
    amount: number,
    ticketType: 'seated' | 'standing',
    options: QRCodeOptions = {},
  ): Promise<{ qrCodeImage: string; qrData: QRCodeData; qrUrl: string }> {
    try {
      // Validate และแปลง showDate
      let showDateTime: Date;
      let validUntil: string;

      try {
        // ตรวจสอบว่า showDate เป็น string ที่ถูกต้องหรือไม่
        if (!showDate || typeof showDate !== 'string') {
          this.logger.warn(
            `⚠️ Invalid showDate format: ${showDate}, using current date`,
          );
          showDateTime = new Date();
        } else {
          showDateTime = new Date(showDate);

          // ตรวจสอบว่าเป็น valid date หรือไม่
          if (isNaN(showDateTime.getTime())) {
            this.logger.warn(
              `⚠️ Invalid showDate value: ${showDate}, using current date`,
            );
            showDateTime = new Date();
          }
        }

        // สร้างวันหมดอายุ (7 วันหลังจากการแข่งขัน)
        validUntil = new Date(
          showDateTime.getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
      } catch (dateError) {
        this.logger.error(
          `❌ Date parsing error: ${dateError.message}, using current date`,
        );
        showDateTime = new Date();
        validUntil = new Date(
          showDateTime.getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
      }

      // สร้างข้อมูล QR
      const qrData: QRCodeData = {
        orderId,
        userId,
        showDate: showDateTime.toISOString(), // ใช้ ISO string ที่แน่นอน
        seats: seats || [],
        amount,
        ticketType,
        validUntil,
        securityHash: '', // จะสร้างด้านล่าง
      };

      // สร้าง security hash
      qrData.securityHash = this.generateSecurityHash(qrData);

      // เข้ารหัสข้อมูล
      const encryptedData = this.encryptData(JSON.stringify(qrData));

      // สร้าง URL สำหรับการเข้าถึงจากแอปทั่วไป
      const baseUrl =
        this.configService.get<string>('NUXT_PUBLIC_APP_URL') ||
        this.configService.get<string>('APP_BASE_URL') ||
        'http://localhost:3000';
      const qrUrl = `${baseUrl}/api/v1/mobile/scanner/check-in/${orderId}?qr=${encodeURIComponent(encryptedData)}`;

      // ตั้งค่า default options
      const qrOptions: QRCode.QRCodeToDataURLOptions = {
        width: options.width || 256,
        margin: options.margin || 2,
        color: {
          dark: options.color?.dark || '#000000',
          light: options.color?.light || '#FFFFFF',
        },
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      };

      // สร้าง QR Code image จาก URL (แทนที่จะเป็นข้อมูลเข้ารหัส)
      const qrCodeImage = await QRCode.toDataURL(qrUrl, qrOptions);

      this.logger.log(
        `✅ สร้าง QR Code URL สำเร็จสำหรับออเดอร์ ${orderId}: ${qrUrl}`,
      );

      return {
        qrCodeImage,
        qrData,
        qrUrl,
      };
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการสร้าง QR Code: ${error.message}`,
      );
      throw new Error(`การสร้าง QR Code ล้มเหลว: ${error.message}`);
    }
  }

  /**
   * 🔍 ตรวจสอบ QR Code
   */
  async validateQRCode(encryptedQRData: string): Promise<QRValidationResult> {
    try {
      // ถอดรหัสข้อมูล
      const decryptedData = this.decryptData(encryptedQRData);
      const qrData: QRCodeData = JSON.parse(decryptedData);

      // ตรวจสอบ security hash
      const expectedHash = this.generateSecurityHash(qrData);
      if (qrData.securityHash !== expectedHash) {
        return {
          isValid: false,
          error: 'QR Code ไม่ถูกต้องหรือถูกปลอมแปลง',
          timestamp: new Date().toISOString(),
        };
      }

      // ตรวจสอบวันหมดอายุ
      const now = new Date();
      const validUntil = new Date(qrData.validUntil);
      if (now > validUntil) {
        return {
          isValid: false,
          error: 'QR Code หมดอายุแล้ว',
          timestamp: new Date().toISOString(),
        };
      }

      // ตรวจสอบวันที่การแข่งขัน
      const showDate = new Date(qrData.showDate);
      const showEndTime = new Date(showDate.getTime() + 24 * 60 * 60 * 1000); // +1 วัน
      if (now < showDate || now > showEndTime) {
        return {
          isValid: false,
          error: 'QR Code ไม่อยู่ในช่วงเวลาการใช้งาน',
          timestamp: new Date().toISOString(),
        };
      }

      this.logger.log(`✅ QR Code ถูกต้อง สำหรับออเดอร์ ${qrData.orderId}`);

      return {
        isValid: true,
        data: qrData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการตรวจสอบ QR Code: ${error.message}`,
      );
      return {
        isValid: false,
        error: 'QR Code ไม่ถูกต้องหรือเสียหาย',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 🎨 สร้าง QR Code พร้อมโลโก้
   */
  async generateQRWithLogo(
    data: string,
    logoPath?: string,
    options: QRCodeOptions = {},
  ): Promise<string> {
    try {
      // สร้าง QR Code ขนาดใหญ่เพื่อให้มีพื้นที่สำหรับโลโก้
      const qrOptions: QRCode.QRCodeToDataURLOptions = {
        width: options.width || 512,
        margin: options.margin || 4,
        errorCorrectionLevel: 'H', // ใช้ระดับสูงสุดเพื่อรองรับโลโก้
        color: options.color,
      };

      const qrCodeImage = await QRCode.toDataURL(data, qrOptions);

      // หากไม่มีโลโก้ ให้คืนค่า QR Code ธรรมดา
      if (!logoPath) {
        return qrCodeImage;
      }

      // TODO: ในอนาคตสามารถเพิ่มการผสมโลโก้เข้าไปได้
      this.logger.log('📝 หมายเหตุ: การเพิ่มโลโก้ยังไม่ได้ implement');

      return qrCodeImage;
    } catch (error) {
      this.logger.error(
        `❌ เกิดข้อผิดพลาดในการสร้าง QR Code พร้อมโลโก้: ${error.message}`,
      );
      throw new Error(`การสร้าง QR Code พร้อมโลโก้ล้มเหลว: ${error.message}`);
    }
  }

  /**
   * 📊 สร้าง QR Code หลายรูปแบบ
   */
  async generateMultipleFormats(
    data: string,
    formats: Array<'png' | 'svg'> = ['png'],
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    for (const format of formats) {
      try {
        if (format === 'svg') {
          results[format] = await QRCode.toString(data, { type: 'svg' });
        } else {
          results[format] = await QRCode.toDataURL(data, {
            width: 512,
            margin: 2,
            errorCorrectionLevel: 'M',
          });
        }
      } catch (error) {
        this.logger.error(
          `❌ ไม่สามารถสร้าง QR Code รูปแบบ ${format}: ${error.message}`,
        );
      }
    }

    return results;
  }

  /**
   * 🔐 เข้ารหัสข้อมูล
   */
  private encryptData(data: string): string {
    return crypto.AES.encrypt(data, this.secretKey).toString();
  }

  /**
   * 🔓 ถอดรหัสข้อมูล
   */
  private decryptData(encryptedData: string): string {
    const bytes = crypto.AES.decrypt(encryptedData, this.secretKey);
    return bytes.toString(crypto.enc.Utf8);
  }

  /**
   * 🛡️ สร้าง security hash
   */
  private generateSecurityHash(
    qrData: Omit<QRCodeData, 'securityHash'>,
  ): string {
    const dataString = `${qrData.orderId}${qrData.userId}${qrData.showDate}${qrData.amount}${qrData.ticketType}`;
    return crypto.HmacSHA256(dataString, this.secretKey).toString();
  }

  /**
   * 📈 สถิติการใช้งาน QR Code
   */
  async getQRCodeStats() {
    // TODO: เพิ่มการเก็บสถิติการสแกน QR Code
    this.logger.log('📊 สถิติการใช้งาน QR Code (ยังไม่ได้ implement)');

    return {
      totalGenerated: 0,
      totalScanned: 0,
      successfulScans: 0,
      failedScans: 0,
      scansByDate: [],
      scansByLocation: [],
    };
  }
}

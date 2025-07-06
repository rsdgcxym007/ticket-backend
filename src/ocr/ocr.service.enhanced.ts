import { Injectable, Logger } from '@nestjs/common';
import { TicketOrderOCR } from '../common/interfaces';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  /**
   * 🔍 ประมวลผลรูปภาพสลิปเพื่อแยกข้อมูล
   */
  async processSlipImage(imageBuffer: Buffer): Promise<TicketOrderOCR | null> {
    try {
      this.logger.log('🔍 เริ่มประมวลผลรูปภาพสลิป...');

      // TODO: ติดตั้ง OCR Library (เช่น Tesseract, Google Vision API)
      // const ocrResult = await this.performOCR(imageBuffer);

      // จำลองผลลัพธ์ OCR ชั่วคราว
      const mockOcrResult = await this.mockOcrProcessing(imageBuffer);

      if (mockOcrResult) {
        this.logger.log('✅ ประมวลผลสลิปสำเร็จ');
        return mockOcrResult;
      }

      this.logger.warn('⚠️ ไม่สามารถประมวลผลสลิปได้');
      return null;
    } catch (error) {
      this.logger.error('❌ เกิดข้อผิดพลาดในการประมวลผลสลิป:', error);
      throw new Error('ไม่สามารถประมวลผลรูปภาพได้');
    }
  }

  /**
   * 🤖 จำลองการประมวลผล OCR (ใช้งานชั่วคราว)
   */
  private async mockOcrProcessing(
    imageBuffer: Buffer,
  ): Promise<TicketOrderOCR | null> {
    // จำลองเวลาประมวลผล
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ตรวจสอบขนาดไฟล์ (ขั้นต่ำ)
    if (imageBuffer.length < 1000) {
      return null;
    }

    // สร้างข้อมูลจำลอง
    const mockData: TicketOrderOCR = {
      orderNumber: `HKT-${Math.floor(Math.random() * 99999) + 10000}`,
      customerName: 'Sample Customer',
      customerPhone: '+66812345678',
      ticketType: 'Ringside',
      quantity: 2,
      price: 3600,
      paymentStatus: 'Paid',
      paymentMethod: 'Bank Transfer',
      travelDate: new Date().toISOString().split('T')[0],
      orderDate: new Date().toISOString().split('T')[0],
      pickupHotel: 'Sample Hotel',
      dropoffLocation: 'Stadium',
      voucherCode: 'ABC123',
      referenceNo: `REF${Date.now()}`,
      source: 'DIRECT',
      seatNumbers: ['A1', 'A2'],
      note: 'OCR Processed',
    };

    return mockData;
  }

  /**
   * 🔍 ตรวจสอบความถูกต้องของข้อมูลจาก OCR
   */
  async validateOcrData(ocrData: TicketOrderOCR): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!ocrData.orderNumber) {
      errors.push('ไม่พบหมายเลขคำสั่งซื้อ');
    }

    if (!ocrData.customerName) {
      errors.push('ไม่พบชื่อลูกค้า');
    }

    if (!ocrData.ticketType) {
      errors.push('ไม่พบประเภทตั๋ว');
    }

    if (!ocrData.quantity || ocrData.quantity <= 0) {
      errors.push('จำนวนตั๋วไม่ถูกต้อง');
    }

    if (!ocrData.price || ocrData.price <= 0) {
      errors.push('ราคาไม่ถูกต้อง');
    }

    if (!ocrData.travelDate) {
      errors.push('ไม่พบวันที่เดินทาง');
    }

    // ตรวจสอบข้อมูลเสริม
    if (!ocrData.customerPhone) {
      warnings.push('ไม่พบหมายเลขโทรศัพท์');
    }

    if (!ocrData.paymentMethod) {
      warnings.push('ไม่พบวิธีการชำระเงิน');
    }

    if (!ocrData.source) {
      warnings.push('ไม่พบแหล่งที่มาของคำสั่งซื้อ');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 📊 วิเคราะห์ความมั่นใจของข้อมูล OCR
   */
  async analyzeConfidence(ocrData: TicketOrderOCR): Promise<{
    overallConfidence: number;
    fieldConfidence: Record<string, number>;
    suggestions: string[];
  }> {
    const fieldConfidence: Record<string, number> = {};
    const suggestions: string[] = [];

    // คำนวณความมั่นใจแต่ละฟิลด์ (จำลอง)
    fieldConfidence.orderNumber = this.calculateFieldConfidence(
      ocrData.orderNumber,
    );
    fieldConfidence.customerName = this.calculateFieldConfidence(
      ocrData.customerName,
    );
    fieldConfidence.ticketType = this.calculateFieldConfidence(
      ocrData.ticketType,
    );
    fieldConfidence.quantity = ocrData.quantity ? 0.9 : 0;
    fieldConfidence.price = ocrData.price ? 0.9 : 0;
    fieldConfidence.travelDate = this.calculateFieldConfidence(
      ocrData.travelDate,
    );

    // คำนวณความมั่นใจรวม
    const confidenceValues = Object.values(fieldConfidence);
    const overallConfidence =
      confidenceValues.reduce((sum, conf) => sum + conf, 0) /
      confidenceValues.length;

    // สร้างคำแนะนำ
    if (overallConfidence < 0.7) {
      suggestions.push('ควรตรวจสอบข้อมูลด้วยตนเองอีกครั้ง');
    }

    if (fieldConfidence.orderNumber < 0.8) {
      suggestions.push('ตรวจสอบหมายเลขคำสั่งซื้อ');
    }

    if (fieldConfidence.customerName < 0.8) {
      suggestions.push('ตรวจสอบชื่อลูกค้า');
    }

    return {
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      fieldConfidence,
      suggestions,
    };
  }

  /**
   * 🎯 คำนวณความมั่นใจของฟิลด์
   */
  private calculateFieldConfidence(value: string | undefined): number {
    if (!value) return 0;

    // จำลองการคำนวณความมั่นใจ
    const length = value.length;
    const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasLetters = /[a-zA-Z]/.test(value);

    let confidence = 0.5;

    if (length >= 3) confidence += 0.2;
    if (length >= 5) confidence += 0.1;
    if (hasNumbers && hasLetters) confidence += 0.1;
    if (!hasSpecialChars) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * 🔄 ทำความสะอาดข้อมูล OCR
   */
  cleanOcrData(ocrData: TicketOrderOCR): TicketOrderOCR {
    return {
      ...ocrData,
      orderNumber: this.cleanString(ocrData.orderNumber),
      customerName: this.cleanString(ocrData.customerName),
      customerPhone: this.cleanPhoneNumber(ocrData.customerPhone),
      ticketType: this.normalizeTicketType(ocrData.ticketType),
      paymentMethod: this.cleanString(ocrData.paymentMethod),
      travelDate: this.normalizeDateString(ocrData.travelDate),
      orderDate: this.normalizeDateString(ocrData.orderDate),
      pickupHotel: this.cleanString(ocrData.pickupHotel),
      dropoffLocation: this.cleanString(ocrData.dropoffLocation),
      voucherCode: this.cleanString(ocrData.voucherCode),
      referenceNo: this.cleanString(ocrData.referenceNo),
      source: this.normalizeSource(ocrData.source),
      note: this.cleanString(ocrData.note),
    };
  }

  /**
   * 🧹 ทำความสะอาดข้อความ
   */
  private cleanString(str: string | undefined): string {
    if (!str) return '';
    return str.trim().replace(/\s+/g, ' ');
  }

  /**
   * 📱 ทำความสะอาดหมายเลขโทรศัพท์
   */
  private cleanPhoneNumber(phone: string | undefined): string {
    if (!phone) return '';

    // ลบอักขระที่ไม่ใช่ตัวเลขและ +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // แปลง 0 เป็น +66 สำหรับเบอร์ไทย
    if (cleaned.startsWith('0')) {
      return '+66' + cleaned.substring(1);
    }

    return cleaned;
  }

  /**
   * 🎫 ปรับปรุงประเภทตั๋ว
   */
  private normalizeTicketType(type: string | undefined): string {
    if (!type) return '';

    const normalized = type.toLowerCase();

    if (normalized.includes('ringside')) return 'RINGSIDE';
    if (normalized.includes('stadium')) return 'STADIUM';
    if (normalized.includes('standing')) return 'STANDING';
    if (normalized.includes('vip')) return 'VIP';

    return type.toUpperCase();
  }

  /**
   * 📅 ปรับปรุงรูปแบบวันที่
   */
  private normalizeDateString(dateStr: string | undefined): string {
    if (!dateStr) return '';

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    } catch {
      return dateStr;
    }
  }

  /**
   * 🏢 ปรับปรุงแหล่งที่มา
   */
  private normalizeSource(source: string | undefined): string {
    if (!source) return 'OTHER';

    const normalized = source.toLowerCase();

    if (normalized.includes('kkday')) return 'KKDAY';
    if (normalized.includes('sayama')) return 'SAYAMA';
    if (normalized.includes('asia')) return 'ASIA_THAILAND';
    if (normalized.includes('direct')) return 'DIRECT';

    return 'OTHER';
  }

  /**
   * 📋 สร้างรายงานการประมวลผล OCR
   */
  async generateOcrReport(
    ocrData: TicketOrderOCR,
    validation: any,
    confidence: any,
  ): Promise<{
    summary: string;
    details: Record<string, any>;
    recommendations: string[];
  }> {
    const summary = validation.isValid
      ? `ประมวลผลสำเร็จ (ความมั่นใจ: ${Math.round(confidence.overallConfidence * 100)}%)`
      : `พบข้อผิดพลาด ${validation.errors.length} รายการ`;

    const details = {
      extractedData: ocrData,
      validation,
      confidence,
      processedAt: new Date().toISOString(),
    };

    const recommendations = [
      ...validation.errors.map((error: string) => `❌ ${error}`),
      ...validation.warnings.map((warning: string) => `⚠️ ${warning}`),
      ...confidence.suggestions.map((suggestion: string) => `💡 ${suggestion}`),
    ];

    return {
      summary,
      details,
      recommendations,
    };
  }
}

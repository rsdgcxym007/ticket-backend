import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Order } from '../order.entity';
import { Payment } from '../../payment/payment.entity';
import { SeatBooking } from '../../seats/seat-booking.entity';
import { Referrer } from '../../referrer/referrer.entity';
import { OrderStatus, BookingStatus, PaymentStatus } from '../../common/enums';
import { ThailandTimeHelper } from '../../common/utils';
import * as XLSX from 'xlsx';

export interface ExportOrderData {
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  ticketType?: string;
  quantity: number;
  totalAmount: number;
  actualPaidAmount?: number;
  paymentAmountVerified: boolean;
  status: string;
  paymentMethod: string;
  showDate: string;

  // Hotel booking fields
  hotelName?: string;
  hotelDistrict?: string;
  roomNumber?: string;
  adultCount: number;
  childCount: number;
  infantCount: number;
  voucherNumber?: string;
  pickupScheduledTime?: string;
  bookerName?: string;
  includesPickup: boolean;
  includesDropoff: boolean;

  // Commission fields
  referrerCode?: string;
  referrerCommission: number;
  standingCommission: number;

  // Additional tracking
  createdAt: string;
  updatedAt: string;
}

export interface ImportUpdateResult {
  ordersUpdated: number;
  paymentsUpdated: number;
  commissionsRecalculated: number;
  errors: string[];
  details: {
    orderNumber: string;
    changes: string[];
    success: boolean;
    error?: string;
  }[];
}

@Injectable()
export class OrderExportImportHelper {
  private readonly logger = new Logger(OrderExportImportHelper.name);

  /**
   * Export orders ตามที่ user เลือก
   */
  static exportOrdersToSpreadsheetFormat(orders: any[]): ExportOrderData[] {
    return orders.map((order) => ({
      orderNumber: order.orderNumber,
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      customerEmail: order.customerEmail || '',
      ticketType: order.ticketType || '',
      quantity: order.quantity || 0,
      totalAmount: order.totalAmount || 0,
      actualPaidAmount: order.actualPaidAmount || null,
      paymentAmountVerified: order.paymentAmountVerified || false,
      status: order.status,
      paymentMethod: order.paymentMethod,
      showDate: order.showDate
        ? new Date(order.showDate).toISOString().split('T')[0]
        : '',

      // Hotel booking fields
      hotelName: order.hotelName || '',
      hotelDistrict: order.hotelDistrict || '',
      roomNumber: order.roomNumber || '',
      adultCount: order.adultCount || 0,
      childCount: order.childCount || 0,
      infantCount: order.infantCount || 0,
      voucherNumber: order.voucherNumber || '',
      pickupScheduledTime: order.pickupScheduledTime || '',
      bookerName: order.bookerName || '',
      includesPickup: order.includesPickup || false,
      includesDropoff: order.includesDropoff || false,

      // Commission fields
      referrerCode: order.referrerCode || '',
      referrerCommission: order.referrerCommission || 0,
      standingCommission: order.standingCommission || 0,

      // Tracking
      createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : '',
      updatedAt: order.updatedAt ? new Date(order.updatedAt).toISOString() : '',
    }));
  }

  /**
   * Import และอัปเดทข้อมูลจาก spreadsheet
   */
  static async importAndUpdateOrders(
    importData: ExportOrderData[],
    orderRepo: Repository<Order>,
    paymentRepo: Repository<Payment>,
    seatBookingRepo: Repository<SeatBooking>,
    referrerRepo: Repository<Referrer>,
    userId: string,
  ): Promise<ImportUpdateResult> {
    const result: ImportUpdateResult = {
      ordersUpdated: 0,
      paymentsUpdated: 0,
      commissionsRecalculated: 0,
      errors: [],
      details: [],
    };

    for (const data of importData) {
      try {
        const orderResult = await this.processOrderImport(
          data,
          orderRepo,
          paymentRepo,
          seatBookingRepo,
          referrerRepo,
          userId,
        );

        result.details.push(orderResult);

        if (orderResult.success) {
          result.ordersUpdated++;
          if (orderResult.changes.includes('payment')) {
            result.paymentsUpdated++;
          }
          if (orderResult.changes.includes('commission')) {
            result.commissionsRecalculated++;
          }
        } else {
          result.errors.push(`${data.orderNumber}: ${orderResult.error}`);
        }
      } catch (error) {
        const errorMsg = `${data.orderNumber}: ${error.message}`;
        result.errors.push(errorMsg);
        result.details.push({
          orderNumber: data.orderNumber,
          changes: [],
          success: false,
          error: errorMsg,
        });
      }
    }

    return result;
  }

  /**
   * ประมวลผลการ import ของแต่ละ order
   */
  private static async processOrderImport(
    data: ExportOrderData,
    orderRepo: Repository<Order>,
    paymentRepo: Repository<Payment>,
    seatBookingRepo: Repository<SeatBooking>,
    referrerRepo: Repository<Referrer>,
    userId: string,
  ): Promise<{
    orderNumber: string;
    changes: string[];
    success: boolean;
    error?: string;
  }> {
    // ค้นหา order โดยใช้ id (UUID) ที่ได้จาก Order ID column ใน CSV
    const order = await orderRepo.findOne({
      where: { id: data.orderNumber },
      relations: ['payment', 'seatBookings', 'referrer'],
    });

    if (!order) {
      throw new Error(`Order not found: ${data.orderNumber}`);
    }

    const changes: string[] = [];
    const updates: any = {
      updatedAt: ThailandTimeHelper.now(),
      updatedBy: userId,
    };

    // 1. อัปเดท Hotel booking fields
    const hotelFields = this.updateHotelBookingFields(order, data, updates);
    if (hotelFields.length > 0) {
      changes.push(...hotelFields);
    }

    // 2. อัปเดท Payment amount และ verification
    const paymentChanges = await this.updatePaymentTracking(
      order,
      data,
      updates,
      paymentRepo,
      referrerRepo,
    );
    if (paymentChanges.length > 0) {
      changes.push(...paymentChanges);
    }

    // 3. คำนวณ Commission ใหม่ถ้าจำเป็น
    const commissionChanges = this.recalculateCommissions(order, data, updates);
    if (commissionChanges.length > 0) {
      changes.push(...commissionChanges);
    }

    // 4. อัปเดท seat bookings เป็น PAID ถ้า status เป็น PAID
    if (updates.status === OrderStatus.PAID && order.seatBookings?.length > 0) {
      await seatBookingRepo.update(
        { orderId: order.id },
        {
          status: BookingStatus.PAID,
          updatedAt: ThailandTimeHelper.now(),
        },
      );
      changes.push('seats_paid');
    }

    // บันทึกการเปลี่ยนแปลง
    if (changes.length > 0) {
      await orderRepo.update(order.id, updates);
    }

    return {
      orderNumber: data.orderNumber,
      changes,
      success: true,
    };
  }

  /**
   * อัปเดท Hotel booking fields
   */
  private static updateHotelBookingFields(
    order: Order,
    data: ExportOrderData,
    updates: any,
  ): string[] {
    const changes: string[] = [];

    const fieldsToUpdate = [
      'hotelName',
      'hotelDistrict',
      'roomNumber',
      'voucherNumber',
      'pickupScheduledTime',
      'bookerName',
    ];

    fieldsToUpdate.forEach((field) => {
      if (data[field] !== undefined && data[field] !== order[field]) {
        updates[field] = data[field];
        changes.push(`hotel_${field}`);
      }
    });

    // Update numeric fields
    ['adultCount', 'childCount', 'infantCount'].forEach((field) => {
      if (data[field] !== undefined && data[field] !== order[field]) {
        updates[field] = data[field];
        changes.push(`hotel_${field}`);
      }
    });

    // Update boolean fields
    ['includesPickup', 'includesDropoff'].forEach((field) => {
      if (data[field] !== undefined && data[field] !== order[field]) {
        updates[field] = data[field];
        changes.push(`hotel_${field}`);
      }
    });

    return changes;
  }

  /**
   * อัปเดท Payment tracking
   */
  private static async updatePaymentTracking(
    order: Order,
    data: ExportOrderData,
    updates: any,
    paymentRepo: Repository<Payment>,
    referrerRepo: Repository<Referrer>,
  ): Promise<string[]> {
    const changes: string[] = [];

    // 🚫 ตรวจสอบว่าออเดอร์เป็น PAID แล้วหรือไม่ - ถ้าใช่ให้ข้าม
    if (
      order.status === OrderStatus.PAID ||
      order.status === OrderStatus.CANCELLED
    ) {
      changes.push('order_already_paid_skip');
      console.log(
        `⚠️ Order ${order.orderNumber || order.id} is already PAID, skipping import update`,
      );
      return changes;
    }

    // อัปเดท actualPaidAmount (ยกเลิก logic skip กรณี equal amounts)
    // เพราะผู้ใช้อาจต้องการ import ข้อมูลที่แก้ไขใหม่
    if (
      data.actualPaidAmount !== undefined &&
      data.actualPaidAmount !== order.actualPaidAmount
    ) {
      updates.actualPaidAmount = data.actualPaidAmount;
      changes.push('payment_amount');

      // 🔥 โลจิกใหม่: ถ้า paymentAmount เท่ากับ totalAmount ให้ทำการอัปเดต
      if (data.actualPaidAmount === data.totalAmount) {
        updates.paymentAmountVerified = true;
        changes.push('payment_verified');

        // 🎯 อัปเดท Order Status เป็น PAID
        updates.status = OrderStatus.PAID;
        changes.push('status_paid');

        // 💰 คำนวณ payment amount ที่ต้องบันทึกใน payment entity
        // (เพิ่มค่าเสื้อกลับเข้าไป - ตรงข้ามกับตอน export)
        let finalPaymentAmount = data.actualPaidAmount;

        // คำนวณจำนวนตั๋วแต่ละประเภท
        const standingQty =
          (order.standingAdultQty || 0) + (order.standingChildQty || 0);
        const ringsideQty =
          order.ticketType === 'RINGSIDE' ? order.quantity || 0 : 0;
        const stadiumQty =
          order.ticketType === 'STADIUM' ? order.quantity || 0 : 0;
        const sittingQty = ringsideQty + stadiumQty;

        if (order.ticketType === 'STANDING' && standingQty > 0) {
          // ตั๋วยืน: บวก 300 ต่อตั๋ว
          finalPaymentAmount = data.actualPaidAmount + standingQty * 300;
        } else if (
          (order.ticketType === 'RINGSIDE' || order.ticketType === 'STADIUM') &&
          sittingQty > 0
        ) {
          // ตั๋วนั่ง: บวก 400 ต่อตั๋ว
          finalPaymentAmount = data.actualPaidAmount + sittingQty * 400;
        }

        // อัปเดท payment entity พร้อมจำนวนเงินที่ปรับแล้ว
        if (order.payment) {
          await paymentRepo.update(order.payment.id, {
            amount: finalPaymentAmount,
            status: PaymentStatus.PAID,
            updatedAt: ThailandTimeHelper.now(),
          });
          changes.push('payment_entity_with_shirt_fee');
          console.log(
            `💰 Updated payment amount for order ${
              order.orderNumber || order.id
            }: ${data.actualPaidAmount} → ${finalPaymentAmount}`,
          );
        }

        // 🏆 อัปเดตค่าคอมมิชชั่นถ้ามี referrerCode
        if (order.referrerCode) {
          console.log(
            `💼 Processing commission for order ${order.orderNumber || order.id} with referrer code: ${order.referrerCode}`,
          );

          // คำนวณค่าคอมมิชชั่นใหม่ตามประเภทตั๋ว
          let referrerCommission = 0;
          let standingCommission = 0;

          if (order.ticketType === 'STANDING') {
            // ตั๋วยืน: 300 บาทต่อตั๋ว
            standingCommission = standingQty * 300;
            updates.standingCommission = standingCommission;
            console.log(
              `📊 Standing commission updated: ${standingQty} tickets × 300 = ${standingCommission} บาท`,
            );
          } else if (
            order.ticketType === 'RINGSIDE' ||
            order.ticketType === 'STADIUM'
          ) {
            // ตั๋วนั่ง: 400 บาทต่อตั๋ว
            referrerCommission = sittingQty * 400;
            updates.referrerCommission = referrerCommission;
            console.log(
              `📊 Referrer commission updated: ${sittingQty} tickets × 400 = ${referrerCommission} บาท`,
            );
          }

          // ❗ อัปเดท referrer entity ด้วย
          if (referrerRepo && order.referrer?.id) {
            try {
              const currentReferrer = await referrerRepo.findOne({
                where: { id: order.referrer.id },
              });

              if (currentReferrer) {
                const totalCommissionToAdd =
                  referrerCommission + standingCommission;
                await referrerRepo.update(order.referrer.id, {
                  totalCommission:
                    (currentReferrer.totalCommission || 0) +
                    totalCommissionToAdd,
                  updatedAt: ThailandTimeHelper.now(),
                });
                changes.push('referrer_commission_updated');
                console.log(
                  `💰 Referrer total commission updated: +${totalCommissionToAdd} บาท`,
                );
              }
            } catch (error) {
              console.error(
                `❌ Failed to update referrer commission: ${error.message}`,
              );
            }
          }

          changes.push('commission');
        }

        // 📝 บันทึก timestamp ของการ import เพื่อป้องกันการอัปเดตซ้ำ
        updates.lastImportProcessedAt = ThailandTimeHelper.now();
        updates.importProcessCount = (order.importProcessCount || 0) + 1;
        changes.push('import_timestamp_recorded');
      } else {
        changes.push('payment_amount_partial');
      }
    }

    // อัปเดท payment verification status
    if (
      data.paymentAmountVerified !== undefined &&
      data.paymentAmountVerified !== order.paymentAmountVerified
    ) {
      updates.paymentAmountVerified = data.paymentAmountVerified;
      changes.push('payment_verified');
    }

    return changes;
  }

  /**
   * คำนวณ Commission ใหม่
   */
  private static recalculateCommissions(
    order: Order,
    data: ExportOrderData,
    updates: any,
  ): string[] {
    const changes: string[] = [];

    // คำนวณ commission ใหม่ถ้าจำนวนเงินเปลี่ยน
    if (data.actualPaidAmount && data.actualPaidAmount !== order.totalAmount) {
      // คำนวณ commission ตามสัดส่วน
      const ratio = data.actualPaidAmount / data.totalAmount;

      if (order.referrerCommission > 0) {
        const newReferrerCommission = Math.round(
          order.referrerCommission * ratio,
        );
        if (newReferrerCommission !== order.referrerCommission) {
          updates.referrerCommission = newReferrerCommission;
          changes.push('commission_referrer');
        }
      }

      if (order.standingCommission > 0) {
        const newStandingCommission = Math.round(
          order.standingCommission * ratio,
        );
        if (newStandingCommission !== order.standingCommission) {
          updates.standingCommission = newStandingCommission;
          changes.push('commission_standing');
        }
      }

      changes.push('commission');
    }

    return changes;
  }

  /**
   * สร้าง Export template
   */
  static createExportTemplate(): Partial<ExportOrderData> {
    return {
      orderNumber: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      ticketType: '',
      quantity: 0,
      totalAmount: 0,
      actualPaidAmount: 0,
      paymentAmountVerified: false,
      status: '',
      paymentMethod: '',
      showDate: '',
      hotelName: '',
      hotelDistrict: '',
      roomNumber: '',
      adultCount: 0,
      childCount: 0,
      infantCount: 0,
      voucherNumber: '',
      pickupScheduledTime: '',
      bookerName: '',
      includesPickup: false,
      includesDropoff: false,
      referrerCode: '',
      referrerCommission: 0,
      standingCommission: 0,
    };
  }

  /**
   * Validate import data
   */
  static validateImportData(data: ExportOrderData[]): string[] {
    const errors: string[] = [];

    data.forEach((row, index) => {
      if (!row.orderNumber) {
        errors.push(`Row ${index + 1}: Order number is required`);
      }

      if (row.actualPaidAmount !== undefined && row.actualPaidAmount < 0) {
        errors.push(`Row ${index + 1}: Actual paid amount cannot be negative`);
      }

      if (row.adultCount < 0 || row.childCount < 0 || row.infantCount < 0) {
        errors.push(`Row ${index + 1}: Guest counts cannot be negative`);
      }
    });

    return errors;
  }

  /**
   * แปลง Thai headers เป็น English field names
   */
  private static mapThaiHeadersToEnglish(rawData: any[]): ExportOrderData[] {
    const logger = new Logger('HeaderMapper');

    // รองรับ header variations ที่อาจเกิดขึ้นใน Excel/CSV
    const headerMapping = {
      'Order ID': 'id',
      'NO.': 'sequenceNumber',
      ชื่อเอเย่นต์: 'referrerName',
      RS: 'ringsideQty',
      STD: 'standingQty',
      CH: 'standingChildQty',
      'ราคามวย RS': 'ringsidePrice',
      'ราคามวย STD': 'standingPrice',
      'ราคามวย CHI': 'standingChildPrice',
      เสื้อ: 'shirtPrice',
      'เสื้อ F': 'shirtFree',
      เงินทัวร์: 'tourMoney',
      เสื้อรวม: 'totalShirtPrice',
      รวม: 'totalAmount',
      ฟรี: 'freeAmount',
      ยอดเงิน: 'actualPaidAmount',
      'No. V/C': 'voucherNumber',
      // เพิ่ม variations สำหรับ Excel
      'ยอดเงิน ': 'actualPaidAmount', // มี space ต่อท้าย
      ' ยอดเงิน': 'actualPaidAmount', // มี space ข้างหน้า
      ' ยอดเงิน ': 'actualPaidAmount', // มี space ทั้งสองข้าง
    };

    // สร้าง normalized header mapping (trim spaces, lowercase)
    const normalizedMapping = {};
    Object.keys(headerMapping).forEach((key) => {
      const normalizedKey = key.trim().toLowerCase();
      normalizedMapping[normalizedKey] = headerMapping[key];
    });

    if (rawData.length === 0) {
      logger.warn('⚠️ No raw data to process');
      return [];
    }

    logger.log(`📋 Raw data sample (first row): ${JSON.stringify(rawData[0])}`);
    logger.log(
      `🗺️ Available headers in mapping: ${Object.keys(headerMapping)}`,
    );

    return rawData.map((row, index) => {
      const mappedRow: any = {};

      // Log first row headers for debugging
      if (index === 0) {
        logger.log(`📋 Input row headers: ${Object.keys(row)}`);
      }

      // Map Thai headers to English field names
      Object.keys(row).forEach((thaiHeader) => {
        const normalizedHeader = thaiHeader.trim().toLowerCase();
        const englishField =
          headerMapping[thaiHeader] || normalizedMapping[normalizedHeader];

        if (englishField) {
          let value = row[thaiHeader];

          // Convert numeric fields
          if (
            [
              'actualPaidAmount',
              'totalAmount',
              'ringsideQty',
              'standingQty',
              'standingChildQty',
            ].includes(englishField)
          ) {
            value =
              value === '' || value === null || value === undefined
                ? 0
                : Number(value);
          }

          // Convert time fields - empty strings should be null
          if (englishField === 'pickupScheduledTime') {
            value =
              value === '' || value === null || value === undefined
                ? null
                : value;
          }

          mappedRow[englishField] = value;

          // Log mapping for critical fields
          if (englishField === 'actualPaidAmount' && index < 3) {
            logger.log(
              `💰 Mapped "${thaiHeader}" → "${englishField}": ${value}`,
            );
          }
        } else {
          // Log unmapped headers for debugging
          if (index === 0) {
            logger.warn(`⚠️ Unmapped header: "${thaiHeader}"`);
          }
        }
      });

      // Set required defaults for ExportOrderData interface
      return {
        orderNumber: mappedRow.id || '', // Use id as orderNumber for search
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        ticketType: '',
        quantity:
          (mappedRow.ringsideQty || 0) +
          (mappedRow.standingQty || 0) +
          (mappedRow.standingChildQty || 0),
        totalAmount: mappedRow.totalAmount || 0,
        actualPaidAmount: mappedRow.actualPaidAmount || 0,
        paymentAmountVerified: false,
        status: '',
        paymentMethod: '',
        showDate: '',
        hotelName: '',
        hotelDistrict: '',
        roomNumber: '',
        adultCount: 0,
        childCount: 0,
        infantCount: 0,
        voucherNumber: mappedRow.voucherNumber || '',
        pickupScheduledTime: null,
        bookerName: '',
        includesPickup: false,
        includesDropoff: false,
        referrerCode: '',
        referrerCommission: 0,
        standingCommission: 0,
        ...mappedRow,
      } as ExportOrderData;
    });
  }

  /**
   * Parse ไฟล์ CSV/Excel จาก buffer แล้วแปลงเป็น import data
   */
  static async parseFileBuffer(
    buffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<ExportOrderData[]> {
    const logger = new Logger('OrderExportImportHelper');
    logger.log(`📄 Parsing file: ${filename} (${mimeType})`);

    try {
      let parsedData: any[] = [];

      if (mimeType === 'text/csv' || mimeType === 'application/csv') {
        // Parse CSV
        parsedData = await this.parseCSVBuffer(buffer);
      } else if (
        mimeType === 'application/vnd.ms-excel' ||
        mimeType ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) {
        // Parse Excel
        parsedData = await this.parseExcelBuffer(buffer);
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Convert Thai headers to English field names
      const mappedData = this.mapThaiHeadersToEnglish(parsedData);

      logger.log(`✅ Parsed and mapped ${mappedData.length} rows from file`);
      return mappedData;
    } catch (error) {
      logger.error(`❌ Error parsing file: ${error.message}`);
      throw new Error(`Failed to parse file: ${error.message}`);
    }
  }

  /**
   * Parse CSV buffer
   */
  private static async parseCSVBuffer(buffer: Buffer): Promise<any[]> {
    const csvText = buffer.toString('utf-8');
    const lines = csvText.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      throw new Error('ไฟล์ CSV ไม่มีข้อมูล');
    }

    // ใช้แถวแรกเป็น header
    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    const dataRows = lines.slice(1);

    const result = dataRows
      .map((line) => {
        const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
        const obj: any = {};

        headers.forEach((header, i) => {
          obj[header] = values[i] || '';
        });

        return obj;
      })
      .filter((obj) => Object.values(obj).some((val) => val !== ''));

    return result;
  }

  /**
   * Parse Excel buffer
   */
  private static async parseExcelBuffer(buffer: Buffer): Promise<any[]> {
    const logger = new Logger('ExcelParser');

    try {
      const workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellText: false,
        cellDates: true,
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      logger.log(`📊 Excel sheet name: ${sheetName}`);

      // ใช้ sheet_to_json แทน header: 1 เพื่อให้ได้ object ที่สมบูรณ์
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        raw: false, // แปลงทุกอย่างเป็น string
      });

      if (jsonData.length === 0) {
        throw new Error('ไฟล์ Excel ไม่มีข้อมูล');
      }

      logger.log(
        `📋 Excel headers from first row: ${Object.keys(jsonData[0])}`,
      );
      logger.log(`📊 Excel data rows: ${jsonData.length}`);

      // Log first few rows for debugging
      if (jsonData.length > 0) {
        logger.log(`📋 First row data: ${JSON.stringify(jsonData[0])}`);
      }
      if (jsonData.length > 1) {
        logger.log(`📋 Second row data: ${JSON.stringify(jsonData[1])}`);
      }

      logger.log(`✅ Parsed ${jsonData.length} rows from Excel`);
      return jsonData;
    } catch (error) {
      logger.error(`❌ Excel parsing error: ${error.message}`);
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }

  /**
   * Import ออเดอร์จาก file buffer
   */
  static async importFromFileBuffer(
    buffer: Buffer,
    mimeType: string,
    filename: string,
    orderRepo: Repository<Order>,
    paymentRepo: Repository<Payment>,
    seatBookingRepo: Repository<SeatBooking>,
    referrerRepo: Repository<Referrer>,
    userId: string,
  ): Promise<ImportUpdateResult> {
    try {
      // Parse ไฟล์
      const parsedData = await this.parseFileBuffer(buffer, mimeType, filename);

      if (parsedData.length === 0) {
        throw new Error('ไฟล์ไม่มีข้อมูลสำหรับ import');
      }

      // ใช้ method เดิมในการ import
      return await this.importAndUpdateOrders(
        parsedData,
        orderRepo,
        paymentRepo,
        seatBookingRepo,
        referrerRepo,
        userId,
      );
    } catch (error) {
      throw new Error(`Failed to import from file: ${error.message}`);
    }
  }

  /**
   * Export ออเดอร์เป็นไฟล์ CSV หรือ Excel
   */
  static async exportToFile(
    orders: any[],
    format: 'csv' | 'excel',
    includePayments: boolean = true,
  ): Promise<{ data: string | Buffer; filename: string; mimeType: string }> {
    try {
      // แปลงข้อมูลออเดอร์เป็นรูปแบบ export
      const exportData = this.exportOrdersToSpreadsheetFormat(orders);

      // เพิ่มข้อมูล payments ถ้าต้องการ
      const formattedData = exportData.map((order: any) => ({
        'Order Number': order.orderNumber,
        'Customer Name': order.customerName || '-',
        'Customer Phone': order.customerPhone || '-',
        'Customer Email': order.customerEmail || '-',
        'Ticket Type': order.ticketType || '-',
        Quantity: order.quantity || 0,
        'Total Amount': order.totalAmount || 0,
        'Actual Paid Amount': includePayments
          ? order.actualPaidAmount || '-'
          : '-',
        'Payment Verified': includePayments
          ? order.paymentAmountVerified
            ? 'Yes'
            : 'No'
          : '-',
        Status: order.status,
        'Payment Method': order.paymentMethod,
        'Show Date': order.showDate || '-',
        'Hotel Name': order.hotelName || '-',
        'Hotel District': order.hotelDistrict || '-',
        'Room Number': order.roomNumber || '-',
        'Adult Count': order.adultCount || 0,
        'Child Count': order.childCount || 0,
        'Infant Count': order.infantCount || 0,
        'Voucher Number': order.voucherNumber || '-',
        'Pickup Time': order.pickupScheduledTime || '-',
        'Booker Name': order.bookerName || '-',
        'Includes Pickup': order.includesPickup ? 'Yes' : 'No',
        'Includes Dropoff': order.includesDropoff ? 'Yes' : 'No',
        'Referrer Code': order.referrerCode || '-',
        'Referrer Commission': order.referrerCommission || 0,
        'Standing Commission': order.standingCommission || 0,
        'Created At': order.createdAt || '-',
        'Updated At': order.updatedAt || '-',
      }));

      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === 'csv') {
        // สร้าง CSV
        const headers = Object.keys(formattedData[0] || {});
        const csvRows = [
          headers.join(','),
          ...formattedData.map((row) =>
            headers
              .map((header) => {
                const value = row[header];
                // ถ้าเป็น string ที่มี comma หรือ newline ต้อง escape ด้วย quotes
                if (
                  typeof value === 'string' &&
                  (value.includes(',') ||
                    value.includes('\n') ||
                    value.includes('"'))
                ) {
                  return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
              })
              .join(','),
          ),
        ];

        return {
          data: csvRows.join('\n'),
          filename: `orders_export_${timestamp}.csv`,
          mimeType: 'text/csv',
        };
      } else {
        // สร้าง Excel
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

        // กำหนดความกว้างคอลัมน์
        const columnWidths = [
          { wch: 15 }, // Order Number
          { wch: 20 }, // Customer Name
          { wch: 15 }, // Customer Phone
          { wch: 25 }, // Customer Email
          { wch: 12 }, // Ticket Type
          { wch: 8 }, // Quantity
          { wch: 12 }, // Total Amount
          { wch: 15 }, // Actual Paid Amount
          { wch: 15 }, // Payment Verified
          { wch: 12 }, // Status
          { wch: 15 }, // Payment Method
          { wch: 12 }, // Show Date
          { wch: 20 }, // Hotel Name
          { wch: 15 }, // Hotel District
          { wch: 12 }, // Room Number
          { wch: 8 }, // Adult Count
          { wch: 8 }, // Child Count
          { wch: 8 }, // Infant Count
          { wch: 15 }, // Voucher Number
          { wch: 15 }, // Pickup Time
          { wch: 20 }, // Booker Name
          { wch: 12 }, // Includes Pickup
          { wch: 12 }, // Includes Dropoff
          { wch: 15 }, // Referrer Code
          { wch: 15 }, // Referrer Commission
          { wch: 15 }, // Standing Commission
          { wch: 20 }, // Created At
          { wch: 20 }, // Updated At
        ];
        worksheet['!cols'] = columnWidths;

        const buffer = XLSX.write(workbook, {
          type: 'buffer',
          bookType: 'xlsx',
        });

        return {
          data: buffer,
          filename: `orders_export_${timestamp}.xlsx`,
          mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      }
    } catch (error) {
      throw new Error(`Failed to export to ${format}: ${error.message}`);
    }
  }
}

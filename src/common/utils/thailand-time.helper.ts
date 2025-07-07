// ========================================
// 🌍 TIMEZONE HELPER - ฟังก์ชันจัดการเวลาส่วนกลาง
// ========================================

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
// import { LOCALIZATION } from '../constants';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * ฟังก์ชันจัดการเวลาส่วนกลาง - ใช้ Asia/Bangkok เป็นหลัก
 */
export class ThailandTimeHelper {
  private static readonly THAILAND_TIMEZONE = 'Asia/Bangkok';

  /**
   * ได้วันเวลาปัจจุบันในเขตเวลาไทย
   */
  static now(): Date {
    return dayjs().tz(this.THAILAND_TIMEZONE).toDate();
  }

  /**
   * แปลงวันที่ใดๆ ให้เป็นเขตเวลาไทย
   */
  static toThailandTime(date: Date | string): Date {
    return dayjs(date).tz(this.THAILAND_TIMEZONE).toDate();
  }

  /**
   * เริ่มต้นวัน (00:00:00) ในเขตเวลาไทย
   */
  static startOfDay(date?: Date | string): Date {
    return dayjs(date || this.now())
      .tz(this.THAILAND_TIMEZONE)
      .startOf('day')
      .toDate();
  }

  /**
   * สิ้นสุดวัน (23:59:59) ในเขตเวลาไทย
   */
  static endOfDay(date?: Date | string): Date {
    return dayjs(date || this.now())
      .tz(this.THAILAND_TIMEZONE)
      .endOf('day')
      .toDate();
  }

  /**
   * เริ่มต้นสัปดาห์ในเขตเวลาไทย
   */
  static startOfWeek(date?: Date | string): Date {
    return dayjs(date || this.now())
      .tz(this.THAILAND_TIMEZONE)
      .startOf('week')
      .toDate();
  }

  /**
   * สิ้นสุดสัปดาห์ในเขตเวลาไทย
   */
  static endOfWeek(date?: Date | string): Date {
    return dayjs(date || this.now())
      .tz(this.THAILAND_TIMEZONE)
      .endOf('week')
      .toDate();
  }

  /**
   * เริ่มต้นเดือนในเขตเวลาไทย
   */
  static startOfMonth(date?: Date | string): Date {
    return dayjs(date || this.now())
      .tz(this.THAILAND_TIMEZONE)
      .startOf('month')
      .toDate();
  }

  /**
   * สิ้นสุดเดือนในเขตเวลาไทย
   */
  static endOfMonth(date?: Date | string): Date {
    return dayjs(date || this.now())
      .tz(this.THAILAND_TIMEZONE)
      .endOf('month')
      .toDate();
  }

  /**
   * บวกเวลาในเขตเวลาไทย
   */
  static add(
    date: Date | string,
    amount: number,
    unit: 'day' | 'hour' | 'minute' | 'second' | 'week' | 'month' | 'year',
  ): Date {
    return dayjs(date).tz(this.THAILAND_TIMEZONE).add(amount, unit).toDate();
  }

  /**
   * ลบเวลาในเขตเวลาไทย
   */
  static subtract(
    date: Date | string,
    amount: number,
    unit: 'day' | 'hour' | 'minute' | 'second' | 'week' | 'month' | 'year',
  ): Date {
    return dayjs(date)
      .tz(this.THAILAND_TIMEZONE)
      .subtract(amount, unit)
      .toDate();
  }

  /**
   * จัดรูปแบบวันที่ในเขตเวลาไทย
   */
  static format(date: Date | string, formatStr: string = 'YYYY-MM-DD'): string {
    return dayjs(date).tz(this.THAILAND_TIMEZONE).format(formatStr);
  }

  /**
   * จัดรูปแบบวันที่และเวลาในเขตเวลาไทย
   */
  static formatDateTime(
    date: Date | string,
    formatStr: string = 'YYYY-MM-DD HH:mm:ss',
  ): string {
    return dayjs(date).tz(this.THAILAND_TIMEZONE).format(formatStr);
  }

  /**
   * เปรียบเทียบวันที่ว่าเป็นวันเดียวกันหรือไม่
   */
  static isSameDay(date1: Date | string, date2: Date | string): boolean {
    return dayjs(date1)
      .tz(this.THAILAND_TIMEZONE)
      .isSame(dayjs(date2).tz(this.THAILAND_TIMEZONE), 'day');
  }

  /**
   * เช็คว่าวันที่อยู่ในอดีตหรือไม่
   */
  static isPast(date: Date | string): boolean {
    return dayjs(date).tz(this.THAILAND_TIMEZONE).isBefore(this.now());
  }

  /**
   * เช็คว่าวันที่อยู่ในอนาคตหรือไม่
   */
  static isFuture(date: Date | string): boolean {
    return dayjs(date).tz(this.THAILAND_TIMEZONE).isAfter(this.now());
  }

  /**
   * เช็คว่าวันที่หมดอายุแล้วหรือไม่
   */
  static isExpired(expiresAt: Date | string): boolean {
    return dayjs(expiresAt).tz(this.THAILAND_TIMEZONE).isBefore(this.now());
  }

  /**
   * คำนวณเวลาที่เหลือจนหมดอายุ (นาที)
   */
  static getMinutesUntilExpiry(expiresAt: Date | string): number {
    return dayjs(expiresAt)
      .tz(this.THAILAND_TIMEZONE)
      .diff(this.now(), 'minute');
  }

  /**
   * คำนวณจำนวนวันระหว่างวันที่สองวัน
   */
  static daysBetween(date1: Date | string, date2: Date | string): number {
    return Math.abs(
      dayjs(date1)
        .tz(this.THAILAND_TIMEZONE)
        .diff(dayjs(date2).tz(this.THAILAND_TIMEZONE), 'day'),
    );
  }

  /**
   * สร้างวันที่หมดอายุสำหรับออเดอร์ (วันแสดงเวลา 21:00)
   */
  static createOrderExpiry(showDate: Date | string): Date {
    return dayjs(showDate)
      .tz(this.THAILAND_TIMEZONE)
      .hour(21)
      .minute(0)
      .second(0)
      .millisecond(0)
      .toDate();
  }

  /**
   * สร้างวันที่หมดอายุสำหรับการจองที่นั่ง (+ 5 นาที)
   */
  static createSeatReservationExpiry(): Date {
    return this.add(this.now(), 5, 'minute');
  }

  /**
   * ตรวจสอบว่าวันที่เป็นวันนี้หรือไม่
   */
  static isToday(date: Date | string): boolean {
    return this.isSameDay(date, this.now());
  }

  /**
   * ตรวจสอบว่าวันที่เป็นเมื่อวานหรือไม่
   */
  static isYesterday(date: Date | string): boolean {
    return this.isSameDay(date, this.subtract(this.now(), 1, 'day'));
  }

  /**
   * ตรวจสอบว่าวันที่อยู่ในสัปดาห์นี้หรือไม่
   */
  static isThisWeek(date: Date | string): boolean {
    const startOfWeek = this.startOfWeek();
    const endOfWeek = this.endOfWeek();
    const checkDate = dayjs(date).tz(this.THAILAND_TIMEZONE);

    return checkDate.isAfter(startOfWeek) && checkDate.isBefore(endOfWeek);
  }

  /**
   * ตรวจสอบว่าวันที่อยู่ในเดือนนี้หรือไม่
   */
  static isThisMonth(date: Date | string): boolean {
    const startOfMonth = this.startOfMonth();
    const endOfMonth = this.endOfMonth();
    const checkDate = dayjs(date).tz(this.THAILAND_TIMEZONE);

    return checkDate.isAfter(startOfMonth) && checkDate.isBefore(endOfMonth);
  }

  /**
   * แปลงวันที่เป็น ISO string ในเขตเวลาไทย
   */
  static toISOString(date: Date | string): string {
    return dayjs(date).tz(this.THAILAND_TIMEZONE).toISOString();
  }

  /**
   * แปลงวันที่เป็น format สำหรับ database
   */
  static toDBFormat(date: Date | string): string {
    return dayjs(date).tz(this.THAILAND_TIMEZONE).format('YYYY-MM-DD');
  }

  /**
   * แปลงวันที่และเวลาเป็น format สำหรับ database
   */
  static toDBDateTime(date: Date | string): string {
    return dayjs(date).tz(this.THAILAND_TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
  }

  /**
   * สร้างช่วงเวลาสำหรับ query (เริ่มต้น-สิ้นสุดวัน)
   */
  static createDayRange(date: Date | string): { start: Date; end: Date } {
    return {
      start: this.startOfDay(date),
      end: this.endOfDay(date),
    };
  }

  /**
   * สร้างช่วงเวลาสำหรับ query (เริ่มต้น-สิ้นสุดสัปดาห์)
   */
  static createWeekRange(date?: Date | string): { start: Date; end: Date } {
    return {
      start: this.startOfWeek(date),
      end: this.endOfWeek(date),
    };
  }

  /**
   * สร้างช่วงเวลาสำหรับ query (เริ่มต้น-สิ้นสุดเดือน)
   */
  static createMonthRange(date?: Date | string): { start: Date; end: Date } {
    return {
      start: this.startOfMonth(date),
      end: this.endOfMonth(date),
    };
  }

  /**
   * debug - แสดงเวลาในรูปแบบที่อ่านง่าย
   */
  static debug(date: Date | string, label?: string): void {
    const formatted = this.formatDateTime(date, 'YYYY-MM-DD HH:mm:ss');
    console.log(`[Thailand Time] ${label || 'Debug'}: ${formatted}`);
  }
}

// Export เพื่อความสะดวกในการใช้งาน
export const ThaiTime = ThailandTimeHelper;

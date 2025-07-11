import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, { data: any; expiry: number }>();

  // Cache TTL (Time To Live) ในมิลลิวินาที
  private readonly DEFAULT_TTL = 30 * 1000; // 30 วินาที
  private readonly SEAT_AVAILABILITY_TTL = 10 * 1000; // 10 วินาที
  private readonly ZONE_DATA_TTL = 5 * 60 * 1000; // 5 นาที

  /**
   * เก็บข้อมูลใน Cache
   */
  set(key: string, data: any, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.DEFAULT_TTL);
    this.cache.set(key, { data, expiry });
    this.logger.debug(
      `Cached data for key: ${key}, TTL: ${ttl || this.DEFAULT_TTL}ms`,
    );
  }

  /**
   * ดึงข้อมูลจาก Cache
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // ตรวจสอบว่าหมดอายุหรือยัง
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      this.logger.debug(`Cache expired and removed for key: ${key}`);
      return null;
    }

    this.logger.debug(`Cache hit for key: ${key}`);
    return cached.data;
  }

  /**
   * ลบข้อมูลจาก Cache
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.logger.debug(`Cache deleted for key: ${key}`);
  }

  /**
   * ลบ Cache ทั้งหมด
   */
  clear(): void {
    this.cache.clear();
    this.logger.log('All cache cleared');
  }

  /**
   * ลบ Cache ที่หมดอายุ
   */
  cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiry) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.debug(`Cleaned up ${deletedCount} expired cache entries`);
    }
  }

  /**
   * สร้าง Key สำหรับ Seat Availability
   */
  getSeatAvailabilityKey(zoneId: string, showDate: string): string {
    return `seat_availability:${zoneId}:${showDate}`;
  }

  /**
   * สร้าง Key สำหรับ Zone Data
   */
  getZoneDataKey(zoneId: string): string {
    return `zone_data:${zoneId}`;
  }

  /**
   * Cache สำหรับ Seat Availability
   */
  setSeatAvailability(zoneId: string, showDate: string, data: any): void {
    const key = this.getSeatAvailabilityKey(zoneId, showDate);
    this.set(key, data, this.SEAT_AVAILABILITY_TTL);
  }

  /**
   * ดึง Cache สำหรับ Seat Availability
   */
  getSeatAvailability(zoneId: string, showDate: string): any {
    const key = this.getSeatAvailabilityKey(zoneId, showDate);
    return this.get(key);
  }

  /**
   * Cache สำหรับ Zone Data
   */
  setZoneData(zoneId: string, data: any): void {
    const key = this.getZoneDataKey(zoneId);
    this.set(key, data, this.ZONE_DATA_TTL);
  }

  /**
   * ดึง Cache สำหรับ Zone Data
   */
  getZoneData(zoneId: string): any {
    const key = this.getZoneDataKey(zoneId);
    return this.get(key);
  }

  /**
   * ลบ Cache ที่เกี่ยวข้องกับ Zone
   */
  invalidateZoneCache(zoneId: string): void {
    // ลบ Cache ของ Zone Data
    const zoneKey = this.getZoneDataKey(zoneId);
    this.delete(zoneKey);

    // ลบ Cache ของ Seat Availability ทั้งหมดใน Zone นี้
    for (const key of this.cache.keys()) {
      if (key.startsWith(`seat_availability:${zoneId}:`)) {
        this.delete(key);
      }
    }

    this.logger.log(`Invalidated all cache for zone: ${zoneId}`);
  }

  /**
   * รายงานสถานะ Cache
   */
  getStats(): { totalKeys: number; expiredKeys: number } {
    const now = Date.now();
    let expiredKeys = 0;

    for (const value of this.cache.values()) {
      if (now > value.expiry) {
        expiredKeys++;
      }
    }

    return {
      totalKeys: this.cache.size,
      expiredKeys,
    };
  }
}

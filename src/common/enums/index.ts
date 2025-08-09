// ========================================
// 🎯 COMMON ENUMS - ใช้งานทั่วทั้งระบบ
// ========================================

export enum OrderStatus {
  PENDING = 'PENDING', // รอชำระเงิน (5 นาที)
  PENDING_SLIP = 'PENDING_SLIP', // รอตรวจสอบสลิป (OCR)
  PAID = 'PAID', // ชำระเงินแล้ว
  CONFIRMED = 'CONFIRMED', // ยืนยันแล้ว (Staff/Admin)
  CANCELLED = 'CANCELLED', // ยกเลิก
  EXPIRED = 'EXPIRED', // หมดเวลา (5 นาที)
  BOOKED = 'BOOKED', // จองแล้ว (มีที่นั่ง)
  REFUNDED = 'REFUNDED', // คืนเงินแล้ว
  NO_SHOW = 'NO_SHOW', // ไม่มาดูการแสดง
}

export enum PaymentMethod {
  QR_CODE = 'QR_CODE',
  CASH = 'CASH', // เฉพาะ Staff/Admin
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD', // เตรียมรองรับอนาคต
}

export enum TicketType {
  RINGSIDE = 'RINGSIDE', // ที่นั่งริงไซด์
  STADIUM = 'STADIUM', // ที่นั่งสเตเดียม
  STANDING = 'STANDING', // ตั๋วยืน
}

export enum OrderSource {
  DIRECT = 'DIRECT', // จองตรง
  KKDAY = 'KKDAY',
  SAYAMA = 'SAYAMA',
  ASIA_THAILAND = 'ASIA_THAILAND',
  OTHER = 'OTHER',
}

export enum OrderPurchaseType {
  WEBSITE = 'WEBSITE', // ซื้อจากหน้าเว็บ
  BOOKING = 'BOOKING', // ซื้อจากการจอง
  ONSITE = 'ONSITE', // ซื้อหน้างาน (default)
}

export enum UserRole {
  USER = 'user',
  STAFF = 'staff',
  MANAGER = 'manager',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED', // จองชั่วคราว (5 นาที)
  BOOKED = 'BOOKED', // จองแล้ว
  PAID = 'PAID', // ชำระแล้ว
  OCCUPIED = 'OCCUPIED', // ใช้งานแล้ว
  BLOCKED = 'BLOCKED', // บล็อค (ไม่ให้จอง)
  EMPTY = 'EMPTY', // ช่องว่าง (ไม่ใช่ที่นั่ง)
}

export enum BookingStatus {
  PENDING = 'PENDING',
  RESERVED = 'RESERVED',
  BOOKED = 'BOOKED',
  PAID = 'PAID',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  AVAILABLE = 'AVAILABLE',
}

export enum StandingTicketType {
  ADULT = 'ADULT', // ผู้ใหญ่
  CHILD = 'CHILD', // เด็ก
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING', // กำลังตรวจสอบ
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
  PARTIAL = 'PARTIAL', // ชำระบางส่วน (ไม่ครบตามยอดรวม)
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  CANCEL = 'CANCEL',
  CONFIRM = 'CONFIRM',
  REFUND = 'REFUND',
  VIEW = 'VIEW',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

export enum NotificationType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_PAID = 'ORDER_PAID',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_EXPIRED = 'ORDER_EXPIRED',
  SEAT_ASSIGNED = 'SEAT_ASSIGNED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  SLIP_VERIFICATION = 'SLIP_VERIFICATION',
}

export enum ReportType {
  DAILY_SALES = 'DAILY_SALES',
  MONTHLY_SALES = 'MONTHLY_SALES',
  REFERRER_COMMISSION = 'REFERRER_COMMISSION',
  SEAT_UTILIZATION = 'SEAT_UTILIZATION',
  PAYMENT_METHODS = 'PAYMENT_METHODS',
}

export enum ZoneType {
  RINGSIDE = 'RINGSIDE',
  STADIUM = 'STADIUM',
  VIP = 'VIP',
  PREMIUM = 'PREMIUM',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  EARLY_BIRD = 'EARLY_BIRD',
  GROUP = 'GROUP',
}

export enum AttendanceStatus {
  PENDING = 'PENDING', // ยังไม่เช็คอิน
  CHECKED_IN = 'CHECKED_IN', // เช็คอินแล้ว
  NO_SHOW = 'NO_SHOW', // ไม่มาร่วมงาน
}

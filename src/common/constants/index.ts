// ========================================
// 🎯 SYSTEM CONSTANTS - ค่าคงที่ของระบบ
// ========================================

// 💰 ราคาตั๋ว
export const TICKET_PRICES = {
  RINGSIDE: 1800,
  STADIUM: 1800,
  STANDING_ADULT: 1500,
  STANDING_CHILD: 1200,
} as const;

// 💸 ค่าคอมมิชชั่น
export const COMMISSION_RATES = {
  SEAT: 400, // ที่นั่งทั่วไป (RINGSIDE, STADIUM)
  STANDING_ADULT: 300, // ตั๋วยืนผู้ใหญ่
  STANDING_CHILD: 200, // ตั๋วยืนเด็ก
} as const;

// ⏰ การจำกัดเวลา
export const TIME_LIMITS = {
  RESERVATION_MINUTES: 5, // จำกัดเวลาจอง 5 นาที
  PAYMENT_HOURS: 24, // จำกัดเวลาชำระเงิน 24 ชั่วโมง
  CANCEL_HOURS: 2, // ยกเลิกได้ก่อน 2 ชั่วโมง
  REFUND_DAYS: 7, // คืนเงินได้ภายใน 7 วัน
} as const;

// 🎫 จำกัดจำนวนการจอง - ตาม Role
export const BOOKING_LIMITS = {
  user: {
    maxSeatsPerOrder: 10,
    maxOrdersPerDay: 5,
  },
  staff: {
    maxSeatsPerOrder: 50,
    maxOrdersPerDay: 20,
  },
  admin: {
    maxSeatsPerOrder: 100,
    maxOrdersPerDay: 50,
  },
} as const;

// 📱 การแจ้งเตือน
export const NOTIFICATION_SETTINGS = {
  ORDER_EXPIRY_WARNING: 2, // แจ้งเตือนก่อนหมดเวลา 2 นาที
  PAYMENT_REMINDER: 30, // แจ้งเตือนชำระเงิน 30 นาที
  SHOW_REMINDER: 120, // แจ้งเตือนก่อนการแสดง 2 ชั่วโมง
} as const;

// 🏷️ รหัสอ้างอิง
export const REFERENCE_PREFIXES = {
  ORDER: 'ORD',
  PAYMENT: 'PAY',
  REFUND: 'REF',
  VOUCHER: 'VCH',
  INVOICE: 'INV',
} as const;

// 📊 การรายงาน
export const REPORT_SETTINGS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_EXPORT_ROWS: 10000,
  CACHE_DURATION_MINUTES: 30,
} as const;

// 🎯 ข้อมูลโซน
export const ZONE_CONFIGS = {
  RINGSIDE: {
    NAME: 'Ringside',
    ROWS: 10,
    COLS: 20,
    PRICE: TICKET_PRICES.RINGSIDE,
    COLOR: '#FF6B6B',
  },
  STADIUM: {
    NAME: 'Stadium',
    ROWS: 15,
    COLS: 30,
    PRICE: TICKET_PRICES.STADIUM,
    COLOR: '#4ECDC4',
  },
} as const;

// 📱 API การตั้งค่า
export const API_SETTINGS = {
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW_MINUTES: 15,
  JWT_EXPIRY_DAYS: 7,
  REFRESH_TOKEN_DAYS: 30,
} as const;

// 📁 ไฟล์และรูปภาพ
export const FILE_SETTINGS = {
  MAX_SLIP_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_AVATAR_SIZE_MB: 2,
  UPLOAD_PATH: {
    SLIPS: 'uploads/slips',
    AVATARS: 'uploads/avatars',
    TICKETS: 'uploads/tickets',
    REPORTS: 'uploads/reports',
  },
} as const;

// 🌍 ภาษาและสกุลเงิน
export const LOCALIZATION = {
  DEFAULT_LOCALE: 'th-TH',
  CURRENCY: 'THB',
  TIMEZONE: 'Asia/Bangkok',
  DATE_FORMAT: 'DD/MM/YYYY',
  TIME_FORMAT: 'HH:mm',
  DATETIME_FORMAT: 'DD/MM/YYYY HH:mm',
} as const;

// 🔐 ความปลอดภัย
export const SECURITY_SETTINGS = {
  BCRYPT_ROUNDS: 12,
  PASSWORD_MIN_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
} as const;

// 📧 อีเมล
export const EMAIL_SETTINGS = {
  FROM_NAME: 'Boxing Stadium Patong',
  FROM_EMAIL: 'noreply@boxingstadium.com',
  TEMPLATES: {
    ORDER_CONFIRMATION: 'order-confirmation',
    PAYMENT_RECEIPT: 'payment-receipt',
    TICKET_DELIVERY: 'ticket-delivery',
    ORDER_CANCELLED: 'order-cancelled',
  },
} as const;

// 🎨 UI/UX
export const UI_SETTINGS = {
  THEME_COLORS: {
    PRIMARY: '#FF6B6B',
    SECONDARY: '#4ECDC4',
    SUCCESS: '#51CF66',
    WARNING: '#FFD43B',
    ERROR: '#FF6B6B',
    INFO: '#339AF0',
  },
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 5000,
} as const;

// 🌐 เครือข่ายสังคม
export const SOCIAL_SETTINGS = {
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  LINE_CHANNEL_ID: process.env.LINE_CHANNEL_ID,
} as const;

// 📊 การติดตาม
export const TRACKING_SETTINGS = {
  GOOGLE_ANALYTICS: process.env.GOOGLE_ANALYTICS_ID,
  FACEBOOK_PIXEL: process.env.FACEBOOK_PIXEL_ID,
  ENABLE_TRACKING: process.env.NODE_ENV === 'production',
} as const;

// 🚀 การปรับขนาด
export const PERFORMANCE_SETTINGS = {
  DATABASE_POOL_SIZE: 20,
  CACHE_TTL_SECONDS: 3600,
  SESSION_TIMEOUT_MINUTES: 30,
  CLEANUP_INTERVAL_HOURS: 24,
} as const;

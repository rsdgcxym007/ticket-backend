// ========================================
// 🎯 COMMON INTERFACES - ส่วนที่ใช้งานร่วมกัน
// ========================================

import {
  OrderStatus,
  PaymentMethod,
  TicketType,
  OrderSource,
  PaymentStatus,
  StandingTicketType,
  UserRole,
  SeatStatus,
} from '../enums';

// 🗺️ ข้อมูลโซนที่นั่ง (ZoneData)
export interface ZoneData {
  id: string;
  name: string;
  description?: string;
  totalSeats: number;
  availableSeats: number;
  bookedSeats: number;
  price: number;
}
// 🎫 ข้อมูลการจองตั๋วจาก OCR
export interface TicketOrderOCR {
  orderNumber: string; // เช่น HKT-11274
  customerName: string; // เช่น Demi Dauria
  customerPhone?: string; // เช่น +66..., optional
  ticketType: string; // เช่น Ringside, Stadium, VIP
  quantity: number; // จำนวนที่จอง เช่น 2
  price: number; // ยอดรวม เช่น 1500, 10500
  paymentStatus: 'Paid' | 'Unpaid';
  paymentMethod?: string; // เช่น Credit / Debit Card
  travelDate: string; // วันที่ดูมวย เช่น 2025-07-03
  orderDate?: string; // วันที่ออกใบเสร็จ เช่น 2025-07-02
  pickupHotel?: string; // เช่น Zenmaya Ocean Front
  dropoffLocation?: string; // เช่น Phuket Leelavadee
  voucherCode?: string; // เช่น y4g151ey, 93666049
  referenceNo?: string; // เช่น 429964653724520
  source?: string; // เช่น KKDAY, SAYAMA, ASIA Thailand
  seatNumbers?: string[]; // เช่น ["407", "408"]
  note?: string; // หมายเหตุ เช่น "แจกเสื้อ"
}

// 📱 ข้อมูลการจอง (ใช้ interface เดียว)
export interface OrderData {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  email?: string;
  ticketType: TicketType | string;
  quantity: number;
  price: number;
  totalAmount: number;
  referrerCommission?: number;
  status: OrderStatus | string;
  paymentMethod?: PaymentMethod | string;
  paymentStatus: PaymentStatus | string;
  showDate: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  referrerCode?: string;
  source?: OrderSource | string;
  purchaseType?: string; // WEBSITE, BOOKING, ONSITE
  attendanceStatus?: string;
  seatNumbers?: string[];
  standingTickets?: StandingTicketData[];
  note?: string;
  slipUrl?: string;
  createdBy?: string;
  createdById?: string;
  updatedBy?: string;
  // เพิ่มชื่อผู้สร้างออเดอร์
  createdByName?: string | null;
  // เพิ่มชื่อผู้กดจ่ายเงิน (ถ้ามี)
  paidByName?: string | null;
  // เพิ่มชื่อผู้แก้ไขล่าสุด (ถ้ามี)
  lastUpdatedByName?: string | null;
  standingAdultQty?: number;
  standingChildQty?: number;
  standingTotal?: number;
  standingCommission?: number;
  referrer?: {
    id: string;
    code: string;
    name: string;
  } | null;
  seats: Array<{
    id: string;
    seatNumber: string;
    zone: {
      id: string;
      name: string;
    } | null;
  }>;
}

// 🎪 ข้อมูลตั๋วยืน
export interface StandingTicketData {
  id: string;
  type: StandingTicketType;
  quantity: number;
  price: number;
  totalAmount: number;
}

// 💺 ข้อมูลที่นั่ง
export interface SeatData {
  id: string;
  seatNumber: string;
  row: number;
  column: number;
  zoneId: string;
  zoneName: string;
  status: SeatStatus;
  price: number;
  isLocked: boolean;
  lockedUntil?: Date;
  lockedBy?: string;
}

// 🏷️ ข้อมูลโซน (ลบ OrderData ซ้ำ)

// 👤 ข้อมูลผู้ใช้
export interface UserData {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  totalOrders: number;
  totalSpent: number;
  lastLoginAt?: Date;
}

// 🏷️ ข้อมูลตัวแทนขาย
export interface ReferrerData {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  totalCommission: number;
  totalOrders: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 📊 ข้อมูลสถิติ
export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  availableSeats: number;
  todayOrders: number;
  todaySales: number;
  ordersByStatus: Record<OrderStatus, number>;
  salesByMethod: Record<PaymentMethod, number>;
  salesByZone: Array<{ zone: string; total: number }>;
  topReferrers: Array<{ name: string; commission: number }>;
  topCustomers: Array<{ name: string; spent: number }>;
  nextShowDate: string;
  nextShowAvailable: number;
  nextShowBooked: number;
}

// 📱 การตอบกลับ API
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: Date;
  pagination?: PaginationMeta;
}

// 📄 ข้อมูลการแบ่งหน้า
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// 🔍 ตัวกรองการค้นหา
export interface SearchFilters {
  search?: string;
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  ticketType?: TicketType;
  source?: OrderSource;
  dateFrom?: string;
  dateTo?: string;
  showDate?: string;
  referrerCode?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// 🎨 การตั้งค่าธีม
export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  fontSize: number;
  borderRadius: number;
}

// 📧 ข้อมูลอีเมล
export interface EmailData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

// 📱 การแจ้งเตือน
export interface NotificationData {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

// 🎯 การตั้งค่าระบบ
export interface SystemSettings {
  siteName: string;
  siteUrl: string;
  timezone: string;
  currency: string;
  language: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
}

// 🔐 ข้อมูลการเข้าสู่ระบบ
export interface AuthData {
  user: UserData;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  permissions: string[];
}

// 📊 ข้อมูลรายงาน
export interface ReportData {
  id: string;
  name: string;
  type: string;
  data: any;
  generatedAt: Date;
  generatedBy: string;
  fileUrl?: string;
  parameters: Record<string, any>;
}

// 🎮 การตั้งค่าเกม
export interface ShowSettings {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  description?: string;
  isActive: boolean;
  totalSeats: number;
  availableSeats: number;
  ticketSalesStart: Date;
  ticketSalesEnd: Date;
  pricing: Record<TicketType, number>;
}

// 🏆 ข้อมูลการแสดง
export interface ShowData {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  description?: string;
  poster?: string;
  isActive: boolean;
  totalSeats: number;
  availableSeats: number;
  bookedSeats: number;
  revenue: number;
  zones: ZoneData[];
  settings: ShowSettings;
}

// 🎫 ข้อมูลตั๋ว
export interface TicketData {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  showDate: string;
  showTime: string;
  venue: string;
  ticketType: TicketType;
  seatNumber?: string;
  zoneName?: string;
  price: number;
  qrCode: string;
  isUsed: boolean;
  usedAt?: Date;
  generatedAt: Date;
}

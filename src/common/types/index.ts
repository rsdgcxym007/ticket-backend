// ========================================
// 🎯 CENTRAL TYPE DEFINITIONS
// ========================================

import { UserRole, OrderStatus, PaymentStatus, TicketType } from '../enums';

// ========================================
// 📊 CORE BUSINESS TYPES
// ========================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  referenceNo: string;
  status: OrderStatus;
  ticketType: TicketType;
  quantity: number;
  totalAmount: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  showDate: Date;
  expiresAt: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeatBooking {
  id: string;
  orderId: string;
  seatId: string;
  status: OrderStatus;
  price: number;
  createdAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  method: string;
  transactionId?: string;
  slipUrl?: string;
  verifiedAt?: Date;
  createdAt: Date;
}

// ========================================
// 🎫 TICKET TYPES
// ========================================

export interface StandingTicket {
  type: 'ADULT' | 'CHILD';
  quantity: number;
  price: number;
}

export interface TicketData {
  id: string;
  orderId: string;
  seatNumber?: string;
  type: TicketType;
  price: number;
  qrCode: string;
  isUsed: boolean;
  usedAt?: Date;
}

// ========================================
// 📋 REQUEST & RESPONSE TYPES
// ========================================

export interface CreateOrderRequest {
  userId: string;
  ticketType: TicketType;
  quantity: number;
  seatIds?: string[];
  standingTickets?: StandingTicket[];
  showDate: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  referrerCode?: string;
  note?: string;
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  note?: string;
  expiresAt?: string;
}

export interface OrderResponse {
  id: string;
  referenceNo: string;
  status: OrderStatus;
  ticketType: TicketType;
  quantity: number;
  totalAmount: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  showDate: Date;
  expiresAt: Date;
  seatBookings?: SeatBooking[];
  payments?: Payment[];
  tickets?: TicketData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ========================================
// 🔍 FILTER & SEARCH TYPES
// ========================================

export interface OrderFilters {
  status?: OrderStatus;
  ticketType?: TicketType;
  customerName?: string;
  referenceNo?: string;
  showDate?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface OrderStats {
  totalOrders: number;
  confirmedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
}

// ========================================
// 🔐 AUTH TYPES
// ========================================

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthenticatedRequest {
  user: AuthUser;
  ip?: string;
  userAgent?: string;
}

// ========================================
// 🛡️ VALIDATION TYPES
// ========================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
  timestamp: Date;
  path?: string;
}

// ========================================
// 🎯 BUSINESS LOGIC TYPES
// ========================================

export interface BookingLimits {
  maxPerUser: number;
  maxPerOrder: number;
  maxPerDay: number;
}

export interface PriceCalculation {
  basePrice: number;
  quantity: number;
  discount: number;
  commission: number;
  total: number;
}

export interface AuditLogData {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  createdAt: Date;
}

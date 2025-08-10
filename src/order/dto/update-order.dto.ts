import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import {
  OrderStatus,
  PaymentMethod,
  TicketType,
  OrderSource,
  OrderPurchaseType,
  AttendanceStatus,
} from '../../common/enums';

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus, {
    message: 'สถานะต้องเป็นค่าที่ถูกต้องเท่านั้น',
  })
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  attendanceStatus?: AttendanceStatus;

  @IsOptional()
  @IsString()
  slipUrl?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  referrerCode?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(TicketType)
  ticketType?: TicketType;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  outstandingAmount?: number;

  @IsOptional()
  @IsDateString()
  showDate?: string;

  @IsOptional()
  @IsDateString()
  travelDate?: string;

  @IsOptional()
  @IsString()
  pickupHotel?: string;

  @IsOptional()
  @IsString()
  dropoffLocation?: string;

  @IsOptional()
  @IsString()
  voucherCode?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsEnum(OrderSource)
  source?: OrderSource;

  @IsOptional()
  @IsEnum(OrderPurchaseType)
  purchaseType?: OrderPurchaseType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seatNumbers?: string[];

  @IsOptional()
  @IsArray()
  seatIds?: string[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  updatedBy?: string; // เก็บว่าใครเป็นคนอัปเดต

  // 🎪 ตั๋วยืน
  @IsOptional()
  @IsNumber()
  standingAdultQty?: number;

  @IsOptional()
  @IsNumber()
  standingChildQty?: number;

  @IsOptional()
  @IsNumber()
  standingTotal?: number;

  @IsOptional()
  @IsNumber()
  standingCommission?: number;

  // 💰 ค่าคอมมิชชั่น
  @IsOptional()
  @IsNumber()
  referrerCommission?: number;

  @IsOptional()
  @IsNumber()
  totalCommission?: number;

  // 🔐 การตรวจสอบสลิป
  @IsOptional()
  @IsBoolean()
  slipVerified?: boolean;

  @IsOptional()
  @IsDateString()
  slipVerifiedAt?: string;

  @IsOptional()
  @IsString()
  slipVerifiedBy?: string;

  // 📱 ข้อมูลเพิ่มเติม
  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  cancelReason?: string;

  @IsOptional()
  @IsString()
  refundReason?: string;

  @IsOptional()
  @IsNumber()
  refundAmount?: number;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsBoolean()
  requiresPickup?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresDropoff?: boolean;

  @IsOptional()
  @IsString()
  pickupTime?: string;

  @IsOptional()
  @IsString()
  dropoffTime?: string;

  // 🏨 Hotel booking fields - สำหรับการจองที่พักร่วม
  @IsOptional()
  @IsString()
  hotelName?: string;

  @IsOptional()
  @IsString()
  hotelDistrict?: string;

  @IsOptional()
  @IsString()
  roomNumber?: string;

  @IsOptional()
  @IsNumber()
  adultCount?: number;

  @IsOptional()
  @IsNumber()
  childCount?: number;

  @IsOptional()
  @IsNumber()
  infantCount?: number;

  @IsOptional()
  @IsString()
  voucherNumber?: string;

  @IsOptional()
  @IsString()
  pickupScheduledTime?: string;

  @IsOptional()
  @IsString()
  bookerName?: string;

  @IsOptional()
  @IsBoolean()
  includesPickup?: boolean;

  @IsOptional()
  @IsBoolean()
  includesDropoff?: boolean;
}

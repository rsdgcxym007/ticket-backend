import {
  IsUUID,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import {
  TicketType,
  PaymentMethod,
  OrderSource,
  OrderStatus,
  OrderPurchaseType,
  AttendanceStatus,
} from '../../common/enums';

export class CreateOrderDto {
  @IsOptional()
  @IsUUID()
  createdBy?: string;
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsEnum(TicketType)
  ticketType: TicketType;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  seatIds?: string[];

  @IsDateString()
  showDate: string;

  @IsOptional()
  @IsString()
  referrerCode?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  attendanceStatus?: AttendanceStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsEnum(OrderSource)
  source?: OrderSource;

  @IsOptional()
  @IsEnum(OrderPurchaseType)
  purchaseType?: OrderPurchaseType;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsUUID()
  referrerId?: string;

  @IsOptional()
  @IsInt()
  standingAdultQty?: number;

  @IsOptional()
  @IsInt()
  standingChildQty?: number;

  // ✅ Add required fields for order total calculation
  @IsOptional()
  @IsNumber()
  total?: number;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  // ✅ Hotel booking fields - สำหรับการจองที่พักร่วม
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
  @IsInt()
  adultCount?: number;

  @IsOptional()
  @IsInt()
  childCount?: number;

  @IsOptional()
  @IsInt()
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

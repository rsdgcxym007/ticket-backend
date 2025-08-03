import {
  IsUUID,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
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
}

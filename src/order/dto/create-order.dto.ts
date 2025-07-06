import {
  IsUUID,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { TicketType, PaymentMethod, OrderSource } from '../../common/enums';

export class CreateOrderDto {
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
  @IsString()
  note?: string;

  @IsOptional()
  @IsEnum(OrderSource)
  source?: OrderSource;

  @IsOptional()
  @IsUUID()
  referrerId?: string;

  @IsOptional()
  @IsInt()
  standingAdultQty?: number;

  @IsOptional()
  @IsInt()
  standingChildQty?: number;
}

import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { PaymentMethod, OrderPurchaseType } from '../../common/enums';

export class CreatePaymentDto {
  @IsUUID()
  orderId: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  slipUrl?: string;

  @IsOptional()
  @IsString()
  referrerCode?: string;

  @IsOptional()
  @IsEnum(OrderPurchaseType)
  purchaseType?: OrderPurchaseType;

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
  includesPickup?: boolean;

  @IsOptional()
  includesDropoff?: boolean;
}

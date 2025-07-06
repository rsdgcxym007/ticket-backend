import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { PaymentMethod } from '../../common/enums';

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
}

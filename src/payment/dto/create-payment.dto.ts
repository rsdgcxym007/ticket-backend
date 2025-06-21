import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { PaymentMethod } from '../payment.entity';

export class CreatePaymentDto {
  @IsUUID()
  orderId: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  slipUrl?: string;

  @IsString()
  referrerCode?: string;
}

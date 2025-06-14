// src/payment/dto/create-payment.dto.ts
import { IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  amount: string;

  @IsString()
  ref1: string;

  @IsString()
  ref2: string;
}

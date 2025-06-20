import { IsUUID, IsNumber, IsIn, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  orderId: string;

  @IsIn(['QR', 'TRANSFER', 'CASH'])
  method: 'QR' | 'TRANSFER' | 'CASH';

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  slipUrl?: string;
}

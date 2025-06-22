import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  BOOKED = 'BOOKED',
}
export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus, {
    message: 'status must be either PAID or CANCELLED',
  })
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  slipUrl?: string;

  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  referrerCode?: string;
}

import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum OrderStatus {
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
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
}

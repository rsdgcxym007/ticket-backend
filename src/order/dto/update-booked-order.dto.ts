import {
  IsArray,
  IsUUID,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateBookedOrderDto {
  @IsArray()
  @IsUUID('all', { each: true })
  seatIds: string[];

  @IsDateString()
  showDate: string; // ISO date: '2025-06-22'

  @IsOptional()
  @IsString()
  method?: string;
}

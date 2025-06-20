import { IsIn, IsOptional, IsString, IsInt } from 'class-validator';
import { SeatStatus } from '../eat-status.enum';

export class UpdateSeatStatusDto {
  @IsIn([
    SeatStatus.AVAILABLE,
    SeatStatus.LOCKED,
    SeatStatus.BOOKED,
    SeatStatus.PAID,
  ])
  status: SeatStatus;
}

export class UpdateSeatDto {
  @IsOptional()
  @IsString()
  seatNumber?: string;

  @IsOptional()
  @IsInt()
  rowIndex?: number;

  @IsOptional()
  @IsInt()
  columnIndex?: number;
}

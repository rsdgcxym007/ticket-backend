import { IsIn, IsOptional, IsString, IsInt } from 'class-validator';
import { SeatStatus } from '../../common/enums';

export class UpdateSeatStatusDto {
  @IsIn([
    SeatStatus.AVAILABLE,
    SeatStatus.RESERVED,
    SeatStatus.BOOKED,
    SeatStatus.PAID,
    SeatStatus.BLOCKED,
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

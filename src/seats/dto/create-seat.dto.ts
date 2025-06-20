import { IsString, IsUUID, IsInt, IsEnum } from 'class-validator';
import { SeatStatus } from '../eat-status.enum';

export class CreateSeatDto {
  @IsString()
  seatNumber: string;

  @IsInt()
  rowIndex: number;

  @IsInt()
  columnIndex: number;

  @IsEnum(SeatStatus)
  status: SeatStatus;

  @IsUUID()
  zoneId: string;
}

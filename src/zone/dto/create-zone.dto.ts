import { IsString, IsArray, IsBoolean, IsOptional } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  name: string;

  @IsArray()
  seatMap: string[][];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

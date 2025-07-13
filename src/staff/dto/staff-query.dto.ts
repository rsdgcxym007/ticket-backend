import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { StaffStatus, StaffRole } from '../staff.entity';

export class StaffQueryDto {
  @ApiProperty({
    description: 'สถานะ',
    enum: StaffStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;

  @ApiProperty({
    description: 'บทบาท',
    enum: StaffRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @ApiProperty({ description: 'แผนก', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({
    description: 'คำค้นหา (ชื่อ, อีเมล, รหัสพนักงาน)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'หน้า', required: false, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'จำนวนต่อหน้า', required: false, default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { StaffRole, StaffPermission } from '../staff.entity';

export class CreateStaffDto {
  @ApiProperty({ description: 'ชื่อ' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'นามสกุล' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'อีเมล' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'เบอร์โทรศัพท์', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'บทบาท', enum: StaffRole })
  @IsEnum(StaffRole)
  role: StaffRole;

  @ApiProperty({
    description: 'สิทธิ์การใช้งาน',
    enum: StaffPermission,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(StaffPermission, { each: true })
  permissions?: StaffPermission[];

  @ApiProperty({ description: 'แผนก', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: 'ตำแหน่ง', required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ description: 'เงินเดือน', required: false })
  @IsOptional()
  @IsNumber()
  salary?: number;

  @ApiProperty({ description: 'วันที่เริ่มงาน', required: false })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiProperty({ description: 'หมายเหตุ', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateStaffDto } from './create-staff.dto';
import { StaffStatus } from '../staff.entity';

export class UpdateStaffDto extends PartialType(CreateStaffDto) {
  @ApiProperty({
    description: 'สถานะพนักงาน',
    enum: StaffStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;
}

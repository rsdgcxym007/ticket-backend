import { IsEmail, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsIn(['user', 'admin', 'staff'])
  role?: 'user' | 'admin' | 'staff';
}

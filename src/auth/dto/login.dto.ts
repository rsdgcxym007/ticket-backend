import { IsString, MinLength, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: 'Please enter a valid email address',
  })
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

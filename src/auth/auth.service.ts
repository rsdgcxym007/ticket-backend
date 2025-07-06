import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from './auth.entity';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { User } from '../user/user.entity';
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async login(dto: LoginDto): Promise<{ access_token: string; user: any }> {
    const auth = await this.authRepo.findOne({
      where: { email: dto.email },
      relations: ['user'],
    });

    if (!auth) {
      throw new UnauthorizedException('ไม่พบอีเมลนี้ในระบบ');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, auth.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('รหัสผ่านไม่ถูกต้อง');
    }

    if (!auth.user) {
      throw new NotFoundException('ไม่พบข้อมูลผู้ใช้ที่เชื่อมกับบัญชีนี้');
    }

    const payload = {
      sub: auth.user.id,
      email: auth.email,
      role: auth.user.role,
    };

    const access_token = this.jwtService.sign(payload);

    const { password, ...safeUser } = auth;
    console.log(password);

    return {
      access_token,
      user: safeUser,
    };
  }

  async socialLogin(profile: any): Promise<string> {
    const { id, provider, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value || '';
    const avatar = photos?.[0]?.value || '';

    let user = await this.authRepo.findOne({
      where: { providerId: id, provider },
    });

    if (!user) {
      user = this.authRepo.create({
        providerId: id,
        provider,
        email,
        displayName,
        avatar,
      });
      await this.authRepo.save(user);
    }

    const payload = { sub: user.id, role: user.role };
    return this.jwtService.sign(payload);
  }

  async getUserById(id: string): Promise<Auth> {
    return this.authRepo.findOne({ where: { id } });
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ access_token: string; user: any }> {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.authRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const newUser = this.userRepo.create({
      email,
      name: dto.name,
      role: dto.role || 'user',
    });
    const savedUser = await this.userRepo.save(newUser);

    const hashed = await bcrypt.hash(dto.password, 10);
    const auth = this.authRepo.create({
      email: savedUser.email,
      password: hashed,
      displayName: savedUser.name,
      provider: 'manual',
      providerId: savedUser.id,
      role: savedUser.role,
    });
    await this.authRepo.save(auth);

    const payload = { sub: auth.id, email: auth.email, role: auth.role };
    const access_token = this.jwtService.sign(payload);

    const { password, ...safeUser } = auth;
    console.log(password);

    return { access_token, user: safeUser };
  }
}

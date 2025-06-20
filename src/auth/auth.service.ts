import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from './auth.entity';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
  ) {}
  async login(dto: LoginDto): Promise<{ access_token: string; user: any }> {
    const user = await this.authRepo.findOne({ where: { email: dto.email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    const { password, ...safeUser } = user;

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

  async register(dto: RegisterDto): Promise<{ access_token: string }> {
    const existing = await this.authRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.authRepo.create({
      email: dto.email,
      password: hashed,
      displayName: dto.name,
      role: 'user',
      provider: 'manual',
      providerId: 'manual',
    });
    await this.authRepo.save(user);

    const payload = { sub: user.id, email: user.email, role: user.role };
    return { access_token: this.jwtService.sign(payload) };
  }
}

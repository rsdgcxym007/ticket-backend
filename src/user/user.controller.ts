import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { success } from '../common/responses';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(@Req() req: Request) {
    const users = await this.userService.findAll();
    return success(users, 'List users', req);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const user = await this.userService.findById(id);
    return success(user, 'User detail', req);
  }

  @Post()
  async create(@Body() dto: CreateUserDto, @Req() req: Request) {
    const newUser = await this.userService.create(dto);
    return success(newUser, 'User created', req);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const updated = await this.userService.update(id, dto);
    return success(updated, 'User updated', req);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    await this.userService.remove(id);
    return success(null, 'User deleted', req);
  }
}

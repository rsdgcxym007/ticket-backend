import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiResponseHelper, AuditHelper } from '../common/utils';
import { Request } from 'express';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll() {
    const users = await this.userService.findAll();
    return ApiResponseHelper.success(users, 'Users retrieved successfully');
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const user = await this.userService.findById(id);

    // 📝 Audit logging for sensitive user data access
    const currentUser = (req as any).user;
    if (currentUser && currentUser.sub !== id) {
      // Only audit when viewing other users' data
      await AuditHelper.logView(
        'User',
        id,
        AuditHelper.createContextFromRequest(
          req,
          currentUser.sub,
          currentUser.role,
        ),
      );
    }

    return ApiResponseHelper.success(user, 'User retrieved successfully');
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const newUser = await this.userService.create(dto);
    return ApiResponseHelper.success(newUser, 'User created successfully');
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const updated = await this.userService.update(id, dto);
    return ApiResponseHelper.success(updated, 'User updated successfully');
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.userService.remove(id);
    return ApiResponseHelper.success(null, 'User deleted successfully');
  }
}

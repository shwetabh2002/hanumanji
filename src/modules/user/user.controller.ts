import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Patch, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('update-user')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile (auto-geocodes if coordinates provided)' })
  @ApiBody({ type: UpdateUserDto })
  async updateMe(@Req() req: any, @Body() dto: UpdateUserDto) {
    const userId = req.user.sub;
    return this.userService.updateUser(userId, dto);
  }

  @Get('user-data')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  async getUserData(@Req() req: any) {
    const userId = req.user.sub;
    return this.userService.findUserById(userId);
  }
}

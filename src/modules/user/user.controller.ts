import { Controller, Post, Body, HttpCode, HttpStatus, UseInterceptors, ClassSerializerInterceptor, Put, UseGuards, Req, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

import { UserService } from './user.service';
import { RegisterUserDto, VerifyOtpDto, ResendOtpDto } from './dto/register-user.dto';
import { RegisterResponseDto, VerifyOtpResponseDto, ResendOtpResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async registerUser(@Body() registerUserDto: RegisterUserDto): Promise<RegisterResponseDto> {
    // console.log(registerUserDto);
    return this.userService.registerUser(registerUserDto);
  }

  @Post('verify-otp')
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Phone number verified successfully',
    type: VerifyOtpResponseDto
  })    
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    return this.userService.verifyOtp(verifyOtpDto);
  }

  @Post('resend-otp')
  async resendOtp(@Body() resendOtpDto: ResendOtpDto): Promise<ResendOtpResponseDto> {
    return this.userService.resendOtp(resendOtpDto);
  }

  @Patch('update-user')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateUserDto })
  async updateMe(@Req() req: any, @Body() dto: UpdateUserDto) {
    const userId = req.user.sub;
    return this.userService.updateUser(userId, dto);
  }
} 
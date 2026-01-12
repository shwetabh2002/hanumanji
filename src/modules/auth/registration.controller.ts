import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { RegisterUserDto, VerifyOtpDto, ResendOtpDto } from '../user/dto/register-user.dto';
import { RegisterResponseDto, VerifyOtpResponseDto, ResendOtpResponseDto } from '../user/dto/user-response.dto';

@ApiTags('users')
@Controller('users')
export class RegistrationController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async registerUser(@Body() registerUserDto: RegisterUserDto): Promise<RegisterResponseDto> {
    return this.authService.registerUser(registerUserDto);
  }

  @Post('verify-otp')
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Phone number verified successfully',
    type: VerifyOtpResponseDto
  })    
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('resend-otp')
  async resendOtp(@Body() resendOtpDto: ResendOtpDto): Promise<ResendOtpResponseDto> {
    return this.authService.resendOtp(resendOtpDto);
  }
}


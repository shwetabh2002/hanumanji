import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { VerifyOtpDto } from '../user/dto/register-user.dto';
import { UserService } from '../user/user.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('login-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with OTP (verify and issue JWT tokens)' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async loginWithOtp(@Body() dto: VerifyOtpDto) {
    // First verify OTP using user service; it will clear OTP
    const result = await this.userService.verifyOtp(dto);
    // Build tokens for the verified user
    const user = await this.userService.findUserByPhoneNumber(result.user.phoneNumber);
    return this.authService.buildAuthResponse(user!);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user from access token' })
  async me(@Req() req: any) {
    return req.user;
  }
} 
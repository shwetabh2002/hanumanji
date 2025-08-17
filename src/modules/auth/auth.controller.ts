import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Get, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { VerifyOtpDto } from '../user/dto/register-user.dto';
import { UserService } from '../user/user.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RefreshTokenResponseDto } from './dto/refresh-token.dto';

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

  @Post('refresh')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtRefreshGuard)
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Refresh access token using refresh token' })
  // @ApiResponse({ status: 200, description: 'Tokens refreshed successfully', type: RefreshTokenResponseDto })
  async refresh(@Req() req: any) {
    console.log('refresh endpoint reached, user:', req.user);
    const userId = req.user.sub;
    const user = await this.userService.findUserById(userId);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    return this.authService.buildRefreshResponse(user);
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
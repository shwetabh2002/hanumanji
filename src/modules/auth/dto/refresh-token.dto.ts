import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenResponseDto {
  @ApiProperty({ description: 'New access token' })
  accessToken: string;

  @ApiProperty({ description: 'New refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Token type', example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Access token expiration time' })
  expiresIn: string;
} 
import { RegisterUserDto, VerifyOtpDto, ResendOtpDto } from '../dto/register-user.dto';
import { RegisterResponseDto, VerifyOtpResponseDto, ResendOtpResponseDto } from '../dto/user-response.dto';
import { UserDocument } from '../schemas/user.schema';

export interface IUserService {
  registerUser(registerUserDto: RegisterUserDto): Promise<RegisterResponseDto>;
  verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<VerifyOtpResponseDto>;
  resendOtp(resendOtpDto: ResendOtpDto): Promise<ResendOtpResponseDto>;
  findUserByPhoneNumber(phoneNumber: string): Promise<UserDocument | null>;
}

export interface IOtpService {
  generateOtp(): string;
  isOtpValid(user: UserDocument, providedOtp: string): boolean;
  isOtpExpired(user: UserDocument): boolean;
} 
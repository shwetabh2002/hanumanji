import { UserDocument } from '../schemas/user.schema';

export interface IUserService {
  findUserByPhoneNumber(phoneNumber: string): Promise<UserDocument | null>;
  findUserById(userId: string): Promise<UserDocument | null>;
}

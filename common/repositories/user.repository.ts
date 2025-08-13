import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';

import { User } from '../entities/user.entity';
import { UpdateUserCulture } from '../interfaces/user.interface';
import { BaseRepository } from './base.repository';
import { Errors, ErrorHandlerService } from '@app/error-handler';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(ErrorHandlerService)
    private errorHandlerService: ErrorHandlerService,
  ) {
    super(userModel);
  }
  async findUserByEmailOrMobile({
    email,
    primaryMobileNumber,
  }: {
    email?: string;
    primaryMobileNumber?: string;
  }) {
    if (!email && !primaryMobileNumber) return null;
    const orConditions: {
      email?: string;
      primaryMobileNumber?: string;
    }[] = [];
    if (email) orConditions.push({ email });
    if (primaryMobileNumber) orConditions.push({ primaryMobileNumber });
    return this.findOne({ $or: orConditions });
  }

  async updateUserCulture({
    userCulture,
    userId,
  }: {
    userId: string;
    userCulture: string;
  }): Promise<UpdateUserCulture> {
    return this.errorHandlerService.raiseErrorIfNullAsync(
      this.userModel.findOneAndUpdate<UpdateUserCulture>(
        { _id: new mongoose.Types.ObjectId(userId) },
        [
          {
            $set: {
              initialUserCulture: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$initialUserCulture', null] },
                      { $not: '$initialUserCulture' },
                    ],
                  }, // Check if `initialUserCulture` is null
                  userCulture, // Set `userCulture` if null
                  '$initialUserCulture', // Keep existing value if not null
                ],
              },
              userCulture: userCulture, // Set `userCulture` directly
            },
          },
        ],
        {
          new: true, // Return the updated document
          projection: { initialUserCulture: 1, userCulture: 1 }, // Return only specified fields
        },
      ),
      Errors.USER.USER_NOT_FOUND(),
    );
  }
}

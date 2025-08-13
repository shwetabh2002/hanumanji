import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ObjectId } from 'mongodb';

import { UserProfile } from '../entities/userProfile.entity';
import { ProfileStatus } from '../enums/app.enum';
import { BaseRepository } from './base.repository';

export class UserProfileRepository extends BaseRepository<UserProfile> {
  constructor(
    @InjectModel(UserProfile.name)
    private readonly userProfileModel: Model<UserProfile>,
  ) {
    super(userProfileModel);
  }

  async countDocuments(user: ObjectId) {
    const profilesCount = await this.userProfileModel.countDocuments({
      status: ProfileStatus.ACTIVE,
      user: user,
    });
    return profilesCount;
  }
  async softDelete(id: string) {
    return await this.userProfileModel.updateOne(
      { _id: id },
      { $set: { deletedAt: new Date(), status: ProfileStatus.DELETED } },
    );
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';

import { Content, UserWatchData } from '../entities/userWatchData.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserWatchDataRepository extends BaseRepository<UserWatchData> {
  constructor(
    @InjectModel(UserWatchData.name)
    private userWatchDataModel: Model<UserWatchData>,
  ) {
    super(userWatchDataModel);
  }

  async createUserWatchData(data: UserWatchData) {
    return this.userWatchDataModel.create(data);
  }

  async updateUserWatchData(user: Types.ObjectId, contents: Content[]) {
    return this.userWatchDataModel.updateOne(
      { user: user },
      { contents: contents },
      {
        upsert: true,
      },
    );
  }
}

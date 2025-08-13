import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UserSubscriptionV1 } from '../entities/userSubscription.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserSubscriptionV1Repository extends BaseRepository<UserSubscriptionV1> {
  constructor(
    @InjectModel(UserSubscriptionV1.name)
    private userSubscriptionModel: Model<UserSubscriptionV1>,
  ) {
    super(userSubscriptionModel);
  }
}

import { Injectable } from '@nestjs/common';

import { SubscriptionStatus } from '../entities/userSubscription.entity';
import { UserSubscriptionV1Repository } from '../repositories/userSubscriptionV1.repository';

@Injectable()
export class UserSubscriptionUtil {
  constructor(
    private readonly userSubscriptionV1Repository: UserSubscriptionV1Repository,
  ) {}

  async checkIfUserIsSubscribed(userId: string) {
    return this.userSubscriptionV1Repository.findOne(
      {
        subscriptionStatus: SubscriptionStatus.ACTIVE_SUBSCRIBER,
        userId,
      },
      ['subscriptionExpiry'],
      {
        lean: true,
      },
    );
  }
}

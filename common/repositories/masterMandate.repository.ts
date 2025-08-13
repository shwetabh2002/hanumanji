import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { MasterMandate } from '../entities/masterMandate.entity';
import { RecurringTransactionStatusEnum } from '../enums/common.enums';
import { BaseRepository } from './base.repository';

export class MasterMandateRepository extends BaseRepository<MasterMandate> {
  constructor(
    @InjectModel(MasterMandate.name)
    private readonly masterMandateModel: Model<MasterMandate>,
  ) {
    super(masterMandateModel);
  }
  async markMandateRefunded(_id: string, mandateStatus?: string) {
    return this.findByIdAndUpdate(_id, {
      $push: {
        statusHistory: {
          $each: [{ status: mandateStatus, time: new Date() }],
        },
      },
      status: mandateStatus,
      txnStatus: RecurringTransactionStatusEnum.NOTIFICATION_PAUSED,
    });
  }
}

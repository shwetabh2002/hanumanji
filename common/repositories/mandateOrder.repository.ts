import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { MandateOrder } from '../entities/mandateOrder.enitity';
import { DirectIntegrationPGEnum } from '../enums/common.enums';
import { BaseRepository } from './base.repository';

interface PGTrialSuccessRate {
  endTime: Date;
  pgName: DirectIntegrationPGEnum;
  startTime: Date;
}

export class MandateOrderRepository extends BaseRepository<MandateOrder> {
  constructor(
    @InjectModel(MandateOrder.name)
    private readonly mandateOrderModel: Model<MandateOrder>,
  ) {
    super(mandateOrderModel);
  }

  async checkPgTrialSuccessRate({
    endTime,
    pgName,
    startTime,
  }: PGTrialSuccessRate) {
    const result = await this.mandateOrderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startTime,
            $lt: endTime,
          },
          pgName,
        },
      },
      {
        $project: {
          status: 1,
        },
      },
      {
        $facet: {
          mandate_active_docs: [
            { $match: { status: 'mandate_active' } },
            { $count: 'mandate_active_count' },
          ],
          total_docs: [{ $count: 'total' }],
        },
      },
      {
        $project: {
          mandate_active_docs: {
            $arrayElemAt: ['$mandate_active_docs.mandate_active_count', 0],
          },
          total_docs: {
            $arrayElemAt: ['$total_docs.total', 0],
          },
        },
      },
      {
        $project: {
          mandate_active_ratio: {
            $cond: {
              else: 1, // if less than threshold we will get false alerts
              if: { $gt: ['$total_docs', 0] },
              then: {
                $divide: ['$mandate_active_docs', '$total_docs'],
              },
            },
          },
        },
      },
    ]);

    return result[0]?.mandate_active_ratio ?? 1;
  }
}

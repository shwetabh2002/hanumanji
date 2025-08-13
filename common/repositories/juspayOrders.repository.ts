import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { JuspayOrder } from '../entities/juspayOrders.entity';
import { JuspayOrderStatusEnum } from '../enums/common.enums';
import { BaseRepository } from './base.repository';
import { Errors } from '@app/error-handler';

export class JuspayOrderRepository extends BaseRepository<JuspayOrder> {
  constructor(
    @InjectModel(JuspayOrder.name)
    private readonly juspayOrderModel: Model<JuspayOrder>,
  ) {
    super(juspayOrderModel);
  }
  async markJuspayRefunded(
    userId: string,
    _id: Types.ObjectId,
    mandateStatus?: string,
  ) {
    await this.findByIdAndUpdate(_id, {
      $push: {
        refundStatusHistory: {
          status: mandateStatus,
          time: new Date(),
        },
      },
      refundStatus: mandateStatus,
    });

    const latestJuspayOrder = await this.findOne(
      { user: new Types.ObjectId(userId) },
      undefined,
      { sort: { createdAt: -1 } },
    );

    if (!latestJuspayOrder) {
      console.error(`Failed to fetch latest juspay order doc for refund`, {
        mandateStatus,
        userId,
      });
      throw Errors.JUSPAY.ORDER_NOT_FOUND();
    }

    return this.findByIdAndUpdate(latestJuspayOrder._id.toString(), {
      orderStatus: JuspayOrderStatusEnum.REFUNDED,
    });
  }
}

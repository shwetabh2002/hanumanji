import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UserSubscriptionHistory } from '../entities/userSubscriptionHistory.entity';
import { BaseRepository } from '@app/common/repositories/base.repository';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';
@Injectable()
export class UserSubscriptionHistoryRepository extends BaseRepository<UserSubscriptionHistory> {
  constructor(
    @InjectModel(UserSubscriptionHistory.name)
    private userSubscriptionHistoryModel: Model<UserSubscriptionHistory>,
  ) {
    super(userSubscriptionHistoryModel);
  }
  async getUserSubscriptionHistoryWithRefunds(userId: string) {
    return this.userSubscriptionHistoryModel.aggregate([
      {
        $match: {
          userId,
          vendor: {
            $in: [
              PaymentGatewayEnum.PAYTM,
              PaymentGatewayEnum.PHONEPE,
              PaymentGatewayEnum.JUSPAY,
            ],
          },
        },
      },
      {
        $lookup: {
          as: 'refund',
          foreignField: 'subscriptionId',
          from: 'refunds',
          localField: 'subscriptionId',
        },
      },
      { $unwind: { path: '$refund', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          payingPrice: 1,
          refundAmount: '$refund.refundAmount',
          refundCreatedAt: '$refund.createdAt',
          refundInitiatedByUserName: '$refund.refundInitiatedByUserName',
          refundReason: '$refund.reason',
          refundStatus: '$refund.refundStatus',
          refundStatusHistory: '$refund.refundStatusHistory',
          refundTransactionId: '$refund.refundTransactionId',
          refundVendor: '$refund.vendor',
          subscriptionDate: 1,
          subscriptionId: 1,
          subscriptionValid: 1,
          userId: 1,
          vendor: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);
  }
}

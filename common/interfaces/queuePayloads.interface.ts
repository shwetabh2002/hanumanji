import { QUEUES } from '../constants/queues.const';
import { PaymentGatewayEnum } from '@app/payment/enums/paymentGateway.enums';
import { ContentQueueKeys } from 'src/content/interfaces/paymentQueuePayload.interface';

export interface QueuePayload {
  [QUEUES.CONTENTS]: {
    key: ContentQueueKeys;
  };
  [QUEUES.MANDATE_DEBIT_EXECUTION]: {
    userSubscriptionId: string;
    amount: number;
    pgMandateId: string;
    mandateId: string;
  };
  [QUEUES.MANDATE_DEBIT_NOTIFICATIONS]: {
    userId: string;
    subscriptionId: string;
    endAt: Date;
    mandateId: string;
    planId: string;
    startAt: Date;
  };
  [QUEUES.MANDATE_NOTIFICATION_CHECK]: {
    pgMandateId: string;
    pgNotificationId: string;
    pg: PaymentGatewayEnum;
  };
  [QUEUES.SUBSCRIPTION_CHECK]: {
    subscriptionId: string;
  };
}

export enum EnvironmentEnum {
  DEVELOPMENT = 'development',
  PREPROD = 'preprod',
  PRODUCTION = 'production',
  TEST = 'test',
}

export enum DirectIntegrationPGEnum {
  PAYTM = 'PAYTM',
  PHONEPE = 'PHONEPE',
}

export enum PaymentInstrumentEnum {
  UPI_COLLECT = 'UPI_COLLECT',
  UPI_INTENT = 'UPI_INTENT',
}

export enum LoginEnum {
  'EMAIL' = 'email',
  'MOBILE' = 'mobilenumber',
  'SOCIAL' = 'social',
}

export enum MasterOrderStatusEnum {
  MANDATE_ACTIVE = 'mandate_active',
  MANDATE_CANCELLED_AND_STARTED_ANEW = 'mandate_cancelled_and_started_anew',
  MANDATE_FAILED = 'mandate_failed',
  MANDATE_INITIATED = 'mandate_initiated',
  MANDATE_PAUSED_IN_APP = 'mandate_paused_in_app',
  MANDATE_PAUSED_NO_APP_OPEN = 'mandate_paused_no_app_open',
  MANDATE_PAUSED_PSP = 'mandate_paused_psp',
  MANDATE_PAUSED_RETRIES_EXHAUSTED = 'mandate_paused_retries_exhausted', //Max number of mandate retries exhausted
  MANDATE_REFUNDED = 'mandate_refunded',
  MANDATE_REVOKED_IN_APP = 'mandate_revoked_in_app',
  MANDATE_REVOKED_PSP = 'mandate_revoked_psp',
}

export enum MasterMandateStatusEnum {
  MANDATE_ACTIVE = 'mandate_active',
  MANDATE_CANCELLED_AND_STARTED_ANEW = 'mandate_cancelled_and_started_anew',
  MANDATE_FAILED = 'mandate_failed',
  MANDATE_INITIATED = 'mandate_initiated',
  MANDATE_PAUSED = 'mandate_paused',
  MANDATE_PAUSED_IN_APP = 'mandate_paused_in_app',
  MANDATE_PAUSED_NO_APP_OPEN = 'mandate_paused_no_app_open',
  MANDATE_PAUSED_PSP = 'mandate_paused_psp',
  MANDATE_PAUSED_RETRIES_EXHAUSTED = 'mandate_paused_retries_exhausted', //Max number of mandate retries exhausted
  MANDATE_REFUNDED = 'mandate_refunded', // FIXME: This should not be part of the mandate status.
  MANDATE_REVOKED_IN_APP = 'mandate_revoked_in_app',
  MANDATE_REVOKED_PSP = 'mandate_revoked_psp',
}

export enum JuspayOrderStatusEnum {
  AUTH_TXN_COMPLETED = 'auth-transaction-completed',
  AUTH_TXN_GENERATED = 'auth-transaction-generated',
  CANCELLED = 'cancelled',
  MANDATE_PAUSED = 'mandate-paused',
  MANDATE_RESUMED = 'mandate-resumed',
  MANDATE_REVOKED = 'mandate-revoked',
  NOTIFICATION_FAILED = 'notification-failed',
  NOTIFICATION_SUCCEEDED = 'notification-succeeded',
  ORDER_FAILED = 'order-failed',
  ORDER_SUCCEEDED = 'order-succeeded',
  PAUSED = 'paused',
  RECURRING_PAYMENT_COMPLETED = 'recurring-payment-completed',
  RECURRING_PAYMENT_SCHEDULED = 'recurring-payment-scheduled',
  RECURRING_PAYMENT_TRIGGER_FAILED = 'recurring-payment-trigger-failed',
  RECURRING_PAYMENT_TRIGGERED = 'recurring-payment-triggered',
  REFUNDED = 'mandate-refunded',
  RESUMED = 'resumed',
}

export enum RecurringTransactionStatusEnum {
  DEBIT_DEDUCTION_FAILED = 'debit_deduction_failed',
  DEBIT_DEDUCTION_RETRY = 'debit_deduction_retry',
  DEBIT_DEDUCTION_SCHEDULED = 'debit_deduction_scheduled',
  DEBIT_DEDUCTION_SUCCESSFUL = 'debit_deduction_successful',
  DEBIT_DEDUCTION_TRIGGERED = 'debit_deduction_triggered',
  NOTIFICATION_FAILED = 'notification_failed',
  NOTIFICATION_LIMIT_EXHAUSTED = 'notification_limit_exhausted',
  NOTIFICATION_PAUSED = 'notification_paused',
  NOTIFICATION_RETRY = 'notification_retry',
  NOTIFICATION_SCHEDULED = 'notification_scheduled',
  NOTIFICATION_SUCCESSFUL = 'notification_successful',
  NOTIFICATION_TRIGGERED = 'notification_triggered',
}

export enum userSubscriptionStatusEnum {
  ACTIVE = 1,
  EXPIRED = 2,
  NOT_PURCHASED = 0,
}

export enum userSubscriptionHistoryStatusEnum {
  ACTIVE = 'active',
  CANCEL = 'cancel',
  REFUNDED = 'refunded',
}

export enum RecurringRefundStatus {
  REFUND_FAILED = 'refund_failed',
  REFUND_PENDING = 'refund_pending',
  REFUND_SCHEDULED = 'refund_scheduled',
  REFUND_SUCCESSFUL = 'refund_successful',
  REFUND_TRIGGERED = 'refund_triggered',
}

export enum ContentType {
  EPISODE = 'episode',
  MOVIE = 'individual',
  REEL = 'reel',
  SEASON = 'season',
  SHOW = 'show',
  YOUTUBE = 'youtubelivestreaming',
}

export enum ContentTypeV2 {
  MOVIE = 'movie',
  SHOW = 'show',
}

export enum RevokeTrigger {
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  NEW_AUTOPAY = 'NEW_AUTOPAY',
}

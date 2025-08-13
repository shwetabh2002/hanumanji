import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';

import qs from 'querystring';

import { APP_CONFIGS } from '../configs/app.config';
import { CommonUtils } from './common.utils';
import { ErrorHandlerService, Errors } from '@app/error-handler';

const { JUSPAY } = APP_CONFIGS;

export interface JuspayOrderResponse {
  amount?: number;
  amount_debited?: number;
  amount_refunded?: number;
  auth_type?: string;
  bank_error_code?: string;
  bank_error_message?: string;
  bank_pg?: string | null;
  currency?: string;
  customer_email?: string;
  customer_id?: string;
  customer_phone?: string;
  date_created?: string;
  effective_amount?: number;
  error_message?: string;
  gateway_id?: number;
  gateway_reference_id?: string | null;
  id?: string;
  mandate?: MandateDetails;
  maximum_eligible_refund_amount?: number;
  merchant_id?: string;
  metadata?: Metadata;
  order_id?: string;
  payer_vpa?: string;
  payment_gateway_response?: PaymentGatewayResponse;
  payment_links?: PaymentLinks;
  payment_method?: string;
  payment_method_type?: string;
  product_id?: string;
  refunded?: boolean;
  refunds?: RefundDetails[];
  return_url?: string;
  status?: string;
  status_id?: number;
  txn_detail?: TransactionDetail;
  txn_id?: string;
  txn_uuid?: string;
  udf1?: string;
  udf10?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  udf6?: string;
  udf7?: string;
  udf8?: string;
  udf9?: string;
  upi?: UpiDetails;
}

export interface UpiDetails {
  payer_vpa: string;
  txn_flow_type: string;
}

export interface RefundDetails {
  amount: number;
  created: string;
  error_code: string | null;
  error_message: string;
  expected_refund_credit_time: string;
  id: string | null;
  initiated_by: string;
  ref: string | null;
  refund_source: string;
  refund_type: string;
  sent_to_gateway: boolean;
  status: string;
  unique_request_id: string;
}

export interface MandateDetails {
  amount_rule: string;
  block_fund: boolean;
  end_date: string;
  frequency?: string;
  mandate_id: string;
  mandate_status: string;
  mandate_token: string;
  mandate_type: string;
  max_amount: number;
  revokable_by_customer: boolean;
  start_date: string;
}

export interface PaymentLinks {
  iframe: string;
  mobile: string;
  web: string;
}

export interface PaymentGatewayResponse {
  auth_id_code: string;
  created: string;
  debit_amount: string;
  epg_txn_id: string;
  resp_code: string;
  resp_message: string;
  rrn: string;
  txn_id: string;
}

export interface TransactionDetail {
  created: string;
  currency: string;
  error_code: string;
  error_message: string;
  express_checkout: boolean;
  gateway: string;
  gateway_id: number;
  metadata: TransactionMetadata;
  net_amount: number;
  order_id: string;
  redirect: boolean;
  source_object: string;
  source_object_id: string;
  status: string;
  surcharge_amount: number | null;
  tax_amount: number | null;
  txn_amount: number;
  txn_flow_type: string;
  txn_id: string;
  txn_object_type: string;
  txn_uuid: string;
}

export interface TransactionMetadata {
  payment_channel: string;
}

export interface Metadata {
  merchant_payload: string;
  payment_links: PaymentLinks;
  payment_locking: PaymentLocking;
  payment_page_client_id: string;
  payment_page_sdk_payload: string;
}

export interface PaymentLocking {
  payment_filter: string;
}

@Injectable()
export class JuspayUtils {
  private readonly juspayApiUrl;

  constructor(
    @Inject(ErrorHandlerService)
    private readonly errorHandlerService: ErrorHandlerService,
  ) {
    this.juspayApiUrl = JUSPAY.API_URL;
  }

  createRefundUrl(juspayOrderId: string): string {
    this.errorHandlerService.raiseErrorIfNull(
      juspayOrderId,
      Errors.JUSPAY.ORDER_ID_REQUIRED(),
    );
    return `${this.juspayApiUrl}/orders/${juspayOrderId}/refunds`;
  }

  createUniqueOrderId(orderId: string): string {
    this.errorHandlerService.raiseErrorIfNull(
      orderId,
      Errors.JUSPAY.ORDER_ID_REQUIRED(),
    );

    const [actualOrderId, orderIdNumber = 0] = orderId.includes('__')
      ? orderId.split('__')
      : orderId.split('--');

    return `${actualOrderId}--${+orderIdNumber + 1}`;
  }

  async refundTransaction(
    juspayOrderId: string,
    amount: number,
  ): Promise<JuspayOrderResponse> {
    this.errorHandlerService.raiseErrorIfNull(
      juspayOrderId,
      Errors.JUSPAY.ORDER_ID_REQUIRED(),
    );
    const date: string = CommonUtils.dateYYYYMMDDInIndianTimeZoneHandler();

    const body = qs.stringify({
      amount: '' + amount,
      unique_request_id:
        this.createUniqueOrderId(juspayOrderId.toString()) + '2',
    });

    const headers = {
      Authorization: `Basic ${Buffer.from(`${JUSPAY.API_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      version: date,
      'x-merchantid': JUSPAY.MERCHANT_ID,
    };
    const url = this.createRefundUrl(juspayOrderId.toString());
    //TODO: Use try catch wrapper instead
    return axios
      .post(url, body, { headers })
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        return {
          error_message: err.response.data.error_info.user_message,
          refunded: false,
        };
      });
  }
}

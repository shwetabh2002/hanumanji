import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

import { APP_CONFIGS } from '../configs/app.config';
import { RecurringRefundStatus } from '../enums/common.enums';

const { PHONEPE } = APP_CONFIGS;

interface IPhonePePayloadEncryptionResponse {
  base64Payload: string;
  xVerify: string;
}

interface IRefundTransactionParams {
  amount: number;
  merchantOrderId: string;
  pgTxnId: string;
}

export interface IPhonePeRefundTransactionPayload {
  amount: number;
  merchantId: string;
  merchantOrderId: string;
  message: string;
  providerReferenceId: string;
  transactionId: string;
}
interface RefundResponseData {
  amount: number;
  merchantId: string;
  payResponseCode: string;
  providerReferenceId: string;
  transactionId: string;
}

export interface RefundResponse {
  code?: string;
  data: RefundResponseData;
  error_message?: string;
  message?: string;
  refundStatus: RecurringRefundStatus;
  success?: boolean;
}

@Injectable()
export class PhonePeUtils {
  private axiosInstance: AxiosInstance;
  private readonly phonepeApiUrl;
  private readonly phonepeCallbackUrl = PHONEPE.CALLBACK_URL;
  private readonly phonepeRefundTransactionEndpoint = PHONEPE.REFUND_URL_PATH;
  constructor() {
    this.phonepeApiUrl = PHONEPE.API_URL;
    this.axiosInstance = axios.create({
      baseURL: this.phonepeApiUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-CALLBACK-URL': this.phonepeCallbackUrl,
      },
    });
  }

  private createBase64Payload(
    payload: IPhonePeRefundTransactionPayload,
  ): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private createStringToHash(base64Payload: string, endpoint: string): string {
    return base64Payload + endpoint + PHONEPE.SALT_KEY;
  }

  private createXVerify(hash: string): string {
    return `${hash}###${PHONEPE.SALT_INDEX}`;
  }

  private generateSHA256Hash(stringToHash: string): string {
    return crypto.createHash('sha256').update(stringToHash).digest('hex');
  }

  encryptPayload(
    payload: IPhonePeRefundTransactionPayload,
    endpoint: string,
  ): IPhonePePayloadEncryptionResponse {
    const base64Payload = this.createBase64Payload(payload);
    const stringToHash = this.createStringToHash(base64Payload, endpoint);
    const hash = this.generateSHA256Hash(stringToHash);
    const xVerify = this.createXVerify(hash);
    return { base64Payload, xVerify };
  }

  async refundTransaction(
    params: IRefundTransactionParams,
  ): Promise<RefundResponse> {
    const { amount, merchantOrderId, pgTxnId } = params;

    const payload: IPhonePeRefundTransactionPayload = {
      amount: amount * 100, // converting amount to paise
      merchantId: PHONEPE.MERCHANT_ID,
      merchantOrderId,
      message: 'Refund transaction by Agent',
      providerReferenceId: pgTxnId,
      transactionId: 'REFUND' + pgTxnId,
    };

    const { base64Payload, xVerify } = this.encryptPayload(
      payload,
      this.phonepeRefundTransactionEndpoint,
    );
    const body = { request: base64Payload };

    //TODO: Use try catch wrapper instead
    return await axios
      .post(this.phonepeApiUrl + this.phonepeRefundTransactionEndpoint, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-CALLBACK-URL': this.phonepeCallbackUrl,
          'X-VERIFY': xVerify,
        },
      })
      .then((res) => {
        return {
          ...res.data,
          refundStatus:
            res.data.code === 'PAYMENT_SUCCESS'
              ? RecurringRefundStatus.REFUND_SUCCESSFUL
              : res.data.code === 'PAYMENT_PENDING'
                ? RecurringRefundStatus.REFUND_PENDING
                : RecurringRefundStatus.REFUND_FAILED,
        };
      })
      .catch((err) => {
        return {
          error_message: err.response.data.error_message,
          refundStatus: RecurringRefundStatus.REFUND_FAILED,
        };
      });
  }
}

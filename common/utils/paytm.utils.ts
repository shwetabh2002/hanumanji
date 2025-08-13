import { Injectable } from '@nestjs/common';
import axios from 'axios';

import { APP_CONFIGS } from '../configs/app.config';
import { PaytmChecksum } from './paytmChecksum.util';
import { IPaytmRefundTransactionPayload } from 'src/admin/refund/interfaces/PaytmRefundTransactionPayload.interface';

interface IRefundParams {
  orderId: string;
  refId: string;
  refundAmount: number;
  txnId: string;
}
interface IResultInfo {
  resultCode: string;
  resultMsg: string;
  resultStatus: string;
}

interface IRefundDetailInfo {
  payMethod: string;
  refundAmount: string;
  refundType: string;
  userMobileNo: string;
}

interface IRefundBody {
  acceptRefundStatus: string;
  acceptRefundTimestamp: string;
  merchantRefundRequestTimestamp: string;
  mid: string;
  orderId: string;
  refId: string;
  refundAmount: string;
  refundDetailInfoList: IRefundDetailInfo[];
  refundId: string;
  refundReason: string;
  resultInfo: IResultInfo;
  source: string;
  totalRefundAmount: string;
  txnAmount: string;
  txnId: string;
  txnTimestamp: string;
  userCreditInitiateStatus: string;
}

interface IRefundHead {
  responseTimestamp: string;
  signature: string;
  version: string;
}

export interface IPaytmRefundResponse {
  body?: IRefundBody;
  error_message?: string;
  head?: IRefundHead;
  refunded: boolean;
}
@Injectable()
export class PaytmUtils {
  private readonly paytmApiUrl: string;
  private readonly paytmRefundApiEndpoint = APP_CONFIGS.PAYTM.REFUND_URL_PATH;
  private readonly refundTransactionTypes = 'REFUND';
  constructor() {
    this.paytmApiUrl = APP_CONFIGS.PAYTM.API_URL;
  }

  async refundTransaction(refundParams: IRefundParams) {
    const paytmParams: IPaytmRefundTransactionPayload = {
      body: {
        mid: APP_CONFIGS.PAYTM.MERCHANT_ID,
        orderId: refundParams.orderId,
        refId: refundParams.refId,
        refundAmount: refundParams.refundAmount,
        txnId: refundParams.txnId,
        txnType: this.refundTransactionTypes,
      },
    };

    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      APP_CONFIGS.PAYTM.MERCHANT_KEY,
    );

    paytmParams.head = { signature: checksum };

    const data: string = JSON.stringify(paytmParams);

    const endpointUrl: string = new URL(
      this.paytmRefundApiEndpoint,
      this.paytmApiUrl,
    ).href;

    const headers = {
      'Content-Length': data.length,
      'Content-Type': 'application/json',
    };

    //TODO: Use try catch wrapper instead
    return await axios
      .post(endpointUrl, data, { headers })
      .then((res) => {
        return {
          ...res.data,
          refunded: true,
        };
      })
      .catch((err) => {
        return {
          error_message: err.response.data.error_message,
          refunded: false,
        };
      });
  }
}

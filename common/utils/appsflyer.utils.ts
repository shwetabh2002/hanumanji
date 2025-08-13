import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

import { APP_CONFIGS } from '../configs/app.config';

const { APPSFLYER } = APP_CONFIGS;

interface IAppsFlyerShortlinkParams {
  campaign: string;
  deepLinkValue: string;
}

interface IAppsFlyerUpdateShortlinkParams {
  shortlinkId: string;
  campaign: string;
  deepLinkValue: string;
  ttl?: string;
}

export interface IAppsFlyerShortlinkPayload {
  ttl: string;
  renew_ttl: boolean;
  data: {
    pid: string;
    c: string;
    deep_link_value: string;
    af_dp: string;
  };
}

interface ShortlinkResponseData {
  short_url: string;
}

export interface ShortlinkResponse {
  success: boolean;
  data?: ShortlinkResponseData;
  error_message?: string;
  message?: string;
}

@Injectable()
export class AppsFlyerUtils {
  private axiosInstance: AxiosInstance;
  private readonly appsflyerApiUrl = APPSFLYER.SHORTLINK_API_URL;
  private readonly shortlinkEndpoint = `${APPSFLYER.SHORTLINK_ENDPOINT}/${APPSFLYER.TEMPLATE_ID}`;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.appsflyerApiUrl,
      headers: {
        'Content-Type': 'application/json',
        authorization: APPSFLYER.API_TOKEN,
      },
    });
  }

  // POST - Create Shortlink
  private createShortlinkPayload(
    params: IAppsFlyerShortlinkParams,
  ): IAppsFlyerShortlinkPayload {
    const { campaign, deepLinkValue } = params;

    return {
      ttl: APPSFLYER.TTL,
      renew_ttl: true,
      data: {
        pid: APPSFLYER.PID,
        c: campaign,
        deep_link_value: deepLinkValue,
        af_dp: APPSFLYER.AF_DP,
      },
    };
  }

  async createShortlink(
    params: IAppsFlyerShortlinkParams,
  ): Promise<ShortlinkResponse> {
    const payload = this.createShortlinkPayload(params);

    //TODO: Use try catch wrapper instead
    return await this.axiosInstance
      .post(this.shortlinkEndpoint, payload)
      .then((res) => {
        return {
          success: true,
          data: {
            short_url: res.data,
          },
        };
      })
      .catch((err) => {
        return {
          success: false,
          error_message: err.response?.data?.message || err.message,
        };
      });
  }

  // PUT - Update Shortlink
  private createUpdateShortlinkPayload(
    params: IAppsFlyerUpdateShortlinkParams,
  ): Partial<IAppsFlyerShortlinkPayload> {
    const { campaign, deepLinkValue, ttl } = params;

    return {
      ttl: ttl || APPSFLYER.TTL,
      renew_ttl: true,
      data: {
        pid: APPSFLYER.PID,
        c: campaign,
        deep_link_value: deepLinkValue,
        af_dp: APPSFLYER.AF_DP,
      },
    };
  }

  async updateShortlink(
    params: IAppsFlyerUpdateShortlinkParams,
  ): Promise<ShortlinkResponse> {
    const { shortlinkId } = params;
    const payload = this.createUpdateShortlinkPayload(params);
    const updateEndpoint = `${this.shortlinkEndpoint}/${shortlinkId}`;

    //TODO: Use try catch wrapper instead
    return await this.axiosInstance
      .put(updateEndpoint, payload)
      .then((res) => {
        return {
          success: true,
          data: {
            short_url: res.data,
          },
        };
      })
      .catch((err) => {
        return {
          success: false,
          error_message: err.response?.data?.message || err.message,
        };
      });
  }
}

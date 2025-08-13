import { Injectable, Logger } from '@nestjs/common';

import axios, { AxiosInstance } from 'axios';

import { AxiosError } from 'axios';

import { APP_CONFIGS } from '../configs/app.config';
import { Dialect } from '../enums/app.enum';
import {
  INcantoResponse,
  INcantoSubscriber,
} from '../interfaces/INcantoResponse';
import {
  NcantoAsset,
  NcantoAssetType,
} from '../interfaces/ncantoAsset.interface';
import { handleAxiosErrorLog } from './helpers';
import { UserSubscriptionUtil } from './userSubscription.util';
import { ErrorHandlerService } from '@app/error-handler';
import { RedisService } from '@app/redis';
import { DDMetric } from 'common/dtos/dd.dto';
import tracer from 'src/integrations';
import {
  NcantoInteraction,
  XRoadMediaUserInteractionData,
} from 'src/users/interfaces/ncanto.interfaces';
@Injectable()
export class NcantoUtils {
  private readonly axiosInstance: AxiosInstance;
  private readonly logger = new Logger(NcantoUtils.name);
  private readonly ncantoApiKey: string;
  private readonly ncantoApiUrl: string;
  private readonly storeId: string;

  constructor(
    private readonly errorHandler: ErrorHandlerService,
    private readonly userSubscriptionUtil: UserSubscriptionUtil,
    private readonly redisService: RedisService,
  ) {
    this.ncantoApiUrl = APP_CONFIGS.NCANTO.API_URL;
    this.ncantoApiKey = APP_CONFIGS.NCANTO.API_KEY;
    this.storeId = APP_CONFIGS.NCANTO.STORE_ID;
    this.axiosInstance = axios.create({
      baseURL: this.ncantoApiUrl,
      headers: {
        api_key: this.ncantoApiKey,
        'Content-Type': 'application/json',
      },
    });
  }
  private async addSubscriberProfile(subscriberId: string, profileId: string) {
    const [response, error] = await this.errorHandler.try<unknown, AxiosError>(
      () => {
        return this.axiosInstance.post(`/subscriber/${subscriberId}/profiles`, {
          add: [profileId],
        });
      },
    );

    if (error) {
      tracer.dogstatsd.increment(DDMetric.NcantoProfileAddFailure, 1, {
        function: 'addSubscriberProfile',
        service: NcantoUtils.name,
      });
      this.logger.warn(
        { error: handleAxiosErrorLog(error) },
        `[${NcantoUtils.name}]:addSubscriberProfile Failed to add subscriber profile ${profileId} to subscriber ${subscriberId}`,
      );
      return;
    }

    tracer.dogstatsd.increment(DDMetric.NcantoProfileAddSuccess, 1, {
      function: 'addSubscriberProfile',
      service: NcantoUtils.name,
    });

    this.logger.debug(
      { response },
      `[${NcantoUtils.name}]:addSubscriberProfile Successfully added subscriber profile ${profileId} to subscriber ${subscriberId}`,
    );
  }
  private async createNewSubscriber(
    subscriberId: string,
    profileId: string,
    inhouse: boolean,
  ) {
    const [response, error] = await this.errorHandler.try<unknown, AxiosError>(
      () => {
        return this.axiosInstance.put(`/subscriber/${subscriberId}`, {
          customProperties: {
            subscriptionType: inhouse ? 'internal' : 'external',
          },
          profiles: [profileId],
          subscriberId,
        });
      },
    );

    if (error) {
      tracer.dogstatsd.increment(DDMetric.NcantoSubscriberCreationFailure, 1, {
        function: 'createNewSubscriber',
        service: NcantoUtils.name,
      });
      this.logger.warn(
        { error: handleAxiosErrorLog(error) },
        `[${NcantoUtils.name}]:createNewSubscriber Failed to create new subscriber for ${subscriberId} and profile ${profileId}`,
      );
      return false;
    }

    tracer.dogstatsd.increment(DDMetric.NcantoSubscriberCreationSuccess, 1, {
      function: 'createNewSubscriber',
      service: NcantoUtils.name,
    });

    this.logger.debug(
      { response },
      `[${NcantoUtils.name}]:createNewSubscriber Successfully created new subscriber for ${subscriberId} and profile ${profileId}`,
    );
  }

  private ncantoSubscriberCacheKey(subscriberId: string) {
    return `ncanto:subscriber:${subscriberId}`;
  }

  async addContentMetadata(content: NcantoAsset) {
    const [response, error] = await this.errorHandler.try<unknown, AxiosError>(
      () => {
        return this.axiosInstance.post(`/store/${this.storeId}/asset`, {
          update: [content],
          updateOnlyIfNewer: true,
        });
      },
    );

    if (error) {
      tracer.dogstatsd.increment(DDMetric.NcantoStoreAssetUpdateFailure, 1, {
        function: 'addContentMetadata',
        service: NcantoUtils.name,
      });
      this.logger.warn(
        { error: handleAxiosErrorLog(error) },
        `[${NcantoUtils.name}]:addContentMetadata Failed to add content metadata ${content.programType} and slug ${content.assetId}`,
      );
      return;
    }

    tracer.dogstatsd.increment(DDMetric.NcantoStoreAssetUpdateSuccess, 1, {
      function: 'addContentMetadata',
      service: NcantoUtils.name,
    });

    this.logger.debug(
      { response },
      `[${NcantoUtils.name}]:addContentMetadata Successfully added content metadata ${content.programType} and slug ${content.assetId}`,
    );
  }

  async blackListWatchedContent(
    subscriberId: string,
    contentType: NcantoAssetType.MOVIE | NcantoAssetType.SHOW,
    assetId: string,
  ) {
    const body = {
      add: {
        assets: [] as { assetId: string }[],
        series: [] as { seriesId: string }[],
      },
    };
    if (contentType === NcantoAssetType.MOVIE) {
      body.add.assets = [{ assetId }];
    } else {
      body.add.series = [{ seriesId: assetId }];
    }
    const [response, error] = await this.errorHandler.try<unknown, AxiosError>(
      () => {
        return this.axiosInstance.post(
          `/subscriber/${subscriberId}/blacklists/default`,
          body,
        );
      },
    );

    if (error) {
      tracer.dogstatsd.increment(DDMetric.NcantoBlacklistAssetFailure, 1, {
        function: 'blackListWatchedContent',
        service: NcantoUtils.name,
      });
      this.logger.warn(
        { error: handleAxiosErrorLog(error) },
        `[${NcantoUtils.name}]:blackListWatchedContent Failed to black list watched content for ${subscriberId} and asset ${assetId}`,
      );
      return;
    }

    tracer.dogstatsd.increment(DDMetric.NcantoBlacklistAssetSuccess, 1, {
      function: 'blackListWatchedContent',
      service: NcantoUtils.name,
    });

    this.logger.debug(
      { response },
      `[${NcantoUtils.name}]:blackListWatchedContent Successfully black listed watched content for ${subscriberId} and asset ${assetId}`,
    );
  }

  // TODO: replace with more accurate subscription check mechanism after kafka started producting subscription_change events
  async checkSubscription(subscriberId: string) {
    const key = this.ncantoSubscriberCacheKey(subscriberId);

    const isSubscribed = await this.redisService.get(key);

    if (isSubscribed && isSubscribed === 'true') return true;
    else if (isSubscribed && isSubscribed === 'false') return false;

    const userSubscription =
      await this.userSubscriptionUtil.checkIfUserIsSubscribed(subscriberId);

    if (!userSubscription) {
      this.redisService.set(key, 'false', APP_CONFIGS.CACHE.TTL.ONE_DAY); // 1 day cool off period for re-check
      return false;
    }

    const expiryTime = Math.max(
      0,
      Math.round(
        (new Date(userSubscription.subscriptionExpiry).getTime() -
          new Date().getTime()) /
          1000,
      ),
    );
    if (expiryTime === 0) {
      this.redisService.set(key, 'false', APP_CONFIGS.CACHE.TTL.ONE_DAY); // 1 day cool off period for re-check
      return false;
    }

    this.redisService.set(key, 'true', expiryTime);
    await this.completeNcantoSubscriberSetup(subscriberId);
    return true;
  }

  async completeNcantoSubscriberSetup(subscriberId: string) {
    const [subscriber, profile] = await Promise.all([
      this.getSubscriber(subscriberId),
      this.getProfile(`${subscriberId}_default`),
    ]);

    if (!subscriber)
      return Promise.all([
        this.createNewSubscriber(
          subscriberId,
          `${subscriberId}_default`,
          false,
        ),
        this.createProfile(`${subscriberId}_default`, 'default'),
      ]);

    if (!profile)
      return Promise.all([
        this.createProfile(`${subscriberId}_default`, 'default'),
        this.addSubscriberProfile(subscriberId, `${subscriberId}_default`),
      ]);
  }

  async createProfile(profileId: string, profileName: string) {
    const [response, error] = await this.errorHandler.try<unknown, AxiosError>(
      () => {
        return this.axiosInstance.put(`/profile/${profileId}`, {
          calibrationFactor: 0.5,
          name: profileName,
          profileId,
        });
      },
    );

    if (error) {
      tracer.dogstatsd.increment(DDMetric.NcantoCreateProfileFailure, 1, {
        function: 'createProfile',
        service: NcantoUtils.name,
      });
      this.logger.warn(
        { error: handleAxiosErrorLog(error) },
        `[${NcantoUtils.name}]:createProfile Failed to create profile ${profileId}`,
      );
      return;
    }

    tracer.dogstatsd.increment(DDMetric.NcantoCreateProfileSuccess, 1, {
      function: 'createProfile',
      service: NcantoUtils.name,
    });

    this.logger.debug(
      { response },
      `[${NcantoUtils.name}]:createProfile Successfully created profile ${profileId}`,
    );
  }

  async createStore(storeId: string) {
    const [response, error] = await this.errorHandler.try<unknown, AxiosError>(
      () => {
        return this.axiosInstance.post(`/store/${storeId}`);
      },
    );
    if (error) {
      tracer.dogstatsd.increment(DDMetric.NcantoCreateStoreFailure, 1, {
        function: 'createStore',
        service: NcantoUtils.name,
      });

      this.logger.warn(
        { error: handleAxiosErrorLog(error) },
        `[${NcantoUtils.name}]:createStore Failed to create store ${storeId}`,
      );
      return;
    }

    tracer.dogstatsd.increment(DDMetric.NcantoCreateStoreSuccess, 1, {
      function: 'createStore',
      service: NcantoUtils.name,
    });

    this.logger.debug(
      { response },
      `[${NcantoUtils.name}]:createStore Successfully created store ${storeId}`,
    );
  }

  async getProfile(profileId: string) {
    const [response, error] = await this.errorHandler.try<unknown, AxiosError>(
      () => {
        return this.axiosInstance.get(`/profile/${profileId}`);
      },
    );
    if (error) {
      tracer.dogstatsd.increment(DDMetric.NcantoGetProfileFailure, 1, {
        function: 'getProfile',
        service: NcantoUtils.name,
      });
      this.logger.warn(
        { error: handleAxiosErrorLog(error) },
        `[${NcantoUtils.name}]:getProfile Failed to get profile ${profileId}`,
      );
      return false;
    }

    tracer.dogstatsd.increment(DDMetric.NcantoGetProfileSuccess, 1, {
      function: 'getProfile',
      service: NcantoUtils.name,
    });
    this.logger.debug(
      { response },
      `[${NcantoUtils.name}]:getProfile Successfully got profile ${profileId}`,
    );
    return true;
  }

  async getRecommendations(
    context: string,
    subscriber: string,
    dialect: Dialect,
  ): Promise<INcantoResponse> {
    const emptyRecommendations: INcantoResponse = {
      contextId: '',
      contextNames: { en: '' },
      recommendations: [],
    };

    const isSubscriberSubscribed = await this.checkSubscription(subscriber);
    if (!isSubscriberSubscribed) return emptyRecommendations;

    const [response, error] = await this.errorHandler.try<
      INcantoResponse,
      AxiosError
    >(async () => {
      const response = await this.axiosInstance.get<INcantoResponse>(
        `/recommendations?context=${context}&subscriber=${subscriber}&dialect=${dialect}`,
      );
      return response.data;
    });

    if (error) {
      tracer.dogstatsd.increment(DDMetric.NcantoGetRecommendationsFailure, 1, {
        function: 'getRecommendations',
        service: NcantoUtils.name,
      });

      this.logger.warn(
        { error: handleAxiosErrorLog(error) },
        `[${NcantoUtils.name}]:getRecommendations Failed to get recommendations, error in api for ${context} and ${subscriber} and ${dialect}`,
      );

      return emptyRecommendations;
    }

    tracer.dogstatsd.increment(DDMetric.NcantoGetRecommendationsSuccess, 1, {
      function: 'getRecommendations',
      service: NcantoUtils.name,
    });

    this.logger.debug(
      { response },
      `[${NcantoUtils.name}]:getRecommendations Successfully got recommendations for ${context} and ${subscriber} and ${dialect}`,
    );
    return response;
  }

  async getStore(storeId: string) {
    const [response, error] = await this.errorHandler.try<unknown, AxiosError>(
      () => {
        return this.axiosInstance.get(`/store/${storeId}`);
      },
    );

    if (error) {
      tracer.dogstatsd.increment(DDMetric.NcantoGetStoreFailure, 1, {
        function: 'getStore',
        service: NcantoUtils.name,
      });
      this.logger.warn(
        { error: handleAxiosErrorLog(error) },
        `[${NcantoUtils.name}]:getStore Failed to get store ${storeId}`,
      );
      return;
    }

    tracer.dogstatsd.increment(DDMetric.NcantoGetStoreSuccess, 1, {
      function: 'getStore',
      service: NcantoUtils.name,
    });

    this.logger.debug(
      { response },
      `[${NcantoUtils.name}]:getStore Successfully fetched store ${storeId}`,
    );
  }

  async getSubscriber(subscriberId: string) {
    const [response, error] = await this.errorHandler.try<
      INcantoSubscriber,
      AxiosError
    >(async () => {
      const response = await this.axiosInstance.get<INcantoSubscriber>(
        `/subscriber/${subscriberId}`,
      );
      return response.data;
    });
    if (error) {
      tracer.dogstatsd.increment(DDMetric.NcantoGetSubscriberFailure, 1, {
        function: 'getSubscriber',
        service: NcantoUtils.name,
      });
      this.logger.warn(
        { error: handleAxiosErrorLog(error) },
        `[${NcantoUtils.name}]:getSubscriber Failed to get subscriber ${subscriberId}`,
      );
      return;
    }

    tracer.dogstatsd.increment(DDMetric.NcantoGetSubscriberSuccess, 1, {
      function: 'getSubscriber',
      service: NcantoUtils.name,
    });

    this.logger.debug(
      { response },
      `[${NcantoUtils.name}]:getSubscriber Successfully got subscriber ${subscriberId}`,
    );
    return response;
  }

  async logBackfillInteraction(
    data: XRoadMediaUserInteractionData[],
    totalBatchSize: number,
    interactionType: NcantoInteraction,
  ) {
    const droppedCount = totalBatchSize - data.length;
    if (data.length === 0) {
      this.logDDMetric(interactionType, 0, droppedCount, data.length);
      return;
    }

    const [response, error] = await this.errorHandler.try<unknown, AxiosError>(
      async () => {
        return this.axiosInstance.post('/log', data);
      },
    );
    if (error) {
      this.logger.warn(
        { error: handleAxiosErrorLog(error) },
        `Xroadmedia axios error for backfill interactions`,
      );
      this.logDDMetric(interactionType, 0, droppedCount, data.length);
      this.logger.warn(
        { response },
        `Logged backfill interactions for interaction:${data[0].interaction}, success rate:0/${totalBatchSize} assets`,
      );
      return;
    } else {
      this.logDDMetric(interactionType, data.length, droppedCount, data.length);
      this.logger.log(
        { response },
        `Logged backfill interactions for interaction:${data[0].interaction}, success rate:${data.length}/${totalBatchSize} assets`,
      );
    }
  }

  async logDDMetric(
    interactionType: string,
    successCount: number,
    droppedCount: number,
    totalEventsCount: number,
  ) {
    const service = 'ncanto';

    if (totalEventsCount === 0) {
      tracer.dogstatsd.increment(
        DDMetric.NcantoTotalDroppedInteractions,
        droppedCount,
        {
          interaction_type: interactionType,
          service,
        },
      );
      return;
    }

    const failureCount = totalEventsCount - successCount;
    const successRate = (successCount / totalEventsCount) * 100;

    // Core metrics
    tracer.dogstatsd.increment(
      DDMetric.NcantoTotalProcessedInteractions,
      totalEventsCount,
      {
        interaction_type: interactionType,
        service,
      },
    );

    tracer.dogstatsd.increment(
      DDMetric.NcantoTotalDroppedInteractions,
      droppedCount,
      {
        interaction_type: interactionType,
        service,
      },
    );

    tracer.dogstatsd.increment(
      DDMetric.NcantoSuccessInteractions,
      successCount,
      {
        interaction_type: interactionType,
        service,
      },
    );

    if (failureCount > 0) {
      tracer.dogstatsd.increment(
        DDMetric.NcantoFailureInteractions,
        failureCount,
        {
          interaction_type: interactionType,
          service,
        },
      );
    }

    tracer.dogstatsd.gauge(DDMetric.NcantoSuccessRate, successRate, {
      interaction_type: interactionType,
      service,
    });

    tracer.dogstatsd.histogram(DDMetric.NcantoBatchSize, totalEventsCount, {
      interaction_type: interactionType,
      service,
    });

    // Batch completion tracking
    tracer.dogstatsd.increment(DDMetric.NcantoBatchCompleted, 1, {
      interaction_type: interactionType,
      service,
      success_status:
        successCount === totalEventsCount ? 'complete' : 'partial',
    });
  }

  async logInteraction(
    data: XRoadMediaUserInteractionData[],
    totalBatchSize: number,
    interactionType: NcantoInteraction,
  ) {
    const droppedCount = totalBatchSize - data.length;
    if (data.length === 0) {
      this.logDDMetric(interactionType, 0, droppedCount, data.length);
      return;
    }

    const [response, error] = await this.errorHandler.try<unknown, AxiosError>(
      async () => {
        return this.axiosInstance.post('/log', data);
      },
    );
    if (error) {
      this.logger.warn(
        { error: handleAxiosErrorLog(error) },
        `Xroadmedia axios error`,
      );
      this.logDDMetric(interactionType, 0, droppedCount, data.length);
      this.logger.warn(
        { response },
        `Logged interactions for interaction:${data[0].interaction}, success rate:0/${totalBatchSize} assets`,
      );
      return;
    } else {
      this.logDDMetric(interactionType, data.length, droppedCount, data.length);
      this.logger.debug(
        { response },
        `Logged interactions for interaction:${data[0].interaction}, success rate:${data.length}/${totalBatchSize} assets`,
      );
    }
  }

  async removeContentMetadata(content: NcantoAsset) {
    const [response, error] = await this.errorHandler.try<unknown, AxiosError>(
      () => {
        return this.axiosInstance.post(`/store/${this.storeId}/asset`, {
          delete: [content],
        });
      },
    );
    if (error) {
      tracer.dogstatsd.increment(
        DDMetric.NcantoRemoveContentMetadataFailure,
        1,
        {
          function: 'removeContentMetadata',
          service: NcantoUtils.name,
        },
      );
      this.logger.warn(
        { error: handleAxiosErrorLog(error) },
        `[${NcantoUtils.name}]:removeContentMetadata Failed to remove content metadata ${content.programType} and slug ${content.assetId}`,
      );
      return;
    }

    tracer.dogstatsd.increment(DDMetric.NcantoRemoveContentMetadataSuccess, 1, {
      function: 'removeContentMetadata',
      service: NcantoUtils.name,
    });

    this.logger.debug(
      { response },
      `[${NcantoUtils.name}]:removeContentMetadata Successfully removed content metadata ${content.programType} and slug ${content.assetId}`,
    );
  }
}

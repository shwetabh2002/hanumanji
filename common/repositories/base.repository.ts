import { Inject } from '@nestjs/common';
import {
  FilterQuery,
  Model,
  QueryOptions,
  SaveOptions,
  SortOrder,
  Types,
  UpdateQuery,
  Document,
  AggregateOptions,
  PipelineStage,
} from 'mongoose';

import { Logger } from '@nestjs/common';

import { BaseModel } from '../entities/base.entity';
import { RepositoryCacheService } from '@app/repository-cache';
import { APP_CONFIGS } from 'common/configs/app.config';

export type Fields<T extends BaseModel> = (keyof T)[];

interface CacheOptions {
  enabled: boolean;
  ttl?: number; // in seconds
}

export interface ExtendedAggregateOptions extends AggregateOptions {
  cache?: CacheOptions;
  ttl?: number; // in seconds
}
export interface ExtendedQueryOptions<T> extends QueryOptions<T> {
  cache?: CacheOptions;
  sort?: Partial<{ [K in keyof T]: SortOrder }>;
}
export interface ExtendedSaveOptions extends SaveOptions {
  cache?: {
    clearCollectionCache?: boolean;
  };
}

interface Pagination {
  page?: number;
  perPage?: number;
}

interface PaginatedQueryOptions<T> extends ExtendedQueryOptions<T> {
  pagination: Pagination;
}

export interface PaginatedQueryResponse<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    nextPageAvailable: boolean;
  };
}
export class BaseRepository<T extends BaseModel> {
  private logger = new Logger(BaseRepository.name);

  @Inject(RepositoryCacheService)
  private repositoryCache!: RepositoryCacheService<T>;
  protected constructor(private readonly model: Model<T>) {}

  protected async executeWithCache<R>(
    queryFn: () => Promise<R | null>,
    filter: FilterQuery<T>,
    projections?: (keyof T)[],
    cacheOptions?: CacheOptions,
  ): Promise<R | null> {
    // Disable cache in test environment
    if (APP_CONFIGS.IS_TEST) {
      return queryFn();
    }
    if (cacheOptions?.enabled) {
      this.logger.debug(
        `Looking for cache key for ${this.model.modelName} with filter ${JSON.stringify(filter)} and projection ${projections ? JSON.stringify(projections) : ''}`,
      );
      const cacheKey = this.repositoryCache.getCacheKey(
        this.model,
        filter,
        projections,
      );
      return this.repositoryCache.cacheQuery(queryFn, {
        collection: this.model.modelName, // FIX: This collection name will be used once we implement auto cache burst.
        key: cacheKey,
        ttl: cacheOptions.ttl,
      });
    }
    return queryFn();
  }

  async aggregate<R>(
    pipeline?: PipelineStage[],
    options?: ExtendedAggregateOptions,
  ): Promise<R[] | null> {
    const { cache, ...aggregateOptions } = options || {};

    if (cache && cache.enabled) {
      return this.executeWithCache(
        () => this.model.aggregate(pipeline, aggregateOptions),
        pipeline as FilterQuery<T>, // FIX: This is a temporary fix. We need to change the type of pipeline to FilterQuery<T>[]
        [],
        cache,
      );
    }
    const result = await this.model.aggregate(pipeline, aggregateOptions);
    if (result.length === 0) {
      return null;
    }
    return result;
  }

  async create(
    doc: Pick<T, Exclude<keyof T & keyof Document, keyof Document>>,
    options?: ExtendedSaveOptions,
  ): Promise<T> {
    const savedDoc = await new this.model(doc).save(options);
    const { cache } = options || {};
    if (cache && cache.clearCollectionCache) {
      this.repositoryCache.clearCacheByCollectionName(this.model.modelName);
    }
    return savedDoc;
  }

  async find<K extends keyof T>(
    filter: FilterQuery<T>,
    projections?: K[],
    options?: ExtendedQueryOptions<T>,
  ): Promise<Pick<T, K>[] | null> {
    const { cache, ...queryOptions } = options || {};
    const projection = projections
      ? projections.reduce((acc, key) => ({ ...acc, [key]: 1 }), {})
      : undefined;
    if (cache && cache.enabled) {
      return this.executeWithCache(
        () => this.model.find(filter, projection, queryOptions),
        filter,
        projections,
        cache,
      );
    }
    return this.model.find(filter, projection, queryOptions);
  }

  async findById<K extends keyof T>(
    id: string | Types.ObjectId | number,
    projections?: K[],
    options?: ExtendedQueryOptions<T>,
  ): Promise<Pick<T, K> | null> {
    const { cache, ...queryOptions } = options || {};
    const projection = projections
      ? projections.reduce((acc, key) => ({ ...acc, [key]: 1 }), {})
      : undefined;
    if (cache && cache.enabled) {
      return this.executeWithCache(
        () => this.model.findById(id, projection, queryOptions),
        { _id: id },
        projections,
        cache,
      );
    }
    return this.model.findById(id, projection, queryOptions);
  }

  async findByIdAndUpdate(
    _id: string | Types.ObjectId,
    update: UpdateQuery<T>,
    options?: QueryOptions<T>,
  ) {
    return this.model.findByIdAndUpdate(_id, update, options);
  }

  async findCount(filter: FilterQuery<T>, options: QueryOptions<T>) {
    return this.model.find(filter, options).countDocuments();
  }

  async findOne<K extends keyof T>(
    filter: FilterQuery<T>,
    projections?: K[],
    options?: ExtendedQueryOptions<T>,
  ): Promise<Pick<T, K> | null> {
    const { cache, ...queryOptions } = options || {};
    const projection = projections
      ? projections.reduce((acc, key) => ({ ...acc, [key]: 1 }), {})
      : undefined;
    if (cache && cache.enabled) {
      return this.executeWithCache(
        () => this.model.findOne(filter, projection, queryOptions),
        filter,
        projections,
        cache,
      );
    }
    return this.model.findOne(filter, projection, queryOptions);
  }

  public async findPaginated<K extends keyof T>({
    filter,
    options,
    projections,
  }: {
    filter: FilterQuery<T>;
    projections?: K[];
    options?: PaginatedQueryOptions<T>;
  }): Promise<PaginatedQueryResponse<Pick<T, K>>> {
    const projection = projections
      ? projections.reduce((acc, key) => ({ ...acc, [key]: 1 }), {})
      : undefined;

    const { cache, pagination = {} } = options || {};
    const { page = 1, perPage = 20 } = pagination;
    const query = this.model
      .find(filter, projection, options)
      .skip((page - 1) * perPage)
      .limit(perPage + 1)
      .lean();

    const queryResponse =
      cache && cache.enabled
        ? await this.executeWithCache(
            () => query,
            { ...filter, page, perPage },
            projections,
            cache,
          )
        : await query;

    return {
      data: queryResponse?.slice(0, perPage) as Pick<T, K>[],
      pagination: {
        nextPageAvailable: (queryResponse ?? []).length > perPage,
        page,
        perPage,
      },
    };
  }

  async save(doc: T): Promise<T> {
    return this.model.create(doc);
  }

  async updateOne({
    filter,
    update,
    upsert,
  }: {
    filter: FilterQuery<T>;
    update: UpdateQuery<T>;
    upsert?: boolean;
  }) {
    return this.model.updateOne(filter, update, { upsert });
  }
}

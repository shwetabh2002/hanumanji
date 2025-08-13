import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  UserCultures,
  UserCultureStatusEnum,
} from '../entities/userCultures.entity';
import { BaseRepository } from '@app/common/repositories/base.repository';

@Injectable()
export class UserCulturesRepository extends BaseRepository<UserCultures> {
  constructor(
    @InjectModel(UserCultures.name)
    private userCulturesModel: Model<UserCultures>,
  ) {
    super(userCulturesModel);
  }

  findActiveUserCultureByAbbreviation(
    abbreviation: string,
  ): Promise<Pick<UserCultures, 'abbreviation'> | null> {
    return this.findOne(
      {
        abbreviation: abbreviation.toLowerCase(),
        status: UserCultureStatusEnum.ACTIVE,
      },
      ['abbreviation'],
      {
        cache: {
          enabled: true,
        },
      },
    );
  }
  getActiveUserCultures(): Promise<UserCultures[] | null> {
    return this.find(
      {
        status: UserCultureStatusEnum.ACTIVE,
      },
      undefined,
      {
        cache: {
          enabled: true,
        },
        sort: {
          name: 1,
        },
      },
    );
  }
  listEnabledUserCultures(): Promise<UserCultures[] | null> {
    return this.find(
      {
        isEnabled: true,
        status: UserCultureStatusEnum.ACTIVE,
      },
      undefined,
      {
        cache: {
          enabled: true,
        },
        sort: {
          name: 1,
        },
      },
    );
  }
}

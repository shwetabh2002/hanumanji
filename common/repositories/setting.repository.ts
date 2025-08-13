import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Setting } from '../entities/setting.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class SettingRepository extends BaseRepository<Setting> {
  constructor(
    @InjectModel(Setting.name) private readonly settingModel: Model<Setting>,
  ) {
    super(settingModel);
  }
}

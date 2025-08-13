import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UserMeta } from '../entities/user-meta.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserMetaRepository extends BaseRepository<UserMeta> {
  constructor(
    @InjectModel(UserMeta.name)
    private userMetaModel: Model<UserMeta>,
  ) {
    super(userMetaModel);
  }
}

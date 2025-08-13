import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { Plan } from '../entities/plan.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class PlanRepository extends BaseRepository<Plan> {
  constructor(@InjectModel(Plan.name) private planModel: Model<Plan>) {
    super(planModel);
  }
}

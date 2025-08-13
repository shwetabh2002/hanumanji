import { EntityManager, EntityRepository } from '@mikro-orm/mongodb';

import { Injectable } from '@nestjs/common';

import { PlanV2 } from '../entities/planV2.entity';

@Injectable()
export class PlanV2Repository extends EntityRepository<PlanV2> {
  constructor(em: EntityManager) {
    super(em, PlanV2);
  }
  persistAndFlush(entity: PlanV2) {
    this.em.persistAndFlush(entity);
  }
}

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { RecurringTransaction } from '../entities/recurringTransaction.entity';
import { BaseRepository } from './base.repository';

export class RecurringTransactionRepository extends BaseRepository<RecurringTransaction> {
  constructor(
    @InjectModel(RecurringTransaction.name)
    private readonly recurringTransactionModel: Model<RecurringTransaction>,
  ) {
    super(recurringTransactionModel);
  }
}

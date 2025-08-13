import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { WatchVideoEvent } from '../entities/watchVideoEvent.entity';
import { BaseRepository } from './base.repository';

export class WatchVideoEventRepository extends BaseRepository<WatchVideoEvent> {
  constructor(
    @InjectModel(WatchVideoEvent.name)
    private watchVideoEventModel: Model<WatchVideoEvent>,
  ) {
    super(watchVideoEventModel);
  }

  findWatchDataByEpisodeSlugsAndUserId(
    episodeSlugs: string[],
    userId: string,
  ): Promise<WatchVideoEvent[]> {
    return this.watchVideoEventModel
      .find({
        content_slug: { $in: episodeSlugs },
        user_id: userId,
      })
      .sort({ timestamp: -1 })
      .select({
        _id: 1,
        consumed_duration: 1,
        content_id: 1,
        content_slug: 1,
        timestamp: 1,
      });
  }
}

import { Article } from '../models/Article.js';
import { Tag } from '../models/Tag.js';

/** Recomputes `usageCount` for every tag based on published articles. */
export const syncTagUsage = async (): Promise<void> => {
  const counts = await Article.aggregate<{ _id: string; count: number }>([
    { $match: { status: 'published' } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
  ]);

  const map = new Map(counts.map((item) => [String(item._id), item.count]));
  const allTags = await Tag.find().select('_id');

  const operations = allTags.map((tag) => ({
    updateOne: {
      filter: { _id: tag._id },
      update: { $set: { usageCount: map.get(String(tag._id)) ?? 0 } },
    },
  }));

  if (operations.length > 0) {
    await Tag.bulkWrite(operations);
  }
};

/** Removes tags that are no longer attached to any article. */
export const pruneUnusedTags = async (): Promise<number> => {
  const used = await Article.distinct('tags');
  const result = await Tag.deleteMany({ _id: { $nin: used } });
  return result.deletedCount ?? 0;
};
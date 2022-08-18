import Collection from '../models/db/collection';
import Level from '../models/db/level';
import Stat from '../models/db/stat';
import User from '../models/db/user';
import { StatModel } from '../models/mongoose';
import { EnrichedCollection, EnrichedLevel } from '../pages/search';

export async function enrichCollectionWithUserStats(collection: Collection, user?: User | null) {
  if (!user) {
    return collection;
  }

  const stats = await StatModel.find({ userId: user._id, levelId: { $in: collection.levels.map(level => level._id) } });

  // map each stat to each level to create an EnrichedLevel
  let count = 0;

  collection.levels.forEach(lvl => {
    const stat: Stat = stats.find(stat => stat.levelId.equals(lvl._id));

    (stat?.moves && stat?.moves === lvl.leastMoves) ? count++ : null;
  });
  const newCol = (collection as any).toObject() as EnrichedCollection;

  newCol.userBeatenCount = count;
  newCol.levelCount = collection.levels.length;

  return newCol;
}

export async function enrichLevelsWithUserStats(levels: Level[], user?: User | null) {
  if (!user) {
    return levels;
  }

  const stats = await StatModel.find({ userId: user._id, levelId: { $in: levels.map(level => level._id) } });

  // map each stat to each level to create an EnrichedLevel
  return levels.map(lvl => {
    const stat: Stat = stats.find(stat => stat.levelId.equals(lvl._id));
    const new_lvl = (lvl as any).toObject() as EnrichedLevel; // clone it

    new_lvl.userMoves = stat?.moves;
    new_lvl.userMovesTs = stat?.ts;
    new_lvl.userAttempts = stat?.attempts;

    return new_lvl;
  });
}

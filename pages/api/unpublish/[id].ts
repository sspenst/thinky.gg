import type { NextApiResponse } from 'next';
import { logger } from '../../../helpers/logger';
import revalidateLevel from '../../../helpers/revalidateLevel';
import revalidateUniverse from '../../../helpers/revalidateUniverse';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import Record from '../../../models/db/record';
import Stat from '../../../models/db/stat';
import { CollectionModel, ImageModel, LevelModel, PlayAttemptModel, RecordModel, ReviewModel, StatModel, UserModel } from '../../../models/mongoose';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { id } = req.query;

  const level = await LevelModel.findById<Level>(id);

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  if (level.userId.toString() !== req.userId) {
    return res.status(401).json({
      error: 'Not authorized to delete this Level',
    });
  }

  const record = await RecordModel.findOne<Record>({ levelId: id }).sort({ ts: -1 });

  // update calc_records if the record was set by a different user
  if (record && record.userId.toString() !== req.userId) {
    // NB: await to avoid multiple user updates in parallel
    await UserModel.updateOne({ _id: record.userId }, { $inc: { calc_records: -1 } });
  }

  const stats = await StatModel.find<Stat>({ levelId: id });
  const userIds = stats.filter(stat => stat.complete).map(stat => stat.userId);

  await Promise.all([
    ImageModel.deleteOne({ documentId: id }),
    LevelModel.updateOne({ _id: id }, { $set: {
      calc_playattempts_count: 0,
      calc_playattempts_duration_sum: 0,
      isDraft: true,
    } }),
    PlayAttemptModel.deleteMany({ levelId: id }),
    RecordModel.deleteMany({ levelId: id }),
    ReviewModel.deleteMany({ levelId: id }),
    StatModel.deleteMany({ levelId: id }),
    UserModel.updateMany({ _id: { $in: userIds } }, { $inc: { score: -1 } }),
    // remove from other users' collections
    CollectionModel.updateMany({ levels: id, userId: { '$ne': req.userId } }, { $pull: { levels: id } }),
  ]);

  try {
    const [revalidateUniverseRes, revalidateLevelRes] = await Promise.all([
      revalidateUniverse(res, req.userId, true),
      revalidateLevel(res, level.slug),
    ]);

    if (!revalidateUniverseRes) {
      throw 'Error revalidating universe';
    } else if (!revalidateLevelRes) {
      throw 'Error revalidating level';
    } else {
      return res.status(200).json({ updated: true });
    }
  } catch (err) {
    logger.trace(err);

    return res.status(500).json({
      error: 'Error revalidating api/unpublish ' + err,
    });
  }
});

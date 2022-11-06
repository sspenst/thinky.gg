import mongoose from 'mongoose';
import type { NextApiResponse } from 'next';
import { ValidObjectId } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import { clearNotifications } from '../../../helpers/notificationHelper';
import revalidateLevel from '../../../helpers/revalidateLevel';
import revalidateUrl, { RevalidatePaths } from '../../../helpers/revalidateUrl';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import Record from '../../../models/db/record';
import Stat from '../../../models/db/stat';
import { CollectionModel, ImageModel, LevelModel, PlayAttemptModel, RecordModel, ReviewModel, StatModel, UserModel } from '../../../models/mongoose';
import { calcPlayAttempts } from '../../../models/schemas/levelSchema';
import { queueRefreshIndexCalcs } from '../internal-jobs/worker';

export default withAuth({ POST: {
  query: {
    id: ValidObjectId(),
  }
} }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
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

  const record = await RecordModel.findOne<Record>({ levelId: id }).sort({ moves: 1, ts: -1 });

  // update calc_records if the record was set by a different user
  const session = await mongoose.startSession();

  await session.withTransaction(async () => {
    if (record && record.userId.toString() !== req.userId) {
      // NB: await to avoid multiple user updates in parallel
      await UserModel.updateOne({ _id: record.userId }, { $inc: { calc_records: -1 } }, { session: session });
    }

    const stats = await StatModel.find<Stat>({ levelId: id });

    const userIds = stats.filter(stat => stat.complete).map(stat => stat.userId);

    await Promise.all([
      ImageModel.deleteOne({ documentId: id }, { session: session }),
      LevelModel.updateOne({ _id: id }, { $set: {
        isDraft: true,
      } }, { session: session }),
      PlayAttemptModel.deleteMany({ levelId: id }, { session: session }),
      RecordModel.deleteMany({ levelId: id }, { session: session }),
      ReviewModel.deleteMany({ levelId: id }, { session: session }),
      StatModel.deleteMany({ levelId: id }, { session: session }),
      UserModel.updateMany({ _id: { $in: userIds } }, { $inc: { score: -1 } }, { session: session }),
      // remove from other users' collections
      CollectionModel.updateMany({ levels: id, userId: { '$ne': req.userId } }, { $pull: { levels: id } }, { session: session }),
      queueRefreshIndexCalcs(level._id),
      clearNotifications(undefined, undefined, level._id)
    ]);
  });

  await calcPlayAttempts(level._id);

  await Promise.all([
    revalidateUrl(res, RevalidatePaths.CATALOG),
    revalidateLevel(res, level.slug),
  ]);

  return res.status(200).json({ updated: true });
});

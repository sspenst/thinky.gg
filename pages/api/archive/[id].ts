import Record from '@root/models/db/record';
import mongoose, { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import Discord from '../../../constants/discord';
import TestId from '../../../constants/testId';
import { ValidObjectId } from '../../../helpers/apiWrapper';
import queueDiscordWebhook from '../../../helpers/discordWebhook';
import { generateLevelSlug } from '../../../helpers/generateSlug';
import { TimerUtil } from '../../../helpers/getTs';
import isCurator from '../../../helpers/isCurator';
import { logger } from '../../../helpers/logger';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { LevelModel, RecordModel, UserModel } from '../../../models/mongoose';
import { queueCalcCreatorCounts } from '../internal-jobs/worker';

export default withAuth({ POST: {
  query: {
    id: ValidObjectId(),
  }
} }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const { id } = req.query;
  const level = await LevelModel.findOne<Level>({ _id: id, isDeleted: { $ne: true }, isDraft: false });

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  if (!isCurator(req.user) && level.userId.toString() !== req.userId) {
    return res.status(401).json({
      error: 'Not authorized to delete this Level',
    });
  }

  const ts = TimerUtil.getTs();
  const session = await mongoose.startSession();
  let newLevel: Level | null = null;

  try {
    await session.withTransaction(async () => {
      const [record, slug] = await Promise.all([
        RecordModel.findOne<Record>({ levelId: level._id }, {}, { session: session }).sort({ ts: -1 }),
        generateLevelSlug('archive', level.name, level._id.toString(), { session: session }),
      ]);

      if (!record) {
        throw new Error(`Record not found for level ${level._id}`);
      }

      await Promise.all([
        LevelModel.findOneAndUpdate({ _id: id }, { $set: {
          archivedBy: level.userId,
          archivedTs: ts,
          slug: slug,
          userId: new Types.ObjectId(TestId.ARCHIVE),
        } }, { new: true, session: session }),
        UserModel.updateOne({ _id: record.userId }, { $inc: { calc_records: -1 } }, { session: session }),
      ]);

      newLevel = await LevelModel.findOneAndUpdate({ _id: id }, { $set: {
        archivedBy: level.userId,
        archivedTs: ts,
        slug: slug,
        userId: new Types.ObjectId(TestId.ARCHIVE),
      } }, { new: true, session: session });

      await Promise.all([
        queueCalcCreatorCounts(new Types.ObjectId(TestId.ARCHIVE), { session: session }),
        queueCalcCreatorCounts(level.userId, { session: session }),
        queueDiscordWebhook(Discord.LevelsId, `**${req.user.name}** archived a level: [${level.name}](${req.headers.origin}/level/${slug}?ts=${ts})`, { session: session }),
      ]);
    });

    session.endSession();
  } catch (err) {
    logger.error(err);
    session.endSession();

    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.status(200).json(newLevel);
});

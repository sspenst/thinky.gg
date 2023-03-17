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
import { LevelModel } from '../../../models/mongoose';
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
      // level is over 24hrs old, move to archive
      const slug = await generateLevelSlug('archive', level.name, level._id.toString(), { session: session });

      newLevel = await LevelModel.findOneAndUpdate({ _id: id }, { $set: {
        archivedBy: req.userId,
        archivedTs: ts,
        slug: slug,
        userId: new Types.ObjectId(TestId.ARCHIVE),
      } }, { new: true, session: session });

      await Promise.all([
        queueCalcCreatorCounts(new Types.ObjectId(TestId.ARCHIVE), { session: session }),
        queueCalcCreatorCounts(req.user._id, { session: session }),
        queueDiscordWebhook(Discord.LevelsId, `**${req.user.name}** archived a level: [${level.name}](${req.headers.origin}/level/${level.slug}?ts=${ts})`, { session: session }),
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

import { ObjectId } from 'bson';
import mongoose from 'mongoose';
import type { NextApiResponse } from 'next';
import Discord from '../../../constants/discord';
import { ValidObjectId } from '../../../helpers/apiWrapper';
import queueDiscordWebhook from '../../../helpers/discordWebhook';
import { generateLevelSlug } from '../../../helpers/generateSlug';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import revalidateLevel from '../../../helpers/revalidateLevel';
import revalidateUrl, { RevalidatePaths } from '../../../helpers/revalidateUrl';
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
  const level = await LevelModel.findOne<Level>({ _id: id, isDraft: false });

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

  const ts = TimerUtil.getTs();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // level is over 24hrs old, move to archive
      const slug = await generateLevelSlug('archive', level.name, level._id.toString(), { session: session });

      await LevelModel.updateOne({ _id: id }, { $set: {
        archivedBy: req.userId,
        archivedTs: ts,
        slug: slug,
        userId: new ObjectId('63cdb193ca0d2c81064a21b7'),
      } }, { session: session });

      await Promise.all([
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

  await Promise.all([
    revalidateUrl(res, RevalidatePaths.CATALOG),
    revalidateLevel(res, level.slug),
  ]);

  return res.status(200).json({ updated: true });
});

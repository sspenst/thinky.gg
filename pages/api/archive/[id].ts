import { GameId } from '@root/constants/GameId';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import mongoose, { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import DiscordChannel from '../../../constants/discordChannel';
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
import { queueCalcCreatorCounts } from '../internal-jobs/worker/queueFunctions';

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
      const slug = await generateLevelSlug(level.gameId, 'archive', level.name, level._id.toString(), { session: session });

      newLevel = await LevelModel.findOneAndUpdate({ _id: id }, { $set: {
        archivedBy: level.userId,
        archivedTs: ts,
        slug: slug,
        userId: new Types.ObjectId(TestId.ARCHIVE),
      } }, { new: true, session: session });

      const game = getGameFromId(level.gameId);
      const discordChannel = game.id === GameId.SOKOPATH ? DiscordChannel.SokopathLevels : DiscordChannel.PathologyLevels;

      await Promise.all([
        queueCalcCreatorCounts(level.gameId, new Types.ObjectId(TestId.ARCHIVE), { session: session }),
        queueCalcCreatorCounts(level.gameId, level.userId, { session: session }),
        queueDiscordWebhook(discordChannel, `**${req.user.name}** archived a level: [${level.name}](<${req.headers.origin}/level/${slug}?ts=${ts}>)`, { session: session }),
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

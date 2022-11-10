import { ObjectId } from 'bson';
import mongoose from 'mongoose';
import type { NextApiResponse } from 'next';
import Discord from '../../../constants/discord';
import LevelDataType from '../../../constants/levelDataType';
import { ValidObjectId } from '../../../helpers/apiWrapper';
import queueDiscordWebhook from '../../../helpers/discordWebhook';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import { createNewLevelNotifications } from '../../../helpers/notificationHelper';
import revalidateLevel from '../../../helpers/revalidateLevel';
import revalidateUrl, { RevalidatePaths } from '../../../helpers/revalidateUrl';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel, RecordModel, StatModel, UserModel } from '../../../models/mongoose';
import { calcPlayAttempts } from '../../../models/schemas/levelSchema';
import { queueRefreshIndexCalcs } from '../internal-jobs/worker';

export default withAuth({ POST: {
  query: {
    id: ValidObjectId(),
  },
} }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const { id } = req.query;

  await dbConnect();

  const level = await LevelModel.findOne<Level>({
    _id: id,
    userId: req.userId,
  }, {}, { lean: true });

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  if ((level.data.match(new RegExp(LevelDataType.Start, 'g')) || []).length !== 1) {
    return res.status(400).json({
      error: 'There must be exactly one start block',
    });
  }

  if ((level.data.match(new RegExp(LevelDataType.End, 'g')) || []).length === 0) {
    return res.status(400).json({
      error: 'There must be at least one end block',
    });
  }

  if (level.leastMoves === 0) {
    return res.status(400).json({
      error: 'You must set a move count before publishing',
    });
  }

  if (level.leastMoves > 2500) {
    return res.status(400).json({
      error: 'Move count cannot be greater than 2500',
    });
  }

  if (await LevelModel.findOne({ data: level.data, isDraft: false })) {
    return res.status(400).json({
      error: 'An identical level already exists',
    });
  }

  const session = await mongoose.startSession();
  const ts = TimerUtil.getTs();

  try {
    await session.withTransaction(async () => {
      const [user] = await Promise.all([
        UserModel.findOneAndUpdate<User>({ _id: req.userId }, {
          $inc: { score: 1 },
        }, { lean: true, session: session }),
        LevelModel.updateOne({ _id: id }, {
          $set: {
            isDraft: false,
            ts: ts,
          },
        }, { session: session }),
        RecordModel.create([{
          _id: new ObjectId(),
          levelId: level._id,
          moves: level.leastMoves,
          ts: ts,
          userId: new ObjectId(req.userId),
        }], { session: session }),
        StatModel.create([{
          _id: new ObjectId(),
          attempts: 1,
          complete: true,
          levelId: level._id,
          moves: level.leastMoves,
          ts: ts,
          userId: new ObjectId(req.userId),
        }], { session: session }),
      ]);

      await queueRefreshIndexCalcs(level._id, { session: session });
      await calcPlayAttempts(level._id, { session: session });
      await Promise.all([
        createNewLevelNotifications(new ObjectId(req.userId), level._id),
        queueDiscordWebhook(Discord.LevelsId, `**${user?.name}** published a new level: [${level.name}](${req.headers.origin}/level/${level.slug}?ts=${ts})`),
      ]);
    });
    session.endSession();
  } catch (err) {
    logger.error(err);
    session.endSession();

    return res.status(500).json({
      error: 'Error in publishing level',
    });
  }

  await Promise.all([
    revalidateUrl(res, RevalidatePaths.CATALOG),
    revalidateLevel(res, level.slug),
  ]);

  return res.status(200).json({ updated: true });
});

import { ObjectId } from 'bson';
import mongoose from 'mongoose';
import type { NextApiResponse } from 'next';
import { ValidObjectId } from '../../../helpers/apiWrapper';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import { clearNotifications } from '../../../helpers/notificationHelper';
import revalidateLevel from '../../../helpers/revalidateLevel';
import revalidateUrl, { RevalidatePaths } from '../../../helpers/revalidateUrl';
import { requestBroadcastMatch } from '../../../lib/appSocketToClient';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import MultiplayerMatch from '../../../models/db/multiplayerMatch';
import Record from '../../../models/db/record';
import Stat from '../../../models/db/stat';
import { CollectionModel, ImageModel, LevelModel, MultiplayerMatchModel, PlayAttemptModel, RecordModel, ReviewModel, StatModel, UserModel } from '../../../models/mongoose';
import { MatchAction, MatchLogGeneric, MultiplayerMatchState } from '../../../models/MultiplayerEnums';
import { generateMatchLog } from '../../../models/schemas/multiplayerMatchSchema';
import { queueCalcCreatorCounts, queueCalcPlayAttempts, queueRefreshIndexCalcs } from '../internal-jobs/worker';

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

  const record = await RecordModel.findOne<Record>({ levelId: id }).sort({ moves: 1, ts: -1 });

  // update calc_records if the record was set by a different user
  const session = await mongoose.startSession();
  let newId;
  const allMatchesToRebroadcast = await MultiplayerMatchModel.find({
    state: MultiplayerMatchState.ACTIVE,
    levels: id,
  }, {
    _id: 1,
    matchId: 1
  },
  {
    lean: true
  });

  const ts = TimerUtil.getTs();

  try {
    await session.withTransaction(async () => {
      if (level.ts < ts - 24 * 60 * 60) {
        // level is over 24hrs old, move to archive
        await LevelModel.updateOne({ _id: id }, { $set: {
          archivedBy: req.userId,
          archivedTs: ts,
          userId: new ObjectId('63cdb193ca0d2c81064a21b7'),
        } }, { session: session });
      } else {
        // level is less than 24hrs old, unpublish and clean up stats
        if (record && record.userId.toString() !== req.userId) {
          // NB: await to avoid multiple user updates in parallel
          await UserModel.updateOne({ _id: record.userId }, { $inc: { calc_records: -1 } }, { session: session });
        }

        const stats = await StatModel.find<Stat>({ levelId: id }, {}, { session: session });
        const userIds = stats.filter(stat => stat.complete).map(stat => stat.userId);
        const levelClone = await LevelModel.findOne<Level>({ _id: id, isDraft: false }, {}, { session: session, lean: true }) as Level;

        if (!levelClone) {
          throw new Error('Level not found');
        }

        levelClone._id = new mongoose.Types.ObjectId();
        levelClone.isDraft = true;

        await CollectionModel.updateMany({ levels: id, userId: { '$eq': req.userId } }, { $addToSet: { levels: levelClone._id } }, { session: session });

        await Promise.all([
          ImageModel.deleteOne({ documentId: id }, { session: session }),
          LevelModel.deleteOne({ _id: id }, { session: session }),
          PlayAttemptModel.deleteMany({ levelId: id }, { session: session }),
          RecordModel.deleteMany({ levelId: id }, { session: session }),
          ReviewModel.deleteMany({ levelId: id }, { session: session }),
          StatModel.deleteMany({ levelId: id }, { session: session }),
          UserModel.updateMany({ _id: { $in: userIds } }, { $inc: { score: -1 } }, { session: session }),
          CollectionModel.updateMany({ levels: id }, { $pull: { levels: id } }, { session: session }),
          clearNotifications(undefined, undefined, level._id, undefined, { session: session }),
          MultiplayerMatchModel.updateMany({
            state: MultiplayerMatchState.ACTIVE,
            levels: id,
          },
          {
            state: MultiplayerMatchState.ABORTED,
            $pull: { levels: id },
            $push: {
              matchLog: generateMatchLog(MatchAction.ABORTED, {
                log: 'The level ' + id + ' was unpublished',
              } as MatchLogGeneric)
            }
          }, {
            session: session,
          }),
        ]);

        // need to wait for the level to get deleted before we insert the new one (otherwise we get a duplicate key error)
        await LevelModel.insertMany([levelClone], { session: session });

        // need to wait for the level to get inserted before we update the stats
        await Promise.all([
          queueRefreshIndexCalcs(levelClone._id, { session: session }),
          queueCalcPlayAttempts(levelClone._id, { session: session }),
          queueCalcCreatorCounts(req.user._id, { session: session }),
        ]);

        newId = levelClone._id;

        for (const match of allMatchesToRebroadcast as MultiplayerMatch[]) {
          await requestBroadcastMatch(match.matchId);
        }
      }
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

  return res.status(200).json({ updated: true, levelId: newId });
});

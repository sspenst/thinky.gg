import { GameId } from '@root/constants/GameId';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import mongoose from 'mongoose';
import type { NextApiResponse } from 'next';
import DiscordChannel from '../../../constants/discordChannel';
import { ValidObjectId } from '../../../helpers/apiWrapper';
import queueDiscordWebhook from '../../../helpers/discordWebhook';
import isCurator from '../../../helpers/isCurator';
import { logger } from '../../../helpers/logger';
import { clearNotifications } from '../../../helpers/notificationHelper';
import { requestBroadcastMatch } from '../../../lib/appSocketToClient';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { MatchAction, MatchLogGeneric, MultiplayerMatchState } from '../../../models/constants/multiplayer';
import Level from '../../../models/db/level';
import MultiplayerMatch from '../../../models/db/multiplayerMatch';
import Record from '../../../models/db/record';
import Stat from '../../../models/db/stat';
import { CollectionModel, ImageModel, LevelModel, MultiplayerMatchModel, PlayAttemptModel, RecordModel, ReviewModel, StatModel, UserConfigModel } from '../../../models/mongoose';
import { generateMatchLog } from '../../../models/schemas/multiplayerMatchSchema';
import { queueCalcCreatorCounts, queueCalcPlayAttempts, queueRefreshIndexCalcs } from '../internal-jobs/worker';

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

  if (level.isRanked) {
    return res.status(403).json({
      error: 'Cannot unpublish ranked levels',
    });
  }

  const session = await mongoose.startSession();
  let newLevelId;

  try {
    await session.withTransaction(async () => {
      const record = await RecordModel.findOne(
        { levelId: id },
        { userId: 1 },
        { session: session },
      ).sort({ moves: 1, ts: -1 }).lean<Record>();

      // update calc_records if the record was set by a different user
      if (record && record.userId.toString() !== level.userId.toString()) {
        // NB: await to avoid multiple user updates in parallel
        await UserConfigModel.updateOne({ userId: record.userId, gameId: level.gameId }, { $inc: { calcRecordsCount: -1 } }, { session: session });
      }

      const [levelClone, matchesToRebroadcast, stats] = await Promise.all([
        LevelModel.findOne({ _id: id, isDeleted: { $ne: true }, isDraft: false }, {}, { session: session }).lean<Level>(),
        MultiplayerMatchModel.find({
          state: MultiplayerMatchState.ACTIVE,
          levels: id,
          gameId: level.gameId,
        }, {
          _id: 1,
          matchId: 1
        }, {
          session: session,
        }).lean<MultiplayerMatch[]>(),
        StatModel.find({ levelId: id }, 'complete userId', { session: session }).lean<Stat[]>(),
      ]);

      const userIdsSolved = [];
      const userIdsCompleted = [];

      for (const stat of stats) {
        if (stat.complete) {
          userIdsSolved.push(stat.userId);
        } else {
          userIdsCompleted.push(stat.userId);
        }
      }

      if (!levelClone) {
        throw new Error('Level not found');
      }

      newLevelId = levelClone._id = new mongoose.Types.ObjectId();
      levelClone.isDraft = true;
      // reset leastMoves because the author may not have set the record (and so could "steal" the record by republishing)
      levelClone.leastMoves = 0;

      // first add the new level id to all relevant collections
      await CollectionModel.updateMany({ levels: id, userId: { '$eq': level.userId } }, { $addToSet: { levels: levelClone._id } }, { session: session });

      await Promise.all([
        ImageModel.deleteOne({ documentId: id }, { session: session }),
        // NB: set slug to unique id to avoid duplicate key error
        LevelModel.updateOne({ _id: id }, { $set: { isDeleted: true, slug: id } }, { session: session }),
        PlayAttemptModel.updateMany({ levelId: id }, { $set: { isDeleted: true } }, { session: session }),
        RecordModel.updateMany({ levelId: id }, { $set: { isDeleted: true } }, { session: session }),
        ReviewModel.updateMany({ levelId: id }, { $set: { isDeleted: true } }, { session: session }),
        StatModel.updateMany({ levelId: id }, { $set: { isDeleted: true } }, { session: session }),
        UserConfigModel.updateMany({ userId: { $in: userIdsSolved }, gameId: level.gameId }, { $inc: { calcLevelsSolvedCount: -1, calcLevelsCompletedCount: -1 } }, { session: session }),
        UserConfigModel.updateMany({ userId: { $in: userIdsCompleted }, gameId: level.gameId }, { $inc: { calcLevelsCompletedCount: -1 } }, { session: session }),
        // NB: deleted levels are pulled from all collections, so we never need to filter for deleted levels within collections
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

      const game = getGameFromId(level.gameId);
      const discordChannel = game.id === GameId.PATHOBAN ? DiscordChannel.Pathoban : DiscordChannel.Pathology;

      // need to wait for the level to get inserted before we update the stats
      await Promise.all([
        queueRefreshIndexCalcs(levelClone._id, { session: session }),
        queueCalcPlayAttempts(levelClone._id, { session: session }),
        queueCalcCreatorCounts(level.gameId, level.userId, { session: session }),
        queueDiscordWebhook(discordChannel, `**${req.user.name}** unpublished a level: ${level.name}`, { session: session }),
        ...matchesToRebroadcast.map(match => requestBroadcastMatch(level.gameId, match.matchId)),
      ]);
    });

    session.endSession();
  } catch (err) {
    logger.error(err);
    session.endSession();

    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.status(200).json({ updated: true, levelId: newLevelId });
});

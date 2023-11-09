// ts-node -r tsconfig-paths/register --files server/scripts/delete-user.ts

import { AchievementCategory } from '@root/constants/achievements/achievementInfo';
import { clearNotifications } from '@root/helpers/notificationHelper';
import { requestBroadcastMatch } from '@root/lib/appSocketToClient';
import { MatchAction, MatchLogGeneric, MultiplayerMatchState } from '@root/models/constants/multiplayer';
import Level from '@root/models/db/level';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import Record from '@root/models/db/record';
import Review from '@root/models/db/review';
import Stat from '@root/models/db/stat';
import User from '@root/models/db/user';
import { refreshIndexCalcs } from '@root/models/schemas/levelSchema';
import { generateMatchLog } from '@root/models/schemas/multiplayerMatchSchema';
import { queueRefreshAchievements } from '@root/pages/api/internal-jobs/worker';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import { Types } from 'mongoose';
import dbConnect from '../../lib/dbConnect';
import { AchievementModel, CollectionModel, CommentModel, GraphModel, ImageModel, KeyValueModel, LevelModel, MultiplayerMatchModel, NotificationModel, PlayAttemptModel, RecordModel, ReviewModel, StatModel, UserConfigModel, UserModel } from '../../models/mongoose';

'use strict';

dotenv.config();
console.log('loaded env vars');
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function unpublishLevel(level: Level) {
  const record = await RecordModel.findOne(
    { levelId: level._id },
    { userId: 1 },
  ).sort({ moves: 1, ts: -1 }).lean<Record>();

  // update calc_records if the record was set by a different user
  if (record && record.userId.toString() !== level.userId.toString()) {
    // NB: await to avoid multiple user updates in parallel
    await UserModel.updateOne({ _id: record.userId }, { $inc: { calc_records: -1 } });
  }

  const [matchesToRebroadcast, stats] = await Promise.all([
    MultiplayerMatchModel.find({
      state: MultiplayerMatchState.ACTIVE,
      levels: level._id,
    }, {
      _id: 1,
      matchId: 1
    }).lean<MultiplayerMatch[]>(),
    StatModel.find({ levelId: level._id, complete: true }, 'userId').lean<Stat[]>(),
  ]);

  const userIds = stats.map(stat => stat.userId);

  await Promise.all([
    ImageModel.deleteOne({ documentId: level._id }),
    // NB: set slug to unique id to avoid duplicate key error
    LevelModel.updateOne({ _id: level._id }, { $set: { isDeleted: true, slug: level._id } }),
    PlayAttemptModel.updateMany({ levelId: level._id }, { $set: { isDeleted: true } }),
    RecordModel.updateMany({ levelId: level._id }, { $set: { isDeleted: true } }),
    ReviewModel.updateMany({ levelId: level._id }, { $set: { isDeleted: true } }),
    StatModel.updateMany({ levelId: level._id }, { $set: { isDeleted: true } }),
    UserModel.updateMany({ _id: { $in: userIds } }, { $inc: { score: -1 } }),
    // NB: deleted levels are pulled from all collections, so we never need to filter for deleted levels within collections
    CollectionModel.updateMany({ levels: level._id }, { $pull: { levels: level._id } }),
    clearNotifications(undefined, undefined, level._id, undefined),
    MultiplayerMatchModel.updateMany({
      state: MultiplayerMatchState.ACTIVE,
      levels: level._id,
    },
    {
      state: MultiplayerMatchState.ABORTED,
      $pull: { levels: level._id },
      $push: {
        matchLog: generateMatchLog(MatchAction.ABORTED, {
          log: 'The level ' + level._id + ' was unpublished',
        } as MatchLogGeneric)
      }
    }),
  ]);

  await Promise.all([
    ...matchesToRebroadcast.map(match => requestBroadcastMatch(match.matchId)),
  ]);
}

async function deleteReviews(user: User) {
  console.log(`deleting ${user.name}'s reviews...`);

  const creatorUserIds = new Set<Types.ObjectId>();
  const reviewCount = await ReviewModel.countDocuments({ userId: user._id });

  progressBar.start(reviewCount, 0);

  for await (const review of ReviewModel.find<Review>({
    userId: user._id,
  })) {
    const level = await LevelModel.findById<Level>(review.levelId);

    if (!level) {
      console.error(`level ${review.levelId} not found`);

      continue;
    }

    creatorUserIds.add(level.userId);

    await ReviewModel.deleteOne({ _id: review._id }),
    await refreshIndexCalcs(level._id);
    progressBar.increment();
  }

  progressBar.stop();

  for (const userId of creatorUserIds) {
    await queueRefreshAchievements(userId, [AchievementCategory.CREATOR]);
  }
}

async function deleteUser(userName: string) {
  const user = await UserModel.findOne<User>({ name: userName });

  if (!user) {
    console.error(`user ${userName} not found`);

    return;
  }

  const deletedAt = new Date();

  const levels = await LevelModel.find<Level>({
    isDeleted: { $ne: true },
    isDraft: false,
    userId: user._id,
  });

  console.log(`deleting ${userName}'s levels...`);

  progressBar.start(levels.length, 0);

  for (const level of levels) {
    await unpublishLevel(level);
    progressBar.increment();
  }

  progressBar.stop();

  await deleteReviews(user);

  await Promise.all([
    AchievementModel.deleteMany({ userId: user._id }),
    CollectionModel.deleteMany({ userId: user._id }),
    // delete all comments posted on this user's profile, and all their replies
    CommentModel.aggregate([
      {
        $match: { $or: [
          { author: user._id, deletedAt: null },
          { target: user._id, deletedAt: null },
        ] },
      },
      {
        $set: {
          deletedAt: deletedAt,
        },
      },
      {
        $lookup: {
          from: CommentModel.collection.name,
          localField: '_id',
          foreignField: 'target',
          as: 'children',
          pipeline: [
            {
              $match: {
                deletedAt: null,
              },
            },
            {
              $set: {
                deletedAt: deletedAt,
              },
            },
          ],
        },
      },
    ]),
    GraphModel.deleteMany({ $or: [{ source: user._id }, { target: user._id }] }),
    // delete in keyvaluemodel where key contains userId
    KeyValueModel.deleteMany({ key: { $regex: `.*${user._id}.*` } }),
    NotificationModel.deleteMany({ $or: [
      { source: user._id },
      { target: user._id },
      { userId: user._id },
    ] }),
    UserConfigModel.deleteOne({ userId: user._id }),
    UserModel.deleteOne({ _id: user._id }), // TODO, should make this soft delete...
  ]);

  console.log(`deleted ${userName}`);
}

async function init() {
  const args = process.argv.slice(2);

  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');

  for (const userName of args) {
    console.log(`deleting ${userName}...`);

    await deleteUser(userName);
  }

  process.exit(0);
}

init();

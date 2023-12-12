/* eslint-disable @typescript-eslint/no-explicit-any */
// run with ts-node -r tsconfig-paths/register --files server/scripts/save.ts
// import dotenv
// import tsconfig-paths

import { AchievementCategory } from '@root/constants/achievements/achievementInfo';
import { GameId } from '@root/constants/GameId';
import Level from '@root/models/db/level';
import MultiplayerProfile from '@root/models/db/multiplayerProfile';
import PlayAttempt from '@root/models/db/playAttempt';
import Record from '@root/models/db/record';
import { AttemptContext } from '@root/models/schemas/playAttemptSchema';
import { queueRefreshAchievements } from '@root/pages/api/internal-jobs/worker';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import dbConnect from '../../lib/dbConnect';
import { MultiplayerMatchType } from '../../models/constants/multiplayer';
import User from '../../models/db/user';
import { LevelModel, MultiplayerMatchModel, MultiplayerProfileModel, PlayAttemptModel, RecordModel, StatModel, UserModel } from '../../models/mongoose';
import { calcPlayAttempts, refreshIndexCalcs } from '../../models/schemas/levelSchema';
import { calcCreatorCounts } from '../../models/schemas/userSchema';

'use strict';

dotenv.config();
console.log('loaded env vars');
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function integrityCheckLevels(chunks = 1, chunkIndex = 0) {
  const allLevels = await LevelModel.find({ isDeleted: { $ne: true }, isDraft: false }, '_id', { sort: { ts: -1 } });

  const chunk = Math.floor(allLevels.length / chunks);
  const start = chunk * chunkIndex;
  let end = chunk * (chunkIndex + 1);

  progressBar.start(end - start, 0);

  if (chunkIndex === chunks - 1) {
    end = allLevels.length;
  }

  console.log('Starting integrity checks Levels ... Going from ' + start + ' to ' + end + ' of ' + allLevels.length);
  let changedCount = 0;

  for (let i = start; i < end; i++) {
    const beforeId = allLevels[i];
    const before = await LevelModel.findById(beforeId);

    try {
      await Promise.all([calcPlayAttempts(before._id), refreshIndexCalcs(before._id)]);
    } catch (e) {
      console.error(e, 'for ', before.name);
    }

    const after = await LevelModel.findById(before._id);

    // compare each key and value and see if any are different, if so, console log that
    const changed = [];

    for (const key in before) {
      if (key === '__v') {
        continue;
      }

      // check if before[key] is array
      if (before[key] instanceof Array) {
        // an array so we need to check if the sorted values are differend
        const beforeArr = before[key].sort();
        const afterArr = after[key].sort();
        const arraysEqual = beforeArr.length === afterArr.length && beforeArr.every((value: any, index: any) => value.toString() === afterArr[index].toString());

        if (!arraysEqual) {
          changed.push({ key: key, before: beforeArr, after: afterArr });
          continue;
        }
      } else if (before[key]?.toString() !== after[key]?.toString()) {
        changed.push({ key: key, before: before[key], after: after[key] });
      }
    }

    if (changed.length > 0) {
      console.warn(`\n${before.name} changed:`);
      changedCount++;

      for (const change of changed) {
        if (change.key === 'calc_playattempts_unique_users') {
          const before = change.before.map((x: any) => x.toString());
          const after = change.after.map((x: any) => x.toString());
          const diffAdded = after.filter((x: any) => !before.includes(x));
          const diffRemoved = before.filter((x: any) => !after.includes(x));

          console.warn(`calc_playattempts_unique_users changed from length ${change.before.length} to ${change.after.length} +[${diffAdded}] -[${diffRemoved}]`);
        } else {
          console.warn(`${change.key}: ${change.before} -> ${change.after}`);
        }
      }

      console.log('Changed count is now ' + changedCount + '. Percent error rate is ' + (changedCount / (i + 1 - start) * 100).toFixed(2) + '%');
    }

    progressBar.increment();
  }

  progressBar.update(end - start);
  progressBar.stop();

  console.log('All done');
}

async function integrityCheckMultiplayerProfiles() {
  console.log('Querying all users into memory...');
  const multiplayerProfiles = await MultiplayerProfileModel.find().populate('userId', 'name').lean<MultiplayerProfile[]>();

  for (const type of Object.keys(MultiplayerMatchType)) {
    for (const profile of multiplayerProfiles) {
      const count = await MultiplayerMatchModel.countDocuments({
        players: profile.userId,
        type: type,
      });

      if (count > 0) {
        console.log(type, profile.userId.name, count);
        await MultiplayerProfileModel.findOneAndUpdate({ _id: profile._id }, { $set: { ['calc' + type + 'Count']: count } });
      }
    }
  }

  console.log('All done');
}

async function integrityCheckRankedScore() {
  console.log('collecting stats...');

  // find all ranked levels, then all complete stats for those levels, then group by userId
  const stats = await LevelModel.aggregate([
    { $match: { isRanked: true } },
    {
      $lookup: {
        from: 'stats',
        localField: '_id',
        foreignField: 'levelId',
        as: 'stats',
      },
    },
    { $unwind: '$stats' },
    { $replaceRoot: { newRoot: '$stats' } },
    { $match: { complete: true, isDeleted: { $ne: true } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);

  // convert stats to a dictionary
  const rankedSolvesTable: { [userId: string]: number } = {};

  for (const stat of stats) {
    rankedSolvesTable[stat._id.toString()] = stat.count;
  }

  console.log('querying all users into memory...');
  const allUsers = await UserModel.find<User>().sort({ last_visited_at: -1 });

  progressBar.start(allUsers.length, 0);

  for (const user of allUsers) {
    const calcRankedSolves = rankedSolvesTable[user._id.toString()] ?? 0;

    await UserModel.updateOne({ _id: user._id }, { $set: { calcRankedSolves: calcRankedSolves } });

    // const userBefore = await UserModel.findOneAndUpdate({ _id: user._id }, { $set: { calcRankedSolves: calcRankedSolves } }, { new: false });

    // const userAfter = await UserModel.findById(user._id);

    // if (user.score !== calcRankedSolves) {
    //   console.warn(`\nUser ${user.name} score changed from ${userBefore.score} to ${calcRankedSolves}`);
    // }

    // if (userAfter.calc_levels_created_count !== userBefore.calc_levels_created_count) {
    //   console.warn(`\nUser ${user.name} calc_levels_created_count changed from ${userBefore.calc_levels_created_count} to ${userAfter.calc_levels_created_count}`);
    // }

    progressBar.increment();
  }

  progressBar.stop();
  console.log('done');
}

async function integrityCheckUsersScore() {
  // Aggregate all of the stat model complete:true by userId
  const scoreTable = await StatModel.aggregate([
    { $match: { complete: true, isDeleted: { $ne: true } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);

  // now update all user's  based on their play attempt count
  console.log('Querying all users into memory...');
  const allUsers = await UserModel.find<User>({}, '_id name score', { sort: { last_visited_at: -1 } });
  let i = 0;

  progressBar.start(allUsers.length, 0);

  for (const user of allUsers) {
    const scoreForThisUser = scoreTable.find((x: any) => x._id.toString() === user._id.toString())?.count || 0;

    const userBefore = await UserModel.findOneAndUpdate({ _id: user._id }, { $set: { score: scoreForThisUser } }, { new: false });

    await calcCreatorCounts(user._id);
    const userAfter = await UserModel.findById(user._id);

    if (user.score !== scoreForThisUser) {
      console.warn(`\nUser ${user.name} score changed from ${userBefore.score} to ${scoreForThisUser}`);
    }

    if (userAfter.calc_levels_created_count !== userBefore.calc_levels_created_count) {
      console.warn(`\nUser ${user.name} calc_levels_created_count changed from ${userBefore.calc_levels_created_count} to ${userAfter.calc_levels_created_count}`);
    }

    i++;
    progressBar.update(i);
  }

  progressBar.stop();
  console.log('All done');
}

async function integrityCheckRecords() {
  console.log('Integrity Check Records');
  console.log('Querying all levels\' records into memory...');
  const allLevels = await LevelModel.countDocuments({ isDeleted: { $ne: true }, isDraft: false });
  const recordCounts: { [userId: string]: number } = {};
  let i = 0;

  progressBar.start(allLevels, 0);

  for await (const level of LevelModel.find<Level>({ isDeleted: { $ne: true }, isDraft: false })) {
    // find the latest record
    const record = await RecordModel.findOne<Record>({ levelId: level._id }).sort({ ts: -1 });

    if (!record) {
      console.warn(`\nNo record found for level ${level.slug}`);
      continue;
    }

    const levelUserId = (level.archivedBy ?? level.userId).toString();
    const recordUserId = record.userId.toString();

    // record was not set by the original author, we have found a valid record
    if (recordUserId !== levelUserId) {
      if (recordUserId in recordCounts) {
        recordCounts[recordUserId] += 1;
      } else {
        recordCounts[recordUserId] = 1;
      }
    }

    i++;
    progressBar.update(i);
  }

  progressBar.stop();
  console.log('Collected record counts');

  const allUsers = await UserModel.countDocuments();

  i = 0;
  progressBar.start(allUsers, 0);

  for await (const user of UserModel.find<User>()) {
    const userId = user._id.toString();
    const records = (userId in recordCounts) ? recordCounts[userId] : 0;

    if (user.calc_records !== records) {
      console.warn(`\nUser ${user.name} score changed from ${user.calc_records} to ${records}`);
      await UserModel.updateOne({ _id: user._id }, { $set: { calc_records: records } });
    }

    i++;
    progressBar.update(i);
  }

  progressBar.stop();
  console.log('All done');
}

async function integrityCheckAcheivements() {
  console.log('Querying all users into memory...');
  const users = await UserModel.find<User>({}, '_id name score', { sort: { score: -1 } });

  // looping through all users

  const allAchievementCategories = Object.values(AchievementCategory);
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

  progressBar.start(users.length, 0);

  for (const user of users) {
    // TODO - loop through all games and refresh achievements for each game
    await queueRefreshAchievements(GameId.PATHOLOGY, user._id, allAchievementCategories as AchievementCategory[], { session: null });
    progressBar.increment();
  }

  progressBar.stop();
  console.log('integrityCheckAcheivements done');
}

async function integrityCheckPlayAttempts() {
  let prevPlayAttempt: PlayAttempt | null = null;
  let trackJustSolved = false;

  // stream with async interator, sorted using the existing index
  for await (const playAttempt of PlayAttemptModel.find({}, {}, { sort: { levelId: 1, userId: 1, endTime: -1, attemptContext: -1 } }).lean<PlayAttempt[]>()) {
    if (playAttempt.startTime > playAttempt.endTime) {
      console.warn(`[${playAttempt._id.toString()}, ${playAttempt.levelId.toString()}, ${playAttempt.userId.toString()}] startTime greater than endTime`);
      continue;
    }

    // comparing play attempts from the same level and user
    if (prevPlayAttempt && prevPlayAttempt.levelId.toString() === playAttempt.levelId.toString() && prevPlayAttempt.userId.toString() === playAttempt.userId.toString()) {
      if (playAttempt.attemptContext > prevPlayAttempt.attemptContext) {
        console.warn(`[${playAttempt._id.toString()}, ${playAttempt.levelId.toString()}, ${playAttempt.userId.toString()}] attemptContext out of order`);
      }

      if (playAttempt.attemptContext === AttemptContext.UNSOLVED && prevPlayAttempt.attemptContext === AttemptContext.SOLVED) {
        if (playAttempt.startTime === playAttempt.endTime) {
          // sometimes this is a bug where an author has UNSOLVED on their own level - safe to delete either way
          await PlayAttemptModel.deleteOne({ _id: playAttempt._id });
          console.log(`[${playAttempt._id.toString()}, ${playAttempt.levelId.toString()}, ${playAttempt.userId.toString()}] DELETED - missing AttemptContext.JUST_SOLVED`);
          continue;
        } else {
          // otherwise attempt to correct the data
          await PlayAttemptModel.findByIdAndUpdate(playAttempt._id, { $set: { attemptContext: AttemptContext.JUST_SOLVED } });
          playAttempt.attemptContext = AttemptContext.JUST_SOLVED;

          console.log(`[${playAttempt._id.toString()}, ${playAttempt.levelId.toString()}, ${playAttempt.userId.toString()}] UPDATED - AttemptContext.JUST_SOLVED`);
        }
      }

      if (playAttempt.attemptContext === AttemptContext.JUST_SOLVED) {
        if (trackJustSolved) {
          await PlayAttemptModel.findByIdAndUpdate(playAttempt._id, { $set: { attemptContext: AttemptContext.UNSOLVED } });
          playAttempt.attemptContext = AttemptContext.UNSOLVED;

          console.log(`[${playAttempt._id.toString()}, ${playAttempt.levelId.toString()}, ${playAttempt.userId.toString()}] UPDATED - multiple AttemptContext.JUST_SOLVED`);
        } else {
          trackJustSolved = true;
        }
      }

      if (playAttempt.endTime > prevPlayAttempt.startTime) {
        if (playAttempt.startTime >= prevPlayAttempt.startTime && playAttempt.attemptContext !== AttemptContext.JUST_SOLVED) {
          await PlayAttemptModel.deleteOne({ _id: playAttempt._id });
          console.log(`[${playAttempt._id.toString()}, ${playAttempt.levelId.toString()}, ${playAttempt.userId.toString()}] DELETED - time range overlapping`);
          continue;
        }

        console.warn(`[${playAttempt._id.toString()}, ${playAttempt.levelId.toString()}, ${playAttempt.userId.toString()}] time range overlapping`);
      }
    } else {
      // reset tracking variable
      trackJustSolved = false;
    }

    prevPlayAttempt = playAttempt;
  }

  // NB: not worth comparing all the playattempt JUST_SOLVED against all completed stats, since playattempts are not guaranteed to be complete (data is missing from before playattempts were collected and so there are many special cases)

  console.log('integrityCheckPlayAttempts done');
}

// get command line arguments. check for existence of --levels and --users
async function init() {
  const args = process.argv.slice(2);
  const runLevels = args.includes('--levels');
  const runRanked = args.includes('--ranked');
  const runUsers = args.includes('--users');
  const runMultiplayerProfiles = args.includes('--multiplayer');
  const runAchievements = args.includes('--achievements');
  const runPlayAttempts = args.includes('--playattempts');
  const runRecords = args.includes('--records');

  // chunks and chunk-index are used to split up the work into chunks
  const chunks = parseInt(args.find((x: string) => x.startsWith('--chunks='))?.split('=')[1] || '1');
  const chunkIndex = parseInt(args.find((x: string) => x.startsWith('--chunk-index='))?.split('=')[1] || '0');

  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');

  if (runLevels) {
    await integrityCheckLevels(chunks, chunkIndex);
  }

  if (runRanked) {
    await integrityCheckRankedScore();
  }

  if (runUsers) {
    await integrityCheckUsersScore();
  }

  if (runRecords) {
    await integrityCheckRecords();
  }

  if (runMultiplayerProfiles) {
    await integrityCheckMultiplayerProfiles();
  }

  if (runAchievements) {
    await integrityCheckAcheivements();
  }

  if (runPlayAttempts) {
    await integrityCheckPlayAttempts();
  }

  process.exit(0);
}

init();

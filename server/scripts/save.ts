// run with ts-node -r tsconfig-paths/register --files server/scripts/save.ts
// import dotenv
// import tsconfig-paths

import AchievementInfo from '@root/constants/achievementInfo';
import AchievementType from '@root/constants/achievementType';
import { createNewAchievement } from '@root/helpers/notificationHelper';
import Achievement from '@root/models/db/achievement';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import dbConnect from '../../lib/dbConnect';
import User from '../../models/db/user';
import { AchievementModel, LevelModel, MultiplayerMatchModel, MultiplayerProfileModel, StatModel, UserModel } from '../../models/mongoose';
import { MultiplayerMatchType } from '../../models/MultiplayerEnums';
import { calcPlayAttempts, refreshIndexCalcs } from '../../models/schemas/levelSchema';
import { calcCreatorCounts } from '../../models/schemas/userSchema';

'use strict';

dotenv.config();

console.log('env vars are ', dotenv.config().parsed);
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function integrityCheckLevels(chunks = 1, chunkIndex = 0) {
  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');
  const allLevels = await LevelModel.find({ isDeleted: { $ne: true }, isDraft: false }, '_id', { lean: false, sort: { ts: -1 } });

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

      console.log('Changed count is now ' + changedCount + '. Percent error rate is ' + (changedCount / (end - start) * 100).toFixed(2) + '%');
    }

    progressBar.increment();
  }

  progressBar.update(end - start);
  progressBar.stop();

  console.log('All done');
}

async function integrityCheckMultiplayerProfiles() {
  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');
  console.log('Querying all users into memory...');
  const multiplayerProfiles = await MultiplayerProfileModel.find({}, {}, { lean: true }).populate('userId', 'name');

  for (const type of Object.keys(MultiplayerMatchType)) {
    for (const profile of multiplayerProfiles) {
      const count = await MultiplayerMatchModel.count({
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

async function integrityCheckUsersScore() {
  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');

  // Aggregate all of the stat model complete:true by userId
  const scoreTable = await StatModel.aggregate([
    { $match: { complete: true, isDeleted: { $ne: true } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);

  // now update all user's  based on their play attempt count
  console.log('Querying all users into memory...');
  const allUsers = await UserModel.find<User>({}, '_id name score', { lean: false, sort: { last_visited_at: -1 } });
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

async function integrityCheckAcheivements() {
  console.log('Connecting to db...');
  await dbConnect();
  console.log('Querying all users into memory...');
  const users = await UserModel.find<User>({}, '_id name score', { lean: false, sort: { score: -1 } });

  console.log(users[0]);

  console.log('Querying all achievements into memory...');
  const achievements = await AchievementModel.find<Achievement>();

  console.log(achievements.length);

  for (const achievementType in AchievementInfo) {
    console.log(achievementType);

    const achievementInfo = AchievementInfo[achievementType];

    // go through each user that qualifies for the achievement
    for (const user of users.filter(user => achievementInfo.unlocked(user))) {
      if (!achievements.some((achievement) => achievement.type === achievementType as AchievementType && achievement.userId !== user._id)) {
        console.warn(`\nIssuing ${achievementType} for ${user.name}`);
        createNewAchievement(achievementType as AchievementType, user._id);
      }
    }
  }

  console.log('integrityCheckAcheivements done');
}

// get command line arguments. check for existence of --levels and --users
async function init() {
  const args = process.argv.slice(2);
  const runLevels = args.includes('--levels');
  const runUsers = args.includes('--users');
  const runMultiplayerProfiles = args.includes('--multiplayer');
  const runAchievements = args.includes('--achievements');

  // chunks and chunk-index are used to split up the work into chunks
  const chunks = parseInt(args.find((x: any) => x.startsWith('--chunks='))?.split('=')[1] || '1');
  const chunkIndex = parseInt(args.find((x: any) => x.startsWith('--chunk-index='))?.split('=')[1] || '0');

  if (runLevels) {
    await integrityCheckLevels(chunks, chunkIndex);
  }

  if (runUsers) {
    await integrityCheckUsersScore();
  }

  if (runMultiplayerProfiles) {
    await integrityCheckMultiplayerProfiles();
  }

  if (runAchievements) {
    await integrityCheckAcheivements();
  }
}

init();

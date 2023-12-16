// run with
// ts-node -r tsconfig-paths/register --files server/scripts/p2_migrateUserCalcsToConfig.ts
// import dotenv
import User from '@root/models/db/user';
import { UserConfigModel, UserModel } from '@root/models/mongoose';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import { migrateFields } from './migrateFields';

dotenv.config();

const fieldsToMigrate = {
  calcRankedSolves: '$calcRankedSolves',
  calcLevelsCreatedCount: '$calc_levels_created_count',
  calcRecordsCount: '$calc_records',
  chapterUnlocked: '$chapterUnlocked',
  calcLevelsSolvedCount: '$score',
  roles: '$roles',
};

migrateFields(UserModel, UserConfigModel, fieldsToMigrate, '_id', 'userId', { 'target.gameId': 'pathology' });

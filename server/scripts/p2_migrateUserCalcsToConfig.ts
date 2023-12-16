// run with
// ts-node -r tsconfig-paths/register --files server/scripts/p2_migrateUserCalcsToConfig.ts
// import dotenv
import { UserConfigModel, UserModel } from '@root/models/mongoose';
import dotenv from 'dotenv';
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

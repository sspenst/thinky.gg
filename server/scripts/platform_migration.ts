// ts-node -r tsconfig-paths/register --files server/scripts/platform_migration.ts
import { UserConfigModel, UserModel } from '@root/models/mongoose';
import dotenv from 'dotenv';
import { migrateFields } from './migrateFields';

dotenv.config();

migrateFields(UserConfigModel, UserModel, {
  emailDigest: '$emailDigest',
  disallowedEmailNotifications: '$disallowedEmailNotifications',
  disallowedPushNotifications: '$disallowedPushNotifications'
}, 'userId', '_id', { 'target.emailDigest': { $exists: false } });

migrateFields(UserModel, UserConfigModel, {
  calcRankedSolves: '$calcRankedSolves',
  calcLevelsCreatedCount: '$calc_levels_created_count',
  calcRecordsCount: '$calc_records',
  chapterUnlocked: '$chapterUnlocked',
  calcLevelsSolvedCount: '$score',
  roles: '$roles',
}, '_id', 'userId', { 'target.gameId': 'pathology' });

// TODO : Remove old fields from both models.
// Also ensure that PRO doesn't exist on UserModel roles

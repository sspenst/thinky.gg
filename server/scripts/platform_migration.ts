// ts-node -r tsconfig-paths/register --files server/scripts/platform_migration.ts
import Role from '@root/constants/role';
import { UserConfigModel, UserModel } from '@root/models/mongoose';
import dotenv from 'dotenv';
import * as readline from 'readline';
import { migrateFields } from './migrateFields';

dotenv.config();

// empty roles fields on UserModel, basically remove all except Role.ADMIN
async function pullAllRolesInUserModelExceptAdmin() {
  console.log('pulling all roles except admin from UserModel');
  const pulled = await UserModel.updateMany({}, {
    $pullAll: { roles: [ Role.PRO, Role.CURATOR] }
  });

  console.log('pulled', pulled);
}

async function Go() {
  console.log('Starting migration script');
  await migrateFields(UserConfigModel, UserModel, {
    emailDigest: '$emailDigest',
    disallowedEmailNotifications: '$disallowedEmailNotifications',
    disallowedPushNotifications: '$disallowedPushNotifications',
    stripeCustomerId: '$stripeCustomerId',
    stripeGiftSubscriptions: '$giftSubscriptions',
    mobileDeviceTokens: '$mobileDeviceTokens',
  }, 'userId', '_id', { 'target.emailDigest': { $exists: false } });

  await migrateFields(UserModel, UserConfigModel, {
    calcRankedSolves: '$calcRankedSolves',
    calcLevelsCreatedCount: '$calc_levels_created_count',
    calcRecordsCount: '$calc_records',
    chapterUnlocked: '$chapterUnlocked',
    calcLevelsSolvedCount: '$score',
    roles: '$roles',
  }, '_id', 'userId', { 'target.gameId': 'pathology' });

  await pullAllRolesInUserModelExceptAdmin();

  console.log('Done');
  process.exit(0);

// TODO : Remove old fields from both models.
// Also ensure that PRO doesn't exist on UserModel roles
}

Go();

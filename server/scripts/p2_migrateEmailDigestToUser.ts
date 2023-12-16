import { UserConfigModel, UserModel } from '@root/models/mongoose';
import dotenv from 'dotenv';
import { migrateFields } from './migrateFields';

dotenv.config();

// Example usage
const sourceModel = UserConfigModel; // Replace with your source model
const targetModel = UserModel; // Replace with your target model
const fieldsToMigrate = {
  emailDigest: '$emailDigest',
  disallowedEmailNotifications: '$disallowedEmailNotifications',
  disallowedPushNotifications: '$disallowedPushNotifications'
};

migrateFields(sourceModel, targetModel, fieldsToMigrate, 'userId', '_id', { 'target.emailDigest': { $exists: false } });

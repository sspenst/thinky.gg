import CollectionModel from '@root/models/mongoose/CollectionModel';
import { Types } from 'mongoose';
import User from '../../models/db/user';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

interface IAchievementInfoFeatureExplorer extends IAchievementInfo {
  unlocked: ({ hasAddedLevelToCollection, user }: { hasAddedLevelToCollection: boolean, user: User }) => boolean;
}

const AchievementRulesFeatureExplorer: { [achievementType: string]: IAchievementInfoFeatureExplorer } = {};

AchievementRulesFeatureExplorer[AchievementType.ADD_LEVEL_TO_COLLECTION] = {
  getDescription: () => 'Added a level to a collection',
  name: 'Collection Curator',
  emoji: '📁',
  discordNotification: false,
  secret: false,
  unlocked: ({ hasAddedLevelToCollection }) => {
    return hasAddedLevelToCollection;
  },
};

AchievementRulesFeatureExplorer[AchievementType.UPLOAD_AVATAR] = {
  getDescription: () => 'Uploaded an avatar to personalize your profile',
  name: 'Avatar Awakened',
  emoji: '🖼️',
  discordNotification: false,
  secret: true,
  unlocked: ({ user }) => {
    return !!(user?.avatarUpdatedAt);
  },
};

AchievementRulesFeatureExplorer[AchievementType.UPDATE_BIO] = {
  getDescription: () => 'Added a bio to your profile',
  name: 'Autobiographer',
  emoji: '✍️',
  discordNotification: false,
  secret: true,
  unlocked: ({ user }) => {
    return !!(user?.bio && user.bio.length > 0);
  },
};

export default AchievementRulesFeatureExplorer;

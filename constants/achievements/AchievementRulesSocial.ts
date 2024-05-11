import Comment from '@root/models/db/comment';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

interface IAchievementInfoSocial extends IAchievementInfo {
  unlocked: ({ welcomedComments, commentCount }: { welcomedComments: Comment[]; commentCount: number }) => boolean;
}

const AchievementRulesThinky: { [achievementType: string]: IAchievementInfoSocial } = {};

AchievementRulesThinky[AchievementType.THINKY_SOCIAL_WELCOMED_1_USER] = {
  getDescription: () => 'Welcomed a new user to the community!',
  name: 'Newbie Nod',
  emoji: '👋',
  discordNotification: true,
  secret: true,
  unlocked: ({ welcomedComments, commentCount }) => {
    return (welcomedComments.length > 0);
  },
};
AchievementRulesThinky[AchievementType.THINKY_SOCIAL_COMMENT_TO_1_USER] = {
  getDescription: () => 'Welcomed a new user to the community!',
  name: 'Thinky-Mart Greeter',
  emoji: '🛒',
  discordNotification: true,
  secret: true,
  unlocked: ({ welcomedComments, commentCount }) => {
    return (welcomedComments.length > 0);
  },
};
AchievementRulesThinky[AchievementType.THINKY_SOCIAL_WEBLCOMED_5_USERS] = {
  getDescription: () => 'Welcomed 5 new users to the community!',
  name: 'Welcoming Committee',
  emoji: '🎈',
  discordNotification: true,
  secret: true,
  unlocked: ({ welcomedComments, commentCount }) => {
    return (welcomedComments.length >= 5);
  },
};
AchievementRulesThinky[AchievementType.THINKY_SOCIAL_WEBLCOMED_10_USERS] = {
  getDescription: () => 'Welcomed 10 new users to the community!',
  name: 'Thinky Ambassador',
  emoji: '🤝',
  discordNotification: true,
  secret: true,
  unlocked: ({ welcomedComments, commentCount }) => {
    return (welcomedComments.length >= 10);
  },
};

export default AchievementRulesThinky;

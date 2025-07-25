import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

interface IAchievementInfoSocial extends IAchievementInfo {
  unlocked: ({ commentCount, hasWelcomed, hasSharedToSocial, user }: { commentCount: number, hasWelcomed: boolean, hasSharedToSocial: boolean, user: User }) => boolean;
}

const AchievementRulesSocial: { [achievementType: string]: IAchievementInfoSocial } = {};

AchievementRulesSocial[AchievementType.COMMENT_1] = {
  getDescription: () => 'Wrote a comment on another user\'s profile',
  name: 'Chatty',
  emoji: '💬',
  discordNotification: false,
  secret: false,
  unlocked: ({ commentCount }) => {
    return (commentCount >= 1);
  },
};
AchievementRulesSocial[AchievementType.COMMENT_5] = {
  getDescription: () => 'Wrote 5 comments on other users\' profiles',
  name: 'Conversationalist',
  emoji: '🗣️',
  discordNotification: false,
  secret: false,
  unlocked: ({ commentCount }) => {
    return (commentCount >= 5);
  },
};
AchievementRulesSocial[AchievementType.COMMENT_10] = {
  getDescription: () => 'Wrote 10 comments on other users\' profiles',
  name: 'Commentator',
  emoji: '🎙️',
  discordNotification: true,
  secret: false,
  unlocked: ({ commentCount }) => {
    return (commentCount >= 10);
  },
};
AchievementRulesSocial[AchievementType.COMMENT_25] = {
  getDescription: () => 'Wrote 25 comments on other users\' profiles',
  name: 'Social Butterfly',
  emoji: '🦋',
  discordNotification: true,
  secret: false,
  unlocked: ({ commentCount }) => {
    return (commentCount >= 25);
  },
};
AchievementRulesSocial[AchievementType.WELCOME] = {
  getDescription: () => 'Welcomed a new user to the community!',
  name: 'Newbie Nod',
  emoji: '👋',
  discordNotification: true,
  secret: true,
  unlocked: ({ hasWelcomed }) => {
    return hasWelcomed;
  },
};
AchievementRulesSocial[AchievementType.UPLOAD_AVATAR] = {
  getDescription: () => 'Uploaded an avatar to personalize your profile',
  name: 'Avatar Awakened',
  emoji: '🖼️',
  discordNotification: false,
  secret: true,
  unlocked: ({ user }) => {
    return !!(user?.avatarUpdatedAt);
  },
};
AchievementRulesSocial[AchievementType.UPDATE_BIO] = {
  getDescription: () => 'Added a bio to your profile',
  name: 'Autobiographer',
  emoji: '✍️',
  discordNotification: false,
  secret: true,
  unlocked: ({ user }) => {
    return !!(user?.bio && user.bio.length > 0);
  },
};
AchievementRulesSocial[AchievementType.SOCIAL_SHARE] = {
  getDescription: () => 'Shared a level to a social network',
  name: 'Social Sharer',
  emoji: '📱',
  discordNotification: true,
  secret: true,
  unlocked: ({ hasSharedToSocial }) => {
    return hasSharedToSocial;
  },
};

export default AchievementRulesSocial;

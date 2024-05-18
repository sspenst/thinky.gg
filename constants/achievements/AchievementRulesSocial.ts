import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

interface IAchievementInfoSocial extends IAchievementInfo {
  unlocked: ({ commentCount, hasWelcomed }: { commentCount: number, hasWelcomed: boolean }) => boolean;
}

const AchievementRulesSocial: { [achievementType: string]: IAchievementInfoSocial } = {};

AchievementRulesSocial[AchievementType.COMMENT_1] = {
  getDescription: () => 'Wrote a comment',
  name: 'Chatty',
  emoji: '💬',
  discordNotification: false,
  secret: false,
  unlocked: ({ commentCount }) => {
    return (commentCount >= 1);
  },
};
AchievementRulesSocial[AchievementType.COMMENT_5] = {
  getDescription: () => 'Wrote 5 comments',
  name: 'Conversationalist',
  emoji: '🗣️',
  discordNotification: false,
  secret: false,
  unlocked: ({ commentCount }) => {
    return (commentCount >= 5);
  },
};
AchievementRulesSocial[AchievementType.COMMENT_10] = {
  getDescription: () => 'Wrote 10 comments',
  name: 'Commentator',
  emoji: '🎙️',
  discordNotification: true,
  secret: false,
  unlocked: ({ commentCount }) => {
    return (commentCount >= 10);
  },
};
AchievementRulesSocial[AchievementType.COMMENT_25] = {
  getDescription: () => 'Wrote 25 comments',
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

export default AchievementRulesSocial;

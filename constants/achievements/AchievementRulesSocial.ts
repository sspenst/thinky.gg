import Comment from '@root/models/db/comment';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

interface IAchievementInfoSocial extends IAchievementInfo {
  unlocked: ({ welcomedComments, commentCount }: { welcomedComments: Comment[]; commentCount: number }) => boolean;
}

const AchievementRulesThinky: { [achievementType: string]: IAchievementInfoSocial } = {};

AchievementRulesThinky[AchievementType.THINKY_SOCIAL_WELCOMED_1_USER] = {
  getDescription: () => 'Welcomed a new user to the community!',
  name: 'Welcoming Committee',
  emoji: '👋',
  discordNotification: true,
  secret: true,
  unlocked: ({ welcomedComments, commentCount }) => {
    console.log('welc', welcomedComments);

    return (welcomedComments.length > 0);
  },
};
AchievementRulesThinky[AchievementType.THINKY_SOCIAL_COMMENT_TO_1_USER] = {
  getDescription: () => 'Wrote a comment on another player\'s profile',
  name: 'Ice breaker',
  emoji: '💬',
  discordNotification: true,
  secret: false,
  unlocked: ({ welcomedComments, commentCount }) => {
    console.log('commentCount', commentCount);

    return (commentCount > 0);
  },
};

export default AchievementRulesThinky;

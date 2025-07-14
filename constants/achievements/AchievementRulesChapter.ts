import UserConfig from '@root/models/db/userConfig';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

interface IAchievementInfoUser extends IAchievementInfo {
  unlocked: ({ userConfig }: { userConfig: UserConfig | null; }) => boolean;
}

const AchievementRulesChapter: { [achievementType: string]: IAchievementInfoUser; } = {
  [AchievementType.CHAPTER_1_COMPLETED]: {
    name: 'Grassroots Graduate',
    emoji: '🌱',
    getDescription: () => 'Completed Chapter 1',
    unlocked: ({ userConfig }) => (userConfig?.chapterUnlocked || 1) >= 2,
  },
  [AchievementType.CHAPTER_2_COMPLETED]: {
    name: 'Into the Depths',
    emoji: '🌿',
    getDescription: () => 'Completed Chapter 2',
    unlocked: ({ userConfig }) => (userConfig?.chapterUnlocked || 1) >= 3,
  },
  [AchievementType.CHAPTER_3_COMPLETED]: {
    name: 'Brain Buster Champion',
    emoji: '🏅',
    getDescription: () => 'Completed Chapter 3',
    discordNotification: true,
    unlocked: ({ userConfig }) => (userConfig?.chapterUnlocked || 1) >= 4,
  },
};

export default AchievementRulesChapter;

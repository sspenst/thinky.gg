import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

export interface IAchievementInfoMultiplayer extends IAchievementInfo {
    unlocked: ({ userMatches }: { userMatches: MultiplayerMatch[]; }) => boolean;
  }
export const AchievementRulesTableMultiplayer: { [achievementType: string]: IAchievementInfoMultiplayer; } = {
  [AchievementType.MULTIPLAYER_1_GAME_PLAYED]: {
    name: 'First Game',
    emoji: '🎮',
    description: 'Played a rated multiplayer match',
    unlocked: ({ userMatches }) => {
      return userMatches.length >= 1;
    }
  },
};

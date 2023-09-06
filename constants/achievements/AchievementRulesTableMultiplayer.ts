import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import MultiplayerProfile from '@root/models/db/multiplayerProfile';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

export interface IAchievementInfoMultiplayer extends IAchievementInfo {
    unlocked: ({ userMatches, multiplayerProfile }: { userMatches: MultiplayerMatch[], multiplayerProfile: MultiplayerProfile }) => boolean;
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
  [AchievementType.MULTIPLAYER_CLASSICAL_1_GAME_PLAYED]: {
    name: 'Classical Player',
    emoji: '⏱️',
    description: 'Earned an elo in classical',
    unlocked: ({ multiplayerProfile }) => {
      return multiplayerProfile.calcRushClassicalCount >= 5;
    }
  },
};

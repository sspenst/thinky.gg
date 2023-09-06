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
      return userMatches?.length >= 1;
    }
  },
  [AchievementType.MULTIPLAYER_BULLET_5_GAME_PLAYED]: {
    name: 'Bullet Player',
    // rabbit
    emoji: '🚅',
    description: 'Earned an elo in bullet',
    unlocked: ({ multiplayerProfile }) => {
      return multiplayerProfile?.calcRushBulletCount >= 5;
    },
  },
  [AchievementType.MULTIPLAYER_BLITZ_5_GAME_PLAYED]: {
    name: 'Blitz Player',
    emoji: '⚡',
    description: 'Earned an elo in blitz',
    unlocked: ({ multiplayerProfile }) => {
      return multiplayerProfile?.calcRushBlitzCount >= 5;
    }
  },
  [AchievementType.MULTIPLAYER_RAPID_5_GAME_PLAYED]: {
    name: 'Rapid Player',
    emoji: '🚗',
    description: 'Earned an elo in rapid',
    unlocked: ({ multiplayerProfile }) => {
      return multiplayerProfile?.calcRushRapidCount >= 5;
    }
  },

  [AchievementType.MULTIPLAYER_CLASSICAL_5_GAME_PLAYED]: {
    name: 'Classical Player',
    emoji: '⏱️',
    description: 'Earned an elo in classical',
    unlocked: ({ multiplayerProfile }) => {
      return multiplayerProfile?.calcRushClassicalCount >= 5;
    }
  },

};

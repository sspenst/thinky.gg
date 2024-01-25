import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import MultiplayerProfile from '@root/models/db/multiplayerProfile';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

interface IAchievementInfoMultiplayer extends IAchievementInfo {
    unlocked: ({ userMatches, multiplayerProfile }: { userMatches: MultiplayerMatch[], multiplayerProfile: MultiplayerProfile }) => boolean;
}

const AchievementRulesMultiplayer: { [achievementType: string]: IAchievementInfoMultiplayer; } = {
  [AchievementType.MULTIPLAYER_CLASSICAL_5_GAME_PLAYED]: {
    name: 'Classical Player',
    emoji: '⏱️',
    getDescription: () => 'Earned an elo in classical',
    unlocked: ({ multiplayerProfile }) => multiplayerProfile?.calcRushClassicalCount >= 5,
  },
  [AchievementType.MULTIPLAYER_RAPID_5_GAME_PLAYED]: {
    name: 'Rapid Player',
    emoji: '🚗',
    getDescription: () => 'Earned an elo in rapid',
    unlocked: ({ multiplayerProfile }) => multiplayerProfile?.calcRushRapidCount >= 5,
  },
  [AchievementType.MULTIPLAYER_BLITZ_5_GAME_PLAYED]: {
    name: 'Blitz Player',
    emoji: '⚡',
    getDescription: () => 'Earned an elo in blitz',
    unlocked: ({ multiplayerProfile }) => multiplayerProfile?.calcRushBlitzCount >= 5,
  },
  [AchievementType.MULTIPLAYER_BULLET_5_GAME_PLAYED]: {
    name: 'Bullet Player',
    emoji: '🚅',
    getDescription: () => 'Earned an elo in bullet',
    unlocked: ({ multiplayerProfile }) => multiplayerProfile?.calcRushBulletCount >= 5,
  },
  [AchievementType.MULTIPLAYER_1_GAME_PLAYED]: {
    name: 'First Game',
    emoji: '🎮',
    getDescription: () => 'Played a rated multiplayer match',
    unlocked: ({ userMatches }) => userMatches?.length >= 1,
  },
};

export default AchievementRulesMultiplayer;

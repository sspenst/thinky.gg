import AchievementRulesCreator from '@root/constants/achievements/AchievementRulesCreator';
import AchievementType from '@root/constants/achievements/achievementType';
import Level from '@root/models/db/level';
import { Games } from '@root/constants/Games';
import { GameId } from '@root/constants/GameId';

describe('AchievementRulesCreator', () => {
  // Helper function to create mock levels with specific review scores
  const createMockLevel = (reviewScore: number): Level => ({
    calc_reviews_score_laplace: reviewScore,
  } as Level);

  // Mock game for testing
  const mockGame = Games[GameId.PATHOLOGY];

  describe('CREATOR_CREATED_1_LEVEL', () => {
    const achievement = AchievementRulesCreator[AchievementType.CREATOR_CREATED_1_LEVEL];

    test('should have correct properties', () => {
      expect(achievement.name).toBe('Handyman');
      expect(achievement.emoji).toBe('🔧');
      expect(achievement.getDescription(mockGame)).toBe('Created your first level');
    });

    test('should unlock with 1 level', () => {
      const levels = [createMockLevel(0.5)];
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(true);
    });

    test('should not unlock with 0 levels', () => {
      expect(achievement.unlocked({ levelsCreated: [] })).toBe(false);
    });
  });

  describe('CREATOR_CREATED_5_LEVELS', () => {
    const achievement = AchievementRulesCreator[AchievementType.CREATOR_CREATED_5_LEVELS];

    test('should have correct properties', () => {
      expect(achievement.name).toBe('Apprentice');
      expect(achievement.emoji).toBe('🛠️');
      expect(achievement.getDescription(mockGame)).toBe('Created 5 quality levels');
      expect(achievement.tooltip).toBe('Quality levels have a review score >= 80.0');
    });

    test('should unlock with 5 quality levels', () => {
      const levels = Array(5).fill(null).map(() => createMockLevel(0.8));
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(true);
    });

    test('should not unlock with 4 quality levels', () => {
      const levels = Array(4).fill(null).map(() => createMockLevel(0.8));
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(false);
    });

    test('should not unlock with 5 low quality levels', () => {
      const levels = Array(5).fill(null).map(() => createMockLevel(0.7));
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(false);
    });
  });

  describe('CREATOR_CREATED_10_LEVELS', () => {
    const achievement = AchievementRulesCreator[AchievementType.CREATOR_CREATED_10_LEVELS];

    test('should have correct properties', () => {
      expect(achievement.name).toBe('Builder');
      expect(achievement.emoji).toBe('🏗️');
      expect(achievement.discordNotification).toBe(true);
    });

    test('should unlock with 10 quality levels', () => {
      const levels = Array(10).fill(null).map(() => createMockLevel(0.8));
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(true);
    });
  });

  describe('CREATOR_CREATED_25_LEVELS', () => {
    const achievement = AchievementRulesCreator[AchievementType.CREATOR_CREATED_25_LEVELS];

    test('should have correct properties', () => {
      expect(achievement.name).toBe('Developer');
      expect(achievement.emoji).toBe('🏘');
    });

    test('should unlock with 25 quality levels', () => {
      const levels = Array(25).fill(null).map(() => createMockLevel(0.8));
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(true);
    });
  });

  describe('CREATOR_CREATED_50_LEVELS', () => {
    const achievement = AchievementRulesCreator[AchievementType.CREATOR_CREATED_50_LEVELS];

    test('should have correct properties', () => {
      expect(achievement.name).toBe('Engineer');
      expect(achievement.emoji).toBe('📐');
    });

    test('should unlock with 50 quality levels', () => {
      const levels = Array(50).fill(null).map(() => createMockLevel(0.8));
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(true);
    });
  });

  describe('CREATOR_CREATED_100_LEVELS', () => {
    const achievement = AchievementRulesCreator[AchievementType.CREATOR_CREATED_100_LEVELS];

    test('should have correct properties', () => {
      expect(achievement.name).toBe('Architect');
      expect(achievement.emoji).toBe('🏛️');
    });

    test('should unlock with 100 quality levels', () => {
      const levels = Array(100).fill(null).map(() => createMockLevel(0.8));
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(true);
    });
  });

  describe('CREATOR_CREATED_200_LEVELS', () => {
    const achievement = AchievementRulesCreator[AchievementType.CREATOR_CREATED_200_LEVELS];

    test('should have correct properties', () => {
      expect(achievement.name).toBe('Master Architect');
      expect(achievement.emoji).toBe('🏯');
    });

    test('should unlock with 200 quality levels', () => {
      const levels = Array(200).fill(null).map(() => createMockLevel(0.8));
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(true);
    });
  });

  describe('CREATOR_CREATED_300_LEVELS', () => {
    const achievement = AchievementRulesCreator[AchievementType.CREATOR_CREATED_300_LEVELS];

    test('should have correct properties', () => {
      expect(achievement.name).toBe('Visionary Architect');
      expect(achievement.emoji).toBe('🏰');
    });

    test('should unlock with 300 quality levels', () => {
      const levels = Array(300).fill(null).map(() => createMockLevel(0.8));
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(true);
    });
  });

  describe('CREATOR_CREATED_1_HIGH_QUALITY_LEVEL', () => {
    const achievement = AchievementRulesCreator[AchievementType.CREATOR_CREATED_1_HIGH_QUALITY_LEVEL];

    test('should have correct properties', () => {
      expect(achievement.name).toBe('Stroke of Genius');
      expect(achievement.emoji).toBe('🖌️');
      expect(achievement.getDescription(mockGame)).toBe('Created an acclaimed level');
      expect(achievement.tooltip).toBe('Acclaimed levels have a review score >= 91.0');
      expect(achievement.discordNotification).toBe(true);
    });

    test('should unlock with 1 high quality level', () => {
      const levels = [createMockLevel(0.91)];
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(true);
    });

    test('should not unlock with lower quality level', () => {
      const levels = [createMockLevel(0.90)];
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(false);
    });
  });

  describe('CREATOR_CREATED_10_HIGH_QUALITY_LEVELS', () => {
    const achievement = AchievementRulesCreator[AchievementType.CREATOR_CREATED_10_HIGH_QUALITY_LEVELS];

    test('should have correct properties', () => {
      expect(achievement.name).toBe('Artist');
      expect(achievement.emoji).toBe('🎨');
    });

    test('should unlock with 10 high quality levels', () => {
      const levels = Array(10).fill(null).map(() => createMockLevel(0.91));
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(true);
    });

    test('should not unlock with mixed quality levels', () => {
      const levels = [
        ...Array(5).fill(null).map(() => createMockLevel(0.91)),
        ...Array(5).fill(null).map(() => createMockLevel(0.80))
      ];
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(false);
    });
  });

  describe('CREATOR_CREATED_25_HIGH_QUALITY_LEVELS', () => {
    const achievement = AchievementRulesCreator[AchievementType.CREATOR_CREATED_25_HIGH_QUALITY_LEVELS];

    test('should have correct properties', () => {
      expect(achievement.name).toBe('Masterpiece Maker');
      expect(achievement.emoji).toBe('🎻');
      expect(achievement.getDescription(mockGame)).toBe('Created 25 acclaimed levels');
    });

    test('should unlock with 25 high quality levels', () => {
      const levels = Array(25).fill(null).map(() => createMockLevel(0.91));
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(true);
    });

    test('should not unlock with 24 high quality levels', () => {
      const levels = Array(24).fill(null).map(() => createMockLevel(0.91));
      expect(achievement.unlocked({ levelsCreated: levels })).toBe(false);
    });
  });

  describe('Quality vs High Quality thresholds', () => {
    test('should distinguish between quality (0.8) and high quality (0.91) levels', () => {
      const qualityLevels = Array(10).fill(null).map(() => createMockLevel(0.8));
      const highQualityLevels = Array(10).fill(null).map(() => createMockLevel(0.91));

      const builderAchievement = AchievementRulesCreator[AchievementType.CREATOR_CREATED_10_LEVELS];
      const artistAchievement = AchievementRulesCreator[AchievementType.CREATOR_CREATED_10_HIGH_QUALITY_LEVELS];

      expect(builderAchievement.unlocked({ levelsCreated: qualityLevels })).toBe(true);
      expect(artistAchievement.unlocked({ levelsCreated: qualityLevels })).toBe(false);
      expect(artistAchievement.unlocked({ levelsCreated: highQualityLevels })).toBe(true);
    });
  });
});

export {};
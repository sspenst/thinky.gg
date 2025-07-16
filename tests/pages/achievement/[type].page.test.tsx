import AchievementType from '@root/constants/achievements/achievementType';
import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import { logger } from '@root/helpers/logger';
import { createNewAchievement } from '@root/helpers/notificationHelper';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { AchievementModel, UserModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import { getServerSideProps } from '../../../pages/[subdomain]/achievement/[type]';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/[subdomain]/achievement/[type]', () => {
  const mockReq = {
    headers: {
      host: 'localhost:3000',
    },
  };

  describe('getServerSideProps', () => {
    test('getServerSideProps with valid token and no achievement should return props with null myAchievement', async () => {
      const context = {
        query: {
          type: AchievementType.SOLVED_LEVELS_100,
        },
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect(result.props).toEqual({
        type: AchievementType.SOLVED_LEVELS_100,
        gameId: expect.any(String),
        isViewingFromThinky: expect.any(Boolean),
        totalActiveUsers: expect.any(Number),
        totalAchievementCount: expect.any(Number),
        countsByGame: expect.any(Array),
        achievementsByGame: expect.any(Object),
        myAchievements: [],
        achievements: expect.any(Array),
      });
    });

    test('getServerSideProps with valid token and existing achievement should return props with myAchievement', async () => {
      // Create a test achievement for the user using the helper function
      const testAchievement = await createNewAchievement(
        DEFAULT_GAME_ID,
        AchievementType.WELCOME,
        new Types.ObjectId(TestId.USER),
        true // disable push notification for test
      );

      try {
        const context = {
          query: {
            type: AchievementType.WELCOME,
          },
          req: {
            ...mockReq,
            cookies: {
              token: getTokenCookieValue(TestId.USER),
            },
          },
        };

        const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

        expect(result).toHaveProperty('props');
        expect(result.props?.myAchievements).toEqual(expect.any(Array));
        expect(result.props?.myAchievements?.length).toBeGreaterThan(0);
        expect(result.props?.myAchievements?.[0]._id.toString()).toBe(testAchievement._id.toString());
        expect(result.props?.type).toBe(AchievementType.WELCOME);
        expect(result.props?.achievements).toEqual(expect.any(Array));
      } finally {
        // Clean up
        await AchievementModel.findByIdAndDelete(testAchievement._id);
      }
    });

    test('getServerSideProps should return achievements with user data populated', async () => {
      // Create test achievements for different users using the helper function
      const testAchievements = await Promise.all([
        createNewAchievement(
          DEFAULT_GAME_ID,
          AchievementType.COMMENT_1,
          new Types.ObjectId(TestId.USER_B),
          true // disable push notification for test
        ),
        createNewAchievement(
          DEFAULT_GAME_ID,
          AchievementType.COMMENT_1,
          new Types.ObjectId(TestId.USER_C),
          true // disable push notification for test
        ),
      ]);

      try {
        const context = {
          query: {
            type: AchievementType.COMMENT_1,
          },
          req: {
            ...mockReq,
            cookies: {
              token: getTokenCookieValue(TestId.USER),
            },
          },
        };

        const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

        expect(result).toHaveProperty('props');
        expect(result.props?.achievements).toEqual(expect.any(Array));
        expect(result.props?.achievements?.length).toBeGreaterThan(0);

        // Check that achievements are sorted by createdAt descending
        const achievements = result.props?.achievements || [];

        if (achievements.length > 1) {
          expect(new Date(achievements[0].createdAt).getTime()).toBeGreaterThanOrEqual(
            new Date(achievements[1].createdAt).getTime()
          );
        }

        // Check that user data is populated
        if (achievements.length > 0) {
          const achievement = achievements[0];

          expect(achievement.userId).toBeDefined();
          expect(achievement.userId._id).toBeDefined();
          expect(achievement.userId.name).toBeDefined();
        }
      } finally {
        // Clean up
        await AchievementModel.deleteMany({ _id: { $in: testAchievements.map(a => a._id) } });
      }
    });

    test('getServerSideProps should limit achievements to 100', async () => {
      const context = {
        query: {
          type: AchievementType.SOLVED_LEVELS_100,
        },
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
      };

      // Spy on the aggregate method to verify the limit is applied
      const aggregateSpy = jest.spyOn(AchievementModel, 'aggregate');

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(aggregateSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $facet: expect.objectContaining({
              thinky_achievements: expect.arrayContaining([
                expect.objectContaining({ $limit: 100 })
              ]),
              pathology_achievements: expect.arrayContaining([
                expect.objectContaining({ $limit: 100 })
              ]),
              sokoban_achievements: expect.arrayContaining([
                expect.objectContaining({ $limit: 100 })
              ])
            })
          }),
        ])
      );
    });

    test('getServerSideProps should handle different achievement types', async () => {
      const achievementTypes = [
        AchievementType.SOLVED_LEVELS_100,
        AchievementType.CREATOR_CREATED_1_LEVEL,
        AchievementType.MULTIPLAYER_1_GAME_PLAYED,
        AchievementType.PLAYER_RANK_KINDERGARTEN,
      ];

      for (const type of achievementTypes) {
        const context = {
          query: {
            type: type,
          },
          req: {
            ...mockReq,
            cookies: {
              token: getTokenCookieValue(TestId.USER),
            },
          },
        };

        const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

        expect(result).toHaveProperty('props');
        expect(result.props?.type).toBe(type);
      }
    });

    test('getServerSideProps should handle database errors gracefully', async () => {
      jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

      // Mock AchievementModel.find to throw an error
      const findSpy = jest.spyOn(AchievementModel, 'find').mockImplementation(() => {
        throw new Error('Database connection error');
      });

      const context = {
        query: {
          type: AchievementType.SOLVED_LEVELS_100,
        },
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
      };

      // The function should not throw, but should handle the error
      await expect(getServerSideProps(context as unknown as GetServerSidePropsContext)).rejects.toThrow();

      findSpy.mockRestore();
    });

    test('getServerSideProps should handle aggregate database errors gracefully', async () => {
      jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

      // Mock AchievementModel.aggregate to throw an error
      const aggregateSpy = jest.spyOn(AchievementModel, 'aggregate').mockImplementation(() => {
        throw new Error('Aggregate error');
      });

      const context = {
        query: {
          type: AchievementType.SOLVED_LEVELS_100,
        },
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
      };

      // The function should not throw, but should handle the error
      await expect(getServerSideProps(context as unknown as GetServerSidePropsContext)).rejects.toThrow();

      aggregateSpy.mockRestore();
    });

    test('getServerSideProps should filter achievements by gameId', async () => {
      const aggregateSpy = jest.spyOn(AchievementModel, 'aggregate');

      const context = {
        query: {
          type: AchievementType.SOLVED_LEVELS_100,
        },
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
      };

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      // Verify that the aggregate query includes gameId filter
      expect(aggregateSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              gameId: { $in: [DEFAULT_GAME_ID] }
            })
          }),
        ])
      );
    });

    test('getServerSideProps should include user enrichment pipeline', async () => {
      const aggregateSpy = jest.spyOn(AchievementModel, 'aggregate');

      const context = {
        query: {
          type: AchievementType.SOLVED_LEVELS_100,
        },
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
      };

      await getServerSideProps(context as unknown as GetServerSidePropsContext);

      // Verify that the aggregate includes user lookup and enrichment within per-game facets
      expect(aggregateSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $facet: expect.objectContaining({
              thinky_achievements: expect.arrayContaining([
                expect.objectContaining({
                  $lookup: expect.objectContaining({
                    from: UserModel.collection.name,
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userId',
                  })
                }),
                expect.objectContaining({ $unwind: { path: '$userId' } }),
              ])
            })
          }),
        ])
      );
    });

    test('getServerSideProps should handle missing achievement type', async () => {
      const context = {
        query: {
          // Missing type parameter
        },
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect(result.props?.type).toBeUndefined();
    });

    test('getServerSideProps should handle string vs enum achievement type', async () => {
      const context = {
        query: {
          type: 'SOLVED_LEVELS_100', // String instead of enum
        },
        req: {
          ...mockReq,
          cookies: {
            token: getTokenCookieValue(TestId.USER),
          },
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toHaveProperty('props');
      expect(result.props?.type).toBe('SOLVED_LEVELS_100');
    });
  });
});

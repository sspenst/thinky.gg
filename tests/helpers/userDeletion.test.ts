import TestId from '@root/constants/testId';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import { archiveUserLevels } from '@root/helpers/userDeletion';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { LevelModel, UserModel } from '@root/models/mongoose';
// Import the mocked functions
import { queueCalcCreatorCounts } from '@root/pages/api/internal-jobs/worker';
import { Types } from 'mongoose';

// Mock the queue functions
jest.mock('@root/pages/api/internal-jobs/worker', () => ({
  queueCalcCreatorCounts: jest.fn(),
}));

jest.mock('@root/helpers/discordWebhook', () => jest.fn());

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('userDeletion helper functions', () => {
  describe('archiveUserLevels', () => {
    test('should archive all published levels for a user', async () => {
      // Find a user with published levels
      const userWithLevels = await LevelModel.findOne({
        isDraft: false,
        isDeleted: { $ne: true },
        userId: { $ne: new Types.ObjectId(TestId.ARCHIVE) }
      });

      expect(userWithLevels).toBeDefined();

      if (!userWithLevels) {
        throw new Error('No user with levels found for test');
      }

      const userId = userWithLevels.userId;

      // Get initial count of published levels for this user
      const initialLevels = await LevelModel.find({
        userId: userId,
        isDraft: false,
        isDeleted: { $ne: true },
      });

      expect(initialLevels.length).toBeGreaterThan(0);

      // Archive the user's levels
      await archiveUserLevels(userId);

      // Verify levels were archived (transferred to archive user)
      const archivedLevels = await LevelModel.find({
        userId: TestId.ARCHIVE,
        archivedBy: userId,
      });

      expect(archivedLevels.length).toBe(initialLevels.length);

      // Verify original user no longer has published levels
      const userLevels = await LevelModel.find({
        userId: userId,
        isDraft: false,
        isDeleted: { $ne: true },
      });

      expect(userLevels.length).toBe(0);

      // Verify archived levels have correct archive properties
      for (const archivedLevel of archivedLevels) {
        expect(archivedLevel.archivedBy).toEqual(userId);
        expect(archivedLevel.archivedTs).toBeDefined();
        expect(archivedLevel.slug).toContain('archive/');
      }

      // Verify that creator count updates were queued
      expect(queueCalcCreatorCounts).toHaveBeenCalledTimes(2);
      expect(queueCalcCreatorCounts).toHaveBeenCalledWith(
        expect.any(String), // gameId
        new Types.ObjectId(TestId.ARCHIVE),
        expect.objectContaining({ session: expect.anything() })
      );
      expect(queueCalcCreatorCounts).toHaveBeenCalledWith(
        expect.any(String), // gameId
        userId,
        expect.objectContaining({ session: expect.anything() })
      );

      // Verify Discord webhook was called
      expect(queueDiscordWebhook).toHaveBeenCalledTimes(1);
      expect(queueDiscordWebhook).toHaveBeenCalledWith(
        expect.any(String), // Discord channel
        expect.stringContaining('archived by admin'),
        expect.objectContaining({ session: expect.anything() })
      );
    });

    test('should handle user with no published levels', async () => {
      // Create a user with no published levels
      const userWithNoLevels = await UserModel.findOne({
        _id: { $ne: new Types.ObjectId(TestId.ARCHIVE) }
      });

      expect(userWithNoLevels).toBeDefined();

      if (!userWithNoLevels) {
        throw new Error('No user found for test');
      }

      const userId = userWithNoLevels._id;

      // Ensure this user has no published levels
      const existingLevels = await LevelModel.find({
        userId: userId,
        isDraft: false,
        isDeleted: { $ne: true },
      });

      if (existingLevels.length > 0) {
        // Skip this test if user already has levels
        return;
      }

      // Archive the user's levels (should be no-op)
      await archiveUserLevels(userId);

      // Verify no creator count updates or Discord webhooks were queued
      expect(queueCalcCreatorCounts).not.toHaveBeenCalled();
      expect(queueDiscordWebhook).not.toHaveBeenCalled();
    });
  });
});

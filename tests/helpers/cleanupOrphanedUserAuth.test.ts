import TestId from '@root/constants/testId';
import { cleanupOrphanedUserAuthRecords, findOrphanedUserAuthRecords } from '@root/helpers/cleanupOrphanedUserAuth';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { AuthProvider } from '@root/models/db/userAuth';
import { UserAuthModel } from '@root/models/mongoose';
import { Types } from 'mongoose';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(async () => {
  // Clean up test data
  await UserAuthModel.deleteMany({ userId: { $in: [TestId.USER_B, TestId.USER_C, new Types.ObjectId('507f1f77bcf86cd799439011')] } });
});

describe('helpers/cleanupOrphanedUserAuth.ts', () => {
  describe('findOrphanedUserAuthRecords', () => {
    test('Should return empty array when no orphaned records exist', async () => {
      const orphanedRecords = await findOrphanedUserAuthRecords();

      expect(orphanedRecords).toEqual([]);
    });

    test('Should find orphaned UserAuth records', async () => {
      const fakeUserId = new Types.ObjectId('507f1f77bcf86cd799439011');

      // Create a UserAuth record with a non-existent user ID
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: fakeUserId,
        provider: AuthProvider.DISCORD,
        providerId: 'discord123',
        providerUsername: 'testuser',
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      // Create a normal UserAuth record for an existing user (should not be returned)
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.GOOGLE,
        providerId: 'google456',
        providerUsername: 'normaluser',
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      const orphanedRecords = await findOrphanedUserAuthRecords();

      expect(orphanedRecords).toHaveLength(1);
      expect(orphanedRecords[0].userId.toString()).toBe(fakeUserId.toString());
      expect(orphanedRecords[0].provider).toBe(AuthProvider.DISCORD);
      expect(orphanedRecords[0].providerUsername).toBe('testuser');

      // Clean up the normal record too
      await UserAuthModel.deleteOne({ userId: TestId.USER, provider: AuthProvider.GOOGLE });
    });
  });

  describe('cleanupOrphanedUserAuthRecords', () => {
    test('Should return 0 when no orphaned records exist', async () => {
      const deletedCount = await cleanupOrphanedUserAuthRecords(true);

      expect(deletedCount).toBe(0);
    });

    test('Should report correct count in dry run mode', async () => {
      const fakeUserId = new Types.ObjectId('507f1f77bcf86cd799439011');

      // Create orphaned records
      await UserAuthModel.insertMany([
        {
          _id: new Types.ObjectId(),
          userId: fakeUserId,
          provider: AuthProvider.DISCORD,
          providerId: 'discord123',
          connectedAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        },
        {
          _id: new Types.ObjectId(),
          userId: fakeUserId,
          provider: AuthProvider.GOOGLE,
          providerId: 'google456',
          connectedAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        }
      ]);

      const deletedCount = await cleanupOrphanedUserAuthRecords(true);

      expect(deletedCount).toBe(2);

      // Verify records still exist (dry run should not delete)
      const remainingRecords = await UserAuthModel.find({ userId: fakeUserId });

      expect(remainingRecords).toHaveLength(2);
    });

    test('Should actually delete orphaned records when not in dry run mode', async () => {
      const fakeUserId = new Types.ObjectId('507f1f77bcf86cd799439011');

      // Create orphaned records
      await UserAuthModel.insertMany([
        {
          _id: new Types.ObjectId(),
          userId: fakeUserId,
          provider: AuthProvider.DISCORD,
          providerId: 'discord123',
          connectedAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        },
        {
          _id: new Types.ObjectId(),
          userId: fakeUserId,
          provider: AuthProvider.GOOGLE,
          providerId: 'google456',
          connectedAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        }
      ]);

      // Create a normal record that should NOT be deleted
      await UserAuthModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        provider: AuthProvider.DISCORD,
        providerId: 'discord789',
        connectedAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });

      const deletedCount = await cleanupOrphanedUserAuthRecords(false);

      expect(deletedCount).toBe(2);

      // Verify orphaned records are deleted
      const orphanedRecords = await UserAuthModel.find({ userId: fakeUserId });

      expect(orphanedRecords).toHaveLength(0);

      // Verify normal record still exists
      const normalRecord = await UserAuthModel.findOne({ userId: TestId.USER });

      expect(normalRecord).toBeTruthy();

      // Clean up normal record
      await UserAuthModel.deleteOne({ userId: TestId.USER });
    });
  });
});

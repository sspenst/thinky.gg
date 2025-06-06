import dbConnect from '../lib/dbConnect';
import { UserAuthModel, UserModel } from '../models/mongoose';
import { logger } from './logger';

/**
 * Find UserAuth records that reference non-existent users
 * @returns Array of orphaned UserAuth records
 */
export async function findOrphanedUserAuthRecords() {
  await dbConnect();

  const orphanedRecords = await UserAuthModel.aggregate([
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $match: {
        user: { $size: 0 } // No matching user found
      }
    },
    {
      $project: {
        _id: 1,
        userId: 1,
        provider: 1,
        providerId: 1,
        providerUsername: 1,
        connectedAt: 1
      }
    }
  ]);

  return orphanedRecords;
}

/**
 * Remove orphaned UserAuth records that reference non-existent users
 * @param dryRun If true, only log what would be deleted without actually deleting
 * @returns Number of records deleted (or that would be deleted in dry run)
 */
export async function cleanupOrphanedUserAuthRecords(dryRun = true): Promise<number> {
  await dbConnect();

  const orphanedRecords = await findOrphanedUserAuthRecords();

  if (orphanedRecords.length === 0) {
    logger.info('No orphaned UserAuth records found');

    return 0;
  }

  logger.info(`Found ${orphanedRecords.length} orphaned UserAuth records:`);
  orphanedRecords.forEach(record => {
    logger.info(`- ${record.provider} (${record.providerUsername || record.providerId}) for non-existent user ${record.userId}`);
  });

  if (dryRun) {
    logger.info('DRY RUN: Would delete the above records. Run with dryRun=false to actually delete.');

    return orphanedRecords.length;
  }

  // Actually delete the orphaned records
  const userIds = orphanedRecords.map(record => record.userId);
  const result = await UserAuthModel.deleteMany({
    userId: { $in: userIds }
  });

  logger.info(`Deleted ${result.deletedCount} orphaned UserAuth records`);

  return result.deletedCount;
}

/**
 * CLI-style function to run cleanup
 */
export async function runCleanupOrphanedUserAuth() {
  const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');

  logger.info('🧹 Cleaning up orphaned UserAuth records...');
  logger.info(`Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);

  try {
    const deletedCount = await cleanupOrphanedUserAuthRecords(isDryRun);

    if (isDryRun && deletedCount > 0) {
      logger.info('\n💡 To actually delete these records, run:');
      logger.info('npm run cleanup:userauth --execute');
    } else if (!isDryRun && deletedCount > 0) {
      logger.info('✅ Cleanup completed successfully!');
    }
  } catch (error) {
    logger.error('❌ Error during cleanup:', error);
    throw error;
  }
}

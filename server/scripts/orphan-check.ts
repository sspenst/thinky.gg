// run with
/*
npx ts-node -r tsconfig-paths/register --transpile-only server/scripts/orphan-check.ts [--move-to-trash]
*/
import dbConnect from '@root/lib/dbConnect';
import {
  AchievementModel,
  CollectionModel,
  CommentModel,
  DeviceModel,
  EmailLogModel,
  GraphModel,
  LevelModel,
  MultiplayerProfileModel,
  NotificationModel,
  PlayAttemptModel,
  RecordModel,
  ReportModel,
  ReviewModel,
  StatModel,
  TrashCanModel,
  UserAuthModel,
  UserConfigModel,
  UserModel
} from '@root/models/mongoose';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

interface OrphanedRecord {
  collection: string;
  field: string;
  recordId: string;
  userId: string;
  count: number;
  orphanedUserIds?: any[];
  movedToTrash?: boolean;
  trashCount?: number;
}

interface CheckConfig {
  model: any;
  collection: string;
  field: string;
  batchSize?: number;
  useOptimizedQuery?: boolean;
}

dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const MOVE_TO_TRASH = args.includes('--move-to-trash') || args.includes('--trash');

// Set a timeout for mongoose operations
mongoose.set('maxTimeMS', 30000); // 30 seconds timeout

async function checkOrphanedRecords() {
  try {
    await dbConnect();
    console.log('Connected to database');

    if (MOVE_TO_TRASH) {
      console.log('🗑️  TRASH MODE ENABLED - Orphaned records will be moved to TrashCan collection');
    } else {
      console.log('📊 REPORT MODE - Orphaned records will be reported only');
      console.log('   Use --move-to-trash flag to move orphaned records to trash');
    }

    const orphanedRecords: OrphanedRecord[] = [];

    console.log('\nChecking for orphaned records...\n');

    // First, get all existing user IDs for efficient lookups
    console.log('Loading all existing user IDs...');
    const existingUserIds = new Set<string>();
    const userCursor = UserModel.find({}, { _id: 1 }).cursor();
    let userCount = 0;

    for (let user = await userCursor.next(); user != null; user = await userCursor.next()) {
      existingUserIds.add(user._id.toString());
      userCount++;

      if (userCount % 10000 === 0) {
        console.log(`  Loaded ${userCount} user IDs...`);
      }
    }

    console.log(`✅ Loaded ${userCount} existing user IDs\n`);

    // Helper function to move records to trash
    async function moveRecordsToTrash(
      orphanedDocs: any[],
      collection: string,
      field: string,
      model: any
    ): Promise<number> {
      if (!MOVE_TO_TRASH || orphanedDocs.length === 0) {
        return 0;
      }

      console.log(`  🗑️  Moving ${orphanedDocs.length} records to trash...`);
      let totalMovedCount = 0;

      // Process in batches to avoid memory issues and transaction size limits
      const BATCH_SIZE = 1000;
      const batches = [];

      for (let i = 0; i < orphanedDocs.length; i += BATCH_SIZE) {
        batches.push(orphanedDocs.slice(i, i + BATCH_SIZE));
      }

      console.log(`  Processing ${batches.length} batches of up to ${BATCH_SIZE} records each...`);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const session = await mongoose.startSession();

        try {
          await session.withTransaction(async () => {
            // Prepare trash records for this batch
            const trashRecords = batch.map(doc => ({
              _id: new mongoose.Types.ObjectId(),
              originalDocument: doc.toObject ? doc.toObject() : doc,
              originalId: doc._id,
              originalCollection: collection,
              originalField: field,
              orphanedUserId: doc[field],
              deletedAt: new Date(),
              deletedBy: 'orphan-check',
              reason: `Orphaned record - ${field} references non-existent user`,
              canRestore: true,
              notes: `Moved by orphan-check script on ${new Date().toISOString()}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            // Batch insert into trash collection
            await TrashCanModel.insertMany(trashRecords, { session });

            // Batch delete from original collection
            const idsToDelete = batch.map(doc => doc._id);
            const deleteResult = await model.deleteMany(
              { _id: { $in: idsToDelete } },
              { session }
            );

            totalMovedCount += deleteResult.deletedCount;

            console.log(`    ✅ Batch ${batchIndex + 1}/${batches.length}: moved ${deleteResult.deletedCount} records`);
          });
        } catch (error) {
          console.error(`    ❌ Error processing batch ${batchIndex + 1}:`, (error as Error).message);
          console.log('    Skipping this batch and continuing...');
        } finally {
          await session.endSession();
        }
      }

      console.log(`  ✅ Successfully moved ${totalMovedCount}/${orphanedDocs.length} records to trash`);

      return totalMovedCount;
    }

    // Check each schema that has userId foreign references
    const checksToPerform: CheckConfig[] = [
      {
        model: AchievementModel,
        collection: 'Achievement',
        field: 'userId',
      },
      {
        model: CollectionModel,
        collection: 'Collection',
        field: 'userId',
      },
      {
        model: CommentModel,
        collection: 'Comment',
        field: 'author',
      },
      {
        model: DeviceModel,
        collection: 'Device',
        field: 'userId',
      },
      {
        model: EmailLogModel,
        collection: 'EmailLog',
        field: 'userId',
      },
      {
        model: LevelModel,
        collection: 'Level',
        field: 'userId',
        batchSize: 1000, // Process levels in smaller batches
        useOptimizedQuery: true,
      },
      {
        model: MultiplayerProfileModel,
        collection: 'MultiplayerProfile',
        field: 'userId',
      },
      {
        model: NotificationModel,
        collection: 'Notification',
        field: 'userId',
      },
      {
        model: PlayAttemptModel,
        collection: 'PlayAttempt',
        field: 'userId',
        batchSize: 5000, // PlayAttempts might be large too
        useOptimizedQuery: true,
      },
      {
        model: RecordModel,
        collection: 'Record',
        field: 'userId',
      },
      {
        model: ReviewModel,
        collection: 'Review',
        field: 'userId',
      },
      {
        model: StatModel,
        collection: 'Stat',
        field: 'userId',
      },
      {
        model: UserAuthModel,
        collection: 'UserAuth',
        field: 'userId',
      },
      {
        model: UserConfigModel,
        collection: 'UserConfig',
        field: 'userId',
      },
    ];

    // Check Report model which has multiple user reference fields
    const reportChecks: CheckConfig[] = [
      {
        model: ReportModel,
        collection: 'Report',
        field: 'reporter',
      },
      {
        model: ReportModel,
        collection: 'Report',
        field: 'reportedUser',
      },
    ];

    // Function to check for orphaned records using optimized approach
    async function checkOrphanedOptimized(config: CheckConfig, existingUserIds: Set<string>) {
      const { model, collection, field, batchSize = 10000, useOptimizedQuery = false } = config;

      console.log(`Checking ${collection}.${field}...`);

      try {
        // Get total count first
        const totalCount = await model.countDocuments();

        console.log(`  Total ${collection} documents: ${totalCount}`);

        if (totalCount === 0) {
          console.log('  ✅ No documents to check\n');

          return;
        }

        const orphanedDocs: any[] = [];
        let processedCount = 0;

        if (useOptimizedQuery && totalCount > 50000) {
          // For very large collections, use distinct to get unique user IDs first
          console.log('  Using optimized query for large collection...');

          const distinctUserIds = await model.distinct(field);

          console.log(`  Found ${distinctUserIds.length} distinct user IDs`);

          const orphanedUserIds = distinctUserIds.filter((userId: any) =>
            userId && !existingUserIds.has(userId.toString())
          );

          if (orphanedUserIds.length > 0) {
            console.log(`  Found ${orphanedUserIds.length} orphaned user IDs, getting records...`);

            // Move to trash if enabled
            let trashCount = 0;

            // For trash mode, we need to get actual documents to move them
            if (MOVE_TO_TRASH) {
              // Process documents in chunks to avoid memory issues
              const userIdBatchSize = 500; // Smaller batches to avoid memory issues
              let totalTrashCount = 0;

              console.log(`  Processing ${orphanedUserIds.length} orphaned user IDs in chunks...`);

              for (let i = 0; i < orphanedUserIds.length; i += userIdBatchSize) {
                const userIdBatch = orphanedUserIds.slice(i, i + userIdBatchSize);

                // Get documents for this batch
                const batchDocs = await model.find({ [field]: { $in: userIdBatch } });

                // Immediately move this batch to trash
                if (batchDocs.length > 0) {
                  const batchTrashCount = await moveRecordsToTrash(batchDocs, collection, field, model);

                  totalTrashCount += batchTrashCount;

                  console.log(`    Processed batch ${Math.floor(i / userIdBatchSize) + 1}/${Math.ceil(orphanedUserIds.length / userIdBatchSize)}: ${batchTrashCount} records moved to trash`);
                }
              }

              trashCount = totalTrashCount;
            } else {
              // For report mode, just get samples
              for (const userId of orphanedUserIds.slice(0, 10)) {
                const sampleDocs = await model.find({ [field]: userId }, { _id: 1, [field]: 1 }).limit(3);

                orphanedDocs.push(...sampleDocs);
              }
            }

            // Count total orphaned records
            const totalOrphanedCount = await model.countDocuments({
              [field]: { $in: orphanedUserIds }
            });

            // Move to trash if enabled (already done above for large collections in chunks)

            if (MOVE_TO_TRASH && orphanedDocs.length > 0) {
              // This is for the report mode samples only
              trashCount = await moveRecordsToTrash(orphanedDocs, collection, field, model);
            }

            orphanedRecords.push({
              collection: collection,
              field: field,
              recordId: 'multiple',
              userId: 'multiple',
              count: totalOrphanedCount,
              orphanedUserIds: orphanedUserIds,
              movedToTrash: MOVE_TO_TRASH,
              trashCount: trashCount,
            });

            if (MOVE_TO_TRASH) {
              console.log(`  ✅ Processed ${totalOrphanedCount} orphaned records, moved ${trashCount} to trash`);
            } else {
              console.log(`  ❌ Found ${totalOrphanedCount} orphaned records`);
            }
          } else {
            console.log('  ✅ No orphaned records found');
          }
        } else {
          // For smaller collections or when not using optimized query, use cursor approach
          const cursor = model.find({}, { _id: 1, [field]: 1 }).cursor({ batchSize });
          const orphanedUserIdsSet = new Set<string>();

          for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            processedCount++;

            if (processedCount % batchSize === 0) {
              console.log(`  Processed ${processedCount}/${totalCount} documents...`);
            }

            const userId = doc[field];

            if (userId && !existingUserIds.has(userId.toString())) {
              orphanedDocs.push(doc);
              orphanedUserIdsSet.add(userId.toString());
            }
          }

          if (orphanedDocs.length > 0) {
            // Move to trash if enabled
            let cursorTrashCount = 0;

            if (MOVE_TO_TRASH) {
              // For cursor approach, get full documents for trash
              const fullOrphanedDocs = await model.find({
                _id: { $in: orphanedDocs.map(doc => doc._id) }
              });

              cursorTrashCount = await moveRecordsToTrash(fullOrphanedDocs, collection, field, model);
            }

            orphanedRecords.push({
              collection: collection,
              field: field,
              recordId: 'multiple',
              userId: 'multiple',
              count: orphanedDocs.length,
              orphanedUserIds: Array.from(orphanedUserIdsSet),
              movedToTrash: MOVE_TO_TRASH,
              trashCount: cursorTrashCount,
            });

            if (MOVE_TO_TRASH) {
              console.log(`  ✅ Processed ${orphanedDocs.length} orphaned records, moved ${cursorTrashCount} to trash`);
            } else {
              console.log(`  ❌ Found ${orphanedDocs.length} orphaned records`);
              console.log('  Sample records:');
              orphanedDocs.slice(0, 10).forEach((doc: any, index: number) => {
                console.log(`    ${index + 1}. Record ID: ${doc._id}, User ID: ${doc[field]}`);
              });

              if (orphanedDocs.length > 10) {
                console.log(`    ... and ${orphanedDocs.length - 10} more`);
              }
            }
          } else {
            console.log('  ✅ No orphaned records found');
          }
        }
      } catch (error) {
        console.error(`  ❌ Error checking ${collection}.${field}:`, (error as Error).message);
        console.log('  Skipping this collection...');
      }

      console.log();
    }

    // Perform checks for regular user reference fields
    for (const check of checksToPerform) {
      await checkOrphanedOptimized(check, existingUserIds);
    }

    // Check Report model fields
    for (const check of reportChecks) {
      await checkOrphanedOptimized(check, existingUserIds);
    }

    // Check Graph model which has conditional user references
    console.log('Checking Graph.source where sourceModel = "User"...');

    try {
      const orphanedGraphSourceDocs = await GraphModel.find(
        {
          sourceModel: 'User',
          source: { $nin: Array.from(existingUserIds).map(id => new mongoose.Types.ObjectId(id)) }
        },
        { _id: 1, source: 1 }
      ).limit(1000); // Limit to avoid memory issues

      const orphanedGraphSourceCount = orphanedGraphSourceDocs.length;

      if (orphanedGraphSourceCount > 0) {
        // Get total count
        const totalGraphSourceOrphaned = await GraphModel.countDocuments({
          sourceModel: 'User',
          source: { $nin: Array.from(existingUserIds).map(id => new mongoose.Types.ObjectId(id)) }
        });

        // Get all orphaned user IDs for this collection
        const allOrphanedGraphSourceDocs = await GraphModel.find(
          {
            sourceModel: 'User',
            source: { $nin: Array.from(existingUserIds).map(id => new mongoose.Types.ObjectId(id)) }
          },
          { source: 1 }
        );
        const orphanedGraphSourceUserIds = [...new Set(allOrphanedGraphSourceDocs.map(doc => doc.source.toString()))];

        // Move to trash if enabled
        let graphSourceTrashCount = 0;

        if (MOVE_TO_TRASH) {
          const fullOrphanedGraphSourceDocs = await GraphModel.find({
            sourceModel: 'User',
            source: { $nin: Array.from(existingUserIds).map(id => new mongoose.Types.ObjectId(id)) }
          });

          graphSourceTrashCount = await moveRecordsToTrash(fullOrphanedGraphSourceDocs, 'Graph', 'source', GraphModel);
        }

        orphanedRecords.push({
          collection: 'Graph',
          field: 'source',
          recordId: 'multiple',
          userId: 'multiple',
          count: totalGraphSourceOrphaned,
          orphanedUserIds: orphanedGraphSourceUserIds,
          movedToTrash: MOVE_TO_TRASH,
          trashCount: graphSourceTrashCount,
        });

        if (MOVE_TO_TRASH) {
          console.log(`  ✅ Processed ${totalGraphSourceOrphaned} orphaned records, moved ${graphSourceTrashCount} to trash`);
        } else {
          console.log(`  ❌ Found ${totalGraphSourceOrphaned} orphaned records`);
          console.log('  Sample records:');
          orphanedGraphSourceDocs.slice(0, 10).forEach((doc: any, index: number) => {
            console.log(`    ${index + 1}. Record ID: ${doc._id}, User ID: ${doc.source}`);
          });

          if (totalGraphSourceOrphaned > 10) {
            console.log(`    ... and ${totalGraphSourceOrphaned - 10} more`);
          }
        }
      } else {
        console.log('  ✅ No orphaned records found');
      }
    } catch (error) {
      console.error('  ❌ Error checking Graph.source:', (error as Error).message);
    }

    console.log();

    console.log('Checking Graph.target where targetModel = "User"...');

    try {
      const orphanedGraphTargetDocs = await GraphModel.find(
        {
          targetModel: 'User',
          target: { $nin: Array.from(existingUserIds).map(id => new mongoose.Types.ObjectId(id)) }
        },
        { _id: 1, target: 1 }
      ).limit(1000);

      const orphanedGraphTargetCount = orphanedGraphTargetDocs.length;

      if (orphanedGraphTargetCount > 0) {
        // Get total count
        const totalGraphTargetOrphaned = await GraphModel.countDocuments({
          targetModel: 'User',
          target: { $nin: Array.from(existingUserIds).map(id => new mongoose.Types.ObjectId(id)) }
        });

        // Get all orphaned user IDs for this collection
        const allOrphanedGraphTargetDocs = await GraphModel.find(
          {
            targetModel: 'User',
            target: { $nin: Array.from(existingUserIds).map(id => new mongoose.Types.ObjectId(id)) }
          },
          { target: 1 }
        );
        const orphanedGraphTargetUserIds = [...new Set(allOrphanedGraphTargetDocs.map(doc => doc.target.toString()))];

        // Move to trash if enabled
        let graphTargetTrashCount = 0;

        if (MOVE_TO_TRASH) {
          const fullOrphanedGraphTargetDocs = await GraphModel.find({
            targetModel: 'User',
            target: { $nin: Array.from(existingUserIds).map(id => new mongoose.Types.ObjectId(id)) }
          });

          graphTargetTrashCount = await moveRecordsToTrash(fullOrphanedGraphTargetDocs, 'Graph', 'target', GraphModel);
        }

        orphanedRecords.push({
          collection: 'Graph',
          field: 'target',
          recordId: 'multiple',
          userId: 'multiple',
          count: totalGraphTargetOrphaned,
          orphanedUserIds: orphanedGraphTargetUserIds,
          movedToTrash: MOVE_TO_TRASH,
          trashCount: graphTargetTrashCount,
        });

        if (MOVE_TO_TRASH) {
          console.log(`  ✅ Processed ${totalGraphTargetOrphaned} orphaned records, moved ${graphTargetTrashCount} to trash`);
        } else {
          console.log(`  ❌ Found ${totalGraphTargetOrphaned} orphaned records`);
          console.log('  Sample records:');
          orphanedGraphTargetDocs.slice(0, 10).forEach((doc: any, index: number) => {
            console.log(`    ${index + 1}. Record ID: ${doc._id}, User ID: ${doc.target}`);
          });

          if (totalGraphTargetOrphaned > 10) {
            console.log(`    ... and ${totalGraphTargetOrphaned - 10} more`);
          }
        }
      } else {
        console.log('  ✅ No orphaned records found');
      }
    } catch (error) {
      console.error('  ❌ Error checking Graph.target:', (error as Error).message);
    }

    console.log();

    // Summary
    console.log('='.repeat(60));

    if (MOVE_TO_TRASH) {
      console.log('ORPHAN CLEANUP SUMMARY (TRASH MODE)');
    } else {
      console.log('ORPHAN CHECK SUMMARY (REPORT MODE)');
    }

    console.log('='.repeat(60));

    if (orphanedRecords.length === 0) {
      console.log('✅ No orphaned records found across all schemas!');
    } else {
      if (MOVE_TO_TRASH) {
        console.log(`🗑️  Processed orphaned records in ${orphanedRecords.length} collections:`);
      } else {
        console.log(`❌ Found orphaned records in ${orphanedRecords.length} collections:`);
      }

      console.log();

      let totalOrphanedCount = 0;
      let totalMovedToTrash = 0;
      const allOrphanedUserIds = new Set<string>();

      orphanedRecords.forEach(record => {
        if (MOVE_TO_TRASH) {
          console.log(`${record.collection}.${record.field}: ${record.count} found, ${record.trashCount || 0} moved to trash`);
          totalMovedToTrash += record.trashCount || 0;
        } else {
          console.log(`${record.collection}.${record.field}: ${record.count} orphaned records`);
        }

        totalOrphanedCount += record.count;

        // Collect all unique orphaned user IDs
        if (record.orphanedUserIds) {
          record.orphanedUserIds.forEach(userId => allOrphanedUserIds.add(userId.toString()));
        }
      });

      console.log(`\nTotal orphaned records found: ${totalOrphanedCount}`);
      console.log(`Number of distinct orphaned users: ${allOrphanedUserIds.size}`);

      if (MOVE_TO_TRASH) {
        console.log(`Total records moved to trash: ${totalMovedToTrash}`);
        console.log('\n🗑️  All orphaned records have been safely moved to the TrashCan collection.');
        console.log('   They can be recovered if needed by querying the TrashCan collection.');
        console.log('   Use the following query to view trashed records:');
        console.log('   db.trashcans.find({ deletedBy: "orphan-check" }).sort({ deletedAt: -1 });');
      } else {
        console.log('\nThese records reference users that no longer exist in the User collection.');
        console.log('Consider cleaning up these orphaned records to maintain data integrity.');
        console.log('Use --move-to-trash flag to safely move them to the TrashCan collection.');
      }

      // MongoDB queries for each collection (only show in report mode)
      if (!MOVE_TO_TRASH) {
        console.log('\n' + '='.repeat(60));
        console.log('MONGODB QUERIES FOR COPY-PASTING');
        console.log('='.repeat(60));

        orphanedRecords.forEach(record => {
          if (record.orphanedUserIds && record.orphanedUserIds.length > 0) {
            console.log(`\n// ${record.collection}.${record.field} - ${record.count} orphaned records`);

            // Format user IDs for MongoDB query
            const formattedUserIds = record.orphanedUserIds.map(userId => `ObjectId("${userId}")`).join(', ');

            if (record.collection === 'Graph') {
              // Special handling for Graph collection with conditional fields
              if (record.field === 'source') {
                console.log(`db.graphs.find({ sourceModel: "User", source: { $in: [${formattedUserIds}] } });`);
                console.log(`// To delete: db.graphs.deleteMany({ sourceModel: "User", source: { $in: [${formattedUserIds}] } });`);
              } else if (record.field === 'target') {
                console.log(`db.graphs.find({ targetModel: "User", target: { $in: [${formattedUserIds}] } });`);
                console.log(`// To delete: db.graphs.deleteMany({ targetModel: "User", target: { $in: [${formattedUserIds}] } });`);
              }
            } else {
              // Standard collection queries - map to actual MongoDB collection names
              const collectionNameMap: { [key: string]: string } = {
                'Achievement': 'achievements',
                'Collection': 'collections',
                'Comment': 'comments',
                'Device': 'devices',
                'EmailLog': 'emaillogs',
                'Level': 'levels',
                'MultiplayerProfile': 'multiplayerprofiles',
                'Notification': 'notifications',
                'PlayAttempt': 'playattempts',
                'Record': 'records',
                'Review': 'reviews',
                'Stat': 'stats',
                'UserAuth': 'userauths',
                'UserConfig': 'userconfigs',
                'Report': 'reports'
              };

              const collectionName = collectionNameMap[record.collection] || record.collection.toLowerCase() + 's';

              console.log(`db.${collectionName}.find({ ${record.field}: { $in: [${formattedUserIds}] } });`);
              console.log(`// To delete: db.${collectionName}.deleteMany({ ${record.field}: { $in: [${formattedUserIds}] } });`);
            }
          }
        });
      } else {
        // Show TrashCan queries in trash mode
        console.log('\n' + '='.repeat(60));
        console.log('TRASHCAN RECOVERY QUERIES');
        console.log('='.repeat(60));
        console.log('\n// View all records moved to trash by this orphan-check run:');
        console.log('db.trashcans.find({ deletedBy: "orphan-check", deletedAt: { $gte: new ISODate() } }).sort({ deletedAt: -1 });');
        console.log('\n// Restore a specific record (replace with actual _id):');
        console.log('// 1. Get the trash record: const trashDoc = db.trashcans.findOne({ _id: ObjectId("...") });');
        console.log('// 2. Restore to original collection: db[trashDoc.originalCollection.toLowerCase() + "s"].insertOne(trashDoc.originalDocument);');
        console.log('// 3. Remove from trash: db.trashcans.deleteOne({ _id: ObjectId("...") });');

        console.log('\n// Count records in trash by collection:');
        console.log('db.trashcans.aggregate([');
        console.log('  { $match: { deletedBy: "orphan-check" } },');
        console.log('  { $group: { _id: "$originalCollection", count: { $sum: 1 } } },');
        console.log('  { $sort: { count: -1 } }');
        console.log(']);');
      }
    }
  } catch (error) {
    console.error('Error during orphan check:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');

    process.exit(0);
  }
}

// Run the check
checkOrphanedRecords().catch(console.error);

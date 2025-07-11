// run with
/*
npx ts-node -r tsconfig-paths/register --transpile-only server/scripts/trash-recovery.ts [command] [options]

Commands:
  list                              - Show summary of trash by collection
  list --detailed                   - Show individual records (up to 50)
  list --collection [name]          - Show summary for specific collection
  list --collection [name] --detailed - Show records from specific collection
  list --user [userId]              - Show records for specific user
  list --limit [number]             - Change record limit (default: 50)
  restore [trashId]                 - Restore a specific record from trash
  restore-all --collection [name]   - Restore all records from a collection
  count                             - Show count by collection
  clean --older-than [days]         - Remove trash records older than X days

Examples:
  npm run trash list
  npm run trash list --detailed
  npm run trash list --collection Level
  npm run trash list --collection Level --detailed --limit 100
  npm run trash restore 64a7b8c9d1e2f3a4b5c6d7e8
  npm run trash restore-all --collection Level
  npm run trash count
  npm run trash clean --older-than 30
*/

import dbConnect from '@root/lib/dbConnect';
import { TrashCanModel } from '@root/models/mongoose';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import readline from 'readline';

dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

async function trashRecovery() {
  try {
    await dbConnect();
    console.log('Connected to database');

    switch (command) {
    case 'list': {
      await listTrashRecords();
      break;
    }

    case 'restore': {
      const trashId = args[1];

      if (!trashId) {
        console.error('❌ Please provide a trash record ID');
        process.exit(1);
      }

      await restoreRecord(trashId);
      break;
    }

    case 'restore-all': {
      await restoreAllFromCollection();
      break;
    }

    case 'count': {
      await showTrashCount();
      break;
    }

    case 'clean': {
      await cleanOldTrash();
      break;
    }

    default: {
      console.log('❌ Unknown command. Available commands:');
      console.log('  list [--detailed] [--collection name] [--user id] [--limit number]');
      console.log('  restore [trashId]');
      console.log('  restore-all --collection [name]');
      console.log('  count');
      console.log('  clean --older-than [days]');
      process.exit(1);
    }
    }
  } catch (error) {
    console.error('Error during trash recovery:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

async function listTrashRecords() {
  const collectionFlag = args.indexOf('--collection');
  const userFlag = args.indexOf('--user');
  const detailedFlag = args.indexOf('--detailed');
  const limitFlag = args.indexOf('--limit');

  const filter: any = {};

  if (collectionFlag !== -1 && args[collectionFlag + 1]) {
    filter.originalCollection = args[collectionFlag + 1];
  }

  if (userFlag !== -1 && args[userFlag + 1]) {
    filter.orphanedUserId = new mongoose.Types.ObjectId(args[userFlag + 1]);
  }

  // If no specific collection is requested, show summary view
  if (collectionFlag === -1 && detailedFlag === -1) {
    await showTrashSummary(filter);

    return;
  }

  // Show detailed records
  const limit = limitFlag !== -1 && args[limitFlag + 1] ? parseInt(args[limitFlag + 1]) : 50;

  const trashRecords = await TrashCanModel.find(filter)
    .sort({ deletedAt: -1 })
    .limit(limit);

  if (trashRecords.length === 0) {
    console.log('✅ No records found in trash with the specified criteria');

    return;
  }

  const totalCount = await TrashCanModel.countDocuments(filter);

  console.log(`\nShowing ${trashRecords.length} of ${totalCount} trash records:\n`);

  if (totalCount > limit) {
    console.log(`📋 Use --limit [number] to show more records (current limit: ${limit})`);
    console.log('📋 Use --collection [name] to filter by collection');
    console.log('📋 Use --user [userId] to filter by user\n');
  }

  console.log('ID'.padEnd(25) + 'Collection'.padEnd(20) + 'Field'.padEnd(15) + 'Deleted At'.padEnd(20) + 'Can Restore');
  console.log('-'.repeat(90));

  trashRecords.forEach(record => {
    const id = record._id.toString();
    const collection = record.originalCollection;
    const field = record.originalField;
    const deletedAt = record.deletedAt.toISOString().substring(0, 19);
    const canRestore = record.canRestore ? '✅' : '❌';

    console.log(
      id.padEnd(25) +
      collection.padEnd(20) +
      field.padEnd(15) +
      deletedAt.padEnd(20) +
      canRestore
    );
  });

  if (totalCount > limit) {
    console.log(`\n... ${totalCount - limit} more records (use --limit ${totalCount} to see all)`);
  }
}

async function showTrashSummary(filter: any = {}) {
  // Get summary by collection
  const pipeline: any[] = [
    { $match: filter },
    {
      $group: {
        _id: {
          collection: '$originalCollection',
          field: '$originalField',
          canRestore: '$canRestore'
        },
        count: { $sum: 1 },
        oldestRecord: { $min: '$deletedAt' },
        newestRecord: { $max: '$deletedAt' }
      }
    },
    {
      $group: {
        _id: {
          collection: '$_id.collection',
          field: '$_id.field'
        },
        totalCount: { $sum: '$count' },
        restorableCount: {
          $sum: {
            $cond: [{ $eq: ['$_id.canRestore', true] }, '$count', 0]
          }
        },
        oldestRecord: { $min: '$oldestRecord' },
        newestRecord: { $max: '$newestRecord' }
      }
    },
    {
      $sort: { totalCount: -1 }
    }
  ];

  const summary = await TrashCanModel.aggregate(pipeline);

  if (summary.length === 0) {
    console.log('✅ No records found in trash');

    return;
  }

  const totalRecords = summary.reduce((sum, item) => sum + item.totalCount, 0);
  const totalRestorable = summary.reduce((sum, item) => sum + item.restorableCount, 0);

  console.log('\n🗑️  TRASH CAN SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total records: ${totalRecords.toLocaleString()}`);
  console.log(`Restorable: ${totalRestorable.toLocaleString()}`);
  console.log(`Non-restorable: ${(totalRecords - totalRestorable).toLocaleString()}\n`);

  console.log('Collection.Field'.padEnd(35) + 'Total'.padEnd(10) + 'Restorable'.padEnd(12) + 'Oldest'.padEnd(12) + 'Newest');
  console.log('-'.repeat(80));

  summary.forEach(item => {
    const collectionField = `${item._id.collection}.${item._id.field}`;
    const total = item.totalCount.toLocaleString();
    const restorable = item.restorableCount.toLocaleString();
    const oldest = item.oldestRecord.toISOString().substring(0, 10);
    const newest = item.newestRecord.toISOString().substring(0, 10);

    console.log(
      collectionField.padEnd(35) +
      total.padEnd(10) +
      restorable.padEnd(12) +
      oldest.padEnd(12) +
      newest
    );
  });

  console.log('\n📋 Commands:');
  console.log('  --detailed                     Show individual records (up to 50)');
  console.log('  --collection [name] --detailed Show records from specific collection');
  console.log('  --limit [number]               Change record limit (default: 50)');
  console.log('  --user [userId]                Filter by specific user');

  console.log('\n💡 Examples:');
  console.log('  trash-recovery list --collection Level --detailed');
  console.log('  trash-recovery list --collection Level --limit 100');
  console.log('  trash-recovery list --user 64a7b8c9d1e2f3a4b5c6d7e8 --detailed');
}

async function restoreRecord(trashId: string) {
  try {
    const trashRecord = await TrashCanModel.findById(trashId);

    if (!trashRecord) {
      console.error('❌ Trash record not found');

      return;
    }

    if (!trashRecord.canRestore) {
      console.error('❌ This record is marked as non-restorable');

      return;
    }

    console.log(`🔄 Restoring record from ${trashRecord.originalCollection}...`);

    // Get the appropriate model dynamically
    const modelName = trashRecord.originalCollection;
    const Model = mongoose.models[modelName];

    if (!Model) {
      console.error(`❌ Unknown collection: ${modelName}`);

      return;
    }

    // Check if a record with this ID already exists
    const existingRecord = await Model.findById(trashRecord.originalId);

    if (existingRecord) {
      console.error('❌ A record with this ID already exists in the target collection');

      return;
    }

    // Restore the original document
    const restoredDoc = new Model(trashRecord.originalDocument);

    await restoredDoc.save();

    // Remove from trash
    await TrashCanModel.findByIdAndDelete(trashId);

    console.log('✅ Record successfully restored and removed from trash');
    console.log(`   Restored to: ${trashRecord.originalCollection}`);
    console.log(`   Record ID: ${trashRecord.originalId}`);
  } catch (error) {
    console.error('❌ Error restoring record:', (error as Error).message);
  }
}

async function restoreAllFromCollection() {
  const collectionFlag = args.indexOf('--collection');

  if (collectionFlag === -1 || !args[collectionFlag + 1]) {
    console.error('❌ Please specify a collection with --collection [name]');

    return;
  }

  const collection = args[collectionFlag + 1];

  const trashRecords = await TrashCanModel.find({
    originalCollection: collection,
    canRestore: true
  });

  if (trashRecords.length === 0) {
    console.log(`✅ No restorable records found for collection: ${collection}`);

    return;
  }

  console.log(`🔄 Found ${trashRecords.length} restorable records for ${collection}`);
  console.log('❓ Are you sure you want to restore all of them? (y/N)');

  // Simple confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('', async (answer: string) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('🔄 Starting bulk restore...');

      let restored = 0;
      let skipped = 0;

      for (const trashRecord of trashRecords) {
        try {
          const Model = mongoose.models[trashRecord.originalCollection];

          // Check if record already exists
          const existingRecord = await Model.findById(trashRecord.originalId);

          if (existingRecord) {
            console.log(`⏭️  Skipped ${trashRecord.originalId} (already exists)`);
            skipped++;
            continue;
          }

          // Restore the document
          const restoredDoc = new Model(trashRecord.originalDocument);

          await restoredDoc.save();

          // Remove from trash
          await TrashCanModel.findByIdAndDelete(trashRecord._id);

          restored++;

          if (restored % 10 === 0) {
            console.log(`   Restored ${restored}/${trashRecords.length} records...`);
          }
        } catch (error) {
          console.error(`❌ Error restoring ${trashRecord.originalId}:`, (error as Error).message);
          skipped++;
        }
      }

      console.log(`✅ Bulk restore complete: ${restored} restored, ${skipped} skipped`);
    } else {
      console.log('❌ Bulk restore cancelled');
    }

    rl.close();
    await mongoose.connection.close();
    process.exit(0);
  });
}

async function showTrashCount() {
  const counts = await TrashCanModel.aggregate([
    {
      $group: {
        _id: {
          collection: '$originalCollection',
          canRestore: '$canRestore'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.collection': 1 }
    }
  ]);

  console.log('Trash can contents by collection:\n');
  console.log('Collection'.padEnd(20) + 'Restorable'.padEnd(15) + 'Count');
  console.log('-'.repeat(40));

  let totalCount = 0;
  let restorableCount = 0;

  counts.forEach(item => {
    const collection = item._id.collection;
    const canRestore = item._id.canRestore ? 'Yes' : 'No';
    const count = item.count;

    console.log(collection.padEnd(20) + canRestore.padEnd(15) + count);

    totalCount += count;

    if (item._id.canRestore) {
      restorableCount += count;
    }
  });

  console.log('-'.repeat(40));
  console.log(`Total records in trash: ${totalCount}`);
  console.log(`Restorable records: ${restorableCount}`);
}

async function cleanOldTrash() {
  const daysFlag = args.indexOf('--older-than');

  if (daysFlag === -1 || !args[daysFlag + 1]) {
    console.error('❌ Please specify days with --older-than [days]');

    return;
  }

  const days = parseInt(args[daysFlag + 1]);

  if (isNaN(days) || days < 1) {
    console.error('❌ Please provide a valid number of days');

    return;
  }

  const cutoffDate = new Date();

  cutoffDate.setDate(cutoffDate.getDate() - days);

  const oldRecords = await TrashCanModel.find({
    deletedAt: { $lt: cutoffDate }
  });

  if (oldRecords.length === 0) {
    console.log(`✅ No trash records older than ${days} days found`);

    return;
  }

  console.log(`🗑️  Found ${oldRecords.length} records older than ${days} days`);
  console.log('❓ Are you sure you want to permanently delete them? (y/N)');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('', async (answer: string) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      const result = await TrashCanModel.deleteMany({
        deletedAt: { $lt: cutoffDate }
      });

      console.log(`✅ Permanently deleted ${result.deletedCount} old trash records`);
    } else {
      console.log('❌ Cleanup cancelled');
    }

    rl.close();
    await mongoose.connection.close();
    process.exit(0);
  });
}

// Run the recovery tool
trashRecovery().catch(console.error);

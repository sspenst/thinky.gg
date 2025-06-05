# UserAuth Cleanup Guide

## 🚨 Problem: Orphaned UserAuth Records

You've discovered orphaned `UserAuth` records in your database - these are authentication records that reference `userId`s that no longer exist in the `users` collection.

### How This Happens

1. **Testing/Development** - Manual database manipulation or incomplete test cleanup
2. **User Deletion** - Users were deleted but their UserAuth records weren't cleaned up (now fixed!)
3. **Failed Transactions** - Race conditions during signup or linking processes
4. **Manual Database Operations** - Direct database edits during development

## ✅ Solution Implemented

### 1. Fixed User Deletion (Prevents Future Issues)

Updated both user deletion endpoints to properly clean up UserAuth records:
- **API Endpoint**: `pages/api/user/index.ts` (DELETE method)
- **Admin Script**: `server/scripts/delete-user.ts`

Both now include `UserAuthModel.deleteMany({ userId: user._id })` in their cleanup operations.

### 2. Created Cleanup Utilities

**Cleanup Helper**: `helpers/cleanupOrphanedUserAuth.ts`
- `findOrphanedUserAuthRecords()` - Finds orphaned records
- `cleanupOrphanedUserAuthRecords(dryRun)` - Removes orphaned records
- `runCleanupOrphanedUserAuth()` - CLI-style runner

**Cleanup Script**: `scripts/cleanup-orphaned-userauth.ts`
- Standalone script for running cleanup

**NPM Command**: `npm run cleanup:userauth`
- Added to package.json for easy execution

### 3. Added Tests

Created comprehensive tests in `tests/helpers/cleanupOrphanedUserAuth.test.ts` to ensure the cleanup functionality works correctly.

## 🔧 Usage

### Check for Orphaned Records (Dry Run)
```bash
npm run cleanup:userauth --dry-run
```
This is the default mode - shows what would be deleted without actually deleting anything.

### Actually Clean Up Orphaned Records
```bash
npm run cleanup:userauth --execute
```
This will actually delete the orphaned records.

### Manual MongoDB Query
If you want to check directly in MongoDB shell:

```javascript
// Check for orphaned UserAuth records
db.userauths.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "userId", 
      foreignField: "_id",
      as: "user"
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
])
```

### Delete Orphaned Records Directly in MongoDB
```javascript
// Get orphaned user IDs first
const orphanedUserIds = db.userauths.aggregate([...query above...]).toArray().map(r => r.userId);

// Delete orphaned records
db.userauths.deleteMany({ userId: { $in: orphanedUserIds } });
```

## 🛡️ Prevention

With the fixes in place, orphaned UserAuth records should no longer be created when users are deleted. The cleanup utilities are provided for historical cleanup and future maintenance.

## 🧪 Testing

Run the cleanup tests:
```bash
npm test -- cleanupOrphanedUserAuth
```

All tests should pass, verifying that:
- Empty database returns no orphaned records
- Orphaned records are correctly identified
- Dry run mode doesn't delete anything
- Execute mode properly deletes orphaned records
- Normal records are preserved

## 📝 Summary

Your orphaned UserAuth records were likely created during testing or development. The issue has been resolved by:

1. ✅ **Fixed user deletion** to properly clean up UserAuth records
2. ✅ **Created cleanup utilities** to handle existing orphaned records  
3. ✅ **Added comprehensive tests** to ensure reliability
4. ✅ **Provided multiple ways** to check and clean up orphaned records

Run `npm run cleanup:userauth` to see if you have any orphaned records and clean them up! 
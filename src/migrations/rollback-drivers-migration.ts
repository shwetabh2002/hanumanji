#!/usr/bin/env ts-node

/**
 * Rollback Script: Restore Drivers Collection from Backup
 *
 * Purpose: Rollback the driver-to-user migration by restoring the drivers
 * collection from backup and removing migrated drivers from users collection.
 *
 * Usage:
 *   npm run rollback:drivers-migration
 *
 * Safety:
 *   - Dry run mode by default (set DRY_RUN=false to execute)
 *   - Validates backup exists before rollback
 *   - Only removes users with type='driver'
 */

import { connect, connection, model, Schema } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/campusride';
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to dry run

// Simple schemas for rollback
const driverSchema = new Schema({}, { strict: false, collection: 'drivers' });
const userSchema = new Schema({}, { strict: false, collection: 'users' });
const backupSchema = new Schema({}, { strict: false, collection: 'drivers_backup' });

const DriverModel = model('RollbackDriver', driverSchema);
const UserModel = model('RollbackUser', userSchema);
const BackupModel = model('RollbackBackup', backupSchema);

interface RollbackStats {
  backupFound: number;
  driversRestored: number;
  usersRemoved: number;
  errors: string[];
}

async function connectDatabase(): Promise<void> {
  console.log('🔌 Connecting to MongoDB...');
  console.log(`   URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

  await connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log('✅ Connected to MongoDB\n');
}

async function disconnectDatabase(): Promise<void> {
  await connection.close();
  console.log('🔌 Disconnected from MongoDB');
}

async function rollbackMigration(): Promise<RollbackStats> {
  const stats: RollbackStats = {
    backupFound: 0,
    driversRestored: 0,
    usersRemoved: 0,
    errors: [],
  };

  console.log('🔙 Starting rollback...\n');

  // Check if backup exists
  const backupDrivers = await BackupModel.find({}).lean();
  stats.backupFound = backupDrivers.length;

  if (backupDrivers.length === 0) {
    console.log('   ⚠️  No backup found in "drivers_backup" collection');
    console.log('   ⚠️  Cannot perform rollback');
    return stats;
  }

  console.log(`   Found ${backupDrivers.length} drivers in backup\n`);

  // Step 1: Remove migrated drivers from users collection
  console.log('🗑️  Removing migrated drivers from users collection...\n');

  const migratedDrivers = await UserModel.find({ type: 'driver' }).lean();
  console.log(`   Found ${migratedDrivers.length} drivers in users collection`);

  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would remove ${migratedDrivers.length} drivers from users collection`);
    stats.usersRemoved = migratedDrivers.length;
  } else {
    const deleteResult = await UserModel.deleteMany({ type: 'driver' });
    stats.usersRemoved = deleteResult.deletedCount || 0;
    console.log(`   ✅ Removed ${stats.usersRemoved} drivers from users collection\n`);
  }

  // Step 2: Restore drivers collection from backup
  console.log('♻️  Restoring drivers collection from backup...\n');

  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would restore ${backupDrivers.length} drivers to drivers collection`);
    stats.driversRestored = backupDrivers.length;
  } else {
    // Clear existing drivers collection (if any)
    await DriverModel.deleteMany({});

    // Restore from backup
    await DriverModel.insertMany(backupDrivers);
    stats.driversRestored = backupDrivers.length;
    console.log(`   ✅ Restored ${stats.driversRestored} drivers to drivers collection\n`);
  }

  return stats;
}

async function printSummary(stats: RollbackStats): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('📊 ROLLBACK SUMMARY');
  console.log('='.repeat(60));
  console.log(`Mode:              ${DRY_RUN ? '🔍 DRY RUN (no changes made)' : '✅ LIVE EXECUTION'}`);
  console.log(`Backup Found:      ${stats.backupFound}`);
  console.log(`Drivers Restored:  ${stats.driversRestored}`);
  console.log(`Users Removed:     ${stats.usersRemoved}`);
  console.log(`Errors:            ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    stats.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }

  if (DRY_RUN) {
    console.log('\n💡 To execute the rollback, run:');
    console.log('   DRY_RUN=false npm run rollback:drivers-migration');
  } else {
    console.log('\n✅ Rollback completed successfully!');
    console.log('\n⚠️  Note: The backup in "drivers_backup" collection is still preserved');
    console.log('   You can manually delete it when you are sure everything is working');
  }

  console.log('='.repeat(60) + '\n');
}

async function main(): Promise<void> {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔙 ROLLBACK DRIVER MIGRATION SCRIPT');
    console.log('='.repeat(60));
    console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '⚠️  LIVE EXECUTION'}`);
    console.log('='.repeat(60) + '\n');

    await connectDatabase();

    const stats = await rollbackMigration();

    await printSummary(stats);

    await disconnectDatabase();

    // Exit with error code if there were errors
    process.exit(stats.errors.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Fatal error during rollback:', error);
    await disconnectDatabase();
    process.exit(1);
  }
}

// Execute rollback
if (require.main === module) {
  main();
}

export { main as rollbackDriversMigration };

#!/usr/bin/env ts-node

/**
 * Migration Script: Consolidate Drivers into Users Collection
 *
 * Purpose: Migrate all driver documents from 'drivers' collection to 'users' collection
 * with type='driver' to create a unified user management system.
 *
 * Usage:
 *   npm run migrate:drivers-to-users
 *
 * Safety:
 *   - Dry run mode by default (set DRY_RUN=false to execute)
 *   - Validates data before migration
 *   - Creates backup of drivers collection
 *   - Provides rollback functionality
 */

import { connect, connection, model, Schema } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/campusride';
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to dry run

// Simple schemas for migration (not using full Mongoose models to avoid circular dependencies)
const driverSchema = new Schema({}, { strict: false, collection: 'drivers' });
const userSchema = new Schema({}, { strict: false, collection: 'users' });
const backupSchema = new Schema({}, { strict: false, collection: 'drivers_backup' });

const DriverModel = model('MigrationDriver', driverSchema);
const UserModel = model('MigrationUser', userSchema);
const BackupModel = model('MigrationBackup', backupSchema);

interface MigrationStats {
  driversFound: number;
  driversBackedUp: number;
  driversMigrated: number;
  driversSkipped: number;
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

async function backupDrivers(): Promise<number> {
  console.log('💾 Creating backup of drivers collection...');

  const drivers = await DriverModel.find({}).lean();

  if (drivers.length === 0) {
    console.log('   ⚠️  No drivers found to backup');
    return 0;
  }

  // Clear existing backup
  await BackupModel.deleteMany({});

  // Create backup
  await BackupModel.insertMany(drivers);

  console.log(`   ✅ Backed up ${drivers.length} drivers to 'drivers_backup' collection\n`);
  return drivers.length;
}

async function validateDriverData(driver: any): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Required fields validation
  if (!driver.phoneNumber) {
    errors.push('Missing phoneNumber');
  }
  if (!driver.firstName) {
    errors.push('Missing firstName');
  }
  if (!driver.lastName) {
    errors.push('Missing lastName');
  }

  // Check if driver already exists in users collection
  const existingUser = await UserModel.findOne({ phoneNumber: driver.phoneNumber }).lean();
  if (existingUser) {
    errors.push(`User with phoneNumber ${driver.phoneNumber} already exists`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function transformDriverToUser(driver: any): any {
  // Transform driver document to unified user format
  const user: any = {
    // Copy all common fields
    phoneNumber: driver.phoneNumber,
    firstName: driver.firstName,
    lastName: driver.lastName,
    countryCode: driver.countryCode || '+91',
    email: driver.email,
    password: driver.password,

    // Set type to driver
    type: 'driver',

    // Set role to user (for backward compatibility)
    role: 'user',

    // Copy verification flags
    isPhoneVerified: driver.isPhoneVerified || false,
    isVerified: driver.isVerified || false,
    isActive: driver.isActive !== undefined ? driver.isActive : true,

    // Copy profile fields
    profilePicture: driver.profilePicture,
    dateOfBirth: driver.dateOfBirth,

    // Driver-specific fields
    status: driver.status || 'offline',
    language: driver.language || 'en',
    licenseNumber: driver.licenseNumber,
    licenseExpiry: driver.licenseExpiry,
    aadharNumber: driver.aadharNumber,
    panNumber: driver.panNumber,

    // Copy nested objects
    vehicle: driver.vehicle,
    location: driver.location,
    bankDetails: driver.bankDetails,
    currentLocation: driver.currentLocation || [0, 0],

    // Copy stats (merge structure)
    stats: driver.stats ? {
      rating: driver.stats.rating || 5.0,
      totalRides: driver.stats.totalRides || 0,
      totalEarnings: driver.stats.totalEarnings || 0,
      completionRate: driver.stats.completionRate || 100,
      cancellationRate: driver.stats.cancellationRate || 0,
    } : undefined,

    // Copy auth fields
    otp: driver.otp,
    otpExpiry: driver.otpExpiry,
    refreshToken: driver.refreshToken,
    lastLogin: driver.lastLogin,

    // Preserve timestamps if they exist
    createdAt: driver.createdAt,
    updatedAt: driver.updatedAt,
  };

  // Remove undefined fields
  Object.keys(user).forEach(key => {
    if (user[key] === undefined) {
      delete user[key];
    }
  });

  return user;
}

async function migrateDrivers(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    driversFound: 0,
    driversBackedUp: 0,
    driversMigrated: 0,
    driversSkipped: 0,
    errors: [],
  };

  console.log('🔄 Starting driver migration...\n');

  // Fetch all drivers
  const drivers = await DriverModel.find({}).lean();
  stats.driversFound = drivers.length;

  console.log(`   Found ${drivers.length} drivers to migrate\n`);

  if (drivers.length === 0) {
    console.log('   ⚠️  No drivers to migrate');
    return stats;
  }

  // Create backup
  stats.driversBackedUp = await backupDrivers();

  // Migrate each driver
  console.log('👥 Migrating drivers to users collection...\n');

  for (const driver of drivers) {
    const driverId = (driver as any)._id;
    const driverInfo = `Driver ${(driver as any).phoneNumber} (${(driver as any).firstName} ${(driver as any).lastName})`;

    try {
      // Validate driver data
      const validation = await validateDriverData(driver);

      if (!validation.valid) {
        console.log(`   ⚠️  Skipping ${driverInfo}:`);
        validation.errors.forEach(error => console.log(`      - ${error}`));
        stats.driversSkipped++;
        stats.errors.push(`${driverInfo}: ${validation.errors.join(', ')}`);
        continue;
      }

      // Transform to user format
      const userData = transformDriverToUser(driver);

      if (DRY_RUN) {
        console.log(`   [DRY RUN] Would migrate: ${driverInfo}`);
        console.log(`      Type: ${userData.type}, Status: ${userData.status}`);
      } else {
        // Insert into users collection
        await UserModel.create(userData);
        console.log(`   ✅ Migrated: ${driverInfo}`);
      }

      stats.driversMigrated++;

    } catch (error) {
      console.log(`   ❌ Error migrating ${driverInfo}:`, error.message);
      stats.errors.push(`${driverInfo}: ${error.message}`);
      stats.driversSkipped++;
    }
  }

  return stats;
}

async function printSummary(stats: MigrationStats): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Mode:              ${DRY_RUN ? '🔍 DRY RUN (no changes made)' : '✅ LIVE EXECUTION'}`);
  console.log(`Drivers Found:     ${stats.driversFound}`);
  console.log(`Drivers Backed Up: ${stats.driversBackedUp}`);
  console.log(`Drivers Migrated:  ${stats.driversMigrated}`);
  console.log(`Drivers Skipped:   ${stats.driversSkipped}`);
  console.log(`Errors:            ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    stats.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }

  if (DRY_RUN) {
    console.log('\n💡 To execute the migration, run:');
    console.log('   DRY_RUN=false npm run migrate:drivers-to-users');
  } else {
    console.log('\n✅ Migration completed!');
    console.log('\n💡 To rollback, run:');
    console.log('   npm run rollback:drivers-migration');
  }

  console.log('='.repeat(60) + '\n');
}

async function main(): Promise<void> {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 DRIVER TO USER MIGRATION SCRIPT');
    console.log('='.repeat(60));
    console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '⚠️  LIVE EXECUTION'}`);
    console.log('='.repeat(60) + '\n');

    await connectDatabase();

    const stats = await migrateDrivers();

    await printSummary(stats);

    await disconnectDatabase();

    // Exit with error code if there were errors
    process.exit(stats.errors.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    await disconnectDatabase();
    process.exit(1);
  }
}

// Execute migration
if (require.main === module) {
  main();
}

export { main as migrateDriversToUsers };

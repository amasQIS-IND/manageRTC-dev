/**
 * Database Backup Script
 *
 * Creates automated backups of MongoDB database
 * Supports local storage and S3 upload
 * Can be run manually or scheduled via cron
 *
 * Usage:
 *   node backend/scripts/backup.js                    # Local backup only
 *   node backend/scripts/backup.js --s3              # Backup to S3
 *   node backend/scripts/backup.js --s3 --no-local   # S3 only, no local
 *   node backend/scripts/backup.js --restore <file>   # Restore from backup
 *
 * @module scripts/backup
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.S3_BUCKET;
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Generate backup filename with timestamp
 * @returns {string} Backup filename
 */
function generateBackupFilename() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `mongodb-backup-${timestamp}_${time}.gz`;
}

/**
 * Create local MongoDB backup using mongodump
 * @returns {Promise<string>} Backup file path
 */
function createLocalBackup() {
  return new Promise((resolve, reject) => {
    if (!MONGODB_URI) {
      reject(new Error('MONGODB_URI environment variable is required'));
      return;
    }

    ensureBackupDir();

    const filename = generateBackupFilename();
    const outputPath = path.join(BACKUP_DIR, filename);

    console.log(`Creating backup: ${filename}`);
    console.log('Backup in progress...');

    // Execute mongodump command
    const command = `mongodump --uri="${MONGODB_URI}" --archive="${outputPath}" --gzip`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Backup failed:', error);
        reject(error);
        return;
      }

      // Verify backup file was created
      if (!fs.existsSync(outputPath)) {
        reject(new Error('Backup file was not created'));
        return;
      }

      // Get file size
      const stats = fs.statSync(outputPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log(`✅ Backup created successfully!`);
      console.log(`   File: ${filename}`);
      console.log(`   Size: ${sizeMB} MB`);
      console.log(`   Path: ${outputPath}`);

      resolve(outputPath);
    });
  });
}

/**
 * Upload backup to S3
 * @param {string} localPath - Local backup file path
 * @returns {Promise<Object>} Upload result
 */
async function uploadToS3(localPath) {
  if (!S3_BUCKET) {
    console.log('⚠️  S3_BUCKET not configured. Skipping S3 upload.');
    return { skipped: true };
  }

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    console.log('⚠️  AWS credentials not configured. Skipping S3 upload.');
    return { skipped: true };
  }

  try {
    // Import AWS SDK dynamically
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

    // Create S3 client
    const s3 = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
      }
    });

    const filename = path.basename(localPath);
    const key = `mongodb-backups/${filename}`;

    console.log(`Uploading to S3: ${S3_BUCKET}/${key}`);

    // Read file
    const fileContent = fs.readFileSync(localPath);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: fileContent,
      ContentType: 'application/gzip',
      Metadata: {
        'backup-date': new Date().toISOString(),
        'backup-type': 'mongodb',
        'source': 'manageRTC'
      }
    });

    await s3.send(command);

    console.log('✅ Upload to S3 completed!');
    return { success: true, key };
  } catch (error) {
    console.error('❌ S3 upload failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * List local backups
 * @returns {Array} Array of backup files
 */
function listLocalBackups() {
  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('mongodb-backup-') && file.endsWith('.gz'))
    .map(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        path: filePath,
        size: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        created: stats.birthtime,
        modified: stats.mtime
      };
    })
    .sort((a, b) => b.created - a.created);

  return files;
}

/**
 * Restore from local backup
 * @param {string} backupFile - Backup filename or path
 * @returns {Promise<void>}
 */
function restoreBackup(backupFile) {
  return new Promise((resolve, reject) => {
    // Handle both filename and full path
    const inputPath = backupFile.includes('/') ? backupFile : path.join(BACKUP_DIR, backupFile);

    if (!fs.existsSync(inputPath)) {
      reject(new Error(`Backup file not found: ${inputPath}`));
      return;
    }

    console.log(`⚠️  WARNING: This will RESTORE the database from backup!`);
    console.log(`   Backup file: ${backupFile}`);
    console.log(`   This will REPLACE all current data!`);

    // Execute mongorestore command
    const command = `mongorestore --uri="${MONGODB_URI}" --archive="${inputPath}" --gzip`;

    console.log('\nStarting restore...');

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Restore failed:', error);
        reject(error);
        return;
      }

      console.log('✅ Restore completed successfully!');
      resolve();
    });
  });
}

/**
 * Clean up old backups (keep last N days)
 * @param {number} daysToKeep - Number of days to keep
 * @returns {Object} Cleanup result
 */
function cleanupOldBackups(daysToKeep = 30) {
  ensureBackupDir();

  const now = Date.now();
  const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
  let deletedCount = 0;
  let deletedSize = 0;

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('mongodb-backup-') && file.endsWith('.gz'));

  files.forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);

    if (now - stats.mtime.getTime() > maxAge) {
      const size = stats.size;
      fs.unlinkSync(filePath);
      deletedCount++;
      deletedSize += size;

      console.log(`Deleted old backup: ${file} (${(size / (1024 * 1024)).toFixed(2)} MB)`);
    }
  });

  return {
    deletedCount,
    deletedSizeMB: (deletedSize / (1024 * 1024)).toFixed(2)
  };
}

/**
 * Get backup statistics
 * @returns {Object} Backup statistics
 */
function getBackupStats() {
  const files = listLocalBackups();

  if (files.length === 0) {
    return {
      totalBackups: 0,
      totalSizeMB: 0,
      latestBackup: null,
      oldestBackup: null
    };
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return {
    totalBackups: files.length,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    latestBackup: files[0].created,
    oldestBackup: files[files.length - 1].created,
    backups: files
  };
}

/**
 * Main backup function
 * @param {Object} options - Backup options
 * @returns {Promise<Object>} Backup result
 */
async function runBackup(options = {}) {
  const {
    uploadToS3: shouldUploadToS3 = false,
    keepLocal = true,
    cleanupDays = 30
  } = options;

  console.log('\n' + '='.repeat(60));
  console.log('MongoDB Backup Script');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toLocaleString()}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Create local backup
    let localPath;
    if (keepLocal) {
      localPath = await createLocalBackup();
    }

    // Upload to S3 if requested
    let s3Result;
    if (shouldUploadToS3 && localPath) {
      s3Result = await uploadToS3(localPath);
    }

    // Clean up old backups
    const cleanupResult = cleanupOldBackups(cleanupDays);

    console.log('\n' + '='.repeat(60));
    console.log('Backup Summary');
    console.log('='.repeat(60));
    console.log(`Local backup: ${keepLocal ? '✅ Created' : '⏭️ Skipped'}`);
    console.log(`S3 upload: ${shouldUploadToS3 ? (s3Result?.success ? '✅ Uploaded' : '❌ Failed') : '⏭️ Skipped'}`);
    console.log(`Cleanup: ${cleanupResult.deletedCount} old files deleted (${cleanupResult.deletedSizeMB} MB freed)`);

    // Show backup stats
    const stats = getBackupStats();
    console.log(`\nTotal backups: ${stats.totalBackups}`);
    console.log(`Total size: ${stats.totalSizeMB} MB`);

    console.log('\n✅ Backup process completed successfully!\n');

    return {
      success: true,
      localPath,
      s3Result,
      cleanupResult,
      stats
    };
  } catch (error) {
    console.error('\n❌ Backup process failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Setup scheduled backups
 * @param {string} schedule - Cron schedule (default: daily at 2 AM)
 * @param {Object} options - Backup options
 */
function setupScheduledBackups(schedule = '0 2 * * *', options = {}) {
  console.log(`Setting up scheduled backups: ${schedule}`);

  cron.schedule(schedule, async () => {
    console.log('\n🔄 Running scheduled backup...');
    await runBackup(options);
  });

  console.log('✅ Scheduled backups configured');
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case '--restore':
      // Restore from backup
      const restoreFile = args[1];
      if (!restoreFile) {
        console.error('Usage: node backup.js --restore <backup-file>');
        process.exit(1);
      }
      await restoreBackup(restoreFile);
      break;

    case '--list':
      // List backups
      console.log('\nLocal MongoDB Backups:');
      console.log('='.repeat(60));
      const backups = listLocalBackups();
      if (backups.length === 0) {
        console.log('No backups found.');
      } else {
        backups.forEach((backup, index) => {
          console.log(`\n${index + 1}. ${backup.filename}`);
          console.log(`   Size: ${backup.sizeMB} MB`);
          console.log(`   Created: ${backup.created.toLocaleString()}`);
        });
      }

      const stats = getBackupStats();
      console.log('\n' + '='.repeat(60));
      console.log(`Total: ${stats.totalBackups} backups, ${stats.totalSizeMB} MB`);
      break;

    case '--stats':
      // Show backup statistics
      const backupStats = getBackupStats();
      console.log('\nBackup Statistics:');
      console.log('='.repeat(60));
      console.log(`Total backups: ${backupStats.totalBackups}`);
      console.log(`Total size: ${backupStats.totalSizeMB} MB`);
      console.log(`Latest: ${backupStats.latestBackup ? backupStats.latestBackup.toLocaleString() : 'N/A'}`);
      console.log(`Oldest: ${backupStats.oldestBackup ? backupStats.oldestBackup.toLocaleString() : 'N/A'}`);
      break;

    case '--cleanup':
      // Clean up old backups
      const days = parseInt(args[1]) || 30;
      console.log(`\nCleaning up backups older than ${days} days...`);
      const cleanupResult = cleanupOldBackups(days);
      console.log(`\n✅ Deleted ${cleanupResult.deletedCount} files (${cleanupResult.deletedSizeMB} MB freed)`);
      break;

    case '--s3':
      // Backup with S3 upload
      await runBackup({ uploadToS3: true });
      break;

    case '--s3-only':
      // S3 only, no local backup
      await runBackup({ uploadToS3: true, keepLocal: false });
      break;

    case '--help':
      console.log(`
MongoDB Backup Script
========================

Usage:
  node backup.js                    # Create local backup
  node backup.js --s3              # Create backup and upload to S3
  node backup.js --s3-only         # Upload to S3 only, no local copy
  node backup.js --restore <file>   # Restore from backup file
  node backup.js --list            # List all backups
  node backup.js --stats           # Show backup statistics
  node backup.js --cleanup [days]  # Delete backups older than N days (default: 30)

Environment Variables Required:
  MONGODB_URI                     # MongoDB connection string
  AWS_REGION                       # AWS region (optional, default: us-east-1)
  AWS_ACCESS_KEY_ID                # AWS access key (for S3 upload)
  AWS_SECRET_ACCESS_KEY            # AWS secret key (for S3 upload)
  S3_BUCKET                        # S3 bucket name (for S3 upload)

Examples:
  node backup.js                    # Create local backup
  node backup.js --s3              # Backup to local and S3
  node backup.js --restore backup-2024-01-15.gz  # Restore from file
  node backup.js --list            # List all backups
  node backup.js --cleanup 7        # Delete backups older than 7 days
      `);
      break;

    default:
      // Default: create local backup
      await runBackup();
  }
}

// Export functions for programmatic use
export {
  createLocalBackup,
  uploadToS3,
  restoreBackup,
  listLocalBackups,
  cleanupOldBackups,
  getBackupStats,
  runBackup,
  setupScheduledBackups
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

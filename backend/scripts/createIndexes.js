/**
 * Database Index Creation Script
 *
 * Creates all necessary indexes for the manageRTC platform
 * Run this script after schema changes or in production to ensure indexes exist
 *
 * Usage:
 *   node backend/scripts/createIndexes.js
 *
 * @module scripts/createIndexes
 */

import { connectDB } from '../config/db.js';

// Import all models to ensure indexes are created
import Employee from '../models/employee/employee.schema.js';
import Attendance from '../models/attendance/attendance.schema.js';
import Leave from '../models/leave/leave.schema.js';
import LeaveType from '../models/leave/leaveType.schema.js';
import Payroll from '../models/payroll/payroll.schema.js';
import Department from '../models/organization/department.schema.js';
import Designation from '../models/organization/designation.schema.js';
import Project from '../models/project/project.schema.js';
import Task from '../models/task/task.schema.js';
import Deal from '../models/deal.model.js';
import Ticket from '../models/ticket.model.js';
import Client from '../models/client/client.schema.js';

// Import any other models that need indexes
import Job from '../models/job.model.js';
import Invoice from '../models/invoice/invoice.schema.js';
import Kanban from '../models/kaban/kaban.model.js';

// Models map for reporting
const models = {
  Employee,
  Attendance,
  Leave,
  LeaveType,
  Payroll,
  Department,
  Designation,
  Project,
  Task,
  Deal,
  Ticket,
  Client,
  Job,
  Invoice,
  Kanban
};

/**
 * Create indexes for all models
 */
const createAllIndexes = async () => {
  console.log('🔧 Starting index creation...\n');

  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');

    const results = [];
    let totalIndexes = 0;
    let failedModels = [];

    // Create indexes for each model
    for (const [modelName, model] of Object.entries(models)) {
      try {
        console.log(`📊 Creating indexes for ${modelName}...`);

        const indexInfo = await model.createIndexes();

        // Get index information
        const indexes = await model.listIndexes();
        const indexCount = indexes.length;
        totalIndexes += indexCount;

        results.push({
          model: modelName,
          success: true,
          indexCount: indexCount,
          indexes: indexes.map(idx => ({ name: idx.name, key: idx.key }))
        });

        console.log(`   ✅ ${modelName}: ${indexCount} indexes created/verified`);
      } catch (error) {
        console.error(`   ❌ ${modelName}: FAILED - ${error.message}`);
        failedModels.push({ model: modelName, error: error.message });
        results.push({
          model: modelName,
          success: false,
          error: error.message
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 INDEX CREATION SUMMARY');
    console.log('='.repeat(60));

    // Summary statistics
    const successful = results.filter(r => r.success).length;
    const failed = failedModels.length;

    console.log(`\n✅ Successful: ${successful}/${Object.keys(models).length} models`);
    console.log(`❌ Failed: ${failed}/${Object.keys(models).length} models`);
    console.log(`📊 Total indexes across all models: ${totalIndexes}`);

    // Detailed results for successful models
    console.log('\n✅ SUCCESSFUL MODELS:');
    results
      .filter(r => r.success)
      .forEach(r => {
        console.log(`   ${r.model}: ${r.indexCount} indexes`);
      });

    // Show failed models
    if (failedModels.length > 0) {
      console.log('\n❌ FAILED MODELS:');
      failedModels.forEach(f => {
        console.log(`   ${f.model}: ${f.error}`);
      });
    }

    // Show index details for each model (verbose)
    console.log('\n📝 INDEX DETAILS:');
    results
      .filter(r => r.success)
      .forEach(r => {
        console.log(`\n${r.model}:`);
        r.indexes.forEach(idx => {
          console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });
      });

    // Warnings and recommendations
    console.log('\n⚠️  WARNINGS & RECOMMENDATIONS:');

    // Check for critical indexes
    const criticalModels = ['Employee', 'Attendance', 'Leave', 'Payroll'];
    criticalModels.forEach(modelName => {
      const result = results.find(r => r.model === modelName);
      if (!result || !result.success) {
        console.log(`   ❌ CRITICAL: ${modelName} indexes failed to create`);
      }
    });

    // Check for compound indexes (multi-tenant)
    console.log('\n🔍 MULTI-TENANT INDEX VERIFICATION:');
    console.log('   Verifying compound indexes for data isolation...');

    const modelsWithCompoundIndexes = [
      { name: 'Employee', fields: ['companyId', 'employeeId'] },
      { name: 'Attendance', fields: ['companyId', 'employeeId', 'date'] },
      { name: 'Leave', fields: ['companyId', 'employeeId'] },
      { name: 'Payroll', fields: ['companyId', 'employeeId', 'month', 'year'] },
      { name: 'Project', fields: ['companyId', 'projectId'] },
      { name: 'Task', fields: ['companyId', 'projectId'] },
      { name: 'Ticket', fields: ['companyId', 'ticketId'] },
      { name: 'Client', fields: ['companyId', 'clientId'] },
      { name: 'Deal', fields: ['companyId', '_id'] }
    ];

    for (const modelInfo of modelsWithCompoundIndexes) {
      const model = models[modelInfo.name];
      if (model) {
        const indexes = await model.listIndexes();
        const hasCompoundIndex = indexes.some(idx => {
          const keys = Object.keys(idx.key);
          return modelInfo.fields.every(field => keys.includes(field));
        });

        if (hasCompoundIndex) {
          console.log(`   ✅ ${modelInfo.name}: Has compound index on {${modelInfo.fields.join(', ')}}`);
        } else {
          console.log(`   ⚠️  ${modelInfo.name}: Missing compound index on {${modelInfo.fields.join(', ')}}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Index creation completed!');
    console.log('='.repeat(60) + '\n');

    // Exit with appropriate code
    if (failed > 0) {
      console.error('⚠️  Some indexes failed to create. Please review the errors above.');
      process.exit(1);
    } else {
      console.log('✅ All indexes created successfully!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR during index creation:');
    console.error(error);
    process.exit(1);
  }
};

/**
 * Drop all indexes (use with caution!)
 * This will drop ALL indexes including the default _id index
 */
const dropAllIndexes = async () => {
  console.log('⚠️  WARNING: Dropping all indexes...\n');

  try {
    await connectDB();

    for (const [modelName, model] of Object.entries(models)) {
      try {
        console.log(`🗑️  Dropping indexes for ${modelName}...`);
        await model.collection.dropIndexes();
        console.log(`   ✅ ${modelName}: Indexes dropped`);
      } catch (error) {
        console.error(`   ❌ ${modelName}: ${error.message}`);
      }
    }

    console.log('\n✅ All indexes dropped. Run createIndexes.js to recreate them.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error dropping indexes:', error);
    process.exit(1);
  }
};

/**
 * Show index information without creating
 */
const showIndexInfo = async () => {
  console.log('📋 Retrieving index information...\n');

  try {
    await connectDB();

    for (const [modelName, model] of Object.entries(models)) {
      try {
        const indexes = await model.listIndexes();
        console.log(`\n${modelName} (${indexes.length} indexes):`);
        indexes.forEach(idx => {
          console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
          if (idx.unique) console.log('     (unique)');
        });
      } catch (error) {
        console.error(`   ❌ ${modelName}: ${error.message}`);
      }
    }

    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error retrieving index information:', error);
    process.exit(1);
  }
};

// CLI interface
const command = process.argv[2];

switch (command) {
  case '--drop':
    dropAllIndexes();
    break;
  case '--info':
    showIndexInfo();
    break;
  case '--help':
    console.log(`
Index Management Script
========================

Usage:
  node backend/scripts/createIndexes.js [command]

Commands:
  (no argument)  Create all indexes (default)
  --drop         Drop all indexes (use with caution!)
  --info         Show current index information
  --help         Show this help message

Examples:
  node backend/scripts/createIndexes.js           # Create indexes
  node backend/scripts/createIndexes.js --info    # Show index info
  node backend/scripts/createIndexes.js --drop    # Drop all indexes
    `);
    process.exit(0);
    break;
  default:
    createAllIndexes();
}

export { createAllIndexes, dropAllIndexes, showIndexInfo };

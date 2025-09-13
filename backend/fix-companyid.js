const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';

async function fixCompanyId() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('68443081dcdfe43152aebf80');
    console.log('📚 Connected to database: 68443081dcdfe43152aebf80');

    // Update all projects that have undefined or missing companyId
    const updateResult = await db.collection('projects').updateMany(
      { $or: [{ companyId: { $exists: false } }, { companyId: null }, { companyId: undefined }] },
      { $set: { companyId: '68443081dcdfe43152aebf80' } }
    );

    console.log('✅ Updated projects:', updateResult.modifiedCount);

    // Verify the fix
    const fixedProjects = await db.collection('projects').find({ companyId: '68443081dcdfe43152aebf80' }).toArray();
    console.log('📋 Projects with correct companyId:', fixedProjects.length);

    if (fixedProjects.length > 0) {
      console.log('📊 Sample fixed projects:');
      fixedProjects.slice(0, 3).forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name} (Status: ${project.status}, CompanyId: ${project.companyId})`);
      });
    }

    await client.close();
    console.log('🔌 Connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixCompanyId();

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';

async function checkProjects() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('68443081dcdfe43152aebf80');
    console.log('📚 Connected to database: 68443081dcdfe43152aebf80');

    // Check projects collection
    const projects = await db.collection('projects').find({}).toArray();
    console.log('📋 Projects collection - Total found:', projects.length);

    // Check if there are any projects with different companyIds
    const allProjects = await db.collection('projects').find({}).toArray();
    console.log('📋 ALL projects in database:', allProjects.length);

    if (allProjects.length > 0) {
      console.log('📊 Sample projects:');
      allProjects.slice(0, 3).forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name || 'No Name'} (ID: ${project._id}, Status: ${project.status}, CompanyId: ${project.companyId})`);
      });
    }

    // Check collections
    const collections = await db.listCollections().toArray();
    console.log('📚 Available collections:');
    collections.forEach(col => console.log(`  - ${col.name}`));

    // Check if there are any documents in other collections
    const employees = await db.collection('employees').countDocuments();
    const clients = await db.collection('clients').countDocuments();
    console.log('👥 Employees count:', employees);
    console.log('🏢 Clients count:', clients);

    await client.close();
    console.log('🔌 Connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkProjects();

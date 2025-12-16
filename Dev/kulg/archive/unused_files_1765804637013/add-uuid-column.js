const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function addUUIDColumn() {
  try {
    console.log('🔄 Adding UUID column manually...');
    
    // Add UUID column to database using raw SQL
    await prisma.$executeRaw`ALTER TABLE users ADD COLUMN uuid TEXT`;
    console.log('✅ UUID column added');
    
    // Get all users and add UUIDs
    const users = await prisma.$queryRaw`SELECT id, username FROM users`;
    console.log(`📊 Found ${users.length} users`);
    
    for (const user of users) {
      const newUUID = uuidv4();
      await prisma.$executeRaw`UPDATE users SET uuid = ${newUUID} WHERE id = ${user.id}`;
      console.log(`✅ Added UUID to user: ${user.username} -> ${newUUID.slice(0, 8)}...`);
    }
    
    // Make UUID unique
    await prisma.$executeRaw`CREATE UNIQUE INDEX users_uuid_key ON users(uuid)`;
    console.log('✅ Made UUID column unique');
    
    console.log('🎉 UUID setup completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️ UUID column already exists, just populating values...');
      
      // Just populate UUIDs for existing users
      const users = await prisma.$queryRaw`SELECT id, username, uuid FROM users`;
      for (const user of users) {
        if (!user.uuid) {
          const newUUID = uuidv4();
          await prisma.$executeRaw`UPDATE users SET uuid = ${newUUID} WHERE id = ${user.id}`;
          console.log(`✅ Added UUID to user: ${user.username} -> ${newUUID.slice(0, 8)}...`);
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

addUUIDColumn();
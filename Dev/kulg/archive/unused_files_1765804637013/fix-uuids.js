const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function fixUUIDs() {
  try {
    console.log('🔄 Starting UUID population...');
    
    // Get all users
    const users = await prisma.user.findMany();
    console.log(`📊 Found ${users.length} users`);
    
    for (const user of users) {
      if (!user.uuid) {
        const newUUID = uuidv4();
        await prisma.user.update({
          where: { id: user.id },
          data: { uuid: newUUID }
        });
        console.log(`✅ Added UUID to user: ${user.username} -> ${newUUID.slice(0, 8)}...`);
      } else {
        console.log(`ℹ️ User ${user.username} already has UUID: ${user.uuid.slice(0, 8)}...`);
      }
    }
    
    console.log('🎉 All users now have UUIDs!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUUIDs();
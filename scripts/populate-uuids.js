const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function populateUUIDs() {
  try {
    console.log('🔄 Starting UUID population for existing users...');
    
    // Get all users without UUIDs
    const usersWithoutUUIDs = await prisma.user.findMany({
      where: {
        OR: [
          { uuid: null },
          { uuid: '' }
        ]
      }
    });

    console.log(`📊 Found ${usersWithoutUUIDs.length} users without UUIDs`);

    // Update each user with a UUID
    for (const user of usersWithoutUUIDs) {
      const newUUID = uuidv4();
      await prisma.user.update({
        where: { id: user.id },
        data: { uuid: newUUID }
      });
      console.log(`✅ Updated user ${user.username} (ID: ${user.id}) with UUID: ${newUUID.slice(0, 8)}...`);
    }

    console.log('🎉 UUID population completed successfully!');
    
    // Verify all users now have UUIDs
    const totalUsers = await prisma.user.count();
    const usersWithUUIDs = await prisma.user.count({
      where: {
        uuid: {
          not: null
        }
      }
    });

    console.log(`📈 Status: ${usersWithUUIDs}/${totalUsers} users now have UUIDs`);

  } catch (error) {
    console.error('❌ Error populating UUIDs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateUUIDs();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAuthService() {
  try {
    console.log('🔍 Testing user query...');
    
    // Try a basic query to see what works
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true,
        isActive: true,
        // Don't select fields that might not exist
      }
    });
    
    if (user) {
      console.log('✅ Basic query works');
      console.log('Available fields:', Object.keys(user));
    } else {
      console.log('❌ No users found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAuthService();
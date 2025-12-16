const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

(async () => {
  try {
    const delegate = prisma.users || prisma.user || prisma.new_users;
    if (!delegate) return console.log('No users delegate found; aborting seed.');
    const count = await delegate.count();
    if (count === 0) {
      await delegate.create({
        data: {
          id: crypto.randomUUID(),
          username: 'admin',
          email: 'admin@example.com',
          password: 'changeme',
          fullName: 'Administrator',
          role: 'admin',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('Seed: admin user created (username=admin password=changeme)');
    } else {
      console.log('Seed: users exist, skipping.');
    }
  } catch (e) {
    console.error('Seed failed:', e.message || e);
  } finally {
    await prisma.$disconnect();
  }
})();
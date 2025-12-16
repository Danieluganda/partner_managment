// Setup initial admin user
const AuthService = require('./services/AuthService');
const readline = require('readline');

const authService = new AuthService();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function getUserDelegate(prisma) {
  if (!prisma) return null;
  const names = ['user', 'users', 'new_users', 'newUsers'];
  for (const n of names) {
    if (prisma[n] && typeof prisma[n].findFirst === 'function') return prisma[n];
  }
  const key = Object.keys(prisma).find(k => prisma[k] && typeof prisma[k].findFirst === 'function' && /user/i.test(k));
  if (key) return prisma[key];
  return null;
}

async function setupAdmin() {
    console.log('🔐 Setting up initial admin user for Partner Dashboard');
    console.log('='.repeat(50));
    
    try {
        const prismaClient = authService && authService.prisma ? authService.prisma : null;
        const usersDelegate = getUserDelegate(prismaClient);

        // If we have a delegate, check for existing admin safely
        let existingAdmin = null;
        if (usersDelegate) {
          existingAdmin = await usersDelegate.findFirst({ where: { role: 'admin' } });
        } else if (typeof authService.findUser === 'function') {
          // optional fallback if AuthService exposes a finder
          existingAdmin = await authService.findUser({ role: 'admin' }).catch(()=>null);
        }

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists:');
            console.log(`   Username: ${existingAdmin.username || existingAdmin.email || ''}`);
            console.log(`   Email: ${existingAdmin.email || ''}`);
            console.log(`   Full Name: ${existingAdmin.fullName || ''}`);
            console.log(`   2FA Enabled: ${existingAdmin.twoFactorEnabled ? 'Yes' : 'No'}`);
            
            rl.question('\nDo you want to create another admin user? (y/N): ', async (answer) => {
                if (answer.toLowerCase() !== 'y') {
                    console.log('Setup cancelled.');
                    rl.close();
                    if (prismaClient && typeof prismaClient.$disconnect === 'function') await prismaClient.$disconnect();
                    return;
                }
                await createAdminUser();
            });
            return;
        }
        
        await createAdminUser();
        
    } catch (error) {
        console.error('❌ Error during admin setup:', error && error.message ? error.message : error);
        rl.close();
        if (authService && authService.prisma && typeof authService.prisma.$disconnect === 'function') {
          await authService.prisma.$disconnect();
        }
    }
}

async function createAdminUser() {
    console.log('\n📝 Please provide admin user details:');
    
    rl.question('Full Name: ', (fullName) => {
        rl.question('Username: ', (username) => {
            rl.question('Email: ', (email) => {
                rl.question('Password (min 8 characters): ', async (password) => {
                    try {
                        // Basic validation
                        if (!fullName || !username || !email || !password) {
                            console.log('❌ All fields are required');
                            rl.close();
                            return;
                        }
                        
                        if (password.length < 8) {
                            console.log('❌ Password must be at least 8 characters');
                            rl.close();
                            return;
                        }
                        
                        // Email validation
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(email)) {
                            console.log('❌ Invalid email format');
                            rl.close();
                            return;
                        }
                        
                        // Safety check: do not modify existing users
                        const prismaClient = authService && authService.prisma ? authService.prisma : null;
                        const usersDelegate = getUserDelegate(prismaClient);
                        if (usersDelegate) {
                          const existsByEmail = await usersDelegate.findFirst({ where: { email } });
                          const existsByUsername = await usersDelegate.findFirst({ where: { username } });
                          if (existsByEmail || existsByUsername) {
                            console.log('❌ A user with that email or username already exists. Aborting to avoid changing existing users.');
                            rl.close();
                            if (prismaClient && typeof prismaClient.$disconnect === 'function') await prismaClient.$disconnect();
                            return;
                          }
                        } // else we will rely on AuthService.createUser which will also fail-safe
                        
                        // Create admin user
                        console.log('\n🔄 Creating admin user...');
                        
                        let adminUser;
                        if (authService && typeof authService.createUser === 'function') {
                            adminUser = await authService.createUser({
                                username,
                                email,
                                password,
                                fullName,
                                role: 'admin'
                            });
                        } else if (usersDelegate && typeof usersDelegate.create === 'function') {
                            adminUser = await usersDelegate.create({
                                data: {
                                    username,
                                    email,
                                    password,
                                    fullName,
                                    role: 'admin',
                                    isActive: true,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                }
                            });
                        } else {
                            throw new Error('No available user creation method (AuthService.createUser or Prisma delegate).');
                        }
                        
                        console.log('✅ Admin user created successfully!');
                        console.log('\n👤 Admin User Details:');
                        console.log(`   ID: ${adminUser.id || ''}`);
                        console.log(`   Username: ${adminUser.username || ''}`);
                        console.log(`   Email: ${adminUser.email || ''}`);
                        console.log(`   Full Name: ${adminUser.fullName || ''}`);
                        console.log(`   Role: ${adminUser.role || ''}`);
                        console.log(`   Created: ${adminUser.createdAt || ''}`);
                        
                    } catch (error) {
                        console.error('❌ Failed to create admin user:', error && error.message ? error.message : error);
                    } finally {
                        rl.close();
                        if (authService && authService.prisma && typeof authService.prisma.$disconnect === 'function') {
                            await authService.prisma.$disconnect();
                        }
                    }
                });
            });
        });
    });
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
    console.log('\n\n👋 Setup cancelled by user');
    rl.close();
    await authService.prisma.$disconnect();
    process.exit(0);
});

setupAdmin();
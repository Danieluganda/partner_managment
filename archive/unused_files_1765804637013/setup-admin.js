// Setup initial admin user
const AuthService = require('./services/AuthService');
const readline = require('readline');

const authService = new AuthService();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function setupAdmin() {
    console.log('🔐 Setting up initial admin user for Partner Dashboard');
    console.log('='.repeat(50));
    
    try {
        // Check if admin already exists
        const existingAdmin = await authService.prisma.user.findFirst({
            where: { role: 'admin' }
        });
        
        if (existingAdmin) {
            console.log('⚠️  Admin user already exists:');
            console.log(`   Username: ${existingAdmin.username}`);
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Full Name: ${existingAdmin.fullName}`);
            console.log(`   2FA Enabled: ${existingAdmin.twoFactorEnabled ? 'Yes' : 'No'}`);
            
            rl.question('\nDo you want to create another admin user? (y/N): ', async (answer) => {
                if (answer.toLowerCase() !== 'y') {
                    console.log('Setup cancelled.');
                    rl.close();
                    await authService.prisma.$disconnect();
                    return;
                }
                await createAdminUser();
            });
            return;
        }
        
        await createAdminUser();
        
    } catch (error) {
        console.error('❌ Error during admin setup:', error.message);
        rl.close();
        await authService.prisma.$disconnect();
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
                        
                        // Create admin user
                        console.log('\n🔄 Creating admin user...');
                        
                        const adminUser = await authService.createUser({
                            username,
                            email,
                            password,
                            fullName,
                            role: 'admin'
                        });
                        
                        console.log('✅ Admin user created successfully!');
                        console.log('\n👤 Admin User Details:');
                        console.log(`   ID: ${adminUser.id}`);
                        console.log(`   Username: ${adminUser.username}`);
                        console.log(`   Email: ${adminUser.email}`);
                        console.log(`   Full Name: ${adminUser.fullName}`);
                        console.log(`   Role: ${adminUser.role}`);
                        console.log(`   Created: ${adminUser.createdAt}`);
                        
                        console.log('\n🔐 Security Recommendations:');
                        console.log('   1. Enable 2FA after first login');
                        console.log('   2. Use a strong, unique password');
                        console.log('   3. Keep login credentials secure');
                        console.log('   4. Regularly review user accounts');
                        
                        console.log('\n🚀 You can now login at: http://localhost:3000');
                        
                    } catch (error) {
                        console.error('❌ Failed to create admin user:', error.message);
                    } finally {
                        rl.close();
                        await authService.prisma.$disconnect();
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
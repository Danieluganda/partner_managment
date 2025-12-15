// Add new normal user to the system
const AuthService = require('./services/AuthService');
const readline = require('readline');

const authService = new AuthService();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function addUser() {
    console.log('👤 Adding new user to Partner Dashboard');
    console.log('='.repeat(50));
    
    try {
        await createUser();
    } catch (error) {
        console.error('❌ Error during user creation:', error.message);
        rl.close();
        await authService.prisma.$disconnect();
    }
}

async function createUser() {
    console.log('\n📝 Please provide user details:');
    
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
                        
                        // Check if user already exists
                        const existingUser = await authService.prisma.user.findFirst({
                            where: {
                                OR: [
                                    { username: username },
                                    { email: email }
                                ]
                            }
                        });
                        
                        if (existingUser) {
                            console.log('❌ User with this username or email already exists');
                            console.log(`   Existing: ${existingUser.username} (${existingUser.email})`);
                            rl.close();
                            return;
                        }

                        // SUPER ADMIN PROTECTION: Prevent creating duplicate Super Admin
                        if (email === 'daniel.bn1800@gmail.com' || username === 'Super user') {
                            console.log('❌ Cannot create user with Super Admin credentials');
                            console.log('   Email: daniel.bn1800@gmail.com and Username: "Super user" are reserved');
                            console.log('   🛡️ This protects the system Super Admin account');
                            rl.close();
                            return;
                        }
                        
                        // Create normal user (role: 'user')
                        console.log('\n🔄 Creating user...');
                        
                        const newUser = await authService.createUser({
                            username,
                            email,
                            password,
                            fullName,
                            role: 'user' // Always create as normal user
                        });
                        
                        console.log('✅ User created successfully!');
                        console.log('\n👤 User Details:');
                        console.log(`   ID: ${newUser.id}`);
                        console.log(`   Username: ${newUser.username}`);
                        console.log(`   Email: ${newUser.email}`);
                        console.log(`   Full Name: ${newUser.fullName}`);
                        console.log(`   Role: ${newUser.role}`);
                        console.log(`   Created: ${newUser.createdAt}`);
                        
                        console.log('\n🔐 Security Information:');
                        console.log('   • User role: NORMAL USER (limited access)');
                        console.log('   • 2FA: Can be enabled after first login');
                        console.log('   • Password reset: Available via email');
                        
                        console.log('\n📧 User Notification:');
                        console.log('   Share these login credentials with the user:');
                        console.log(`   Username: ${username}`);
                        console.log(`   Email: ${email}`);
                        console.log(`   Login URL: http://localhost:3000`);
                        console.log('   ⚠️  Advise user to change password after first login');
                        
                        // Show current user list
                        console.log('\n👥 Current System Users:');
                        const allUsers = await authService.prisma.user.findMany({
                            select: {
                                username: true,
                                email: true,
                                fullName: true,
                                role: true,
                                isActive: true
                            },
                            orderBy: { role: 'desc' } // Admins first
                        });
                        
                        allUsers.forEach(user => {
                            const roleIcon = user.role === 'admin' ? '👑' : '👤';
                            const status = user.isActive ? '✅' : '❌';
                            console.log(`   ${roleIcon} ${user.fullName} (${user.username}) - ${user.role.toUpperCase()} ${status}`);
                        });
                        
                    } catch (error) {
                        console.error('❌ Failed to create user:', error.message);
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
    console.log('\n\n👋 User creation cancelled');
    rl.close();
    await authService.prisma.$disconnect();
    process.exit(0);
});

addUser();
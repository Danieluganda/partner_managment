const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserRoles() {
    try {
        console.log('🔍 Checking current users and roles...');
        
        // Get all users
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                createdAt: true
            }
        });
        
        console.log('\n👥 Current Users:');
        users.forEach(user => {
            console.log(`   ${user.username} (${user.email}) - Role: ${user.role}`);
        });
        
        // Update roles: Only Daniel Uganda should be admin
        console.log('\n🔧 Updating user roles...');
        
        for (const user of users) {
            let newRole = 'user'; // Default to user
            
            // Only Daniel Uganda with "Super user" username should be admin
            if (user.username === 'Super user' && user.email === 'daniel.bn1800@gmail.com') {
                newRole = 'admin';
                console.log(`   ✅ Keeping ${user.username} as ADMIN (Super User)`);
            } else {
                console.log(`   🔄 Setting ${user.username} to USER`);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { role: 'user' }
                });
            }
        }
        
        console.log('\n📊 Final user roles:');
        const updatedUsers = await prisma.user.findMany({
            select: {
                username: true,
                email: true,
                fullName: true,
                role: true
            }
        });
        
        updatedUsers.forEach(user => {
            const roleIcon = user.role === 'admin' ? '👑' : '👤';
            console.log(`   ${roleIcon} ${user.username} (${user.email}) - ${user.role.toUpperCase()}`);
        });
        
        console.log('\n✅ User roles updated successfully!');
        console.log('\n🔐 Access Levels:');
        console.log('   👑 ADMIN: Super user (daniel.bn1800@gmail.com) - Full access');
        console.log('   👤 USER: All others - Limited access');
        
    } catch (error) {
        console.error('❌ Error updating user roles:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateUserRoles();
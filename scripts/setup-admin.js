const readline = require('readline');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => rl.question(question, answer => resolve(answer)));
}

async function main() {
    try {
        console.log('=== Admin User Setup ===');
        const email = (await ask('Admin email: ')).trim().toLowerCase();
        const username = (await ask('Admin username: ')).trim();
        const fullName = (await ask('Full name: ')).trim();
        const password = await ask('Password (min 6 chars): ');

        if (!email || !username || !password || password.length < 6) {
            console.error('❌ All fields are required and password must be at least 6 characters.');
            process.exit(1);
        }

        const hashed = await bcrypt.hash(password, 12);
        const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
        const now = new Date();

        // Upsert admin user
        const user = await prisma.users.upsert({
            where: { email },
            update: {
                username,
                fullName,
                password: hashed,
                role: 'admin',
                isActive: true,
                updatedAt: now
            },
            create: {
                id,
                email,
                username,
                fullName,
                password: hashed,
                role: 'admin',
                isActive: true,
                createdAt: now,
                updatedAt: now
            }
        });

        console.log(`✅ Admin user set up: ${user.email} (${user.username})`);
    } catch (err) {
        console.error('❌ Error setting up admin:', err);
    } finally {
        await prisma.$disconnect();
        rl.close();
    }
}

main();
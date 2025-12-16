
require('dotenv').config();
const DatabaseService = require('./services/DatabaseService');

async function checkPrisma() {
    const db = new DatabaseService();
    await db.connect();
    
    console.log('Prisma connected?', !!db.prisma);
    if (db.prisma) {
        console.log('has user?', !!db.prisma.users);
        console.log('has deliverables?', !!db.prisma.deliverables);
    }
    
    await db.disconnect();
}
checkPrisma();

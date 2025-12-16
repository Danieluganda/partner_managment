
const { PrismaClient } = require('@prisma/client');
const DatabaseService = require('./services/DatabaseService');

async function debugPrisma() {
    const db = new DatabaseService();
    await db.connect();
    
    console.log('Prisma keys:', Object.keys(db.prisma));
    // check specifically for compliance_records
    console.log('Has compliance_records?', !!db.prisma.compliance_records);
    console.log('Has complianceRecords?', !!db.prisma.complianceRecords);
    
    await db.disconnect();
}

debugPrisma();

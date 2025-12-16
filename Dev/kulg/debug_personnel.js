
const { PrismaClient } = require('@prisma/client');
const DatabaseService = require('./services/DatabaseService');

async function testPersonnel() {
    console.log('--- Starting Personnel Debug ---');
    
    // Mock database service
    const db = new DatabaseService();
    // We need to ensure it connects
    await db.connect();
    
    // 1. Create a dummy personnel with minimal data (like from Excel Import)
    const testId = 'test-person-' + Date.now();
    const importData = {
        fullName: 'Test Imported Person',
        jobTitle: 'Tester',
        emailAddress: 'test@example.com',
        partnerType: '', // Empty string as ExcelImporter might produce
        id: testId
    };
    
    console.log('Attempting to create personnel with:', importData);
    
    try {
        const created = await db.createPersonnel(importData);
        console.log('Created Personnel:', created);
        
        // 2. Retrieve it
        const retrieved = await db.getPersonnelById(testId);
        console.log('Retrieved Personnel:', retrieved);
        
        if (!retrieved) {
            console.error('FAILED: Could not retrieve created personnel');
        } else if (retrieved.fullName !== importData.fullName) {
            console.error('FAILED: Data mismatch');
        } else {
            console.log('SUCCESS: Personnel created and retrieved');
        }
        
    } catch (err) {
        console.error('ERROR during test:', err);
    } finally {
        await db.disconnect();
    }
}

testPersonnel();

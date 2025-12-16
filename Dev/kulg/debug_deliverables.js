
require('dotenv').config();
const fs = require('fs');
const util = require('util');
const DatabaseService = require('./services/DatabaseService');
const ExcelImporter = require('./services/ExcelImporter');

const logFile = 'debug_deliverables_output.txt';
const log = (...args) => {
    const msg = util.format(...args) + '\n';
    fs.appendFileSync(logFile, msg);
    console.log(...args);
}

async function testDeliverables() {
    fs.writeFileSync(logFile, '--- Starting Deliverables Import Debug ---\n');
    log('DEBUG: DATABASE_URL exists?', !!process.env.DATABASE_URL);

    // Mock database service
    const db = new DatabaseService({ logger: { 
        log: (...a) => log('[DB]', ...a), 
        info: (...a) => log('[DB INFO]', ...a),
        warn: (...a) => log('[DB WARN]', ...a),
        error: (...a) => log('[DB ERROR]', ...a)
    }});
    
    await db.connect();
    
    const importer = new ExcelImporter({ databaseService: db });
    importer.logger = {
        log: (...a) => log('[IMP]', ...a), 
        info: (...a) => log('[IMP INFO]', ...a),
        warn: (...a) => log('[IMP WARN]', ...a),
        error: (...a) => log('[IMP ERROR]', ...a)
    };
    
    const mockRows = [{
        'Display Name': 'Unknown',
        'Partner Name': 'Test Partner Deliverable',
        'Partner ID': 'P-TEST-DEL',
        'Deliverable #': '1.1',
        'Description': 'Inception Report',
        'Milestone Date': '2024-06-30',
        'Status': 'Pending',
        'Responsible Person': 'John Doe',
        '% Payment': '10%'
    }];
    
    log('Simulating import of:', JSON.stringify(mockRows));
    
    try {
        await importer._importDeliverables(mockRows);
        log('Import function completed.');
        
        // Wait for async
        await new Promise(r => setTimeout(r, 1000));
        
        // Check DB
        let dbRecords = [];
        if (db.prisma && db.prisma.deliverables) {
             dbRecords = await db.prisma.deliverables.findMany({
                where: { partnerName: 'Test Partner Deliverable' }
            });
            log('Prisma Records Found:', JSON.stringify(dbRecords));
        } else {
            log('Skipping Prisma check (prisma not available on db instance)');
        }
        
        // Check via service
        const serviceRecords = await db.getDeliverables();
        const found = serviceRecords.filter(r => r.partnerName === 'Test Partner Deliverable');
        log('Service Records Found:', JSON.stringify(found));

        if (found.length > 0) {
            log('SUCCESS: Deliverable record created and verified.');
        } else {
            log('FAILED: Record not found in DB or JSON store.');
        }
        
    } catch (err) {
        log('ERROR during test:', err);
    } finally {
        await db.disconnect();
    }
}

testDeliverables();

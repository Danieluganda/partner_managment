
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const DatabaseService = require('./services/DatabaseService');
const ExcelImporter = require('./services/ExcelImporter');

console.log('DEBUG: DATABASE_URL exists?', !!process.env.DATABASE_URL);

const fs = require('fs');
const util = require('util');
const logFile = 'debug_output.txt';
const log = (...args) => {
    const msg = util.format(...args) + '\n';
    fs.appendFileSync(logFile, msg);
    console.log(...args);
}

async function testCompliance() {
    fs.writeFileSync(logFile, '--- Starting Compliance Import Debug ---\n');
    
    // Mock database service with file logger
    const db = new DatabaseService({ logger: { 
        log: (...a) => log('[DB]', ...a), 
        info: (...a) => log('[DB INFO]', ...a),
        warn: (...a) => log('[DB WARN]', ...a),
        error: (...a) => log('[DB ERROR]', ...a)
    }});
    
    await db.connect();
    
    // Mock Importer
    const importer = new ExcelImporter({ databaseService: db });
    importer.logger = {
        log: (...a) => log('[IMP]', ...a), 
        info: (...a) => log('[IMP INFO]', ...a),
        warn: (...a) => log('[IMP WARN]', ...a),
        error: (...a) => log('[IMP ERROR]', ...a)
    };
    
    const mockRows = [{
        'Requirement': 'Annual Tax Filing',
        'Status': 'Pending',
        'Due Date': '2024-12-31',
        'Partner Name': 'Test Partner Compliance',
        'Type': 'Tax'
    }];
    
    log('Simulating import of:', JSON.stringify(mockRows));
    
    try {
        await importer._importCompliance(mockRows);
        log('Import function completed.');
        
        // Force a small delay for async ops
        await new Promise(r => setTimeout(r, 1000));
        
        // check DB directly
        let dbRecords = [];
        if (db.prisma && db.prisma.compliance_records) {
             dbRecords = await db.prisma.compliance_records.findMany({
                where: { partnerName: 'Test Partner Compliance' }
            });
            log('Prisma Records Found:', JSON.stringify(dbRecords));
        } else {
            log('Skipping Prisma check (prisma not available on db instance)');
        }
        
        // Check service getter (covers JSON fallback)
        const serviceRecords = await db.getComplianceRecords();
        const found = serviceRecords.filter(r => r.partnerName === 'Test Partner Compliance');
        log('Service Records Found:', JSON.stringify(found));

        if (found.length > 0) {
            log('SUCCESS: Compliance record created and verified.');
        } else {
            log('FAILED: Record not found in DB or JSON store.');
        }
        
    } catch (err) {
        log('ERROR during test:', err);
    } finally {
        await db.disconnect();
    }
}
testCompliance();

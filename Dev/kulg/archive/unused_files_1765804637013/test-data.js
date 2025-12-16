const databaseService = require('./services/DatabaseService');

async function checkData() {
    await databaseService.connect();
    
    const partners = await databaseService.getPartners();
    console.log('First partner object:');
    console.log(JSON.stringify(partners[0], null, 2));
    
    console.log('\nFirst partner getSummary():');
    console.log(JSON.stringify(partners[0].getSummary(), null, 2));
    
    await databaseService.disconnect();
}

checkData();
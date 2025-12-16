
const DatabaseService = require('./services/DatabaseService');

const db = new DatabaseService();
console.log('Type of createComplianceRecord:', typeof db.createComplianceRecord);
console.log('Is function?', typeof db.createComplianceRecord === 'function');
console.log('Method names:', Object.getOwnPropertyNames(Object.getPrototypeOf(db)));

// Current line 9: const databaseService = require('./services/DatabaseService');
// Should be: const DatabaseService = require('./services/DatabaseService');
// And then: const databaseService = new DatabaseService();

const fs = require('fs');

// Read the current app.js
let appContent = fs.readFileSync('app.js', 'utf8');

// Replace line 9
appContent = appContent.replace(
  "const databaseService = require('./services/DatabaseService');",
  `const DatabaseService = require('./services/DatabaseService');
const databaseService = new DatabaseService();`
);

// Write the fixed content back
fs.writeFileSync('app.js', appContent);

console.log('✅ Fixed app.js line 9 - DatabaseService now properly instantiated');
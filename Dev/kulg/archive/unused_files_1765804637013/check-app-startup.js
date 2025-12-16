// Let's see what's happening in app.js startup

const fs = require('fs');

// Read app.js and find the problematic line
const appContent = fs.readFileSync('app.js', 'utf8');
const lines = appContent.split('\n');

// Find lines around 1818
for (let i = 1810; i < 1825 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}

// Also search for any database service initialization
const dbLines = lines.filter((line, index) => {
  return line.includes('databaseService') || line.includes('DatabaseService');
}).map((line, index) => {
  const actualIndex = lines.indexOf(line);
  return `Line ${actualIndex + 1}: ${line.trim()}`;
});

console.log('\n🔍 Database service related lines:');
dbLines.forEach(line => console.log(line));
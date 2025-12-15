const fs = require('fs');

// Read DatabaseService.js and find the problematic line
const dbContent = fs.readFileSync('services/DatabaseService.js', 'utf8');
const lines = dbContent.split('\n');

// Find lines around 204
console.log('🔍 Lines around 204 in DatabaseService.js:');
for (let i = 200; i < 210 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}

// Also search for any middleware requires
const middlewareLines = lines.filter((line, index) => {
  return line.includes('middleware') || line.includes('require');
}).map((line, index) => {
  const actualIndex = lines.indexOf(line);
  return `Line ${actualIndex + 1}: ${line.trim()}`;
});

console.log('\n🔍 Middleware/require related lines:');
middlewareLines.forEach(line => console.log(line));
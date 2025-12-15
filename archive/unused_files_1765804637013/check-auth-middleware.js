const fs = require('fs');

// Check the auth middleware file
try {
  const authContent = fs.readFileSync('middleware/auth.js', 'utf8');
  
  // Look for cookie checking logic
  const lines = authContent.split('\n');
  const cookieLines = lines.filter((line, index) => {
    return line.includes('cookie') || line.includes('token') || line.includes('req.cookies');
  }).map((line, index) => {
    const actualIndex = lines.indexOf(line);
    return `Line ${actualIndex + 1}: ${line.trim()}`;
  });
  
  console.log('🔍 Auth middleware cookie handling:');
  cookieLines.forEach(line => console.log(line));
  
} catch (error) {
  console.log('❌ Could not read auth middleware file:', error.message);
}
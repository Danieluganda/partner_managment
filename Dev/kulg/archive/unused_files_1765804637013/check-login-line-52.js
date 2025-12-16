const fs = require('fs');

const loginContent = fs.readFileSync('public/js/login.js', 'utf8');
const lines = loginContent.split('\n');

console.log('🔍 Content around line 52:');
for (let i = 48; i <= 56; i++) {
    if (lines[i-1]) {
        console.log(`Line ${i}: ${lines[i-1]}`);
    }
}

console.log('\n🔍 Searching for https:// references:');
lines.forEach((line, index) => {
    if (line.includes('https://')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});

console.log('\n🔍 Searching for window.location references:');
lines.forEach((line, index) => {
    if (line.includes('window.location')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
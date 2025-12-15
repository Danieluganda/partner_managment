const jwt = require('jsonwebtoken');

// Test the token that should be set
const testToken = 'your-test-token-here'; // We'll get this from the browser

try {
    const decoded = jwt.verify(testToken, process.env.JWT_SECRET || 'your-fallback-secret');
    console.log('✅ Token is valid:', decoded);
} catch (error) {
    console.log('❌ Token verification failed:', error.message);
}
const jwt = require('jsonwebtoken');

// Test JWT creation
const testUser = {
  userId: 'test123',
  email: 'daniel.bn1800@gmail.com',
  role: 'admin'
};

const token = jwt.sign(testUser, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
console.log('🔧 Generated test token:', token);

// Test JWT verification
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  console.log('✅ Token verification successful:', decoded);
} catch (error) {
  console.error('❌ Token verification failed:', error.message);
}
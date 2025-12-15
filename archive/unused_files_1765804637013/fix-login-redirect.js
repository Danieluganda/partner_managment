// This script will help us check what's happening with the login flow

const fs = require('fs');

// Read app.js to find the login route
const appContent = fs.readFileSync('app.js', 'utf8');
const lines = appContent.split('\n');

// Find login-related lines
const loginLines = lines.filter((line, index) => {
  return line.includes('/login') || line.includes('jwt.sign') || line.includes('cookie') || line.includes('redirect');
}).map((line, index) => {
  const actualIndex = lines.indexOf(line);
  return `Line ${actualIndex + 1}: ${line.trim()}`;
});

console.log('🔍 Login and JWT related lines:');
loginLines.forEach(line => console.log(line));

// Also check for authentication middleware
const authLines = lines.filter((line, index) => {
  return line.includes('requireAuth') || line.includes('authenticate') || line.includes('token');
}).map((line, index) => {
  const actualIndex = lines.indexOf(line);
  return `Line ${actualIndex + 1}: ${line.trim()}`;
});

console.log('\n🔍 Authentication middleware lines:');
authLines.forEach(line => console.log(line));

// In app.js, find the login POST route and ensure it looks like this:
app.post('/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    
    const authService = new AuthService();
    const result = await authService.authenticate(usernameOrEmail, password);
    
    if (result.success) {
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: result.user.id,
          email: result.user.email,
          role: result.user.role 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      
      // Set HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
      });
      
      console.log(`✅ User logged in: ${result.user.email} (${result.user.role})`);
      
      // Redirect to dashboard instead of sending JSON
      res.redirect('/dashboard');
    } else {
      res.render('login', { 
        error: result.message,
        username: usernameOrEmail 
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { 
      error: 'Login failed. Please try again.',
      username: req.body.usernameOrEmail 
    });
  }
});

// Make sure your requireAuth middleware looks like this:
function requireAuth(req, res, next) {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      console.log('❌ No token found, redirecting to login');
      return res.redirect('/login');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    console.log(`✅ Authenticated user: ${decoded.email}`);
    next();
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    res.clearCookie('token');
    res.redirect('/login');
  }
}
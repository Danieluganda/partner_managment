const fs = require('fs');

// Read app.js and find the auth/login route
const appContent = fs.readFileSync('app.js', 'utf8');

// Find the /auth/login route
const authLoginStart = appContent.indexOf("app.post('/auth/login'");
const authLoginEnd = appContent.indexOf('});', authLoginStart) + 3;

if (authLoginStart > -1) {
  const authLoginRoute = appContent.substring(authLoginStart, authLoginEnd);
  console.log('🔍 Current /auth/login route:');
  console.log('='.repeat(60));
  console.log(authLoginRoute);
  console.log('='.repeat(60));
  
  // Check for potential issues
  if (!authLoginRoute.includes('res.redirect')) {
    console.log('❌ Issue: Route does not include res.redirect');
  }
  
  if (!authLoginRoute.includes('res.cookie')) {
    console.log('❌ Issue: Route does not set cookies');
  }
  
  if (authLoginRoute.includes('res.json') && authLoginRoute.includes('res.redirect')) {
    console.log('⚠️  Warning: Route has both JSON and redirect responses');
  }
  
} else {
  console.log('❌ Could not find /auth/login route');
}
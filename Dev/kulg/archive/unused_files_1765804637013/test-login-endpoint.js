const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('🔍 Testing login endpoint...');
    
    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'usernameOrEmail=daniel.bn1800@gmail.com&password=your-password-here',
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', response.headers.raw());
    
    if (response.headers.get('set-cookie')) {
      console.log('🍪 Cookies being set:', response.headers.get('set-cookie'));
    } else {
      console.log('❌ No cookies being set');
    }
    
    if (response.headers.get('location')) {
      console.log('🔄 Redirect location:', response.headers.get('location'));
    }
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
  }
}

testLogin();
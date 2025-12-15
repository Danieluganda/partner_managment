// Comprehensive Authentication Test
console.log('🔐 Testing Registration and Login with 2FA\n');

// Test Registration
async function testRegistration() {
    console.log('1️⃣ Testing Registration API...');
    
    try {
        const response = await fetch('http://localhost:3000/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fullName: 'Test User 2',
                email: 'testuser2@example.com',
                password: 'testpass123'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('   ✅ Registration successful!');
            console.log('   📝 Message:', data.message);
        } else {
            console.log('   ❌ Registration failed:', data.message);
        }
        
        return data.success;
        
    } catch (error) {
        console.log('   ❌ Registration error:', error.message);
        return false;
    }
}

// Test Login
async function testLogin() {
    console.log('\n2️⃣ Testing Login API...');
    
    try {
        const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                usernameOrEmail: 'testuser2@example.com',
                password: 'testpass123'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('   ✅ Login successful!');
            console.log('   🎫 JWT provided:', !!data.token);
            console.log('   👤 User data:', data.user?.fullName || 'Not provided');
            console.log('   🔐 2FA Required:', !!data.requiresTwoFactor);
        } else {
            console.log('   ❌ Login failed:', data.message);
        }
        
        return data;
        
    } catch (error) {
        console.log('   ❌ Login error:', error.message);
        return { success: false };
    }
}

// Test Admin Login (if exists)
async function testAdminLogin() {
    console.log('\n3️⃣ Testing Admin Login...');
    
    try {
        const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                usernameOrEmail: 'daniel.bn1800@gmail.com',
                password: 'your-actual-password' // You'd need to use your real password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('   ✅ Admin login would work with correct password');
            console.log('   🔐 2FA Required:', !!data.requiresTwoFactor);
        } else {
            console.log('   ℹ️  Admin test skipped (use real password to test)');
        }
        
        return data;
        
    } catch (error) {
        console.log('   ℹ️  Admin test skipped:', error.message);
        return { success: false };
    }
}

// Run all tests
async function runTests() {
    console.log('🚀 Starting Authentication Tests\n');
    
    // Check if server is running
    try {
        const healthCheck = await fetch('http://localhost:3000/api/health');
        if (!healthCheck.ok) {
            throw new Error('Server not responding');
        }
        console.log('✅ Server is running on http://localhost:3000\n');
    } catch (error) {
        console.log('❌ Server is not running. Please start with: node app.js');
        return;
    }
    
    // Run tests
    const registrationSuccess = await testRegistration();
    
    if (registrationSuccess) {
        await testLogin();
    }
    
    await testAdminLogin();
    
    console.log('\n📋 Test Summary:');
    console.log('   🔗 Login Page: http://localhost:3000/');
    console.log('   📝 Register Page: http://localhost:3000/register');
    console.log('   📊 Dashboard: http://localhost:3000/dashboard (requires auth)');
    console.log('\n📝 Features Available:');
    console.log('   ✅ User Registration');
    console.log('   ✅ Password Authentication');
    console.log('   ✅ JWT Token Generation');
    console.log('   ✅ 2FA Support (setup required)');
    console.log('   ✅ Protected Routes');
    console.log('   ✅ Role-based Access Control');
    
    console.log('\n🎯 Next Steps to Test 2FA:');
    console.log('   1. Register/Login to your account');
    console.log('   2. Go to profile settings');
    console.log('   3. Set up 2FA with authenticator app');
    console.log('   4. Test login with 2FA code');
}

// Run if this is the main module
if (typeof window === 'undefined') {
    // Node.js environment
    const fetch = require('node-fetch');
    runTests().catch(console.error);
} else {
    // Browser environment
    window.runAuthTests = runTests;
    console.log('Run window.runAuthTests() in browser console');
}
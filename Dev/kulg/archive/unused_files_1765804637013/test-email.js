require('dotenv').config();
const EmailService = require('./services/EmailService');

async function testEmail() {
    console.log('🧪 Testing Gmail Email Service...');
    console.log('📧 Environment variables:');
    console.log(`   EMAIL_USER: ${process.env.EMAIL_USER || 'NOT SET'}`);
    console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? 'SET' : 'NOT SET'}`);
    
    const emailService = new EmailService();
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test the email service
    const testResult = await emailService.testEmailService();
    console.log('📧 Email service test result:', testResult);
    
    if (testResult.success) {
        // Test sending a password reset email
        console.log('📨 Testing password reset email...');
        const resetResult = await emailService.sendPasswordResetEmail(
            'daniel.bn1800@gmail.com',
            'test-token-123',
            'Test User'
        );
        console.log('📧 Password reset email result:', resetResult);
    }
    
    process.exit(0);
}

testEmail().catch(console.error);
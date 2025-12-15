// Email Service for Partner Dashboard
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
        this.initializeTransporter();
    }

    initializeTransporter() {
        try {
            // Use Gmail for both development and production
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                // Gmail configuration
                this.transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS // App password for Gmail
                    }
                });
                
                this.initialized = true;
                console.log('📧 Gmail email service initialized');
                console.log(`   From: ${process.env.EMAIL_USER}`);
                
            } else if (process.env.NODE_ENV === 'production') {
                // Production SMTP configuration fallback
                this.transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.gmail.com',
                    port: process.env.SMTP_PORT || 587,
                    secure: false,
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                });
                
                this.initialized = true;
                console.log('📧 SMTP email service initialized');
                
            } else {
                // Development fallback: Use Ethereal for testing
                this.createTestAccount();
            }
        } catch (error) {
            console.error('❌ Email service initialization failed:', error);
            this.initialized = false;
        }
    }

    async createTestAccount() {
        try {
            // Create a test account for development
            const testAccount = await nodemailer.createTestAccount();
            
            this.transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
            
            this.initialized = true;
            console.log('📧 Test email account created:');
            console.log(`   User: ${testAccount.user}`);
            console.log(`   Pass: ${testAccount.pass}`);
            console.log('   Preview emails at: https://ethereal.email/');
            
        } catch (error) {
            console.error('❌ Failed to create test email account:', error);
            this.initialized = false;
        }
    }

    async sendPasswordResetEmail(userEmail, resetToken, userName) {
        if (!this.initialized || !this.transporter) {
            console.error('❌ Email service not initialized');
            return {
                success: false,
                message: 'Email service not available'
            };
        }

        try {
            const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
            
            const mailOptions = {
                from: process.env.FROM_EMAIL || 'noreply@partnerdashboard.com',
                to: userEmail,
                subject: 'Password Reset Request - Partner Dashboard',
                html: this.generatePasswordResetHTML(userName, resetUrl, resetToken),
                text: this.generatePasswordResetText(userName, resetUrl)
            };

            const info = await this.transporter.sendMail(mailOptions);
            
            console.log('📧 Password reset email sent successfully');
            console.log(`   To: ${userEmail}`);
            console.log(`   Message ID: ${info.messageId}`);
            
            if (process.env.NODE_ENV !== 'production' && nodemailer.getTestMessageUrl(info)) {
                console.log('   Preview URL:', nodemailer.getTestMessageUrl(info));
            }

            return {
                success: true,
                message: 'Password reset email sent successfully',
                messageId: info.messageId,
                previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(info) : null
            };

        } catch (error) {
            console.error('❌ Failed to send password reset email:', error);
            return {
                success: false,
                message: 'Failed to send password reset email'
            };
        }
    }

    generatePasswordResetHTML(userName, resetUrl, resetToken) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - Partner Dashboard</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f6f8; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .button { display: inline-block; background-color: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e9ecef; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .token-box { background-color: #f8f9fa; border: 2px dashed #dee2e6; padding: 15px; margin: 20px 0; font-family: monospace; font-size: 14px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset Request</h1>
            <p>Partner Dashboard</p>
        </div>
        
        <div class="content">
            <h2>Hello ${userName || 'User'},</h2>
            
            <p>We received a request to reset your password for your Partner Dashboard account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong> This password reset link will expire in 1 hour for security reasons.
            </div>
            
            <p><strong>Alternative method:</strong> If the button doesn't work, copy and paste this link into your browser:</p>
            <div class="token-box">
                ${resetUrl}
            </div>
            
            <div class="warning">
                <strong>📋 Manual Reset Token:</strong> If you need to enter the token manually, use: <br>
                <code style="font-weight: bold; font-size: 16px;">${resetToken}</code>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e9ecef;">
            
            <p><strong>🛡️ Security Tips:</strong></p>
            <ul>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share your password or reset tokens with anyone</li>
                <li>Use a strong, unique password for your account</li>
                <li>Consider enabling 2FA for extra security</li>
            </ul>
            
            <p>If you have any questions or concerns, please contact our support team.</p>
            
            <p>Best regards,<br>
            <strong>Partner Dashboard Team</strong></p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from Partner Dashboard. Please do not reply to this email.</p>
            <p>© 2025 Partner Dashboard. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
    }

    generatePasswordResetText(userName, resetUrl) {
        return `
Password Reset Request - Partner Dashboard

Hello ${userName || 'User'},

We received a request to reset your password for your Partner Dashboard account.

To reset your password, visit this link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

For security:
- Never share your password with anyone
- Use a strong, unique password
- Consider enabling 2FA for extra security

Best regards,
Partner Dashboard Team

---
This is an automated message. Please do not reply to this email.
© 2025 Partner Dashboard. All rights reserved.
        `.trim();
    }

    async sendWelcomeEmail(userEmail, userName) {
        if (!this.initialized || !this.transporter) {
            console.log('📧 Email service not available for welcome email');
            return { success: false, message: 'Email service not available' };
        }

        try {
            const mailOptions = {
                from: process.env.FROM_EMAIL || 'noreply@partnerdashboard.com',
                to: userEmail,
                subject: 'Welcome to Partner Dashboard! 🎉',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                        <h1>🎉 Welcome to Partner Dashboard!</h1>
                    </div>
                    <div style="padding: 30px;">
                        <h2>Hello ${userName || 'User'},</h2>
                        <p>Your account has been successfully created! You can now access the Partner Dashboard to:</p>
                        <ul>
                            <li>📊 View your dashboard</li>
                            <li>👥 Manage partnerships</li>
                            <li>💰 Track financial data</li>
                            <li>📋 Handle deliverables</li>
                            <li>📈 Generate reports</li>
                        </ul>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.BASE_URL || 'http://localhost:3000'}" 
                               style="background-color: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                               Access Dashboard
                            </a>
                        </div>
                        <p><strong>🔐 Security Tip:</strong> Consider enabling 2FA in your profile settings for enhanced security.</p>
                    </div>
                </div>`,
                text: `Welcome to Partner Dashboard!\n\nHello ${userName || 'User'},\n\nYour account has been successfully created! Visit ${process.env.BASE_URL || 'http://localhost:3000'} to access your dashboard.\n\nBest regards,\nPartner Dashboard Team`
            };

            const info = await this.transporter.sendMail(mailOptions);
            
            return {
                success: true,
                message: 'Welcome email sent successfully',
                messageId: info.messageId
            };

        } catch (error) {
            console.error('❌ Failed to send welcome email:', error);
            return {
                success: false,
                message: 'Failed to send welcome email'
            };
        }
    }

    async testEmailService() {
        if (!this.initialized || !this.transporter) {
            return {
                success: false,
                message: 'Email service not initialized'
            };
        }

        try {
            await this.transporter.verify();
            return {
                success: true,
                message: 'Email service is working correctly'
            };
        } catch (error) {
            return {
                success: false,
                message: 'Email service verification failed',
                error: error.message
            };
        }
    }
}

module.exports = EmailService;
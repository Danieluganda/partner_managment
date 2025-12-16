const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

class AuthService {
    constructor() {
        this.prisma = new PrismaClient();
        this.jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key';
        this.saltRounds = 12;
        this.maxFailedAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000; // 15 minutes
    }

    // Hash password
    async hashPassword(password) {
        return await bcrypt.hash(password, this.saltRounds);
    }

    // Verify password
    async verifyPassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    // Generate JWT token
    generateToken(user) {
        return jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                email: user.email, 
                role: user.role 
            },
            this.jwtSecret,
            { expiresIn: '24h' }
        );
    }

    // Verify JWT token
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            return null;
        }
    }

    // Check if account is locked
    async isAccountLocked(user) {
        if (!user.lockedUntil) return false;
        
        if (new Date() > user.lockedUntil) {
            // Lock has expired, reset failed attempts
            await this.prisma.users.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: 0,
                    lockedUntil: null
                }
            });
            return false;
        }
        
        return true;
    }

    // Handle failed login attempt
    async handleFailedLogin(user) {
        const failedAttempts = user.failedLoginAttempts + 1;
        const updates = { failedLoginAttempts: failedAttempts };
        
        if (failedAttempts >= this.maxFailedAttempts) {
            updates.lockedUntil = new Date(Date.now() + this.lockoutTime);
        }
        
        await this.prisma.users.update({
            where: { id: user.id },
            data: updates
        });
        
        return failedAttempts >= this.maxFailedAttempts;
    }

    // Reset failed login attempts on successful login
    async resetFailedAttempts(userId) {
        await this.prisma.users.update({
            where: { id: userId },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastLogin: new Date()
            }
        });
    }

    // Generate 2FA secret
    generate2FASecret(username) {
        return speakeasy.generateSecret({
            length: 32,
            name: `Partner Dashboard (${username})`,
            issuer: 'Partner Dashboard'
        });
    }

    // Generate QR code for 2FA setup
    async generate2FAQRCode(secret) {
        try {
            return await qrcode.toDataURL(secret.otpauth_url);
        } catch (error) {
            throw new Error('Failed to generate QR code');
        }
    }

    // Verify 2FA token
    verify2FAToken(secret, token) {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow 2 time steps before/after current time
        });
    }

    // Generate backup codes
    generateBackupCodes(count = 8) {
        const codes = [];
        for (let i = 0; i < count; i++) {
            codes.push(this.generateRandomCode(8));
        }
        return codes;
    }

    // Generate random backup code
    generateRandomCode(length) {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Verify backup code
    async verifyBackupCode(userId, code) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId }
        });
        
        if (!user || !user.backupCodes) return false;
        
        const backupCodes = JSON.parse(user.backupCodes);
        const codeIndex = backupCodes.indexOf(code);
        
        if (codeIndex === -1) return false;
        
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        
        await this.prisma.users.update({
            where: { id: userId },
            data: {
                backupCodes: JSON.stringify(backupCodes)
            }
        });
        
        return true;
    }

    // Create new user
    async createUser(userData) {
        const { username, email, password, fullName, role = 'user' } = userData;
        
        try {
            // Check if user already exists
            const existingUser = await this.prisma.users.findFirst({
                where: {
                    OR: [
                        { username: username },
                        { email: email }
                    ]
                }
            });
            
            if (existingUser) {
                throw new Error('User with this username or email already exists');
            }
            
            // Hash password
            const hashedPassword = await this.hashPassword(password);
            
            // Generate UUID for the user (if your schema requires it)
            const { v4: uuidv4 } = require('uuid');
            
            // Create user - Remove the id field, let Prisma generate it
            const user = await this.prisma.users.create({
                data: {
                    username,
                    email,
                    password: hashedPassword,
                    fullName,
                    role,
                    uuid: uuidv4(), // Generate UUID if your schema has this field
                    emailVerificationToken: this.generateRandomCode(32),
                    isActive: true, // Set as active by default
                    twoFactorEnabled: false, // Disable 2FA by default
                    failedLoginAttempts: 0, // Initialize failed attempts
                    createdAt: new Date(), // Set creation time
                    updatedAt: new Date()  // Set update time
                }
            });
            
            console.log('✅ User created successfully:', { id: user.id, email: user.email, username: user.username });
            
            // Don't return password
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
            
        } catch (error) {
            console.error('❌ Error creating user:', error);
            throw error;
        }
    }

    // Authenticate user (first step - password verification)
    async authenticate(usernameOrEmail, password) {
        try {
            console.log('🔍 [AuthService] Starting authentication for:', usernameOrEmail);
            console.log('🔍 [AuthService] Prisma client exists:', !!this.prisma);
            
            // Find user by username or email - Use 'users' instead of 'user'
            const user = await this.prisma.users.findFirst({
                where: {
                    OR: [
                        { username: usernameOrEmail },
                        { email: usernameOrEmail }
                    ],
                    isActive: true
                }
            });

            console.log('🔍 [AuthService] User found:', user ? { id: user.id, email: user.email, username: user.username } : 'null');

            if (!user) {
                console.log('❌ [AuthService] User not found or inactive');
                return { 
                    success: false, 
                    message: 'Invalid username/email or password' 
                };
            }

            // Verify password
            const validPassword = await bcrypt.compare(password, user.password);
            console.log('🔍 [AuthService] Password valid:', validPassword);

            if (!validPassword) {
                console.log('❌ [AuthService] Invalid password');
                return { 
                    success: false, 
                    message: 'Invalid username/email or password' 
                };
            }

            // Check if 2FA is enabled
            if (user.twoFactorEnabled) {
                console.log('🔍 [AuthService] 2FA required for user');
                return {
                    success: false,
                    requiresTwoFactor: true,
                    userId: user.id,
                    message: '2FA verification required'
                };
            }

            console.log('🔍 [AuthService] About to generate JWT token...');
            console.log('🔍 [AuthService] JWT_SECRET exists:', !!process.env.JWT_SECRET);
            console.log('🔍 [AuthService] JWT_SECRET preview:', process.env.JWT_SECRET?.substring(0, 10) + '...');

            // Generate JWT token
            const tokenPayload = {
                userId: user.id,
                email: user.email,
                role: user.role,
                username: user.username
            };

            console.log('🔍 [AuthService] Token payload:', tokenPayload);

            const token = jwt.sign(
                tokenPayload,
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            console.log('🔍 [AuthService] Token generated:', !!token);
            console.log('🔍 [AuthService] Token length:', token?.length || 0);
            console.log('🔍 [AuthService] Token preview:', token ? token.substring(0, 50) + '...' : 'null');

            // Update last login - Use 'users' instead of 'user'
            await this.prisma.users.update({
                where: { id: user.id },
                data: { lastLogin: new Date() }
            });

            console.log('✅ [AuthService] Authentication successful, returning token');

            const result = {
                success: true,
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role
                }
            };

            console.log('🔍 [AuthService] Final result:', { 
                success: result.success, 
                hasToken: !!result.token,
                tokenLength: result.token?.length || 0
            });

            return result;

        } catch (error) {
            console.error('❌ [AuthService] Authentication error:', error);
            return { 
                success: false, 
                message: 'Authentication failed' 
            };
        }
    }

    // Complete 2FA authentication
    async complete2FAAuthentication(userId, token, isBackupCode = false) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId }
        });
        
        if (!user) {
            throw new Error('User not found');
        }
        
        let isValid = false;
        
        if (isBackupCode) {
            isValid = await this.verifyBackupCode(userId, token);
        } else {
            isValid = this.verify2FAToken(user.twoFactorSecret, token);
        }
        
        if (!isValid) {
            throw new Error('Invalid 2FA code');
        }
        
        // Complete login
        await this.resetFailedAttempts(userId);
        await this.prisma.users.update({
            where: { id: userId },
            data: { lastTwoFactorAuth: new Date() }
        });
        
        const authToken = this.generateToken(user);
        const { password: _, ...userWithoutPassword } = user;
        
        return {
            success: true,
            user: userWithoutPassword,
            token: authToken
        };
    }

    // Setup 2FA for user
    async setup2FA(userId) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId }
        });
        
        if (!user) {
            throw new Error('User not found');
        }
        
        // Generate secret
        const secret = this.generate2FASecret(user.username);
        const qrCode = await this.generate2FAQRCode(secret);
        const backupCodes = this.generateBackupCodes();
        
        // Store secret temporarily (will be confirmed when user verifies)
        await this.prisma.users.update({
            where: { id: userId },
            data: {
                twoFactorSecret: secret.base32,
                backupCodes: JSON.stringify(backupCodes)
            }
        });
        
        return {
            secret: secret.base32,
            qrCode,
            backupCodes
        };
    }

    // Enable 2FA after verification
    async enable2FA(userId, verificationCode) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId }
        });
        
        if (!user || !user.twoFactorSecret) {
            throw new Error('2FA setup not found');
        }
        
        // Verify the code
        const isValid = this.verify2FAToken(user.twoFactorSecret, verificationCode);
        
        if (!isValid) {
            throw new Error('Invalid verification code');
        }
        
        // Enable 2FA
        await this.prisma.users.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: true,
                lastTwoFactorAuth: new Date()
            }
        });
        
        return { success: true, message: '2FA has been enabled successfully' };
    }

    // Disable 2FA
    async disable2FA(userId, verificationCode) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId }
        });
        
        if (!user) {
            throw new Error('User not found');
        }
        
        // Verify current 2FA code
        const isValid = this.verify2FAToken(user.twoFactorSecret, verificationCode);
        
        if (!isValid) {
            throw new Error('Invalid verification code');
        }
        
        // Disable 2FA
        await this.prisma.users.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                backupCodes: null,
                lastTwoFactorAuth: null
            }
        });
        
        return { success: true, message: '2FA has been disabled successfully' };
    }

    // Get user by ID
    async getUserById(userId) {
        try {
            return await this.prisma.users.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    fullName: true,
                    role: true,
                    isActive: true,
                    twoFactorEnabled: true,
                    lastLogin: true
                }
            });
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            return null;
        }
    }

    // Get user profile
    async getUserProfile(userId) {
        return this.getUserById(userId);
    }

    // Password Reset Methods
    async generatePasswordResetToken(email) {
        try {
            const user = await this.prisma.users.findUnique({
                where: { email }
            });

            if (!user) {
                // Don't reveal if email exists or not for security
                return {
                    success: true,
                    message: 'If an account with that email exists, a password reset link has been sent.'
                };
            }

            // Generate reset token
            const resetToken = this.generateRandomToken(32);
            const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            // Save reset token to database
            await this.prisma.users.update({
                where: { id: user.id },
                data: {
                    passwordResetToken: resetToken,
                    passwordResetExpiry: resetTokenExpiry
                }
            });

            return {
                success: true,
                token: resetToken,
                email: user.email,
                fullName: user.fullName,
                message: 'Password reset token generated successfully'
            };

        } catch (error) {
            console.error('Password reset token generation error:', error);
            return {
                success: false,
                message: 'Failed to generate password reset token'
            };
        }
    }

    async resetPassword(token, newPassword) {
        try {
            if (!token || !newPassword) {
                return {
                    success: false,
                    message: 'Reset token and new password are required'
                };
            }

            if (newPassword.length < 6) {
                return {
                    success: false,
                    message: 'Password must be at least 6 characters long'
                };
            }

            // Find user with valid reset token
            const user = await this.prisma.users.findFirst({
                where: {
                    passwordResetToken: token,
                    passwordResetExpiry: {
                        gt: new Date() // Token not expired
                    },
                    isActive: true
                }
            });

            if (!user) {
                return {
                    success: false,
                    message: 'Invalid or expired reset token'
                };
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            // Update password and clear reset token
            await this.prisma.users.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    passwordResetToken: null,
                    passwordResetExpiry: null,
                    failedLoginAttempts: 0, // Reset failed attempts
                    lockedUntil: null // Clear any account locks
                }
            });

            console.log(`✅ Password reset successful for user: ${user.email}`);

            return {
                success: true,
                message: 'Password has been reset successfully'
            };

        } catch (error) {
            console.error('Password reset error:', error);
            return {
                success: false,
                message: 'Failed to reset password'
            };
        }
    }

    async validateResetToken(token) {
        try {
            if (!token) {
                return { valid: false, message: 'Reset token is required' };
            }

            const user = await this.prisma.users.findFirst({
                where: {
                    passwordResetToken: token,
                    passwordResetExpiry: {
                        gt: new Date()
                    },
                    isActive: true
                },
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    passwordResetExpiry: true
                }
            });

            if (!user) {
                return { valid: false, message: 'Invalid or expired reset token' };
            }

            return {
                valid: true,
                user: {
                    email: user.email,
                    fullName: user.fullName
                },
                expiresAt: user.passwordResetExpiry
            };

        } catch (error) {
            console.error('Reset token validation error:', error);
            return { valid: false, message: 'Token validation failed' };
        }
    }

    // Utility method to generate random tokens
    generateRandomToken(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

module.exports = AuthService;
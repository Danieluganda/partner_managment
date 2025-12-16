const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = 'public/uploads/profiles';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.uuid + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware to ensure user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/');
  }
  next();
};

// Profile page
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    res.render('profile', { 
      user,
      pageTitle: 'My Profile',
      pageSubtitle: 'Manage your account settings',
      additionalCSS: ['profile.css'],
      message: req.query.message,
      error: req.query.error
    });
  } catch (error) {
    console.error('Profile page error:', error);
    res.redirect('/dashboard?error=Unable to load profile');
  }
});

// Update profile
router.post('/update', requireAuth, upload.single('profilePicture'), async (req, res) => {
  try {
    const { fullName, username, email, bio, phone, timezone, language } = req.body;

    // Check if username/email already exists (excluding current user)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
        NOT: { id: req.user.id }
      }
    });

    if (existingUser) {
      return res.redirect('/profile?error=Username or email already exists');
    }

    // Update user data
    const updateData = {
      fullName,
      username,
      email,
      bio,
      phone,
      timezone,
      language
    };

    if (req.file) {
      updateData.profilePicture = `/uploads/profiles/${req.file.filename}`;
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    res.redirect('/profile?message=Profile updated successfully');
  } catch (error) {
    console.error('Profile update error:', error);
    res.redirect('/profile?error=Failed to update profile');
  }
});

// Change password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    // Validate current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.redirect('/profile?error=Current password is incorrect');
    }

    // Validate new password
    if (newPassword !== confirmPassword) {
      return res.redirect('/profile?error=New passwords do not match');
    }

    if (newPassword.length < 6) {
      return res.redirect('/profile?error=Password must be at least 6 characters long');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.redirect('/profile?message=Password changed successfully');
  } catch (error) {
    console.error('Change password error:', error);
    res.redirect('/profile?error=Failed to change password');
  }
});

// 2FA Setup
router.get('/2fa/setup', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    if (user.twoFactorEnabled) {
      return res.redirect('/profile?error=2FA is already enabled');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Partner Dashboard (${user.email})`,
      issuer: 'Partner Dashboard',
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.render('2fa-setup', {
      user,
      secret: secret.base32,
      qrCodeUrl,
      pageTitle: '2FA Setup',
      pageSubtitle: 'Secure your account with two-factor authentication',
      additionalCSS: ['profile.css']
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.redirect('/profile?error=Failed to setup 2FA');
  }
});

// Verify and enable 2FA
router.post('/2fa/enable', requireAuth, async (req, res) => {
  try {
    const { secret, token } = req.body;

    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.redirect('/profile/2fa/setup?error=Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        backupCodes: JSON.stringify(backupCodes)
      }
    });

    res.render('2fa-backup-codes', {
      user: req.user,
      backupCodes,
      pageTitle: '2FA Enabled',
      pageSubtitle: 'Save your backup codes',
      additionalCSS: ['profile.css']
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    res.redirect('/profile?error=Failed to enable 2FA');
  }
});

// Disable 2FA
router.post('/2fa/disable', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.redirect('/profile?error=Password is incorrect');
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: null
      }
    });

    res.redirect('/profile?message=2FA has been disabled');
  } catch (error) {
    console.error('2FA disable error:', error);
    res.redirect('/profile?error=Failed to disable 2FA');
  }
});

// Generate new backup codes
router.post('/2fa/backup-codes', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user.twoFactorEnabled) {
      return res.redirect('/profile?error=2FA is not enabled');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.redirect('/profile?error=Password is incorrect');
    }

    // Generate new backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { backupCodes: JSON.stringify(backupCodes) }
    });

    res.render('2fa-backup-codes', {
      user,
      backupCodes,
      pageTitle: 'New Backup Codes',
      pageSubtitle: 'Save your new backup codes',
      additionalCSS: ['profile.css']
    });
  } catch (error) {
    console.error('Backup codes error:', error);
    res.redirect('/profile?error=Failed to generate backup codes');
  }
});

module.exports = router;
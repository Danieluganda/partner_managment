require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const DatabaseService = require('./services/DatabaseService');
const databaseService = new DatabaseService();
const dataService = require('./services/DataService'); // Keep for migration
const { authenticateToken, requireRole, requireAdmin, requireManager, require2FA, optionalAuth, authService } = require('./middleware/auth');
const { safeGetSummary } = require('./utils/dataHelpers');
const fetch = require('node-fetch'); // Add this at the top if not already present
const net = require('net');
const { PrismaClient } = require('@prisma/client');
// Add this require for the Excel importer
const ExcelImporter = require('./services/ExcelImporter');
// reuse a singleton Prisma client
if (!global.prisma) global.prisma = new PrismaClient();
const prisma = global.prisma;

/**
 * Load shared data used by views (partners, personnel, basic stats).
 * Adjust queries/fields to match your prisma/schema.prisma.
 */
async function loadSharedViewData() {
    try {
        // Use DatabaseService so we use the same data shape as the rest of the app
        const [partners, personnel, stats] = await Promise.all([
            databaseService.getPartners().catch(() => []),
            databaseService.getPersonnel().catch(() => []),
            databaseService.getDashboardStats().catch(() => ({}))
        ]);

        // Normalize to plain objects / summaries used by templates
        const partnersData = (partners || []).map(p => (p && p.getSummary) ? p.getSummary() : p);
        const personnelData = (personnel || []).map(p => (p && p.getSummary) ? p.getSummary() : p);

        const derivedStats = Object.assign({}, stats || {}, {
            totalPartners: partnersData.length,
            personnelCount: personnelData.length,
            signedCount: partnersData.filter(p => (p.contractStatus === 'Active' || p.contractStatus === 'Signed')).length
        });

        return { partners: partnersData, personnel: personnelData, stats: derivedStats };
    } catch (err) {
        console.error('loadSharedViewData error:', err);
        return { partners: [], personnel: [], stats: {} };
    }
}

const app = express();

// view data injector: attach shared DB data to res.render locals for HTML responses
app.use(async (req, res, next) => {
    // only for HTML responses
    if (!req.accepts || !req.accepts('html')) return next();

    const originalRender = res.render.bind(res);

    res.render = async function(view, options = {}, callback) {
        try {
            const shared = await loadSharedViewData(); // ensure this function is defined above
            options = Object.assign({}, options, {
                jsData: Object.assign({}, options.jsData || {}, {
                    partners: shared.partners,
                    personnel: shared.personnel,
                    stats: shared.stats
                })
            });

            // Also provide top-level locals commonly used by templates
            res.locals.jsData = options.jsData;
            res.locals.partners = shared.partners;
            res.locals.personnel = shared.personnel;
            res.locals.stats = shared.stats;
        } catch (err) {
            console.error('view injector error:', err);
        }
        return originalRender(view, options, callback);
    };

    next();
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
    max: parseInt(process.env.RATE_LIMIT_GENERAL) || 100, // 0 = unlimited for development
    message: 'Too many requests from this IP, please try again later.',
    skip: (req) => {
        // Skip rate limiting if set to 0 (unlimited)
        return parseInt(process.env.RATE_LIMIT_GENERAL) === 0;
    }
});

const authLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
    max: parseInt(process.env.RATE_LIMIT_AUTH) || 5, // 0 = unlimited for development
    message: 'Too many login attempts, please try again later.',
    skipSuccessfulRequests: true,
    skip: (req) => {
        // Skip rate limiting if set to 0 (unlimited)
        return parseInt(process.env.RATE_LIMIT_AUTH) === 0;
    }
});

app.use(limiter);
app.use('/auth', authLimiter);

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Disable caching for development
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});

// Add version to static files for cache busting
app.use('/js', express.static(path.join(__dirname, 'public/js'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: false
}));

app.use('/css', express.static(path.join(__dirname, 'public/css'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: false
}));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Ensure proper encoding for all HTML responses
app.use((req, res, next) => {
    if (req.accepts('html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    next();
});

// replace earlier ExcelImporter direct init with ExcelLoader usage

const ExcelLoader = require('./services/ExcelLoader');

// Middleware that exposes Excel data to templates (keep this early)
app.use((req, res, next) => {
  const d = (ExcelLoader && typeof ExcelLoader.get === 'function') ? ExcelLoader.get() : {};
  res.locals.partners = d.partners || d.internalPartners || d.partnerList || [];
  res.locals.externalPartners = d.externalPartners || d.external || [];
  res.locals.deliverables = d.deliverables || d.deliverableList || [];
  res.locals.financials = d.financials || d.financialSummary || [];
  res.locals.compliance = d.compliance || d.complianceRecords || [];
  res.locals.personnel = d.personnel || d.personnelList || [];
  res.locals.masterRegister = d.masterRegister || [];
  next();
});

// Routes
app.get('/', async (req, res) => {
    try {
        res.render('index', { 
            title: 'Login - Partner Dashboard'
        });
    } catch (error) {
        console.error('Error loading login page:', error);
        res.render('error', { error });
    }
});

// Authentication Routes
app.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { usernameOrEmail, password, rememberMe } = req.body;
    console.log('🔍 Login attempt:', { usernameOrEmail, rememberMe });

    if (!usernameOrEmail || !password) {
      // If it's an API request, return JSON
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(400).json({
          error: 'Username/email and password are required'
        });
      }
      // For form submissions, render login page with error
      return res.render('index', { 
        error: 'Username/email and password are required',
        title: 'Login - Partner Dashboard'
      });
    }

    // Authenticate user
    const result = await authService.authenticate(usernameOrEmail, password);
    console.log('🔍 Auth result:', { success: result.success, message: result.message });
    console.log('🔍 Token received from authService:', result.token); // ADD THIS LINE

    if (result.success) {
      // Check if token exists and is valid
      if (!result.token) {
        console.error('❌ No token received from authService!');
        return res.render('index', { 
          error: 'Authentication failed - no token generated',
          title: 'Login - Partner Dashboard'
        });
      }

      // Set auth token in cookie with proper settings
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 30 days if remember me, else 24 hours
        sameSite: 'lax',
        path: '/',
        domain: 'localhost' // This will help separate from WordPress
      };

      console.log('🔍 Setting cookie with token:', result.token);
      console.log('🔍 Cookie options:', cookieOptions);
      res.cookie('authToken', result.token, cookieOptions);

      if (rememberMe) {
        res.cookie('rememberUser', result.user.email, {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          httpOnly: false, // Allow JS access for convenience
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }

      console.log(`✅ User logged in: ${result.user.email} (${result.user.role})`);
      console.log('🔍 About to redirect to /dashboard');

      // Check if it's an API request
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({
          success: true,
          message: 'Login successful',
          user: {
            email: result.user.email,
            role: result.user.role,
            username: result.user.username
          },
          redirect: '/dashboard'
        });
      }

      // For form submissions, redirect to dashboard
      return res.redirect('/dashboard');

    } else {
      // Authentication failed
      console.log('❌ Login failed:', result.message);
      
      // If it's an API request, return JSON error
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(401).json({ 
          error: result.message 
        });
      }

      // For form submissions, render login page with error
      return res.render('index', { 
        error: result.message,
        username: usernameOrEmail,
        title: 'Login - Partner Dashboard'
      });
    }

  } catch (error) {
    console.error('❌ Login error:', error);

    // If it's an API request, return JSON error
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ 
        error: 'Internal server error' 
      });
    }

    // For form submissions, render login page with error
    return res.render('index', { 
      error: 'Login failed. Please try again.',
      username: req.body.usernameOrEmail,
      title: 'Login - Partner Dashboard'
    });
  }
});

// 2FA verification route
app.post('/auth/verify-2fa', async (req, res) => {
    try {
        const { code, useBackupCode } = req.body;
        const userId = req.session.pendingUserId;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'No pending 2FA verification found' 
            });
        }
        
        if (!code) {
            return res.status(400).json({ 
                success: false, 
                message: '2FA code is required' 
            });
        }
        
        const result = await authService.complete2FAAuthentication(userId, code, useBackupCode);
        
        // Clear pending user ID from session
        delete req.session.pendingUserId;
        
        // Set auth token in cookie
        res.cookie('authToken', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        res.json({ 
            success: true, 
            message: '2FA verification successful',
            user: result.user,
            redirect: '/dashboard'
        });
        
    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Legacy login route (backwards compatibility)
app.post('/login', async (req, res) => {
  // Simply redirect to the proper auth endpoint
  return app._router.handle({...req, url: '/auth/login', method: 'POST'}, res);
});

// Logout route
app.post('/auth/logout', (req, res) => {
    // Clear session data and cookies
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
    });
    
    // Clear all auth-related cookies
    res.clearCookie('authToken', { path: '/' });
    res.clearCookie('rememberUser', { path: '/' });
    
    console.log('✅ User logged out');
    res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
    });
    
    // Clear all auth-related cookies
    res.clearCookie('authToken', { path: '/' });
    res.clearCookie('rememberUser', { path: '/' });
    
    console.log('✅ User logged out via GET');
    res.redirect('/?message=logged_out');
});

// 2FA Setup Routes
app.get('/auth/setup-2fa', authenticateToken, async (req, res) => {
    try {
        const setup = await authService.setup2FA(req.user.id);
        res.json({
            success: true,
            qrCode: setup.qrCode,
            backupCodes: setup.backupCodes,
            secret: setup.secret
        });
    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

app.post('/auth/enable-2fa', authenticateToken, async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ 
                success: false, 
                message: 'Verification code is required' 
            });
        }
        
        const result = await authService.enable2FA(req.user.id, code);
        res.json(result);
    } catch (error) {
        console.error('2FA enable error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
});

app.post('/auth/disable-2fa', authenticateToken, async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ 
                success: false, 
                message: 'Verification code is required' 
            });
        }
        
        const result = await authService.disable2FA(req.user.id, code);
        res.json(result);
    } catch (error) {
        console.error('2FA disable error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// User profile routes
app.get('/auth/profile', authenticateToken, async (req, res) => {
    try {
        const profile = await authService.getUserProfile(req.user.id);
        res.json({ success: true, user: profile });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch profile' 
        });
    }
});

// Password routes
app.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { 
        title: 'Forgot Password - Partner Dashboard' 
    });
});

// Forgot password POST route
app.post('/auth/forgot-password', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required'
            });
        }
        
        // Generate reset token
        const result = await authService.generatePasswordResetToken(email);
        
        if (result.success && result.token) {
            // Initialize email service if not already done
            if (!global.emailService) {
                const EmailService = require('./services/EmailService');
                global.emailService = new EmailService();
            }
            
            // Send password reset email
            const emailResult = await global.emailService.sendPasswordResetEmail(
                result.email,
                result.token,
                result.fullName
            );
            
            if (emailResult.success) {
                console.log(`📧 Password reset email sent to: ${result.email}`);
                if (emailResult.previewUrl) {
                    console.log(`📧 Preview URL: ${emailResult.previewUrl}`);
                }
            } else {
                console.error('❌ Failed to send password reset email:', emailResult.message);
            }
        }
        
        // Always return success message for security (don't reveal if email exists)
        res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
        });
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Reset password page
app.get('/reset-password', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.render('error', { 
                title: 'Invalid Reset Link',
                error: { message: 'Invalid password reset link' }
            });
        }
        
        // Validate reset token
        const validation = await authService.validateResetToken(token);
        
        if (!validation.valid) {
            return res.render('error', {
                title: 'Invalid Reset Link',
                error: { message: validation.message }
            });
        }
        
        res.render('reset-password', {
            title: 'Reset Password - Partner Dashboard',
            token,
            user: validation.user,
            expiresAt: validation.expiresAt
        });
        
    } catch (error) {
        console.error('Reset password page error:', error);
        res.render('error', {
            title: 'Error',
            error: { message: 'An error occurred while loading the reset page' }
        });
    }
});

// Reset password POST route
app.post('/auth/reset-password', authLimiter, async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;
        
        if (!token || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }
        
        const result = await authService.resetPassword(token, password);
        
        if (result.success) {
            console.log('✅ Password reset completed successfully');
        }
        
        res.json(result);
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Registration disabled - Users managed via admin setup only
app.get('/register', (req, res) => {
    res.status(403).render('error', { 
        title: 'Registration Disabled - Partner Dashboard',
        message: 'User registration is disabled. Please contact an administrator to create an account.',
        error: {
            status: 403,
            stack: 'User accounts are managed by administrators only. Use the setup-admin.js script to create admin accounts.'
        }
    });
});

// Registration POST route - DISABLED
app.post('/auth/register', authLimiter, async (req, res) => {
    res.status(403).json({
        success: false,
        message: 'User registration is disabled. Please contact an administrator.',
        error: 'Registration functionality has been disabled for security. Admin accounts must be created via terminal.'
    });
});

// Temporarily change the dashboard route to bypass auth:

app.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Dashboard route hit WITH AUTH');
        console.log('🔍 User from token:', req.user);
        console.log('🔍 Cookies:', req.cookies);
        
        const [partners, financialData, externalPartners, stats] = await Promise.all([
            databaseService.getPartners(),
            databaseService.getFinancialData(),
            databaseService.getExternalPartners(),
            databaseService.getDashboardStats()
        ]);

        res.render('dashboard', { 
            title: 'Partner Management Dashboard',
            pageTitle: 'Dashboard Overview',
            pageSubtitle: 'Real-time partner and contract management',
            user: req.user,
            data: {
                masterRegister: partners.map(p => p.getSummary()),
                financialSummary: financialData.map(f => f.getSummary()),
                externalPartners: externalPartners.map(ep => ep.getSummary()),
                stats
            },
            jsData: {
                partners: partners,
                financial: financialData,
                external: externalPartners,
                stats
            },
            additionalJS: ['/js/dashboard.js']
        });
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        res.render('error', { error });
    }
});

// Admin User Management Routes
app.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('🔍 Admin users route hit');
        console.log('🔍 User accessing admin panel:', req.user.email);
        
        // Get all users from database
        const users = await databaseService.prisma.users.findMany({
            select: {
                id: true,
                uuid: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                twoFactorEnabled: true,
                createdAt: true,
                lastLogin: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log('🔍 Found users:', users.length);

        res.render('admin-users', {
            users: users,
            user: req.user,
            message: req.query.message || null,
            error: req.query.error || null,
            title: 'User Management - Partner Dashboard'
        });

    } catch (error) {
        console.error('❌ Error in admin users route:', error);
        res.status(500).render('error', {
            error: {
                message: 'Failed to load users',
                stack: error.stack
            },
            user: req.user
        });
    }
});

// Add user route
app.post('/admin/users/add', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { fullName, username, email, password, role } = req.body;
        
        console.log('🔍 Adding new user:', { fullName, username, email, role });

        // Check if user already exists
        const existingUser = await databaseService.prisma.users.findFirst({
            where: {
                OR: [
                    { username: username },
                    { email: email }
                ]
            }
        });

        if (existingUser) {
            return res.redirect('/admin/users?error=User with this username or email already exists');
        }

        // Create user using AuthService
        const authService = new (require('./services/AuthService'))();
        const newUser = await authService.createUser({
            fullName,
            username,
            email,
            password,
            role
        });

        console.log('✅ User created successfully:', newUser.id);
        res.redirect('/admin/users?message=User created successfully');

    } catch (error) {
        console.error('❌ Error creating user:', error);
        res.redirect('/admin/users?error=Failed to create user: ' + error.message);
    }
});

// Toggle user role
app.post('/admin/users/:id/toggle-role', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await databaseService.prisma.users.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.redirect('/admin/users?error=User not found');
        }

        // Protect super admin
        if (user.email === 'daniel.bn1800@gmail.com' && user.username === 'Super user') {
            return res.redirect('/admin/users?error=Cannot modify Super Admin');
        }

        // Check if this is the last admin
        if (user.role === 'admin') {
            const adminCount = await databaseService.prisma.users.count({
                where: { 
                    role: 'admin',
                    isActive: true 
                }
            });

            if (adminCount <= 1) {
                return res.redirect('/admin/users?error=Cannot demote the last admin');
            }
        }

        const newRole = user.role === 'admin' ? 'user' : 'admin';
        
        await databaseService.prisma.users.update({
            where: { id: userId },
            data: { role: newRole }
        });

        console.log(`✅ User role changed: ${user.email} -> ${newRole}`);
        res.redirect('/admin/users?message=User role updated successfully');

    } catch (error) {
        console.error('❌ Error toggling user role:', error);
        res.redirect('/admin/users?error=Failed to update user role');
    }
});

// Toggle user status
app.post('/admin/users/:id/toggle-status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await databaseService.prisma.users.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.redirect('/admin/users?error=User not found');
        }

        // Protect super admin
        if (user.email === 'daniel.bn1800@gmail.com' && user.username === 'Super user') {
            return res.redirect('/admin/users?error=Cannot modify Super Admin');
        }

        // Check if this is the last active admin
        if (user.role === 'admin' && user.isActive) {
            const activeAdminCount = await databaseService.prisma.users.count({
                where: { 
                    role: 'admin',
                    isActive: true 
                }
            });

            if (activeAdminCount <= 1) {
                return res.redirect('/admin/users?error=Cannot deactivate the last admin');
            }
        }

        const newStatus = !user.isActive;
        
        await databaseService.prisma.users.update({
            where: { id: userId },
            data: { isActive: newStatus }
        });

        console.log(`✅ User status changed: ${user.email} -> ${newStatus ? 'active' : 'inactive'}`);
        res.redirect('/admin/users?message=User status updated successfully');

    } catch (error) {
        console.error('❌ Error toggling user status:', error);
        res.redirect('/admin/users?error=Failed to update user status');
    }
});

// Master Partner Register route (fixed: use databaseService directly)
app.get('/master-register', async (req, res) => {
    try {
        // Use your DatabaseService API (adjust method names if different)
        const partners = await databaseService.getPartners();
        const stats = await databaseService.getDashboardStats().catch(() => ({}));
        const total = Array.isArray(partners) ? partners.length : 0;

        // normalize partners to plain objects if using ORM instances
        const partnersPlain = (partners || []).map(p => (p && p.toJSON) ? p.toJSON() : p);

        res.render('master-register', {
            title: 'Master Partner Register - Partner Dashboard',
            partners: partnersPlain,
            stats,
            total
        });
    } catch (err) {
        console.error('Error rendering master-register:', err);
        res.render('master-register', { title: 'Master Partner Register - Partner Dashboard', partners: [], stats: {}, total: 0, error: err.message });
    }
});

// Financial Summary route
app.get('/financial-summary', authenticateToken, async (req, res) => {
    try {
        const [financialData, stats] = await Promise.all([
            databaseService.getFinancialData(),
            databaseService.getDashboardStats()
        ]);

        res.render('financial-summary', { 
            title: 'Financial Summary',
            pageTitle: 'Financial Summary',
            pageSubtitle: 'Real-time partner and contract management',
            data: {
                financial: financialData.map(f => f.getSummary()),
                stats
            },
            jsData: {
                financial: financialData,
                stats
            },
            additionalCSS: ['/css/financial-summary.css'],
            additionalJS: ['/js/financial-summary.js']
        });
    } catch (error) {
        console.error('Error loading financial summary:', error);
        res.render('error', { error });
    }
});

// Deliverables Tracker route
app.get('/deliverables-tracker', authenticateToken, async (req, res) => {
    try {
        // Adjust method name if your DatabaseService API differs
        const deliverables = (await databaseService.getDeliverables()) || [];

        console.log('🔍 DatabaseService: Found deliverables', deliverables.length);
        if (deliverables.length) console.log('🔍 Sample deliverable:', deliverables[0]);

        const total = deliverables.length;
        const pending = deliverables.filter(d => String(d.status || '').toLowerCase() === 'pending').length;
        const approved = deliverables.filter(d => String(d.status || '').toLowerCase() === 'approved').length;
        const overdue = deliverables.filter(d => String(d.status || '').toLowerCase() === 'overdue').length;
        const totalPayment = deliverables.reduce((acc, d) => {
            const v = typeof d.paymentAmount === 'number' ? d.paymentAmount :
                      (d.paymentAmount ? Number(String(d.paymentAmount).replace(/[^\d.-]/g, '')) : 0);
            return acc + (Number.isFinite(v) ? v : 0);
        }, 0);

        const stats = { total, pending, approved, overdue, totalPayment };

        res.render('deliverables-tracker', {
            title: 'Deliverables Tracker - Partner Dashboard',
            data: { deliverables },
            jsData: { deliverables, stats },
            additionalJS: ['/js/deliverables-tracker.js']
        });
    } catch (err) {
        console.error('Error loading deliverables tracker:', err);
        res.render('deliverables-tracker', {
            title: 'Deliverables Tracker - Partner Dashboard',
            data: { deliverables: [] },
            jsData: { deliverables: [], stats: {} },
            additionalJS: ['/js/deliverables-tracker.js'],
            error: err.message
        });
    }
});

// Deliverable Form Routes
app.get('/forms/deliverable', authenticateToken, async (req, res) => {
    try {
        // fetch partners from your service (adjust method names if different)
        const rawPartners = await (databaseService && typeof databaseService.getPartners === 'function'
            ? databaseService.getPartners()
            : Promise.resolve([]));
        const rawExternal = await (databaseService && typeof databaseService.getExternalPartners === 'function'
            ? databaseService.getExternalPartners()
            : Promise.resolve([]));

        // normalize shapes the view expects
        const partners = (rawPartners || []).map(p => ({
            id: p.id || p.partnerId || p.uuid || '',
            name: p.name || p.partnerName || p.displayName || ''
        })).filter(p => p.id);

        const externalPartners = (rawExternal || []).map(p => ({
            id: p.id || p.partnerId || p.uuid || '',
            partnerName: p.partnerName || p.name || p.displayName || ''
        })).filter(p => p.id);

        const data = { partners, externalPartners };

        res.render('forms/deliverable', {
            title: 'Add Deliverable - Partner Dashboard',
            data,
            deliverable: null,
            jsData: { partners, externalPartners }
        });
    } catch (err) {
        console.error('Error rendering deliverable form:', err);
        res.status(500).render('forms/deliverable', {
            title: 'Add Deliverable - Partner Dashboard',
            data: { partners: [], externalPartners: [] },
            deliverable: null,
            jsData: { partners: [], externalPartners: [] },
            error: err.message
        });
    }
});

app.post('/forms/deliverable', authenticateToken, async (req, res) => {
    try {
        const body = Object.assign({}, req.body || {});
        // normalize incoming fields
        const payload = {
            partnerId: body.partnerId || body.partner || null,
            partnerName: body.partnerName || null,
            deliverableNumber: body.deliverableNumber || body.deliverableNo || body.number || null,
            description: body.description || null,
            milestoneDate: body.milestoneDate || body.dueDate || null,
            status: body.status || 'pending',
            actualSubmission: body.actualSubmission || null,
            approvalDate: body.approvalDate || null,
            paymentPercentage: body.paymentPercentage || null,
            paymentAmount: body.paymentAmount || null,
            paymentStatus: body.paymentStatus || null,
            assignedTo: body.assignedTo || null,
            priority: body.priority || null,
            createdAt: new Date()
        };

        let created = null;
        // prefer DatabaseService create API
        if (databaseService && typeof databaseService.createDeliverable === 'function') {
            created = await databaseService.createDeliverable(payload);
        } else if (databaseService && databaseService.prisma) {
            // try common prisma model names
            if (databaseService.prisma.deliverables) {
                created = await databaseService.prisma.deliverables.create({ data: payload });
            } else if (databaseService.prisma.deliverable) {
                created = await databaseService.prisma.deliverable.create({ data: payload });
            } else {
                throw new Error('No deliverable API found on databaseService/prisma');
            }
        } else {
            throw new Error('No databaseService available to persist deliverable');
        }

        // respond JSON for AJAX requests
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, deliverable: created });
        }
        // otherwise redirect back to tracker
        return res.redirect('/deliverables-tracker');
    } catch (err) {
        console.error('Error creating deliverable:', err);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: err.message });
        }
        return res.status(500).render('forms/deliverable', { title: 'Add Deliverable', partners: [], jsData: {}, error: err.message });
    }
});

// Compliance form route
app.get('/forms/compliance', authenticateToken, async (req, res) => {
    try {
        const [partners, externalPartners] = await Promise.all([
            databaseService.getPartners(),
            databaseService.getExternalPartners()
        ]);

        res.render('forms/compliance-form', {
            title: 'Add Compliance Requirement - Partner Dashboard',
            pageTitle: 'Add New Compliance Requirement',
            pageSubtitle: 'Create a new compliance requirement for partners',
            data: {
                partners,
                externalPartners
            },
            additionalCSS: ['/css/forms/deliverable-form.css'],
            additionalJS: ['/js/forms/deliverable-form.js']
        });
    } catch (error) {
        console.error('Error loading compliance form:', error);
        res.render('error', { error });
    }
});

// Compliance form submission
app.post('/api/compliance', authenticateToken, async (req, res) => {
    try {
        // Debugging output
        console.debug('DEBUG /api/compliance req.user:', req.user || null);
        console.debug('DEBUG /api/compliance req.body ->', req.body);
        console.debug('DEBUG /api/compliance cookies ->', req.cookies || null);

        const complianceData = req.body;
        
        const newCompliance = await databaseService.createComplianceRecord(complianceData);
        
        res.redirect('/compliance-reporting?success=created');
    } catch (error) {
        console.error('Error creating compliance record:', error);
        res.render('error', { error });
    }
});

// Compliance & Reporting route
app.get('/compliance-reporting', authenticateToken, async (req, res) => {
    try {
        const [partners, externalPartners, complianceRecords, stats] = await Promise.all([
            databaseService.getPartners(),
            databaseService.getExternalPartners(),
            databaseService.getComplianceRecords(),
            databaseService.getDashboardStats()
        ]);

        // Combine compliance data with partner information
        const enhancedCompliance = complianceRecords.map(record => {
            // Find matching partner from either regular partners or external partners
            let partner = partners.find(p => p.id === record.partnerId);
            let partnerType = 'partner';
            let displayName = record.partnerName;
            
            if (!partner) {
                partner = externalPartners.find(ep => ep.id === record.partnerId);
                partnerType = 'external';
            }

            // For regular partners, use the partnerName as ID and try to get a better display name
            if (partner && partnerType === 'partner') {
                displayName = partner.partnerName; // This is the partner ID like "P-09"
            } else if (partner && partnerType === 'external') {
                displayName = partner.partnerName; // This is the actual name like "OPM"
            }

            return {
                ...record,
                partnerName: displayName,
                partnerType: partnerType,
                partnerId: record.partnerId || record.partnerName || 'N/A'
            };
        });

        res.render('compliance-reporting', { 
            title: 'Compliance & Reporting',
            pageTitle: 'Compliance & Reporting',
            pageSubtitle: 'Monitor partner compliance requirements and audit status',
            query: req.query,
            data: {
                compliance: enhancedCompliance,
                partners,
                externalPartners,
                stats
            },
            jsData: {
                compliance: enhancedCompliance,
                partners,
                externalPartners,
                stats
            },
            additionalCSS: ['/css/compliance-reporting.css'],
            additionalJS: ['/js/compliance-reporting.js']
        });
    } catch (error) {
        console.error('Error loading compliance reporting:', error);
        res.render('error', { error });
    }
});

// Key Personnel route - CORRECTED WITH AUTH
app.get('/key-personnel', authenticateToken, async (req, res) => {
    try {
        const personnel = await databaseService.getPersonnel();
        const partners = await databaseService.getPartners();
        const stats = await databaseService.getDashboardStats().catch(() => ({}));

        res.render('key-personnel', {
            title: 'Key Personnel Directory',
            personnel,
            partners,
            stats,
            jsData: { personnel, partners, stats },
            editMode: false
        });
    } catch (err) {
        console.error('Error loading key-personnel:', err);
        res.render('key-personnel', {
            title: 'Key Personnel Directory',
            personnel: [],
            partners: [],
            stats: {},
            jsData: {}
        });
    }
});

// External Partners route
app.get('/external-partners', async (req, res) => {
    try {
        const [partners, externalPartners, stats] = await Promise.all([
            databaseService.getPartners(),
            databaseService.getExternalPartners(),
            databaseService.getDashboardStats()
        ]);

        // In a real app, you would have a separate external partners service
        // For now, we'll use mock data handled by JavaScript
        res.render('external-partners', { 
            title: 'External Partners Tracker',
            pageTitle: 'External Partners Tracker',
            pageSubtitle: 'Real-time partner and contract management',
            data: {
                externalPartners: externalPartners.map(ep => ep.getSummary()), // Use real data if available
                partners,
                stats
            },
            jsData: {
                externalPartners: externalPartners.map(ep => ep.getSummary()),
                partners: partners.map(p => p.getSummary()),
                stats
            },
            additionalCSS: ['/css/external-partners.css'],
            additionalJS: ['/js/external-partners.js']
        });
    } catch (error) {
        console.error('Error loading external partners:', error);
        res.render('error', { error });
    }
});

// Serve the existing partner dashboard HTML file
app.get('/partner_dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'partner_dashboard.html'));
});

// Serve other static files referenced in the original HTML
app.get('/QUICK_START.md', (req, res) => {
    res.sendFile(path.join(__dirname, 'QUICK_START.md'));
});

app.get('/README.md', (req, res) => {
    res.sendFile(path.join(__dirname, 'README.md'));
});

// API Routes
app.get('/api/partners', async (req, res) => {
    try {
        const partners = await databaseService.getPartners();
        // Handle both objects with getSummary and plain objects
        const response = partners.map(p => p.getSummary ? p.getSummary() : p);
        res.json(response);
    } catch (error) {
        console.error('❌ API partners error:', error);
        res.status(500).json({ error: 'Failed to load partners' });
    }
});

app.get('/api/external-partners', async (req, res) => {
    try {
        const external = await databaseService.getExternalPartners();
        const response = external.map(ep => ep.getSummary ? ep.getSummary() : ep);
        res.json(response);
    } catch (error) {
        console.error('❌ API external partners error:', error);
        res.status(500).json({ error: 'Failed to load external partners' });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const stats = await databaseService.getDashboardStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load statistics' });
    }
});

// Additional API endpoints
app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);
        
        const results = await databaseService.searchPartners(q);
        res.json(results.map(p => p.getSummary()));
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        const health = await databaseService.performHealthCheck();
        res.json(health);
    } catch (error) {
        res.status(500).json({ error: 'Health check failed' });
    }
});

// Get current user information
app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const user = await authService.getUserProfile(req.user.id);
        res.json({ 
            success: true, 
            data: user 
        });
    } catch (error) {
        console.error('User API error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch user information' 
        });
    }
});

// Simple user endpoint (alternative to /api/user)
app.get('/user', authenticateToken, async (req, res) => {
    try {
        const user = await authService.getUserProfile(req.user.id);
        res.json(user);
    } catch (error) {
        console.error('User endpoint error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch user information' 
        });
    }
});

// Test encoding endpoint
app.get('/test-encoding', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Encoding Test</title>
        </head>
        <body>
            <h1>Encoding Test</h1>
            <p>Special characters: !@#$%^&*()</p>
            <p>Emojis: 👥 🛡️ ✅ ❌ 🔐</p>
            <p>Unicode: ⚠️ ℹ️ ✓ ✗</p>
        </body>
        </html>
    `);
});

// Partner Form Routes
app.get('/forms/partner', (req, res) => {
    res.render('forms/partner-form', {
        title: 'Add New Partner',
        pageTitle: 'Add New Partner',
        pageSubtitle: 'Create a comprehensive partner profile',
        mode: 'create',
        partnerId: null,
        additionalCSS: ['/css/forms/partner-form.css'],
        additionalJS: ['/js/forms/partner-form.js']
    });
});

app.get('/forms/partner/:id/edit', async (req, res) => {
    try {
        const partnerId = req.params.id;
        const partner = await databaseService.getPartnerById(partnerId);
        
        if (!partner) {
            return res.status(404).render('404');
        }

        res.render('forms/partner-form', {
            title: 'Edit Partner',
            pageTitle: 'Edit Partner',
            pageSubtitle: `Update ${partner.partnerName || partner.name} profile`,
            editMode: true,
            mode: 'edit',
            partnerId: partnerId,
            partner: partner, // <-- FIX: just use the plain object
            partnerData: partner,
            additionalCSS: ['/css/forms/partner-form.css'],
            additionalJS: ['/js/forms/partner-form.js']
        });
    } catch (error) {
        console.error('Error loading partner for edit:', error);
        res.render('error', { error });
    }
});

// View Partner Details Route
app.get('/forms/partner/:id/view', async (req, res) => {
    try {
        const partnerId = req.params.id;
        const partner = await databaseService.getPartnerById(partnerId);

        if (!partner) {
            return res.status(404).render('404', {
                title: 'Partner Not Found',
                message: 'The requested partner could not be found.'
            });
        }

        res.render('forms/partner-view', {
            title: 'View Partner',
            pageTitle: 'Partner Details',
            pageSubtitle: `Details for ${partner.partnerName || partner.name}`,
            partnerId: partnerId,
            partner: partner,
            partnerData: partner,
            additionalCSS: ['/css/forms/partner-view.css'],
            additionalJS: ['/js/forms/partner-view.js']
        });
    } catch (error) {
        console.error('Error loading partner for view:', error);
        res.render('error', { error });
    }
});

// External Partner Form Routes
app.get('/forms/external-partner', (req, res) => {
    res.render('forms/external-partner-form', {
        title: 'Add New External Partner',
        pageTitle: 'Add New External Partner',
        pageSubtitle: 'Create a new external partnership record',
        mode: 'create',
        partnerId: null,
        additionalCSS: ['/css/forms/external-partner-form.css'],
        additionalJS: ['/js/forms/external-partner-form.js']
    });
});

app.get('/forms/external-partner/:id/edit', async (req, res) => {
    try {
        const partnerId = req.params.id;
        const partner = await databaseService.getExternalPartnerById(partnerId);
        
        if (!partner) {
            return res.status(404).render('404');
        }
        
        res.render('forms/external-partner-form', {
            title: 'Edit External Partner',
            pageTitle: 'Edit External Partner',
            pageSubtitle: `Update ${partner.partnerName} partnership`,
            mode: 'edit',
            partnerId: partnerId,
            partnerData: partner,
            additionalCSS: ['/css/forms/external-partner-form.css'],
            additionalJS: ['/js/forms/external-partner-form.js']
        });
    } catch (error) {
        console.error('Error loading external partner for edit:', error);
        res.render('error', { error });
    }
});

// Partner API Routes
app.post('/api/partners', async (req, res) => {
    try {
        const partnerData = req.body;
        
        // Basic validation
        if (!partnerData.partnerName || !partnerData.partnerType || !partnerData.contactEmail) {
            return res.status(400).json({ 
                error: 'Required fields missing: partnerName, partnerType, contactEmail' 
            });
        }
        
        // Create new partner
        const newPartner = await databaseService.createPartner(partnerData);
        res.status(201).json({ 
            success: true, 
            partner: newPartner, // <-- FIX: do not call .getSummary()
            message: 'Partner created successfully'
        });
    } catch (error) {
        console.error('Error creating partner:', error);
        res.status(500).json({ error: 'Failed to create partner' });
    }
});

app.get('/api/partners/:id', async (req, res) => {
    try {
        const partnerId = req.params.id;
        const partner = await databaseService.getPartnerById(partnerId);
        
        if (!partner) {
            return res.status(404).json({ error: 'Partner not found' });
        }
        
        res.json(partner);
    } catch (error) {
        console.error('Error fetching partner:', error);
        res.status(500).json({ error: 'Failed to fetch partner' });
    }
});

app.put('/api/partners/:id', async (req, res) => {
    try {
        const partnerId = req.params.id;
        const updateData = req.body;
        
        const updatedPartner = await databaseService.updatePartner(partnerId, updateData);
        
        if (!updatedPartner) {
            return res.status(404).json({ error: 'Partner not found' });
        }
        
        res.json({ 
            success: true, 
            partner: updatedPartner, // <-- FIX: do not call .getSummary()
            message: 'Partner updated successfully'
        });
    } catch (error) {
        console.error('Error updating partner:', error);
        res.status(500).json({ error: 'Failed to update partner' });
    }
});

app.delete('/api/partners/:id', async (req, res) => {
    try {
        const partnerId = req.params.id;
        const success = await databaseService.deletePartner(partnerId);
        
        if (!success) {
            return res.status(404).json({ error: 'Partner not found' });
        }
        
        res.json({ 
            success: true,
            message: 'Partner deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting partner:', error);
        res.status(500).json({ error: 'Failed to delete partner' });
    }
});

app.post('/api/partners/draft', async (req, res) => {
    try {
        const draftData = req.body;
        draftData.isDraft = true;
        
        // Save as draft (could be stored in session or temp storage)
        // For now, we'll just acknowledge the draft save
        res.json({ 
            success: true,
            message: 'Draft saved successfully'
        });
    } catch (error) {
        console.error('Error saving draft:', error);
        res.status(500).json({ error: 'Failed to save draft' });
    }
});

// External Partner API Routes
app.post('/api/external-partners', async (req, res) => {
    try {
        const partnerData = req.body;
        
        // Basic validation
        if (!partnerData.partnerName || !partnerData.partnerType || !partnerData.contactEmail) {
            return res.status(400).json({ 
                error: 'Required fields missing: partnerName, partnerType, contactEmail' 
            });
        }
        
        // Create new external partner
        const newPartner = await databaseService.createExternalPartner(partnerData);
        res.status(201).json({ 
            success: true, 
            partner: newPartner.getSummary(),
            message: 'External partner created successfully'
        });
    } catch (error) {
        console.error('Error creating external partner:', error);
        res.status(500).json({ error: 'Failed to create external partner' });
    }
});

app.get('/api/external-partners/:id', async (req, res) => {
    try {
        const partnerId = req.params.id;
        const partner = await databaseService.getExternalPartnerById(partnerId);
        
        if (!partner) {
            return res.status(404).json({ error: 'External partner not found' });
        }
        
        res.json(partner);
    } catch (error) {
        console.error('Error fetching external partner:', error);
        res.status(500).json({ error: 'Failed to fetch external partner' });
    }
});

app.put('/api/external-partners/:id', async (req, res) => {
    try {
        const partnerId = req.params.id;
        const updateData = req.body;
        
        const updatedPartner = await databaseService.updateExternalPartner(partnerId, updateData);
        
        if (!updatedPartner) {
            return res.status(404).json({ error: 'External partner not found' });
        }
        
        res.json({ 
            success: true, 
            partner: updatedPartner.getSummary(),
            message: 'External partner updated successfully'
        });
    } catch (error) {
        console.error('Error updating external partner:', error);
        res.status(500).json({ error: 'Failed to update external partner' });
    }
});

app.delete('/api/external-partners/:id', async (req, res) => {
    try {
        const partnerId = req.params.id;
        const success = await databaseService.deleteExternalPartner(partnerId);
        
        if (!success) {
            return res.status(404).json({ error: 'External partner not found' });
        }
        
        res.json({ 
            success: true,
            message: 'External partner deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting external partner:', error);
        res.status(500).json({ error: 'Failed to delete external partner' });
    }
});

app.post('/api/external-partners/draft', async (req, res) => {
    try {
        const draftData = req.body;
        draftData.isDraft = true;
        
        // Save as draft (could be stored in session or temp storage)
        // For now, we'll just acknowledge the draft save
        res.json({ 
            success: true,
            message: 'Draft saved successfully'
        });
    } catch (error) {
        console.error('Error saving draft:', error);
        res.status(500).json({ error: 'Failed to save draft' });
    }
});

// Personnel Form Routes
app.get('/forms/personnel', async (req, res) => {
    try {
        const [partners, externalPartners] = await Promise.all([
            databaseService.getPartners(),
            databaseService.getExternalPartners()
        ]);

        res.render('forms/personnel-form', {
            title: 'Add New Personnel',
            pageTitle: 'Add New Personnel',
            pageSubtitle: 'Add personnel to the directory',
            mode: 'create',
            editMode: false,
            jsData: {
                partners: partners.map(p => p.getSummary()),
                externalPartners: externalPartners.map(p => p.getSummary())
            },
            additionalCSS: ['/css/forms/personnel-form.css'],
            additionalJS: ['/js/forms/personnel-form.js']
        });
    } catch (error) {
        console.error('Error loading personnel form:', error);
        res.render('error', { error });
    }
});

app.get('/forms/personnel/:id/edit', async (req, res) => {
    try {
        const personnelId = req.params.id;
        const [personnel, partners, externalPartners] = await Promise.all([
            databaseService.getPersonnelById(personnelId),
            databaseService.getPartners(),
            databaseService.getExternalPartners()
        ]);
        
        if (!personnel) {
            return res.status(404).render('404');
        }

        res.render('forms/personnel-form', {
            title: 'Edit Personnel',
            pageTitle: 'Edit Personnel',
            pageSubtitle: `Update ${personnel.fullName} profile`,
            editMode: true,
            mode: 'edit',
            personnelId: personnelId,
            personnel: personnel.getDisplayValues(),
            jsData: {
                partners: partners.map(p => p.getSummary()),
                externalPartners: externalPartners.map(p => p.getSummary())
            },
            additionalCSS: ['/css/forms/personnel-form.css'],
            additionalJS: ['/js/forms/personnel-form.js']
        });
    } catch (error) {
        console.error('Error loading personnel for edit:', error);
        res.render('error', { error });
    }
});

// Personnel API Routes
app.post('/api/personnel', async (req, res) => {
    try {
        const personnelData = req.body;
        
        console.log('Creating personnel with data:', personnelData);
        
        // Basic validation
        if (!personnelData.fullName || !personnelData.jobTitle || !personnelData.emailAddress) {
            return res.status(400).json({ 
                error: 'Required fields missing: fullName, jobTitle, emailAddress' 
            });
        }
        
        if (!personnelData.partnerType || !personnelData.partnerId) {
            return res.status(400).json({ 
                error: 'Partner association required: partnerType and partnerId' 
            });
        }
        
        // Create new personnel
        const newPersonnel = await databaseService.createPersonnel(personnelData);
        res.status(201).json({ 
            success: true, 
            personnel: newPersonnel.getSummary(),
            message: 'Personnel added successfully'
        });
    } catch (error) {
        console.error('Error creating personnel:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to create personnel',
            details: error.stack
        });
    }
});

app.get('/api/personnel/:id', async (req, res) => {
    try {
        const personnelId = req.params.id;
        const personnel = await databaseService.getPersonnelById(personnelId);
        
        if (!personnel) {
            return res.status(404).json({ error: 'Personnel not found' });
        }
        
        res.json({
            success: true,
            personnel: personnel.getDisplayValues()
        });
    } catch (error) {
        console.error('Error fetching personnel:', error);
        res.status(500).json({ error: 'Failed to fetch personnel' });
    }
});

app.put('/api/personnel/:id', async (req, res) => {
    try {
        const personnelId = req.params.id;
        const personnelData = req.body;
        
        console.log('Updating personnel with data:', personnelData);
        
        // Update personnel
        const updatedPersonnel = await databaseService.updatePersonnel(personnelId, personnelData);
        res.json({ 
            success: true, 
            personnel: updatedPersonnel.getSummary(),
            message: 'Personnel updated successfully'
        });
    } catch (error) {
        console.error('Error updating personnel:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to update personnel'
        });
    }
});

app.delete('/api/personnel/:id', async (req, res) => {
    try {
        const personnelId = req.params.id;
        
        await databaseService.deletePersonnel(personnelId);
        res.json({ 
            success: true, 
            message: 'Personnel deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting personnel:', error);
        res.status(500).json({ 
            error: 'Failed to delete personnel'
        });
    }
});

app.get('/api/personnel', async (req, res) => {
    try {
        const { search, partnerType, department, status } = req.query;
        
        let personnel;
        
        if (search) {
            personnel = await databaseService.searchPersonnel(search);
        } else {
            personnel = await databaseService.getPersonnel();
        }
        
        // Apply filters
        if (partnerType) {
            personnel = personnel.filter(p => p.partnerType === partnerType);
        }
        
        if (department) {
            personnel = personnel.filter(p => p.department === department);
        }
        
        if (status) {
            personnel = personnel.filter(p => p.workStatus === status);
        }
        
        res.json({
            success: true,
            personnel: personnel.map(p => p.getSummary()),
            count: personnel.length
        });
    } catch (error) {
        console.error('Error fetching personnel list:', error);
        res.status(500).json({ error: 'Failed to fetch personnel' });
    }
});

// ==================== DELIVERABLE API ====================

// Create new deliverable
app.post('/api/deliverables', async (req, res) => {
    try {
        const Deliverable = require('./models/Deliverable');
        const deliverable = new Deliverable(req.body);
        
        const validation = deliverable.validate();
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
        }
        
        const savedDeliverable = await databaseService.createDeliverable(deliverable.toDatabaseFormat());
        
        res.status(201).json({
            success: true,
            message: 'Deliverable created successfully',
            deliverable: savedDeliverable
        });
    } catch (error) {
        console.error('Error creating deliverable:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create deliverable',
            error: error.message
        });
    }
});

// Get deliverable by ID
app.get('/api/deliverables/:id', async (req, res) => {
    try {
        const deliverable = await databaseService.getDeliverableById(req.params.id);
        
        if (!deliverable) {
            return res.status(404).json({
                success: false,
                message: 'Deliverable not found'
            });
        }
        
        res.json({
            success: true,
            deliverable
        });
    } catch (error) {
        console.error('Error fetching deliverable:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch deliverable'
        });
    }
});

// Update deliverable
app.put('/api/deliverables/:id', async (req, res) => {
    try {
        const Deliverable = require('./models/Deliverable');
        const deliverable = new Deliverable(req.body);
        
        const validation = deliverable.validate();
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
        }
        
        const updatedDeliverable = await databaseService.updateDeliverable(
            req.params.id, 
            deliverable.toDatabaseFormat()
        );
        
        res.json({
            success: true,
            message: 'Deliverable updated successfully',
            deliverable: updatedDeliverable
        });
    } catch (error) {
        console.error('Error updating deliverable:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update deliverable',
            error: error.message
        });
    }
});

// Delete deliverable
app.delete('/api/deliverables/:id', async (req, res) => {
    try {
        await databaseService.deleteDeliverable(req.params.id);
        
        res.json({
            success: true,
            message: 'Deliverable deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting deliverable:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete deliverable'
        });
    }
});

// Get all deliverables with optional filtering
app.get('/api/deliverables', async (req, res) => {
    try {
        const { search, status, priority, partnerId } = req.query;
        
        let deliverables = await databaseService.getDeliverables();
        
        // Apply filters
        if (search) {
            const searchLower = search.toLowerCase();
            deliverables = deliverables.filter(d => 
                d.deliverableName?.toLowerCase().includes(searchLower) ||
                d.partnerName?.toLowerCase().includes(searchLower) ||
                d.description?.toLowerCase().includes(searchLower) ||
                d.assignedTo?.toLowerCase().includes(searchLower)
            );
        }
        
        if (status) {
            deliverables = deliverables.filter(d => d.status === status);
        }
        
        if (priority) {
            deliverables = deliverables.filter(d => d.priority === priority);
        }
        
        if (partnerId) {
            deliverables = deliverables.filter(d => d.partnerId === partnerId);
        }
        
        res.json({
            success: true,
            data: deliverables,
            count: deliverables.length
        });
    } catch (error) {
        console.error('Error fetching deliverables list:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch deliverables' 
        });
    }
});

// Add profile routes
app.use('/profile', require('./routes/profile'));

// Register the key personnel route
app.use('/key-personnel', require('./routes/api/keyPersonnel'));

// Also make sure you have the master register route
app.use('/api/master-register', require('./routes/api/masterRegister'));

// 404 handler
app.use((req, res) => {
    res.status(404).render('404');
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { error: err });
});

// Start server
async function startServer() {
    try {
        // Initialize database connection
        console.log('🔄 Initializing database...');
        const dbConnected = await databaseService.connect();
        
        if (!dbConnected) {
            throw new Error('Failed to connect to database');
        }

        // Check if we need to migrate data from JSON file
        const partners = await databaseService.getPartners();
        if (partners.length === 0) {
            console.log('📦 Database is empty, migrating from JSON file...');
            await dataService.loadData();
            const jsonData = dataService.rawData;
            await databaseService.migrateFromJSON(jsonData);
        }

        // Perform health check
        const health = await databaseService.performHealthCheck();
        console.log(`📊 Database Status: ${health.status}`);
        
        app.listen(PORT, () => {
            console.log(`🚀 Partner Dashboard Server running on http://localhost:${PORT}`);
            console.log(`📊 Dashboard available at http://localhost:${PORT}/dashboard`);
            console.log(`🔌 API endpoints available at http://localhost:${PORT}/api/`);
            console.log(`🔍 Search API at http://localhost:${PORT}/api/search?q=term`);
            console.log(`💚 Health check at http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await databaseService.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    await databaseService.disconnect();
    process.exit(0);
});

// Find a free TCP port between start and end (inclusive).
async function findAvailablePort(start = 2000, end = 3000) {
    for (let port = start; port <= end; port++) {
        const free = await new Promise(resolve => {
            const srv = net.createServer()
                .once('error', () => resolve(false))
                .once('listening', () => {
                    srv.close();
                    resolve(true);
                })
                .listen(port, '0.0.0.0');
        });
        if (free) return port;
    }
    return null;
}

/**
 * Start Express server using:
 * - process.env.PORT if set and available and inside 2000-3000
 * - otherwise pick the first available port in range 2000..3000
 */
async function startServerWithPortRange(app) {
    try {
        let port = null;
        const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : NaN;

        if (!Number.isNaN(envPort) && envPort >= 2000 && envPort <= 3000) {
            // test env port availability
            const ok = await new Promise(resolve => {
                const srv = net.createServer()
                    .once('error', () => resolve(false))
                    .once('listening', () => {
                        srv.close();
                        resolve(true);
                    })
                    .listen(envPort, '0.0.0.0');
            });
            if (ok) {
                port = envPort;
            } else {
                console.warn(`Port ${envPort} from PORT env is in use. Searching 2000-3000.`);
            }
        }

        if (!port) {
            port = await findAvailablePort(2000, 3000);
            if (!port) throw new Error('No available ports found in range 2000-3000');
        }

        process.env.PORT = String(port);
        app.listen(port, () => {
            console.log(`🚀 Partner Dashboard Server running on http://localhost:${port}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

// replace previous direct app.listen(...) call with:
if (process.env.NODE_ENV !== 'test') {
    startServerWithPortRange(app);
} else {
    console.log('⚠️ Skipping startServerWithPortRange in test environment');
}

// JWT Test Route - ADD THIS TEMPORARILY
app.get('/test-jwt', (req, res) => {
    const jwt = require('jsonwebtoken');
    console.log('🧪 Testing JWT generation...');
    console.log('🧪 JWT_SECRET from env:', process.env.JWT_SECRET);
    console.log('🧪 JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
    
    try {
        const testPayload = { 
            test: 'data', 
            timestamp: Date.now(),
            userId: 'test-123'
        };
        
        console.log('🧪 Test payload:', testPayload);
        
        const testToken = jwt.sign(
            testPayload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        console.log('✅ Test token generated successfully');
        console.log('🧪 Token length:', testToken.length);
        console.log('🧪 Token preview:', testToken.substring(0, 50) + '...');
        
        // Try to verify it
        const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
        console.log('✅ Token verified successfully:', decoded);
        
        res.json({ 
            success: true, 
            message: 'JWT working correctly',
            tokenLength: testToken.length,
            decoded: decoded
        });
    } catch (error) {
        console.error('❌ JWT test failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        });
    }
});

app.get('/test-personnel-data', authenticateToken, async (req, res) => {
    try {
        console.log('🧪 Testing personnel data...');
        
        // Direct database query
        const rawPersonnel = await databaseService.prisma.personnel.findMany({
            take: 5 // Just get first 5 for testing
        });
        console.log(`📊 Raw personnel count: ${rawPersonnel.length}`);
        
        // Through service
        const servicePersonnel = await databaseService.getPersonnel();
        console.log(`📊 Service personnel count: ${servicePersonnel.length}`);
        
        // Check partners too
        const partners = await databaseService.prisma.partners.findMany({
            take: 5
        });
        console.log(`📊 Partners count: ${partners.length}`);

        // Test getSummary method
        const personnelSummaries = servicePersonnel.slice(0, 3).map(p => {
            try {
                return p.getSummary ? p.getSummary() : safeGetSummary(p);
            } catch (error) {
                return { error: error.message, original: p };
            }
        });
        
        res.json({
            success: true,
            rawPersonnelCount: rawPersonnel.length,
            servicePersonnelCount: servicePersonnel.length,
            partnersCount: partners.length,
            sampleRawPersonnel: rawPersonnel.slice(0, 2),
            sampleServicePersonnel: personnelSummaries,
            totalInDatabase: {
                partners: await databaseService.prisma.partners.count(),
                personnel: await databaseService.prisma.personnel.count(),
                externalPartners: await databaseService.prisma.external_partners.count()
            }
        });
    } catch (error) {
        console.error('❌ Test failed:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

if (process.env.NODE_ENV !== 'test') {
  (async function bootstrap() {
    const prismaClient = new PrismaClient();
    try {
      await prismaClient.$connect();
      console.log('📚 Database connected successfully');

      // initialize ExcelLoader (it will run importer if files changed)
      ExcelLoader.init({ prisma: prismaClient, databaseService }).then(() => {
        console.log('ExcelLoader: initialized');
        // expose for manual triggers / diagnostics in dev
        try {
          global.excelLoader = ExcelLoader;
          global.excelImporter = ExcelImporter; // fallback to importer module if needed
          console.log('ExcelLoader and ExcelImporter exposed on global for debugging');
        } catch (ex) {
          console.warn('Failed to expose excel loader/importer globals', ex && ex.message);
        }
      }).catch(err => {
        console.warn('ExcelLoader init failed', err && err.message);
      });

      // continue starting express server...
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })();
} else {
  console.log('⚠️ Skipping bootstrap initializer in test environment');
}

// Add a protected manual import endpoint (require admin)
app.post('/api/import/excel', authenticateToken, requireAdmin, async (req, res) => {
    try {
                             if (!global.excelImporter) {
            return res.status(500).json({ success: false, message: 'Importer not initialized' });
        }
        await global.excelImporter._processAllFiles();
        return res.json({ success: true, message: 'Excel import triggered' });
    } catch (err) {
        console.error('Manual excel import failed', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Add dev-only debug endpoint (after bootstrap code)
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug/excel', async (req, res) => {
    try {
      const loaderState = (global.excelLoader && typeof global.excelLoader.get === 'function')
        ? global.excelLoader.get()
        : { message: 'ExcelLoader.get() not available', hasLoader: !!global.excelLoader };

      return res.json({ success: true, loaderState });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // update manual import endpoint to try available importers
  app.post('/api/import/excel', async (req, res) => {
    try {
      const candidate = global.excelImporter || global.excelLoader || ExcelImporter || ExcelLoader;

      // try common method names
      if (candidate && typeof candidate._processAllFiles === 'function') {
        await candidate._processAllFiles();
      } else if (candidate && typeof candidate.processAll === 'function') {
        await candidate.processAll();
      } else if (candidate && typeof candidate.processFile === 'function') {
        // call processFile with no args if it supports that (some importers do)
        await candidate.processFile();
      } else {
        return res.status(500).json({ success: false, message: 'No importer available to trigger' });
      }

      return res.json({ success: true, message: 'Excel import triggered' });
    } catch (err) {
      console.error('Manual excel import failed', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
}

module.exports = app;

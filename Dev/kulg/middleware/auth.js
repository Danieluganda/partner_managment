// Authentication Middleware
const AuthService = require('../services/AuthService');
const jwt = require('jsonwebtoken');

const authService = new AuthService();

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    try {
        console.log('🔍 Auth middleware hit for:', req.url);
        console.log('🔍 Cookies received:', req.cookies);
        
        const token = req.cookies.authToken;
        console.log('🔍 Token from cookie:', token ? 'Present' : 'Missing');
        
        if (!token) {
            console.log('❌ No token found, redirecting to login');
            if (req.path === '/dashboard') {
                return res.redirect('/?error=session_expired');
            }
            return res.redirect('/');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token decoded successfully:', decoded);
        
        const user = await authService.getUserById(decoded.userId);
        console.log('✅ User found:', user ? user.email : 'Not found');
        
        if (!user || !user.isActive) {
            console.log('❌ User not found or inactive');
            res.clearCookie('authToken');
            return res.redirect('/?error=session_expired');
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('❌ Auth middleware error:', error.message);
        res.clearCookie('authToken');
        return res.redirect('/?error=session_expired');
    }
};

// Middleware to check user roles
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                required: allowedRoles,
                current: userRole
            });
        }
        
        next();
    };
};

// Middleware for admin-only routes
const requireAdmin = requireRole('admin');

// Middleware for manager and admin routes
const requireManager = requireRole(['admin', 'manager']);

// Middleware to check if user has 2FA enabled (for sensitive operations)
const require2FA = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        if (!req.user.twoFactorEnabled) {
            return res.status(403).json({ 
                error: '2FA required for this operation',
                message: 'Please enable 2FA to access this feature'
            });
        }
        
        // Check if 2FA was used recently (within last hour)
        const user = await authService.getUserProfile(req.user.id);
        if (!user.lastTwoFactorAuth) {
            return res.status(403).json({ 
                error: '2FA verification required',
                message: 'Please verify with 2FA to continue'
            });
        }
        
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (new Date(user.lastTwoFactorAuth) < oneHourAgo) {
            return res.status(403).json({ 
                error: '2FA verification expired',
                message: 'Please verify with 2FA to continue'
            });
        }
        
        next();
    } catch (error) {
        console.error('2FA check error:', error);
        return res.status(500).json({ error: '2FA verification failed' });
    }
};

// Middleware for optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
            const decoded = authService.verifyToken(token);
            if (decoded) {
                const user = await authService.getUserProfile(decoded.id);
                if (user && user.isActive) {
                    req.user = user;
                }
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

module.exports = {
    authenticateToken,
    requireRole,
    requireAdmin,
    requireManager,
    require2FA,
    optionalAuth,
    authService
};

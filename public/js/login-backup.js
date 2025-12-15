// Login Page JavaScript with 2FA Support
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const emailInput = document.getElementById('email');
    const demoButtons = document.querySelectorAll('.demo-btn');

    // Password visibility toggle
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = this.querySelector('.toggle-icon');
            icon.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    // Demo login functionality
    demoButtons.forEach(button => {
        button.addEventListener('click', function() {
            const role = this.getAttribute('data-role');
            handleDemoLogin(role);
        });
    });

    // Form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const loginData = {
                usernameOrEmail: formData.get('email'), // Keep 'email' for backwards compatibility
                password: formData.get('password'),
                remember: formData.get('remember')
            };
            
            handleLogin(loginData);
        });
    }
    
    // Handle login with 2FA support
    function handleLogin(loginData) {
        if (loginBtn) {
            loginBtn.textContent = 'Signing in...';
            loginBtn.disabled = true;
        }
        
        // Create a form and submit it naturally (let the server handle the redirect)
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/auth/login';
        form.style.display = 'none';
        
        // Add form fields
        const fields = {
            usernameOrEmail: loginData.usernameOrEmail,
            password: loginData.password,
            rememberMe: loginData.remember || false
        };
        
        for (const [name, value] of Object.entries(fields)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            form.appendChild(input);
        }
        
        document.body.appendChild(form);
        form.submit();
    }
    
    // Show 2FA verification form
    function show2FAForm() {
        const loginCard = document.querySelector('.login-card');
        loginCard.innerHTML = `
            <div class="login-header">
                <div class="login-logo">
                    <div class="logo-circle">
                        <span class="logo-icon">🔐</span>
                    </div>
                </div>
                <h1 class="login-title">Two-Factor Authentication</h1>
                <p class="login-subtitle">Enter the 6-digit code from your authenticator app</p>
            </div>
            
            <form id="twoFactorForm" class="login-form">
                <div class="form-group">
                    <label for="twoFactorCode" class="form-label">Authentication Code</label>
                    <input 
                        type="text" 
                        id="twoFactorCode" 
                        name="code" 
                        class="form-input" 
                        placeholder="000000"
                        maxlength="6"
                        pattern="[0-9]{6}"
                        required
                        autocomplete="off"
                    >
                </div>
                
                <button type="submit" id="verify2FABtn" class="btn-primary">
                    Verify Code
                </button>
                
                <div class="backup-codes-section">
                    <button type="button" id="useBackupCodeBtn" class="link-button">
                        Use backup code instead
                    </button>
                </div>
                
                <div class="login-footer">
                    <button type="button" id="backToLoginBtn" class="link-button">
                        ← Back to login
                    </button>
                </div>
            </form>
        `;
        
        // Add event listeners for 2FA form
        setup2FAForm();
    }
    
    // Setup 2FA form event listeners
    function setup2FAForm() {
        const twoFactorForm = document.getElementById('twoFactorForm');
        const verify2FABtn = document.getElementById('verify2FABtn');
        const useBackupCodeBtn = document.getElementById('useBackupCodeBtn');
        const backToLoginBtn = document.getElementById('backToLoginBtn');
        const codeInput = document.getElementById('twoFactorCode');
        
        // Auto-focus on code input
        if (codeInput) {
            codeInput.focus();
            
            // Auto-format input (optional)
            codeInput.addEventListener('input', function() {
                this.value = this.value.replace(/\D/g, '').substring(0, 6);
            });
        }
        
        // Handle 2FA form submission
        if (twoFactorForm) {
            twoFactorForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const code = codeInput.value.trim();
                if (code.length !== 6) {
                    showMessage('Please enter a 6-digit code', 'error');
                    return;
                }
                
                verify2FA(code, false);
            });
        }
        
        // Handle backup code
        if (useBackupCodeBtn) {
            useBackupCodeBtn.addEventListener('click', function() {
                showBackupCodeForm();
            });
        }
        
        // Handle back to login
        if (backToLoginBtn) {
            backToLoginBtn.addEventListener('click', function() {
                location.reload(); // Reload to show login form again
            });
        }
    }
    
    // Show backup code form
    function showBackupCodeForm() {
        const formGroup = document.querySelector('.form-group');
        formGroup.innerHTML = `
            <label for="backupCode" class="form-label">Backup Code</label>
            <input 
                type="text" 
                id="backupCode" 
                name="backupCode" 
                class="form-input" 
                placeholder="Enter 8-character backup code"
                maxlength="8"
                required
                autocomplete="off"
            >
        `;
        
        const backupCodeInput = document.getElementById('backupCode');
        if (backupCodeInput) {
            backupCodeInput.focus();
            
            // Update form submission to handle backup codes
            const twoFactorForm = document.getElementById('twoFactorForm');
            twoFactorForm.onsubmit = function(e) {
                e.preventDefault();
                const backupCode = backupCodeInput.value.trim().toUpperCase();
                if (backupCode.length !== 8) {
                    showMessage('Please enter an 8-character backup code', 'error');
                    return;
                }
                verify2FA(backupCode, true);
            };
        }
    }
    
    // Verify 2FA code or backup code
    function verify2FA(code, useBackupCode = false) {
        const verify2FABtn = document.getElementById('verify2FABtn');
        
        if (verify2FABtn) {
            verify2FABtn.textContent = 'Verifying...';
            verify2FABtn.disabled = true;
        }
        
        fetch('/auth/verify-2fa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                code: code,
                useBackupCode: useBackupCode
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage('Verification successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = data.redirect || '/dashboard';
                }, 1000);
            } else {
                showMessage(data.message || 'Verification failed', 'error');
            }
        })
        .catch(error => {
            console.error('2FA verification error:', error);
            showMessage('Network error. Please try again.', 'error');
        })
        .finally(() => {
            if (verify2FABtn) {
                verify2FABtn.textContent = 'Verify Code';
                verify2FABtn.disabled = false;
            }
        });
    }

    function handleDemoLogin(role) {
        // Set demo credentials based on role
        const credentials = {
            admin: {
                email: 'daniel.bn1800@gmail.com', // Use your actual admin email
                password: 'your-password' // Users will need to enter their actual password
            },
            user: {
                email: 'user@partnerdashboard.com',
                password: 'user123'
            }
        };

        const creds = credentials[role];
        if (creds && role === 'admin') {
            emailInput.value = creds.email;
            passwordInput.focus(); // Let user enter their password
            showMessage(`Admin email filled. Please enter your password.`, 'info');
        } else if (creds) {
            emailInput.value = creds.email;
            passwordInput.value = creds.password;
            
            // Auto-submit after a brief delay
            setTimeout(() => {
                showMessage(`Demo ${role} credentials loaded. Logging in...`, 'info');
                handleLogin({
                    usernameOrEmail: creds.email,
                    password: creds.password
                });
            }, 500);
        }
    }

    // Message display function
    function showMessage(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: var(--spacing-lg, 20px);
            right: var(--spacing-lg, 20px);
            padding: 16px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;

        const colors = {
            error: '#ef4444',
            success: '#10b981',
            info: '#3b82f6'
        };

        const icons = {
            error: '❌',
            success: '✅',
            info: 'ℹ️'
        };

        notification.style.backgroundColor = colors[type] || colors.info;
        notification.innerHTML = `${icons[type]} ${message}`;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // Check if user should be remembered
    const rememberedUser = localStorage.getItem('rememberUser');
    if (rememberedUser && emailInput) {
        emailInput.value = rememberedUser;
        const rememberCheckbox = document.getElementById('remember');
        if (rememberCheckbox) {
            rememberCheckbox.checked = true;
        }
        if (passwordInput) {
            passwordInput.focus();
        }
    }

    // Add slide animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .login-card {
            animation: fadeInUp 0.6s ease;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .link-button {
            background: none;
            border: none;
            color: #3b82f6;
            text-decoration: underline;
            cursor: pointer;
            font-size: 14px;
            margin: 10px 0;
        }
        
        .link-button:hover {
            color: #1d4ed8;
        }
        
        .backup-codes-section {
            text-align: center;
            margin: 15px 0;
        }
        
        .login-footer {
            text-align: center;
            margin-top: 20px;
        }
    `;
    document.head.appendChild(style);
});

// Utility functions
window.authUtils = {
    logout: function() {
        fetch('/auth/logout', { method: 'POST' })
            .then(() => {
                localStorage.removeItem('rememberUser');
                window.location.href = '/';
            })
            .catch(() => {
                // Fallback: redirect anyway
                window.location.href = '/';
            });
    }
};
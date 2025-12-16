document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Simple test login.js loaded');
    
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.action = '/auth/login';
        loginForm.method = 'POST';
        
        console.log('📝 Form found, action set to:', loginForm.action);
        
        loginForm.addEventListener('submit', function(e) {
            console.log(' Form submitting to:', this.action);
            
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.textContent = 'Signing in...';
                loginBtn.disabled = true;
            }
        });
    } else {
        console.log('❌ Login form not found');
    }
    
    console.log('✅ Simple login setup complete');
});

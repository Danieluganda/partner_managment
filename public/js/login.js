document.addEventListener('DOMContentLoaded', function() {
    console.log(' New login.js loaded successfully');
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.action = '/auth/login';
        loginForm.method = 'POST';
        
        loginForm.addEventListener('submit', function(e) {
            console.log(' Form submitting to:', this.action);
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.textContent = 'Signing in...';
                loginBtn.disabled = true;
            }
            // Let form submit naturally
        });
    }
});

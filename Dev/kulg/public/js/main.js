// Main JavaScript for the landing page
document.addEventListener('DOMContentLoaded', function() {
    // Add loading animation to buttons
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Add a subtle loading effect
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });

    // Add fade-in animation to stats
    const stats = document.querySelectorAll('.stat');
    stats.forEach((stat, index) => {
        setTimeout(() => {
            stat.classList.add('fade-in');
        }, index * 100);
    });

    // Fetch and update real-time stats
    async function updateStats() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            
            // Update stat numbers if elements exist
            const totalPartnersElement = document.querySelector('.stat-number');
            if (totalPartnersElement && stats.totalPartners !== undefined) {
                // Animate number counting
                animateNumber(totalPartnersElement, stats.totalPartners);
            }
        } catch (error) {
            console.log('Stats update not available:', error.message);
        }
    }

    // Animate number counting
    function animateNumber(element, targetNumber) {
        const currentNumber = parseInt(element.textContent) || 0;
        const increment = Math.ceil((targetNumber - currentNumber) / 20);
        
        if (currentNumber < targetNumber) {
            element.textContent = Math.min(currentNumber + increment, targetNumber);
            setTimeout(() => animateNumber(element, targetNumber), 50);
        }
    }

    // Test API connectivity
    async function testAPIConnectivity() {
        const endpoints = ['/api/stats', '/api/partners'];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (response.ok) {
                    console.log(`✅ API endpoint ${endpoint} is working`);
                } else {
                    console.log(`⚠️ API endpoint ${endpoint} returned ${response.status}`);
                }
            } catch (error) {
                console.log(`❌ API endpoint ${endpoint} failed:`, error.message);
            }
        }
    }

    // Initialize
    updateStats();
    testAPIConnectivity();
});
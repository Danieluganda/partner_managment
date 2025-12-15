// Dashboard JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize user interface first
    initializeUserInterface();
    
    // Tab Navigation
    const navTabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetView = this.getAttribute('data-tab');
            
            // Update active tab
            navTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update active content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetView) {
                    content.classList.add('active');
                    content.classList.add('fade-in');
                }
            });
        });
    });

    // Initialize Charts if Chart.js is available
    if (typeof Chart !== 'undefined') {
        initializeCharts();
    } else {
        // Create simple charts with CSS
        createSimpleCharts();
    }

    // Search and Filter Functionality
    addSearchFilters();
    
    // Real-time updates
    setupRealTimeUpdates();
});

// Create simple visual charts without Chart.js
function createSimpleCharts() {
    const statusChart = document.getElementById('statusChart');
    const regionChart = document.getElementById('regionChart');
    
    if (statusChart && window.dashboardData) {
        // Support both old and new data structure
        const signed = window.dashboardData.masterRegister.filter(p => 
            p.status === 'Signed' || p['Contract Status'] === 'Signed'
        ).length;
        const contracting = window.dashboardData.masterRegister.filter(p => 
            p.status === 'In Contracting' || p['Contract Status'] === 'In Contracting'
        ).length;
        
        if (signed + contracting > 0) {
            statusChart.innerHTML = `
                <div class="simple-chart">
                    <div class="chart-bar signed" style="height: ${(signed / (signed + contracting)) * 100}%">
                        <span>Signed (${signed})</span>
                    </div>
                    <div class="chart-bar contracting" style="height: ${(contracting / (signed + contracting)) * 100}%">
                        <span>Contracting (${contracting})</span>
                    </div>
                </div>
            `;
        } else {
            statusChart.innerHTML = '<div class="no-data">No contract status data available</div>';
        }
    }
    
    if (regionChart && window.dashboardData) {
        const regions = {};
        window.dashboardData.masterRegister.forEach(partner => {
            const region = partner.regions || partner['Regions of Operation'] || '';
            if (region && region !== '-' && region !== '') {
                const regionArray = Array.isArray(region) ? region : region.split(',');
                regionArray.forEach(r => {
                    const regionKey = r.trim();
                    if (regionKey) {
                        regions[regionKey] = (regions[regionKey] || 0) + 1;
                    }
                });
            }
        });
        
        const regionEntries = Object.entries(regions);
        if (regionEntries.length > 0) {
            let chartHTML = '<div class="simple-chart">';
            const maxCount = Math.max(...Object.values(regions));
            
            regionEntries.slice(0, 5).forEach(([region, count]) => {
                chartHTML += `
                    <div class="chart-bar region" style="height: ${(count / maxCount) * 100}%">
                        <span>${region} (${count})</span>
                    </div>
                `;
            });
            
            chartHTML += '</div>';
            regionChart.innerHTML = chartHTML;
        } else {
            regionChart.innerHTML = '<div class="no-data">No region data available</div>';
        }
    }
    
    // Add CSS for simple charts
    const style = document.createElement('style');
    style.textContent = `
        .simple-chart {
            display: flex;
            align-items: end;
            justify-content: space-around;
            height: 200px;
            padding: 1rem 0;
        }
        .chart-bar {
            background: linear-gradient(135deg, #2563eb, #1e40af);
            border-radius: 4px 4px 0 0;
            min-height: 20px;
            width: 60px;
            display: flex;
            align-items: end;
            justify-content: center;
            position: relative;
            transition: all 0.3s ease;
        }
        .chart-bar:hover {
            background: linear-gradient(135deg, #1e40af, #1e3a8a);
        }
        .chart-bar.contracting {
            background: linear-gradient(135deg, #f59e0b, #d97706);
        }
        .chart-bar.region {
            background: linear-gradient(135deg, #10b981, #059669);
        }
        .chart-bar span {
            color: white;
            font-size: 0.75rem;
            padding: 0.25rem;
            writing-mode: vertical-lr;
            text-orientation: mixed;
        }
    `;
    document.head.appendChild(style);
}

// Initialize Chart.js charts
function initializeCharts() {
    if (!window.dashboardData) return;
    
    const ctx1 = document.getElementById('statusChart');
    const ctx2 = document.getElementById('regionChart');
    
    if (ctx1) {
        const signed = window.dashboardData.masterRegister.filter(p => p['Contract Status'] === 'Signed').length;
        const contracting = window.dashboardData.masterRegister.filter(p => p['Contract Status'] === 'In Contracting').length;
        
        new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['Signed', 'In Contracting'],
                datasets: [{
                    data: [signed, contracting],
                    backgroundColor: ['#10b981', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Add search and filter functionality
function addSearchFilters() {
    const tables = document.querySelectorAll('.data-table');
    
    tables.forEach(table => {
        // Add search input
        const container = table.closest('.table-container');
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search...';
        searchInput.className = 'table-search';
        searchInput.style.cssText = `
            margin: 1rem;
            padding: 0.5rem;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            width: 300px;
        `;
        
        const header = container.querySelector('h2');
        header.parentNode.insertBefore(searchInput, header.nextSibling);
        
        // Add search functionality
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    });
}

// Setup real-time updates
function setupRealTimeUpdates() {
    // Update stats periodically
    setInterval(async () => {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                const stats = await response.json();
                updateStatsDisplay(stats);
            }
        } catch (error) {
            console.log('Stats update failed:', error);
        }
    }, 30000); // Update every 30 seconds
}

// Update stats display
function updateStatsDisplay(stats) {
    const statElements = {
        'total-partners': stats.totalPartners,
        'signed-partners': stats.signedPartners,
        'contracting-partners': stats.inContractingPartners,
        'external-partners': stats.externalPartners
    };
    
    Object.entries(statElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value !== undefined) {
            animateNumber(element, value);
        }
    });
}

// Animate number changes
function animateNumber(element, targetNumber) {
    const currentNumber = parseInt(element.textContent) || 0;
    const difference = targetNumber - currentNumber;
    const duration = 1000; // 1 second
    const steps = 60; // 60 FPS
    const stepValue = difference / steps;
    
    let currentStep = 0;
    const timer = setInterval(() => {
        currentStep++;
        const newValue = Math.round(currentNumber + (stepValue * currentStep));
        element.textContent = newValue;
        
        if (currentStep >= steps) {
            clearInterval(timer);
            element.textContent = targetNumber;
        }
    }, duration / steps);
}

// Initialize user interface
function initializeUserInterface() {
    // Display user email if available
    const userEmailElement = document.getElementById('user-email');
    if (userEmailElement && typeof user !== 'undefined' && user.email) {
        userEmailElement.textContent = user.email;
    }
    
    // Logout button functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                // Call server logout endpoint
                fetch('/auth/logout', { method: 'POST' })
                    .then(() => {
                        window.location.href = '/';
                    })
                    .catch(() => {
                        // Fallback: redirect anyway
                        window.location.href = '/';
                    });
            }
        });
    }
}

// Search functionality
function searchData(query) {
    if (!window.dashboardData) return;

    const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
    const searchQuery = query.toLowerCase();
    
    let dataToSearch = [];
    let tableBodySelector = '';
    
    switch(activeTab) {
        case 'overview':
            // Search across all data
            dataToSearch = [...window.dashboardData.masterRegister, 
                           ...window.dashboardData.financial, 
                           ...window.dashboardData.externalPartners];
            tableBodySelector = '.overview-table tbody';
            break;
        case 'partners':
            dataToSearch = window.dashboardData.masterRegister;
            tableBodySelector = '.partners-table tbody';
            break;
        case 'financial':
            dataToSearch = window.dashboardData.financial;
            tableBodySelector = '.financial-table tbody';
            break;
        case 'external':
            dataToSearch = window.dashboardData.externalPartners;
            tableBodySelector = '.external-table tbody';
            break;
    }
    
    const filteredData = dataToSearch.filter(item => {
        // Search across all fields in the item, supporting both old and new field names
        const searchFields = Object.values(item).join(' ').toLowerCase();
        return searchFields.includes(searchQuery);
    });
    
    // Update the appropriate table with filtered results
    const tableBody = document.querySelector(tableBodySelector);
    if (tableBody) {
        updateTableBody(tableBody, filteredData, activeTab);
    }
}

function updateTableBody(tableBody, data, tabType) {
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No results found</td></tr>';
        return;
    }
    
    let html = '';
    
    switch(tabType) {
        case 'partners':
            data.forEach(partner => {
                html += `
                    <tr>
                        <td>${partner.partnerName || partner['Partner Name'] || 'N/A'}</td>
                        <td>${partner.sector || partner['Sector'] || 'N/A'}</td>
                        <td>${partner.status || partner['Contract Status'] || 'N/A'}</td>
                        <td>${partner.regions || partner['Regions of Operation'] || 'N/A'}</td>
                        <td>${new Date(partner.updatedAt || partner['Last Updated'] || Date.now()).toLocaleDateString()}</td>
                    </tr>
                `;
            });
            break;
        case 'financial':
            data.forEach(item => {
                html += `
                    <tr>
                        <td>${item.partner || item['Partner'] || 'N/A'}</td>
                        <td>${item.budgetAllocated || item['Budget Allocated'] || 'N/A'}</td>
                        <td>${item.expenditure || item['Expenditure'] || 'N/A'}</td>
                        <td>${item.remaining || item['Remaining'] || 'N/A'}</td>
                        <td>${item.quarter || item['Quarter'] || 'N/A'}</td>
                    </tr>
                `;
            });
            break;
        case 'external':
            data.forEach(partner => {
                html += `
                    <tr>
                        <td>${partner.externalPartnerName || partner['External Partner Name'] || 'N/A'}</td>
                        <td>${partner.type || partner['Type'] || 'N/A'}</td>
                        <td>${partner.engagementLevel || partner['Engagement Level'] || 'N/A'}</td>
                        <td>${partner.status || partner['Status'] || 'N/A'}</td>
                        <td>${new Date(partner.updatedAt || partner['Last Updated'] || Date.now()).toLocaleDateString()}</td>
                    </tr>
                `;
            });
            break;
        default:
            data.slice(0, 10).forEach(item => {
                const name = item.partnerName || item.externalPartnerName || item['Partner Name'] || item['External Partner Name'] || item.partner || item['Partner'] || 'N/A';
                const type = item.sector || item.type || item['Sector'] || item['Type'] || 'Partner';
                const status = item.status || item['Status'] || item['Contract Status'] || 'N/A';
                html += `
                    <tr>
                        <td>${name}</td>
                        <td>${type}</td>
                        <td>${status}</td>
                        <td>Mixed Data</td>
                        <td>${new Date(item.updatedAt || item['Last Updated'] || Date.now()).toLocaleDateString()}</td>
                    </tr>
                `;
            });
    }
    
    tableBody.innerHTML = html;
}

// Export functions for global use
window.dashboardUtils = {
    animateNumber,
    updateStatsDisplay,
    initializeUserInterface,
    searchData,
    updateTableBody
};
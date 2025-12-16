// Dashboard Data
let dashboardData = {
    masterRegister: [],
    financialSummary: [],
    keyPersonnel: [],
    deliverables: [],
    compliance: [],
    externalPartners: []
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupEventListeners();
});

// Load Data from JSON
async function loadData() {
    try {
        const response = await fetch('dashboard_data.json');
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        dashboardData = await response.json();
        
        console.log('Data loaded successfully', dashboardData);
        
        // Initialize all views
        updateOverview();
        renderMasterTable();
        renderFinancialTable();
        renderDeliverablesTable();
        renderComplianceTable();
        renderPersonnelCards();
        renderExternalPartnersTable();
        
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Note: Could not load data file. Make sure dashboard_data.json is in the same folder as this HTML file.');
        // Use sample data if file not found
        useSampleData();
    }
}

// Use Sample Data (for demo purposes)
function useSampleData() {
    dashboardData = {
        masterRegister: [
            {
                'Partner ID': 'P-01',
                'Partner Name': 'THE PRIVATE EDUCATION DEVELOPMENT NETWORK LIMITED',
                'Contract Status': 'Signed',
                'Framework Agreement Date': '2025-05-14',
                'Commencement Date': '2025-05-14',
                'Term (Years)': '3',
                'Current Task Order': 'Year 1: May-25 to May-26',
                'Regions of Operation': 'Busia, Tororo, Pallisa, Bulambuli, Kapchorwa, Mbale, Sironko',
                'Key Personnel': 'Mutumba Irene Josephine',
                'Task Order Price (Y1)': 'UGX 748,694,200'
            }
        ],
        financialSummary: [
            {
                'Partner ID': 'P-01',
                'Partner Name': 'PEDN',
                'Total Task Order Price': 'UGX 748,694,200',
                'Q1 Actual Paid': null,
                'Q2 Actual Paid': null,
                'Q3 Actual Paid': null,
                'Q4 Actual Paid': null,
                'Total Disbursed': null,
                'Utilization Rate': 0.4
            }
        ],
        deliverables: [],
        compliance: [],
        keyPersonnel: [],
        externalPartners: []
    };
    
    updateOverview();
    renderMasterTable();
    renderFinancialTable();
    renderExternalPartnersTable();
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            switchView(this.dataset.view);
        });
    });
    
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', loadData);
    
    // Search functionality
    document.getElementById('search-input').addEventListener('input', function(e) {
        globalSearch(e.target.value);
    });
    
    // Table searches
    setupTableSearch('master-search', 'master-tbody');
    setupTableSearch('financial-search', 'financial-tbody');
    setupTableSearch('deliverables-search', 'deliverables-tbody');
    setupTableSearch('compliance-search', 'compliance-tbody');
    setupTableSearch('personnel-search', 'personnel-grid');
    setupTableSearch('external-search', 'external-tbody');
}

// Switch View
function switchView(viewName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show selected view
    const viewMap = {
        'overview': 'overview-view',
        'master': 'master-view',
        'financial': 'financial-view',
        'deliverables': 'deliverables-view',
        'compliance': 'compliance-view',
        'personnel': 'personnel-view',
        'external': 'external-view'
    };
    
    document.getElementById(viewMap[viewName]).classList.add('active');
    
    // Update page title
    const titles = {
        'overview': 'Dashboard Overview',
        'master': 'Master Partner Register',
        'financial': 'Financial Summary',
        'deliverables': 'Deliverables Tracker',
        'compliance': 'Compliance & Reporting',
        'personnel': 'Key Personnel Directory',
        'external': 'External Partners Tracker'
    };
    
    document.getElementById('page-title').textContent = titles[viewName];
}

// Update Overview Statistics
function updateOverview() {
    const partners = dashboardData.masterRegister;
    const financial = dashboardData.financialSummary;
    const external = dashboardData.externalPartners || [];
    
    // Total Partners
    document.getElementById('total-partners').textContent = partners.length;
    
    // External Partners Count
    document.getElementById('external-partners-count').textContent = external.length;
    
    // Active Contracts
    const activeContracts = partners.filter(p => p['Contract Status'] === 'Signed').length;
    document.getElementById('active-contracts').textContent = activeContracts;
    
    // Total Budget
    let totalBudget = 0;
    financial.forEach(f => {
        const price = parseFloat((f['Total Task Order Price'] || '').replace(/[^0-9.]/g, '')) || 0;
        totalBudget += price;
    });
    document.getElementById('total-budget').textContent = formatCurrency(totalBudget);
    
    // Render recent partners
    renderRecentPartners();
}

// Render Recent Partners
function renderRecentPartners() {
    const container = document.getElementById('recent-partners-list');
    const partners = dashboardData.masterRegister.slice(0, 5);
    
    container.innerHTML = partners.map(partner => `
        <div class="partner-item">
            <div class="partner-item-left">
                <h4>${partner['Partner Name'] || 'N/A'}</h4>
                <p>${partner['Partner ID']} • ${partner['Regions of Operation'] || 'N/A'}</p>
            </div>
            <div class="partner-item-right">
                <div class="partner-amount">${partner['Task Order Price (Y1)'] || 'N/A'}</div>
                <span class="badge badge-${(partner['Contract Status'] || '').toLowerCase()}">${partner['Contract Status'] || 'N/A'}</span>
            </div>
        </div>
    `).join('');
}

// Render Master Register Table
function renderMasterTable() {
    const tbody = document.getElementById('master-tbody');
    const data = dashboardData.masterRegister;
    
    tbody.innerHTML = data.map(row => `
        <tr>
            <td><strong>${row['Partner ID'] || 'N/A'}</strong></td>
            <td>${row['Partner Name'] || 'N/A'}</td>
            <td><span class="badge badge-${(row['Contract Status'] || '').toLowerCase()}">${row['Contract Status'] || 'N/A'}</span></td>
            <td>${formatDate(row['Framework Agreement Date'])}</td>
            <td>${formatDate(row['Commencement Date'])}</td>
            <td>${row['Term (Years)'] || 'N/A'} years</td>
            <td>${row['Current Task Order'] || 'N/A'}</td>
            <td>${row['Regions of Operation'] || 'N/A'}</td>
            <td>${row['Key Personnel'] || 'N/A'}</td>
            <td><strong>${row['Task Order Price (Y1)'] || 'N/A'}</strong></td>
            <td><button class="btn-action" onclick="viewPartnerDetails('${row['Partner ID']}')">View</button></td>
        </tr>
    `).join('');
}

// Render Financial Table
function renderFinancialTable() {
    const tbody = document.getElementById('financial-tbody');
    const data = dashboardData.financialSummary;
    
    tbody.innerHTML = data.map(row => `
        <tr>
            <td><strong>${row['Partner ID'] || 'N/A'}</strong></td>
            <td>${row['Partner Name'] || 'N/A'}</td>
            <td><strong>${row['Total Task Order Price'] || 'N/A'}</strong></td>
            <td>${row['Q1 Actual Paid'] || '-'}</td>
            <td>${row['Q2 Actual Paid'] || '-'}</td>
            <td>${row['Q3 Actual Paid'] || '-'}</td>
            <td>${row['Q4 Actual Paid'] || '-'}</td>
            <td>${row['Total Disbursed'] || '-'}</td>
            <td>${row['Utilization Rate'] ? (row['Utilization Rate'] * 100).toFixed(1) + '%' : '-'}</td>
            <td>${row['Comments'] || '-'}</td>
        </tr>
    `).join('');
}

// Render Deliverables Table
function renderDeliverablesTable() {
    const tbody = document.getElementById('deliverables-tbody');
    const data = dashboardData.deliverables;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center">No deliverables data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(row => `
        <tr>
            <td><strong>${row['Partner ID'] || 'N/A'}</strong></td>
            <td>${row['Partner Name'] || 'N/A'}</td>
            <td>${row['Deliverable #'] || 'N/A'}</td>
            <td>${row['Description'] || 'N/A'}</td>
            <td>${formatDate(row['Milestone Date'])}</td>
            <td><span class="badge badge-${(row['Status'] || 'pending').toLowerCase()}">${row['Status'] || 'Pending'}</span></td>
            <td>${formatDate(row['Actual Submission'])}</td>
            <td>${formatDate(row['Approval Date'])}</td>
            <td>${row['% Payment'] || '-'}</td>
            <td>${row['Payment Amount'] || '-'}</td>
            <td><span class="badge badge-${(row['Payment Status'] || 'pending').toLowerCase()}">${row['Payment Status'] || 'Pending'}</span></td>
        </tr>
    `).join('');
}

// Render Compliance Table
function renderComplianceTable() {
    const tbody = document.getElementById('compliance-tbody');
    const data = dashboardData.compliance;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No compliance data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(row => `
        <tr>
            <td><strong>${row['Partner ID'] || 'N/A'}</strong></td>
            <td>${row['Partner Name'] || 'N/A'}</td>
            <td>${row['Requirement'] || 'N/A'}</td>
            <td>${formatDate(row['Due Date'])}</td>
            <td>${row['Reporting Period'] || 'N/A'}</td>
            <td>${formatDate(row['Submission Date'])}</td>
            <td><span class="badge badge-${(row['Status'] || 'pending').toLowerCase()}">${row['Status'] || 'Pending'}</span></td>
            <td>${row['FMCS Audit'] || '-'}</td>
            <td>${row['Notes'] || '-'}</td>
        </tr>
    `).join('');
}

// Render Personnel Cards
function renderPersonnelCards() {
    const container = document.getElementById('personnel-grid');
    const data = dashboardData.keyPersonnel;
    
    if (data.length === 0) {
        container.innerHTML = '<p class="text-center">No personnel data available</p>';
        return;
    }
    
    container.innerHTML = data.map(person => `
        <div class="personnel-card">
            <h4>${person['Name'] || 'N/A'}</h4>
            <p><strong>Partner:</strong> ${person['Partner ID'] || 'N/A'} - ${person['Partner Name'] || 'N/A'}</p>
            <p><strong>Role:</strong> ${person['Contact Type'] || 'N/A'}</p>
            <div class="contact-info">
                <p><strong>📧 Email:</strong> ${person['Email'] || 'N/A'}</p>
                <p><strong>📱 Phone:</strong> ${person['Phone'] || 'N/A'}</p>
                ${person['Notes'] ? `<p><strong>Notes:</strong> ${person['Notes']}</p>` : ''}
            </div>
        </div>
    `).join('');
}

// Setup Table Search
function setupTableSearch(inputId, tableId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const table = document.getElementById(tableId);
        
        if (table.tagName === 'TBODY') {
            const rows = table.getElementsByTagName('tr');
            Array.from(rows).forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        } else {
            // For grid layouts
            const cards = table.children;
            Array.from(cards).forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        }
    });
}

// Global Search
function globalSearch(term) {
    const searchTerm = term.toLowerCase();
    
    if (!searchTerm) {
        renderMasterTable();
        return;
    }
    
    const tbody = document.getElementById('master-tbody');
    const filtered = dashboardData.masterRegister.filter(partner => {
        return Object.values(partner).some(value => 
            String(value).toLowerCase().includes(searchTerm)
        );
    });
    
    tbody.innerHTML = filtered.map(row => `
        <tr>
            <td><strong>${row['Partner ID'] || 'N/A'}</strong></td>
            <td>${row['Partner Name'] || 'N/A'}</td>
            <td><span class="badge badge-${(row['Contract Status'] || '').toLowerCase()}">${row['Contract Status'] || 'N/A'}</span></td>
            <td>${formatDate(row['Framework Agreement Date'])}</td>
            <td>${formatDate(row['Commencement Date'])}</td>
            <td>${row['Term (Years)'] || 'N/A'} years</td>
            <td>${row['Current Task Order'] || 'N/A'}</td>
            <td>${row['Regions of Operation'] || 'N/A'}</td>
            <td>${row['Key Personnel'] || 'N/A'}</td>
            <td><strong>${row['Task Order Price (Y1)'] || 'N/A'}</strong></td>
            <td><button class="btn-action" onclick="viewPartnerDetails('${row['Partner ID']}')">View</button></td>
        </tr>
    `).join('');
    
    // Switch to master view to show results
    document.querySelector('[data-view="master"]').click();
}

// View Partner Details
function viewPartnerDetails(partnerId) {
    const partner = dashboardData.masterRegister.find(p => p['Partner ID'] === partnerId);
    if (partner) {
        alert(`Partner Details:\n\nID: ${partner['Partner ID']}\nName: ${partner['Partner Name']}\nStatus: ${partner['Contract Status']}\nRegions: ${partner['Regions of Operation']}`);
    }
}

// Utility Functions
function formatCurrency(amount) {
    if (!amount) return 'UGX 0';
    return 'UGX ' + amount.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return '-';
    }
}

// Render External Partners Table
function renderExternalPartnersTable() {
    const tbody = document.getElementById('external-tbody');
    const data = dashboardData.externalPartners || [];
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">No external partners data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(row => {
        // Determine status badge class
        let statusBadge = 'badge-pending';
        const status = (row['Status'] || '').toLowerCase();
        if (status.includes('on track')) statusBadge = 'badge-signed';
        else if (status.includes('needs attention')) statusBadge = 'badge-pending';
        else if (status.includes('stalled') || status.includes('blocked')) statusBadge = 'badge-no';
        
        return `
            <tr>
                <td><strong>${row['Partner Name'] || 'N/A'}</strong></td>
                <td>${row['Key Contact & Details'] || 'N/A'}</td>
                <td>${formatDate(row['Date Initiated'])}</td>
                <td>${row['Current Stage'] || 'N/A'}</td>
                <td>${row['Key Objectives / Focus Areas'] || 'N/A'}</td>
                <td><span class="badge ${statusBadge}">${row['Status'] || 'N/A'}</span></td>
                <td>${row['Pending Tasks & Next Steps'] || 'N/A'}</td>
                <td>${row['Responsible Person(s)'] || 'N/A'}</td>
                <td><strong>${row['Deadline'] || 'N/A'}</strong></td>
                <td>${row['Notes & Blockers'] || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Export functionality (placeholder)
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-export')) {
        alert('Export functionality would download the current view as CSV/Excel');
    }
});

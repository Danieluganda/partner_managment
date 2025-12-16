// Key Personnel Directory JavaScript
console.log('Key Personnel Directory script loaded');

// State management
let allPersonnelData = [];
let filteredPersonnelData = [];

// DOM elements
let personnelTable, searchInput, partnerFilter, roleFilter, statusFilter;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Key Personnel page loaded');
    
    // Check if data is available
    const personnelData = window.personnelData || [];
    const partnersData = window.partnersData || [];
    const statsData = window.statsData || {};
    
    console.log('Personnel data:', personnelData.length);
    console.log('Partners data:', partnersData.length);
    
    // Initialize the page
    initializePersonnelTable();
    updateStatistics();
    setupEventListeners();
    
    function initializePersonnelTable() {
        const tbody = document.querySelector('#personnelTable tbody');
        if (!tbody) {
            console.error('Personnel table body not found');
            return;
        }
        
        // Clear existing content
        tbody.innerHTML = '';
        
        if (personnelData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center">
                        <div class="empty-state">
                            <p>No personnel data available</p>
                            <a href="/forms/personnel" class="btn btn-primary">Add First Personnel</a>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Populate table with personnel data
        personnelData.forEach(person => {
            const row = createPersonnelRow(person);
            tbody.appendChild(row);
        });
        
        console.log(`Loaded ${personnelData.length} personnel records`);
    }
    
    function createPersonnelRow(person) {
        const row = document.createElement('tr');
        row.dataset.personnelId = person.id;
        
        // Get partner name
        const partnerName = person.partnerName || 'Unknown Partner';
        
        row.innerHTML = `
            <td>${person.partnerId || person.id || 'N/A'}</td>
            <td>
                <div class="partner-info">
                    <span class="partner-name">${partnerName}</span>
                    ${person.partnerType ? `<span class="partner-type badge badge-info">${person.partnerType}</span>` : ''}
                </div>
            </td>
            <td>
                <div class="personnel-info">
                    <span class="personnel-name">${person.fullName || person.name || 'Unknown'}</span>
                    ${person.seniority ? `<span class="seniority">${person.seniority}</span>` : ''}
                </div>
            </td>
            <td>${person.jobTitle || 'Not specified'}</td>
            <td>${person.department || 'Not specified'}</td>
            <td>
                <a href="mailto:${person.emailAddress || person.email || ''}" class="email-link">
                    ${person.emailAddress || person.email || 'No email'}
                </a>
            </td>
            <td>
                ${person.phoneNumber || person.phone ? 
                    `<a href="tel:${person.phoneNumber || person.phone}" class="phone-link">${person.phoneNumber || person.phone}</a>` : 
                    'No phone'
                }
            </td>
            <td>
                <span class="status-badge ${getStatusClass(person.workStatus || person.status)}">
                    ${person.workStatus || person.status || 'Unknown'}
                </span>
            </td>
            <td>${formatDate(person.updatedAt || person.lastContact) || 'Never'}</td>
            <td class="actions-cell">
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="viewPersonnel('${person.id}')">
                        <span class="icon">👁️</span>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="editPersonnel('${person.id}')">
                        <span class="icon">✏️</span>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deletePersonnel('${person.id}')">
                        <span class="icon">🗑️</span>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }
    
    function getStatusClass(status) {
        if (!status) return 'badge-secondary';
        
        const statusLower = status.toLowerCase();
        switch (statusLower) {
            case 'active': return 'badge-success';
            case 'inactive': return 'badge-danger';
            case 'on leave': return 'badge-warning';
            case 'terminated': return 'badge-danger';
            default: return 'badge-secondary';
        }
    }
    
    function formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }
    
    function updateStatistics() {
        // Update stat cards
        document.getElementById('totalPersonnel').textContent = personnelData.length;
        
        const activePersonnel = personnelData.filter(p => 
            (p.workStatus || p.status || '').toLowerCase() === 'active'
        ).length;
        
        const uniquePartners = new Set(personnelData.map(p => p.partnerId || p.partnerName)).size;
        
        document.getElementById('activePartners').textContent = uniquePartners;
        document.getElementById('keyContacts').textContent = activePersonnel;
        document.getElementById('verifiedContacts').textContent = personnelData.filter(p => 
            (p.emailAddress || p.email) && (p.phoneNumber || p.phone)
        ).length;
        
        // Update footer stats
        document.getElementById('showingPersonnelCount').textContent = personnelData.length;
        document.getElementById('totalPersonnelCount').textContent = personnelData.length;
        document.getElementById('footerActiveCount').textContent = activePersonnel;
        document.getElementById('footerKeyContactCount').textContent = activePersonnel;
        document.getElementById('footerResponseRate').textContent = '85%'; // Placeholder
    }
    
    function setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('personnelSearch');
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
        
        // Quick search
        const quickSearch = document.getElementById('quickPersonnelSearch');
        if (quickSearch) {
            quickSearch.addEventListener('input', handleSearch);
        }
        
        // Filter functionality
        const filters = ['partnerPersonnelFilter', 'rolePersonnelFilter', 'statusPersonnelFilter'];
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', handleFiltering);
            }
        });
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshPersonnelBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }
    
    function handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const rows = document.querySelectorAll('#personnelTable tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const isVisible = text.includes(searchTerm);
            row.style.display = isVisible ? '' : 'none';
        });
        
        updateVisibleCount();
    }
    
    function handleFiltering() {
        const partnerFilter = document.getElementById('partnerPersonnelFilter').value;
        const roleFilter = document.getElementById('rolePersonnelFilter').value;
        const statusFilter = document.getElementById('statusPersonnelFilter').value;
        
        const rows = document.querySelectorAll('#personnelTable tbody tr');
        
        rows.forEach(row => {
            const personnelId = row.dataset.personnelId;
            const person = personnelData.find(p => p.id === personnelId);
            
            if (!person) return;
            
            let isVisible = true;
            
            // Partner filter
            if (partnerFilter && person.partnerId !== partnerFilter) {
                isVisible = false;
            }
            
            // Role filter
            if (roleFilter && person.jobTitle !== roleFilter) {
                isVisible = false;
            }
            
            // Status filter
            if (statusFilter && (person.workStatus || person.status) !== statusFilter) {
                isVisible = false;
            }
            
            row.style.display = isVisible ? '' : 'none';
        });
        
        updateVisibleCount();
    }
    
    function updateVisibleCount() {
        const visibleRows = document.querySelectorAll('#personnelTable tbody tr:not([style*="display: none"])').length;
        document.getElementById('showingPersonnelCount').textContent = visibleRows;
    }
    
    // Global functions for actions
    window.viewPersonnel = function(personnelId) {
        const person = personnelData.find(p => p.id === personnelId);
        if (person) {
            // Create a modal or redirect to view page
            alert(`Viewing personnel: ${person.fullName || person.name}`);
            // TODO: Implement proper view modal
        }
    };
    
    window.editPersonnel = function(personnelId) {
        window.location.href = `/forms/personnel?edit=${personnelId}`;
    };
    
    window.deletePersonnel = function(personnelId) {
        const person = personnelData.find(p => p.id === personnelId);
        if (person && confirm(`Are you sure you want to delete ${person.fullName || person.name}?`)) {
            // TODO: Implement delete functionality
            alert('Delete functionality not yet implemented');
        }
    };
});

// Key Personnel Directory JavaScript
console.log('Key Personnel Directory script loaded');

// State management
let allPersonnelData = [];
let filteredPersonnelData = [];

// DOM elements
let personnelTable, searchInput, partnerFilter, roleFilter, statusFilter;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    initializeElements();
    loadPersonnelData();
    setupEventListeners();
});

// Initialize DOM elements
function initializeElements() {
    personnelTable = document.getElementById('personnelTable');
    searchInput = document.getElementById('personnelSearch');
    partnerFilter = document.getElementById('partnerPersonnelFilter');
    roleFilter = document.getElementById('rolePersonnelFilter');
    statusFilter = document.getElementById('statusPersonnelFilter');

    if (!personnelTable) {
        console.error('Personnel table not found');
    }
}

// Load personnel data from server
function loadPersonnelData() {
    if (typeof window.personnelData !== 'undefined') {
        console.log('Loading personnel data from window object:', window.personnelData);
        allPersonnelData = window.personnelData || [];
        filteredPersonnelData = [...allPersonnelData];
        renderPersonnelTable();
    } else {
        console.log('Window personnel data not available, using empty array');
        allPersonnelData = [];
        filteredPersonnelData = [];
        renderPersonnelTable();
    }
}

// Setup event listeners
function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    if (partnerFilter) {
        partnerFilter.addEventListener('change', handleFilterChange);
    }

    if (roleFilter) {
        roleFilter.addEventListener('change', handleFilterChange);
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', handleFilterChange);
    }

    // Export button
    const exportBtn = document.getElementById('exportPersonnelBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportPersonnelData);
    }

    // Add Personnel button
    const addPersonnelBtn = document.getElementById('addPersonnelBtn');
    if (addPersonnelBtn) {
        addPersonnelBtn.addEventListener('click', showAddPersonnelForm);
    }
}

// Handle search functionality
function handleSearch() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    console.log('Searching for:', searchTerm);
    applyFilters();
}

// Handle filter changes
function handleFilterChange() {
    console.log('Filter changed');
    applyFilters();
}

// Apply all filters
function applyFilters() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedPartner = partnerFilter ? partnerFilter.value : '';
    const selectedRole = roleFilter ? roleFilter.value : '';
    const selectedStatus = statusFilter ? statusFilter.value : '';

    filteredPersonnelData = allPersonnelData.filter(person => {
        // Search filter
        const matchesSearch = !searchTerm || 
            person.firstName?.toLowerCase().includes(searchTerm) ||
            person.lastName?.toLowerCase().includes(searchTerm) ||
            person.email?.toLowerCase().includes(searchTerm) ||
            person.jobTitle?.toLowerCase().includes(searchTerm) ||
            person.partnerName?.toLowerCase().includes(searchTerm);

        // Partner filter
        const matchesPartner = !selectedPartner || person.partnerId === selectedPartner;

        // Role filter
        const matchesRole = !selectedRole || person.jobTitle === selectedRole;

        // Status filter
        const matchesStatus = !selectedStatus || person.status === selectedStatus;

        return matchesSearch && matchesPartner && matchesRole && matchesStatus;
    });

    console.log(`Filtered ${filteredPersonnelData.length} of ${allPersonnelData.length} personnel`);
    renderPersonnelTable();
}

// Render personnel table
function renderPersonnelTable() {
    if (!personnelTable) {
        console.error('Personnel table element not found');
        return;
    }

    const tbody = personnelTable.querySelector('tbody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }

    // Clear existing rows
    tbody.innerHTML = '';

    if (filteredPersonnelData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    No personnel records found
                </td>
            </tr>
        `;
        return;
    }

    // Render personnel rows
    filteredPersonnelData.forEach(person => {
        const row = createPersonnelRow(person);
        tbody.appendChild(row);
    });

    // Update record count
    updateRecordCount();
}

// Create a personnel table row
function createPersonnelRow(person) {
    const row = document.createElement('tr');
    
    // Format phone number
    const formattedPhone = formatPhoneNumber(person.phoneNumber);
    
    // Create status badge
    const statusBadge = createStatusBadge(person.status);
    
    row.innerHTML = `
        <td>
            <div class="d-flex align-items-center">
                <div class="avatar-circle me-2">
                    ${getInitials(person.firstName, person.lastName)}
                </div>
                <div>
                    <div class="fw-medium">${escapeHtml(person.firstName)} ${escapeHtml(person.lastName)}</div>
                    <small class="text-muted">${escapeHtml(person.email)}</small>
                </div>
            </div>
        </td>
        <td>${escapeHtml(person.jobTitle)}</td>
        <td>${escapeHtml(person.partnerName || 'N/A')}</td>
        <td>${formattedPhone}</td>
        <td>${statusBadge}</td>
        <td>${formatDate(person.startDate)}</td>
        <td>
            <div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn btn-outline-primary" onclick="viewPersonnel('${person.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn btn-outline-secondary" onclick="editPersonnel('${person.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn btn-outline-danger" onclick="deletePersonnel('${person.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Create status badge
function createStatusBadge(status) {
    const statusConfig = {
        'Active': { class: 'bg-success', text: 'Active' },
        'Inactive': { class: 'bg-secondary', text: 'Inactive' },
        'On Leave': { class: 'bg-warning', text: 'On Leave' },
        'Terminated': { class: 'bg-danger', text: 'Terminated' }
    };

    const config = statusConfig[status] || { class: 'bg-secondary', text: status || 'Unknown' };
    return `<span class="badge ${config.class}">${config.text}</span>`;
}

// Get initials for avatar
function getInitials(firstName, lastName) {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '??';
}

// Format phone number
function formatPhoneNumber(phone) {
    if (!phone) return 'N/A';
    
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    } catch (error) {
        return dateString;
    }
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update record count
function updateRecordCount() {
    const countElement = document.getElementById('personnelCount');
    if (countElement) {
        countElement.textContent = `${filteredPersonnelData.length} of ${allPersonnelData.length} personnel`;
    }
}

// Personnel action functions
function viewPersonnel(id) {
    console.log('View personnel:', id);
    const person = allPersonnelData.find(p => p.id === id);
    if (person) {
        showPersonnelModal(person, 'view');
    }
}

function editPersonnel(id) {
    console.log('Edit personnel:', id);
    window.location.href = `/forms/personnel-form?id=${id}`;
}

function deletePersonnel(id) {
    console.log('Delete personnel:', id);
    const person = allPersonnelData.find(p => p.id === id);
    if (person && confirm(`Are you sure you want to delete ${person.firstName} ${person.lastName}?`)) {
        fetch(`/api/personnel/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allPersonnelData = allPersonnelData.filter(p => p.id !== id);
                applyFilters();
                showAlert('Personnel deleted successfully', 'success');
            } else {
                showAlert('Error deleting personnel: ' + data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error deleting personnel:', error);
            showAlert('Error deleting personnel', 'danger');
        });
    }
}

// Show add personnel form
function showAddPersonnelForm() {
    console.log('Show add personnel form');
    window.location.href = '/forms/personnel-form';
}

// Export personnel data
function exportPersonnelData() {
    console.log('Export personnel data');
    
    if (filteredPersonnelData.length === 0) {
        showAlert('No data to export', 'warning');
        return;
    }

    const headers = ['Name', 'Job Title', 'Partner', 'Phone', 'Email', 'Status', 'Start Date'];
    const csvContent = [
        headers.join(','),
        ...filteredPersonnelData.map(person => [
            `"${person.firstName} ${person.lastName}"`,
            `"${person.jobTitle}"`,
            `"${person.partnerName || 'N/A'}"`,
            `"${person.phoneNumber || 'N/A'}"`,
            `"${person.email}"`,
            `"${person.status}"`,
            `"${formatDate(person.startDate)}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personnel-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showAlert('Personnel data exported successfully', 'success');
}

// Show personnel modal
function showPersonnelModal(person, mode = 'view') {
    let modal = document.getElementById('personnelModal');
    if (!modal) {
        createPersonnelModal();
        modal = document.getElementById('personnelModal');
    }

    const modalTitle = modal.querySelector('.modal-title');
    const modalBody = modal.querySelector('.modal-body');

    modalTitle.textContent = mode === 'view' ? 'Personnel Details' : 'Edit Personnel';
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>Personal Information</h6>
                <p><strong>Name:</strong> ${person.firstName} ${person.lastName}</p>
                <p><strong>Email:</strong> ${person.email}</p>
                <p><strong>Phone:</strong> ${formatPhoneNumber(person.phoneNumber)}</p>
            </div>
            <div class="col-md-6">
                <h6>Work Information</h6>
                <p><strong>Job Title:</strong> ${person.jobTitle}</p>
                <p><strong>Partner:</strong> ${person.partnerName || 'N/A'}</p>
                <p><strong>Status:</strong> ${createStatusBadge(person.status)}</p>
                <p><strong>Start Date:</strong> ${formatDate(person.startDate)}</p>
            </div>
        </div>
    `;

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Create personnel modal
function createPersonnelModal() {
    const modalHtml = `
        <div class="modal fade" id="personnelModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Personnel Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Content will be populated dynamically -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Show alert function
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Refresh data function
function refreshPersonnelData() {
    console.log('Refreshing personnel data...');
    
    fetch('/api/personnel')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allPersonnelData = data.data || [];
                filteredPersonnelData = [...allPersonnelData];
                renderPersonnelTable();
                showAlert('Personnel data refreshed', 'success');
            } else {
                showAlert('Error refreshing data: ' + data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error refreshing personnel data:', error);
            showAlert('Error refreshing personnel data', 'danger');
        });
}

// Initialize refresh button if it exists
document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refreshPersonnelBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshPersonnelData);
    }
});

console.log('Key Personnel Directory script initialization complete');
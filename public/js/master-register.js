// Master Partner Register JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Page elements
    const searchInput = document.getElementById('partner-search');
    const dataTable = document.getElementById('master-register-table');
    const totalCountElement = document.getElementById('total-count');
    const signedCountElement = document.getElementById('signed-count');
    const filteredCountElement = document.getElementById('filtered-count');
    const exportBtn = document.getElementById('export-partners');
    const refreshBtn = document.getElementById('refresh-partners');
    
    // Instead of fetching from /api/partners, use the data already on the page:
    const partners = window.masterRegisterData && window.masterRegisterData.partners
        ? window.masterRegisterData.partners
        : [];
    
    // Get data from server
    let partnersData = [];
    if (window.masterRegisterData && window.masterRegisterData.masterRegister) {
        partnersData = window.masterRegisterData.masterRegister;
    }
    
    let filteredData = [...partnersData];
    
    // Initialize the page
    init();
    
    function init() {
        updateStats();
        bindEvents();
        
        // Only render table if there's no server-side data already displayed
        if (partnersData.length === 0) {
            renderEmptyState();
        } else {
            // Call this on page load
            renderTableRows(partners);
        }
    }
    
    function bindEvents() {
        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
        
        // Export functionality
        if (exportBtn) {
            exportBtn.addEventListener('click', handleExport);
        }
        
        // Refresh functionality
        if (refreshBtn) {
            refreshBtn.addEventListener('click', handleRefresh);
        }
    }
    
    function handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase().trim();
        const tbody = dataTable.querySelector('tbody');
        const rows = tbody.querySelectorAll('tr');
        
        let visibleCount = 0;
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 1) { // Skip empty state rows
                const rowText = Array.from(cells).map(cell => cell.textContent.toLowerCase()).join(' ');
                const isVisible = searchTerm === '' || rowText.includes(searchTerm);
                row.style.display = isVisible ? '' : 'none';
                if (isVisible) visibleCount++;
            }
        });
        
        // Update filtered count
        if (filteredCountElement) {
            filteredCountElement.textContent = visibleCount;
        }
        
        // Show empty state if no results
        if (visibleCount === 0 && searchTerm !== '') {
            showSearchEmptyState(tbody, searchTerm);
        }
    }
    
    function showSearchEmptyState(tbody, searchTerm) {
        const existingEmptyRow = tbody.querySelector('.search-empty-state');
        if (existingEmptyRow) return;
        
        const emptyRow = document.createElement('tr');
        emptyRow.className = 'search-empty-state';
        emptyRow.innerHTML = `
            <td colspan="11" class="no-data">
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <div class="empty-text">No partners found for "${searchTerm}"</div>
                    <div class="empty-subtext">Try adjusting your search criteria</div>
                </div>
            </td>
        `;
        tbody.appendChild(emptyRow);
    }
    
    function renderEmptyState() {
        const tbody = dataTable.querySelector('tbody');
        if (!tbody) return;
        
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="no-data">
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <div class="empty-text">No partners found</div>
                        <div class="empty-subtext">Partners will appear here once data is loaded</div>
                        <a href="/forms/partner" class="btn-primary" style="margin-top: 1rem;">
                            Add First Partner
                        </a>
                    </div>
                </td>
            </tr>
        `;
    }
    
    function updateStats() {
        const currentRows = dataTable.querySelectorAll('tbody tr:not(.search-empty-state)');
        const visibleRows = Array.from(currentRows).filter(row => row.style.display !== 'none');
        
        if (totalCountElement) {
            totalCountElement.textContent = partnersData.length;
        }
        
        if (filteredCountElement) {
            filteredCountElement.textContent = visibleRows.length;
        }
        
        // Count signed contracts from visible rows
        let signedCount = 0;
        visibleRows.forEach(row => {
            const statusCell = row.querySelector('.status-badge');
            if (statusCell && statusCell.textContent.trim().toLowerCase().includes('signed')) {
                signedCount++;
            }
        });
        
        if (signedCountElement) {
            signedCountElement.textContent = signedCount;
        }
    }
    
    function handleRefresh() {
        showNotification('Refreshing partner data...', 'info');
        
        // Reload the page to get fresh data
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
    
    function handleExport() {
        try {
            const csvContent = generateCSV();
            downloadCSV(csvContent, `master-partner-register-${new Date().toISOString().split('T')[0]}.csv`);
            
            // Show success message
            showNotification('Partner register exported successfully!', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            showNotification('Export failed. Please try again.', 'error');
        }
    }
    
    function generateCSV() {
        const headers = [
            'Partner ID',
            'Partner Name',
            'Status',
            'Partner Type',
            'Regions',
            'Agreement Date',
            'Commencement Date',
            'Contract Duration',
            'Key Personnel',
            'Contract Value',
            'Contact Email',
            'Contact Phone'
        ];
        
        let csv = headers.join(',') + '\n';
        
        partnersData.forEach(partner => {
            const row = [
                partner.id || partner['Partner ID'] || '',
                `"${partner.partnerName || partner.name || partner['Partner Name'] || ''}"`,
                partner.status || partner.contractStatus || partner['Contract Status'] || '',
                partner.partnerType || partner.type || partner['Partner Type'] || '',
                `"${partner.regionsOfOperation || partner.regions || partner['Regions of Operation'] || ''}"`,
                partner.contractStartDate || partner['Agreement Date'] || '',
                partner.commencementDate || partner['Commencement Date'] || '',
                partner.contractDuration || partner['Contract Duration'] || '',
                `"${partner.keyPersonnel || partner['Key Personnel'] || ''}"`,
                `"${partner.contractValue || partner['Contract Value'] || ''}"`,
                partner.contactEmail || partner['Contact Email'] || '',
                partner.contactPhone || partner['Contact Phone'] || ''
            ];
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }
    
    function downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                </span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-weight: 500;
            min-width: 300px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Make viewPartner globally available for the onclick handler
    window.viewPartner = function(partnerId) {
        // Redirect to the partner view page
        window.location.href = '/forms/partner/' + partnerId + '/view';
    };

    // Now use 'partners' to render or filter the table as needed
    // For example, to render rows:
    function renderTableRows(partners) {
        const tbody = document.querySelector('#master-register-table tbody');
        if (!tbody) return;
        tbody.innerHTML = partners.map(partner => `
            <tr>
                <td>${partner.id || '-'}</td>
                <td class="partner-name">${partner.partnerName || '-'}</td>
                <td>
                    <span class="status-badge ${partner.contractStatus === 'Active' || partner.contractStatus === 'Signed' ? 'signed' : 'contracting'}">
                        ${partner.contractStatus || 'Unknown'}
                    </span>
                </td>
                <td>${partner.contractStartDate || '-'}</td>
                <td>${partner.commencementDate || '-'}</td>
                <td>${partner.contractDuration || '-'}</td>
                <td>${partner.taskOrderPrice || '-'}</td>
                <td class="regions-cell"><span class="regions-text">${partner.regionsOfOperation || '-'}</span></td>
                <td>${partner.keyPersonnelFormatted || partner.keyPersonnel || '-'}</td>
                <td class="price-cell"><span class="price-amount">${partner.contractValue || partner.taskOrderPrice || '-'}</span></td>
                <td class="actions-cell">
                    <button class="action-btn view" onclick="viewPartner('${partner.id}')">View</button>
                    <a href="/forms/partner/${partner.id}/edit" class="action-btn edit">Edit</a>
                </td>
            </tr>
        `).join('');
    }

    // Call this on page load
    renderTableRows(partners);
});
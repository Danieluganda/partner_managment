// Compliance & Reporting JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Page elements
    const searchInput = document.getElementById('complianceSearch');
    const quickSearchInput = document.getElementById('quickComplianceSearch');
    const statusFilter = document.getElementById('statusComplianceFilter');
    const auditFilter = document.getElementById('auditFilter');
    const dataTable = document.getElementById('complianceTable');
    const refreshBtn = document.getElementById('refreshComplianceBtn');
    const exportBtn = document.getElementById('exportComplianceBtn');
    
    // Stats elements
    const totalRequirementsElement = document.getElementById('totalRequirements');
    const compliantItemsElement = document.getElementById('compliantItems');
    const pendingItemsElement = document.getElementById('pendingItems');
    const overdueItemsElement = document.getElementById('overdueItems');
    const auditPassItemsElement = document.getElementById('auditPassItems');
    const complianceRateElement = document.getElementById('complianceRate');
    
    // Footer elements
    const showingCountElement = document.getElementById('showingComplianceCount');
    const totalCountElement = document.getElementById('totalComplianceCount');
    const footerCompliantCountElement = document.getElementById('footerCompliantCount');
    const footerPendingCountElement = document.getElementById('footerPendingCount');
    const footerOverdueCountElement = document.getElementById('footerOverdueCount');
    const footerComplianceRateElement = document.getElementById('footerComplianceRate');
    
    // Use backend data if available, otherwise fall back to sample data
    let complianceData = [];
    
    // Check if backend data is available
    if (window.complianceData && Array.isArray(window.complianceData) && window.complianceData.length > 0) {
        console.log('Using backend compliance data:', window.complianceData.length, 'records');
        
        // Transform backend data to match frontend expectations
        complianceData = window.complianceData.map(record => ({
            partnerId: record.partnerId || 'N/A',
            partnerName: record.partnerName || 'Unknown',
            requirement: record.requirement,
            dueDate: record.dueDate,
            reportingPeriod: `${record.complianceType} - ${new Date().getFullYear()}`,
            submissionDate: record.lastReviewDate || '-',
            status: mapBackendStatus(record.status),
            fmcsAudit: record.lastReviewDate ? 'pass' : 'not-audited',
            notes: record.notes || 'No notes available',
            daysOverdue: calculateDaysOverdue(record.dueDate, record.status),
            complianceType: record.complianceType,
            responsiblePerson: record.responsiblePerson
        }));
    } else {
        console.log('No compliance data available');
        complianceData = [];
    }
    
    // Helper functions for data transformation
    function mapBackendStatus(backendStatus) {
        const statusMap = {
            'compliant': 'compliant',
            'non-compliant': 'non-compliant',
            'pending': 'pending',
            'under-review': 'pending'
        };
        return statusMap[backendStatus] || 'pending';
    }
    
    function calculateDaysOverdue(dueDate, status) {
        if (status !== 'non-compliant' && status !== 'overdue') return 0;
        
        const due = new Date(dueDate);
        const now = new Date();
        const diffTime = now - due;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays > 0 ? diffDays : 0;
    }
    
    let filteredData = [...complianceData];
    let currentSort = { field: null, direction: 'asc' };
    
    // Initialize the page
    init();
    
    function init() {
        renderTable();
        updateStats();
        updateFooterStats();
        bindEvents();
        
        // Use backend data if available
        if (window.complianceData && window.complianceData.length > 0) {
            console.log('Using backend compliance data:', window.complianceData);
        }
    }
    
    function bindEvents() {
        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
        
        if (quickSearchInput) {
            quickSearchInput.addEventListener('input', handleQuickSearch);
        }
        
        // Filter functionality
        if (statusFilter) {
            statusFilter.addEventListener('change', handleStatusFilter);
        }
        
        if (auditFilter) {
            auditFilter.addEventListener('change', handleAuditFilter);
        }
        
        // Refresh functionality
        if (refreshBtn) {
            refreshBtn.addEventListener('click', handleRefresh);
        }
        
        // Export functionality
        if (exportBtn) {
            exportBtn.addEventListener('click', handleExport);
        }
        
        // Sorting functionality
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => handleSort(header.dataset.sort));
        });
    }
    
    function handleSearch(event) {
        performFilter();
    }
    
    function handleQuickSearch(event) {
        performFilter();
    }
    
    function handleStatusFilter(event) {
        performFilter();
    }
    
    function handleAuditFilter(event) {
        performFilter();
    }
    
    function performFilter() {
        const searchTerm = (searchInput?.value || quickSearchInput?.value || '').toLowerCase().trim();
        const statusValue = statusFilter?.value || '';
        const auditValue = auditFilter?.value || '';
        
        filteredData = complianceData.filter(item => {
            // Search filter
            const matchesSearch = searchTerm === '' || 
                item.partnerId.toLowerCase().includes(searchTerm) ||
                item.partnerName.toLowerCase().includes(searchTerm) ||
                item.requirement.toLowerCase().includes(searchTerm) ||
                item.reportingPeriod.toLowerCase().includes(searchTerm) ||
                item.notes.toLowerCase().includes(searchTerm);
            
            // Status filter
            const matchesStatus = statusValue === '' || item.status === statusValue;
            
            // Audit filter
            const matchesAudit = auditValue === '' || item.fmcsAudit === auditValue;
            
            return matchesSearch && matchesStatus && matchesAudit;
        });
        
        renderTable();
        updateStats();
        updateFooterStats();
    }
    
    function handleRefresh() {
        // Add loading state
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<span class="icon">⏳</span><span>Loading...</span>';
            refreshBtn.disabled = true;
        }
        
        // Simulate API call
        setTimeout(() => {
            // Reset to original data
            filteredData = [...complianceData];
            renderTable();
            updateStats();
            updateFooterStats();
            
            // Clear search inputs and filters
            if (searchInput) searchInput.value = '';
            if (quickSearchInput) quickSearchInput.value = '';
            if (statusFilter) statusFilter.value = '';
            if (auditFilter) auditFilter.value = '';
            
            // Reset refresh button
            if (refreshBtn) {
                refreshBtn.innerHTML = '<span class="icon">↻</span><span>Refresh</span>';
                refreshBtn.disabled = false;
            }
            
            showNotification('Compliance data refreshed successfully!', 'success');
        }, 1500);
    }
    
    function handleSort(field) {
        if (currentSort.field === field) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.field = field;
            currentSort.direction = 'asc';
        }
        
        // Update sort indicators
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sorted-asc', 'sorted-desc');
        });
        
        const currentHeader = document.querySelector(`[data-sort="${field}"]`);
        if (currentHeader) {
            currentHeader.classList.add(`sorted-${currentSort.direction}`);
        }
        
        // Sort data
        filteredData.sort((a, b) => {
            let valueA = a[field];
            let valueB = b[field];
            
            // Handle date fields
            if (field === 'dueDate' || field === 'submissionDate') {
                valueA = valueA === '-' ? '9999-12-31' : valueA;
                valueB = valueB === '-' ? '9999-12-31' : valueB;
            }
            
            // Handle string comparison
            if (typeof valueA === 'string') {
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
            }
            
            let comparison = 0;
            if (valueA > valueB) {
                comparison = 1;
            } else if (valueA < valueB) {
                comparison = -1;
            }
            
            return currentSort.direction === 'desc' ? comparison * -1 : comparison;
        });
        
        renderTable();
    }
    
    function renderTable() {
        if (!dataTable) return;
        
        const tbody = dataTable.querySelector('tbody');
        if (!tbody) return;
        
        if (filteredData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="no-data">
                        <div class="empty-state">
                            <div class="empty-icon">📋</div>
                            <div class="empty-text">No compliance records found</div>
                            <div class="empty-subtext">Try adjusting your search criteria or filters</div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = filteredData.map(item => `
            <tr>
                <td>${item.partnerId}</td>
                <td>
                    <div class="partner-name-cell">${item.partnerName}</div>
                </td>
                <td class="requirement-cell">
                    <span class="requirement-text" title="${item.requirement}">
                        ${item.requirement}
                    </span>
                </td>
                <td class="date-cell">
                    ${formatDate(item.dueDate)}
                </td>
                <td class="period-cell">
                    ${item.reportingPeriod}
                </td>
                <td class="date-cell">
                    ${item.submissionDate !== '-' ? formatDate(item.submissionDate) : '-'}
                </td>
                <td class="status-cell">
                    <span class="status-badge status-${item.status}">
                        ${capitalizeFirst(item.status.replace('-', ' '))}
                        ${item.status === 'overdue' && item.daysOverdue > 0 ? ` (${item.daysOverdue}d)` : ''}
                    </span>
                </td>
                <td class="audit-cell">
                    <span class="audit-badge audit-${item.fmcsAudit}">
                        ${capitalizeFirst(item.fmcsAudit.replace('-', ' '))}
                    </span>
                </td>
                <td class="notes-cell">
                    <span class="notes-text" title="${item.notes}">
                        ${item.notes}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="action-btn view" onclick="viewComplianceDetails('${item.partnerId}', '${encodeURIComponent(item.requirement)}')">
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    function updateStats() {
        const totalRequirements = filteredData.length;
        const compliantItems = filteredData.filter(item => item.status === 'compliant').length;
        const pendingItems = filteredData.filter(item => item.status === 'pending').length;
        const overdueItems = filteredData.filter(item => item.status === 'overdue').length;
        const auditPassItems = filteredData.filter(item => item.fmcsAudit === 'pass').length;
        
        const complianceRate = totalRequirements > 0 
            ? ((compliantItems / totalRequirements) * 100).toFixed(1)
            : 0;
        
        if (totalRequirementsElement) {
            totalRequirementsElement.textContent = totalRequirements.toLocaleString();
        }
        
        if (compliantItemsElement) {
            compliantItemsElement.textContent = compliantItems.toLocaleString();
        }
        
        if (pendingItemsElement) {
            pendingItemsElement.textContent = pendingItems.toLocaleString();
        }
        
        if (overdueItemsElement) {
            overdueItemsElement.textContent = overdueItems.toLocaleString();
        }
        
        if (auditPassItemsElement) {
            auditPassItemsElement.textContent = auditPassItems.toLocaleString();
        }
        
        if (complianceRateElement) {
            complianceRateElement.textContent = `${complianceRate}%`;
        }
    }
    
    function updateFooterStats() {
        const totalRequirements = filteredData.length;
        const compliantCount = filteredData.filter(item => item.status === 'compliant').length;
        const pendingCount = filteredData.filter(item => item.status === 'pending').length;
        const overdueCount = filteredData.filter(item => item.status === 'overdue').length;
        
        const complianceRate = totalRequirements > 0 
            ? ((compliantCount / totalRequirements) * 100).toFixed(1)
            : 0;
        
        if (showingCountElement) {
            showingCountElement.textContent = totalRequirements.toLocaleString();
        }
        
        if (totalCountElement) {
            totalCountElement.textContent = complianceData.length.toLocaleString();
        }
        
        if (footerCompliantCountElement) {
            footerCompliantCountElement.textContent = compliantCount.toLocaleString();
        }
        
        if (footerPendingCountElement) {
            footerPendingCountElement.textContent = pendingCount.toLocaleString();
        }
        
        if (footerOverdueCountElement) {
            footerOverdueCountElement.textContent = overdueCount.toLocaleString();
        }
        
        if (footerComplianceRateElement) {
            footerComplianceRateElement.textContent = `${complianceRate}%`;
        }
    }
    
    function handleExport() {
        try {
            const csvContent = generateComplianceCSV();
            downloadCSV(csvContent, 'compliance-reporting.csv');
            showNotification('Compliance report exported successfully!', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            showNotification('Export failed. Please try again.', 'error');
        }
    }
    
    function generateComplianceCSV() {
        const headers = [
            'Partner ID',
            'Partner Name',
            'Requirement',
            'Due Date',
            'Reporting Period',
            'Submission Date',
            'Status',
            'FMCS Audit',
            'Notes'
        ];
        
        let csv = headers.join(',') + '\n';
        
        filteredData.forEach(item => {
            const row = [
                item.partnerId,
                `"${item.partnerName}"`,
                `"${item.requirement}"`,
                item.dueDate,
                item.reportingPeriod,
                item.submissionDate,
                item.status,
                item.fmcsAudit,
                `"${item.notes}"`
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
    
    function formatDate(dateString) {
        if (dateString === '-') return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        });
    }
    
    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    function showNotification(message, type = 'info') {
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
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Global function for view button
    window.viewComplianceDetails = function(partnerId, encodedRequirement) {
        const requirement = decodeURIComponent(encodedRequirement);
        const compliance = complianceData.find(c => 
            c.partnerId === partnerId && c.requirement === requirement
        );
        
        if (compliance) {
            const details = `
Compliance Details

Partner: ${compliance.partnerName} (${compliance.partnerId})
Requirement: ${compliance.requirement}

Timeline:
• Due Date: ${formatDate(compliance.dueDate)}
• Reporting Period: ${compliance.reportingPeriod}
• Submission Date: ${compliance.submissionDate}

Status: ${capitalizeFirst(compliance.status.replace('-', ' '))}
${compliance.status === 'overdue' && compliance.daysOverdue > 0 ? `Days Overdue: ${compliance.daysOverdue}` : ''}

FMCS Audit: ${capitalizeFirst(compliance.fmcsAudit.replace('-', ' '))}

Notes: ${compliance.notes}
            `.trim();
            
            alert(details);
        }
    };
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
            event.preventDefault();
            handleExport();
        }
        
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            handleRefresh();
        }
        
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            if (statusFilter) {
                statusFilter.focus();
            }
        }
    });
});
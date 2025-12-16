// Deliverables Tracker JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Page elements
    const searchInput = document.getElementById('deliverablesSearch');
    const quickSearchInput = document.getElementById('quickDeliverablesSearch');
    const statusFilter = document.getElementById('statusFilter');
    const dataTable = document.getElementById('deliverablesTable');
    const refreshBtn = document.getElementById('refreshDeliverablesBtn');
    const exportBtn = document.getElementById('exportDeliverablesBtn');
    
    // Stats elements
    const totalDeliverablesElement = document.getElementById('totalDeliverables');
    const pendingDeliverablesElement = document.getElementById('pendingDeliverables');
    const approvedDeliverablesElement = document.getElementById('approvedDeliverables');
    const overdueDeliverablesElement = document.getElementById('overdueDeliverables');
    
    // Footer elements
    const showingCountElement = document.getElementById('showingDeliverablesCount');
    const totalCountElement = document.getElementById('totalDeliverablesCount');
    const footerPendingCountElement = document.getElementById('footerPendingCount');
    const footerApprovedCountElement = document.getElementById('footerApprovedCount');
    const footerTotalPaymentElement = document.getElementById('footerTotalPayment');
    
    // Use real database data if available, otherwise fallback to mock data
    let deliverablesData = [];
    
    if (window.deliverablesData && Array.isArray(window.deliverablesData)) {
        // Use backend data and transform it for the UI
        deliverablesData = window.deliverablesData.map(item => ({
            id: item.id,
            partnerId: item.partner?.partnerId || 'N/A',
            partnerName: item.partner?.companyName || 'Unknown Partner',
            deliverableNumber: item.deliverableNumber || 'N/A',
            description: item.title,
            milestoneDate: (item.milestoneDate || item.dueDate) ? new Date(item.milestoneDate || item.dueDate).toISOString().split('T')[0] : '-',
            status: item.status,
            actualSubmission: item.actualSubmission ? new Date(item.actualSubmission).toISOString().split('T')[0] : '-',
            approvalDate: item.approvalDate ? new Date(item.approvalDate).toISOString().split('T')[0] : '-',
            paymentPercentage: item.paymentPercentage ? `${item.paymentPercentage}%` : '0%',
            paymentAmount: item.value ? formatCurrency(item.value) : (item.paymentAmount ? formatCurrency(item.paymentAmount) : 'UGX 0'),
            paymentStatus: item.paymentStatus || 'pending',
            rawPaymentAmount: item.value || item.paymentAmount || 0,
            rawPaymentPercentage: item.paymentPercentage || 0,
            daysOverdue: item.status === 'overdue' ? calculateDaysOverdue(item.milestoneDate || item.dueDate) : 0,
            priority: item.priority || 'medium',
            notes: item.notes || ''
        }));
    } else {
        // No data available
        deliverablesData = [];
    }
    
    let filteredData = [...deliverablesData];
    let currentSort = { field: null, direction: 'asc' };
    
    // Initialize the page
    init();
    
    function init() {
        console.log('Initializing deliverables tracker with', deliverablesData.length, 'deliverables');
        renderTable();
        updateStats();
        updateFooterStats();
        bindEvents();
    }
    
    function calculateDaysOverdue(targetDate) {
        if (!targetDate) return 0;
        const target = new Date(targetDate);
        const today = new Date();
        const diffTime = today - target;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
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
        performFilter(event.target.value, statusFilter?.value || '');
    }
    
    function handleQuickSearch(event) {
        performFilter(event.target.value, statusFilter?.value || '');
    }
    
    function handleStatusFilter(event) {
        const searchTerm = searchInput?.value || quickSearchInput?.value || '';
        performFilter(searchTerm, event.target.value);
    }
    
    function performFilter(searchTerm, statusValue) {
        const term = searchTerm.toLowerCase().trim();
        
        filteredData = deliverablesData.filter(item => {
            // Search filter
            const matchesSearch = term === '' || 
                item.partnerId.toLowerCase().includes(term) ||
                item.partnerName.toLowerCase().includes(term) ||
                item.deliverableNumber.toLowerCase().includes(term) ||
                item.description.toLowerCase().includes(term) ||
                item.status.toLowerCase().includes(term);
            
            // Status filter
            const matchesStatus = statusValue === '' || item.status === statusValue;
            
            return matchesSearch && matchesStatus;
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
        
        // Fetch fresh data from server
        fetch('/api/deliverables')
            .then(response => response.json())
            .then(data => {
                if (data.success && Array.isArray(data.deliverables)) {
                    // Update deliverables data with fresh server data
                    deliverablesData = data.deliverables.map(item => ({
                        id: item.id,
                        partnerId: item.partner?.partnerId || 'N/A',
                        partnerName: item.partner?.companyName || 'Unknown Partner',
                        deliverableNumber: item.deliverableNumber || 'N/A',
                        description: item.title,
                        milestoneDate: (item.milestoneDate || item.dueDate) ? new Date(item.milestoneDate || item.dueDate).toISOString().split('T')[0] : '-',
                        status: item.status,
                        actualSubmission: item.actualSubmission ? new Date(item.actualSubmission).toISOString().split('T')[0] : '-',
                        approvalDate: item.approvalDate ? new Date(item.approvalDate).toISOString().split('T')[0] : '-',
                        paymentPercentage: item.paymentPercentage ? `${item.paymentPercentage}%` : '0%',
                        paymentAmount: item.value ? formatCurrency(item.value) : (item.paymentAmount ? formatCurrency(item.paymentAmount) : 'UGX 0'),
                        paymentStatus: item.paymentStatus || 'pending',
                        rawPaymentAmount: item.value || item.paymentAmount || 0,
                        rawPaymentPercentage: item.paymentPercentage || 0,
                        daysOverdue: item.status === 'overdue' ? calculateDaysOverdue(item.milestoneDate || item.dueDate) : 0,
                        priority: item.priority || 'medium',
                        notes: item.notes || ''
                    }));
                    
                    // Reset filtered data
                    filteredData = [...deliverablesData];
                    renderTable();
                    updateStats();
                    updateFooterStats();
                    
                    // Clear search inputs and filters
                    if (searchInput) searchInput.value = '';
                    if (quickSearchInput) quickSearchInput.value = '';
                    if (statusFilter) statusFilter.value = '';
                    
                    showNotification('Deliverables data refreshed successfully!', 'success');
                } else {
                    throw new Error('Invalid response format');
                }
            })
            .catch(error => {
                console.error('Failed to refresh data:', error);
                showNotification('Failed to refresh data. Please try again.', 'error');
            })
            .finally(() => {
                // Reset refresh button
                if (refreshBtn) {
                    refreshBtn.innerHTML = '<span class="icon">↻</span><span>Refresh</span>';
                    refreshBtn.disabled = false;
                }
            });
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
            
            // Handle numeric fields
            if (field === 'paymentAmount' || field === 'paymentPercentage') {
                valueA = a[`raw${field.charAt(0).toUpperCase() + field.slice(1)}`] || 0;
                valueB = b[`raw${field.charAt(0).toUpperCase() + field.slice(1)}`] || 0;
            }
            
            // Handle date fields
            if (field === 'milestoneDate' || field === 'actualSubmission' || field === 'approvalDate') {
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
                    <td colspan="12" class="no-data">
                        <div class="empty-state">
                            <div class="empty-icon">📋</div>
                            <div class="empty-text">No deliverables found</div>
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
                <td class="deliverable-number">
                    ${item.deliverableNumber}
                </td>
                <td class="description-cell">
                    <span class="description-text" title="${item.description}">
                        ${item.description}
                    </span>
                </td>
                <td class="date-cell">
                    ${formatDate(item.milestoneDate)}
                </td>
                <td class="status-cell">
                    <span class="status-badge status-${item.status}">
                        ${capitalizeFirst(item.status)}
                        ${item.status === 'overdue' && item.daysOverdue > 0 ? ` (${item.daysOverdue}d)` : ''}
                    </span>
                </td>
                <td class="date-cell">
                    ${item.actualSubmission !== '-' ? formatDate(item.actualSubmission) : '-'}
                </td>
                <td class="date-cell">
                    ${item.approvalDate !== '-' ? formatDate(item.approvalDate) : '-'}
                </td>
                <td class="percentage-cell">
                    <span class="percentage-value">
                        ${item.paymentPercentage}
                    </span>
                </td>
                <td class="price-cell">
                    <span class="payment-amount">
                        ${item.paymentAmount}
                    </span>
                </td>
                <td class="payment-status-cell">
                    <span class="payment-status-badge status-${item.paymentStatus}">
                        ${capitalizeFirst(item.paymentStatus)}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="action-btn view" onclick="viewDeliverableDetails('${item.id || item.partnerId}', '${item.deliverableNumber}')">
                        View
                    </button>
                    ${item.id ? `<a href="/forms/deliverable/${item.id}" class="action-btn edit">Edit</a>` : ''}
                </td>
            </tr>
        `).join('');
    }
    
    function updateStats() {
        const totalDeliverables = filteredData.length;
        const pendingDeliverables = filteredData.filter(item => item.status === 'pending').length;
        const approvedDeliverables = filteredData.filter(item => item.status === 'approved').length;
        const overdueDeliverables = filteredData.filter(item => item.status === 'overdue').length;
        
        if (totalDeliverablesElement) {
            totalDeliverablesElement.textContent = totalDeliverables.toLocaleString();
        }
        
        if (pendingDeliverablesElement) {
            pendingDeliverablesElement.textContent = pendingDeliverables.toLocaleString();
        }
        
        if (approvedDeliverablesElement) {
            approvedDeliverablesElement.textContent = approvedDeliverables.toLocaleString();
        }
        
        if (overdueDeliverablesElement) {
            overdueDeliverablesElement.textContent = overdueDeliverables.toLocaleString();
        }
    }
    
    function updateFooterStats() {
        const totalDeliverables = filteredData.length;
        const pendingCount = filteredData.filter(item => item.status === 'pending').length;
        const approvedCount = filteredData.filter(item => item.status === 'approved').length;
        const totalPayment = filteredData.reduce((sum, item) => sum + (item.rawPaymentAmount || 0), 0);
        
        if (showingCountElement) {
            showingCountElement.textContent = totalDeliverables.toLocaleString();
        }
        
        if (totalCountElement) {
            totalCountElement.textContent = deliverablesData.length.toLocaleString();
        }
        
        if (footerPendingCountElement) {
            footerPendingCountElement.textContent = pendingCount.toLocaleString();
        }
        
        if (footerApprovedCountElement) {
            footerApprovedCountElement.textContent = approvedCount.toLocaleString();
        }
        
        if (footerTotalPaymentElement) {
            footerTotalPaymentElement.textContent = formatCurrency(totalPayment);
        }
    }
    
    function handleExport() {
        try {
            const csvContent = generateDeliverablesCSV();
            downloadCSV(csvContent, 'deliverables-tracker.csv');
            showNotification('Deliverables tracker exported successfully!', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            showNotification('Export failed. Please try again.', 'error');
        }
    }
    
    function generateDeliverablesCSV() {
        const headers = [
            'Partner ID',
            'Partner Name',
            'Deliverable #',
            'Description',
            'Milestone Date',
            'Status',
            'Actual Submission',
            'Approval Date',
            '% Payment',
            'Payment Amount',
            'Payment Status'
        ];
        
        let csv = headers.join(',') + '\n';
        
        filteredData.forEach(item => {
            const row = [
                item.partnerId,
                `"${item.partnerName}"`,
                item.deliverableNumber,
                `"${item.description}"`,
                item.milestoneDate,
                item.status,
                item.actualSubmission,
                item.approvalDate,
                item.paymentPercentage,
                `"${item.paymentAmount}"`,
                item.paymentStatus
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
    
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount).replace('UGX', 'UGX ');
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
    window.viewDeliverableDetails = function(deliverableId, deliverableNumber) {
        const deliverable = deliverablesData.find(d => 
            (d.id && d.id.toString() === deliverableId.toString()) ||
            (d.partnerId === deliverableId && d.deliverableNumber === deliverableNumber)
        );
        
        if (deliverable) {
            const details = `
Deliverable Details

Partner: ${deliverable.partnerName} (${deliverable.partnerId})
Deliverable: ${deliverable.deliverableNumber}
Description: ${deliverable.description}

Timeline:
• Milestone Date: ${formatDate(deliverable.milestoneDate)}
• Actual Submission: ${deliverable.actualSubmission}
• Approval Date: ${deliverable.approvalDate}

Status: ${capitalizeFirst(deliverable.status)}
${deliverable.status === 'overdue' && deliverable.daysOverdue > 0 ? `Days Overdue: ${deliverable.daysOverdue}` : ''}
${deliverable.priority ? `Priority: ${capitalizeFirst(deliverable.priority)}` : ''}

Payment Information:
• Percentage: ${deliverable.paymentPercentage}
• Amount: ${deliverable.paymentAmount}
• Payment Status: ${capitalizeFirst(deliverable.paymentStatus)}

${deliverable.notes ? `Notes: ${deliverable.notes}` : ''}
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
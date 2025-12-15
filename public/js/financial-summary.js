// Financial Summary JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Page elements
    const searchInput = document.getElementById('financialSearch');
    const quickSearchInput = document.getElementById('quickSearch');
    const dataTable = document.getElementById('financialTable');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportBtn = document.getElementById('exportFinancialBtn');
    
    // Stats elements
    const totalContractsElement = document.getElementById('totalContracts');
    const totalValueElement = document.getElementById('totalValue');
    const totalDisbursedElement = document.getElementById('totalDisbursed');
    const avgUtilizationElement = document.getElementById('avgUtilization');
    
    // Footer elements
    const showingCountElement = document.getElementById('showingCount');
    const totalCountElement = document.getElementById('totalFinancialCount');
    const footerTotalValueElement = document.getElementById('footerTotalValue');
    const footerTotalDisbursedElement = document.getElementById('footerTotalDisbursed');
    
    // Get financial data from server-side rendered data
    let financialData = [];
    
    // Use backend data if available
    if (window.jsData && window.jsData.financial) {
        financialData = window.jsData.financial.map(item => ({
            partnerId: item.partnerId || item['Partner ID'] || '',
            partnerName: item.partnerName || item['Partner Name'] || '',
            totalPrice: formatCurrency(item.contractValue || item.totalTaskOrderPrice || 0),
            rawTotalPrice: item.contractValue || item.totalTaskOrderPrice || 0,
            q1Paid: item.q1ActualPaid ? formatCurrency(item.q1ActualPaid) : '-',
            q2Paid: item.q2ActualPaid ? formatCurrency(item.q2ActualPaid) : '-',
            q3Paid: item.q3ActualPaid ? formatCurrency(item.q3ActualPaid) : '-',
            q4Paid: item.q4ActualPaid ? formatCurrency(item.q4ActualPaid) : '-',
            totalDisbursed: item.actualSpent ? formatCurrency(item.actualSpent) : '-',
            rawTotalDisbursed: item.actualSpent || 0,
            utilizationRate: item.utilizationRate ? `${(item.utilizationRate * 100).toFixed(1)}%` : '-',
            rawUtilizationRate: item.utilizationRate ? item.utilizationRate * 100 : 0,
            comments: item.comments || '-',
            financialStatus: item.financialStatus || 'Unknown'
        }));
        console.log('Using backend financial data:', financialData);
    } else {
        // Fallback sample data if no backend data available
        financialData = [
            {
                partnerId: "P-01",
                partnerName: "PEDN",
                totalPrice: "UGX 748,694,200",
                q1Paid: "-",
                q2Paid: "-",
                q3Paid: "-",
                q4Paid: "-",
                totalDisbursed: "-",
                utilizationRate: "40.0%",
                comments: "-",
                rawTotalPrice: 748694200,
                rawUtilizationRate: 40.0,
                rawTotalDisbursed: 0
            }
        ];
        console.log('Using fallback sample data');
    }
    
    let filteredData = [...financialData];
    let currentSort = { field: null, direction: 'asc' };
    
    // Initialize the page
    init();
    
    function init() {
        renderTable();
        updateStats();
        updateFooterStats();
        bindEvents();
        
        console.log(`Financial Summary initialized with ${financialData.length} financial records`);
    }
    
    function bindEvents() {
        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
        
        if (quickSearchInput) {
            quickSearchInput.addEventListener('input', handleQuickSearch);
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
        performSearch(event.target.value);
    }
    
    function handleQuickSearch(event) {
        performSearch(event.target.value);
    }
    
    function performSearch(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (term === '') {
            filteredData = [...financialData];
        } else {
            filteredData = financialData.filter(item => 
                item.partnerId.toLowerCase().includes(term) ||
                item.partnerName.toLowerCase().includes(term) ||
                item.totalPrice.toLowerCase().includes(term) ||
                item.comments.toLowerCase().includes(term) ||
                (item.financialStatus && item.financialStatus.toLowerCase().includes(term))
            );
        }
        
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
        
        // Reload page to get fresh data from server
        setTimeout(() => {
            window.location.reload();
        }, 500);
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
            if (field === 'totalPrice' || field === 'utilizationRate') {
                valueA = a[`raw${field.charAt(0).toUpperCase() + field.slice(1)}`] || 0;
                valueB = b[`raw${field.charAt(0).toUpperCase() + field.slice(1)}`] || 0;
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
                    <td colspan="11" class="no-data">
                        <div class="empty-state">
                            <div class="empty-icon">💰</div>
                            <div class="empty-text">No financial data found</div>
                            <div class="empty-subtext">Try adjusting your search criteria or refresh the data</div>
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
                <td class="price-cell">
                    <span class="price-amount">${item.totalPrice}</span>
                </td>
                <td class="payment-cell">
                    <span class="payment-amount">${item.q1Paid}</span>
                </td>
                <td class="payment-cell">
                    <span class="payment-amount">${item.q2Paid}</span>
                </td>
                <td class="payment-cell">
                    <span class="payment-amount">${item.q3Paid}</span>
                </td>
                <td class="payment-cell">
                    <span class="payment-amount">${item.q4Paid}</span>
                </td>
                <td class="price-cell">
                    <span class="disbursed-amount">${item.totalDisbursed}</span>
                </td>
                <td class="utilization-cell">
                    <div class="utilization-wrapper">
                        <span class="utilization-rate ${getUtilizationClass(item.rawUtilizationRate || 0)}">
                            ${item.utilizationRate || '-'}
                        </span>
                        <div class="utilization-bar">
                            <div class="utilization-fill ${getUtilizationClass(item.rawUtilizationRate || 0)}" style="width: ${item.utilizationRate || '0%'}"></div>
                        </div>
                    </div>
                </td>
                <td class="comments-cell">
                    <span class="comment-text" title="${item.comments}">
                        ${item.comments}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="action-btn view" onclick="viewFinancialDetails('${item.partnerId}')">
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    function getUtilizationClass(rate) {
        if (rate >= 70) return 'high';
        if (rate >= 40) return 'medium';
        return 'low';
    }
    
    function updateStats() {
        const totalContracts = filteredData.length;
        const totalValue = filteredData.reduce((sum, item) => sum + (item.rawTotalPrice || 0), 0);
        
        // Calculate total disbursed (only for items with actual disbursements)
        const totalDisbursed = filteredData.reduce((sum, item) => {
            return sum + (item.rawTotalDisbursed || 0);
        }, 0);
        
        const avgUtilization = totalContracts > 0 
            ? filteredData.reduce((sum, item) => sum + (item.rawUtilizationRate || 0), 0) / totalContracts 
            : 0;
        
        if (totalContractsElement) {
            totalContractsElement.textContent = totalContracts.toLocaleString();
        }
        
        if (totalValueElement) {
            totalValueElement.textContent = formatCurrency(totalValue);
        }
        
        if (totalDisbursedElement) {
            totalDisbursedElement.textContent = formatCurrency(totalDisbursed);
        }
        
        if (avgUtilizationElement) {
            avgUtilizationElement.textContent = `${avgUtilization.toFixed(1)}%`;
        }
    }
    
    function updateFooterStats() {
        const totalContracts = filteredData.length;
        const totalValue = filteredData.reduce((sum, item) => sum + (item.rawTotalPrice || 0), 0);
        const totalDisbursed = filteredData.reduce((sum, item) => {
            return sum + (item.rawTotalDisbursed || 0);
        }, 0);
        
        if (showingCountElement) {
            showingCountElement.textContent = totalContracts.toLocaleString();
        }
        
        if (totalCountElement) {
            totalCountElement.textContent = financialData.length.toLocaleString();
        }
        
        if (footerTotalValueElement) {
            footerTotalValueElement.textContent = formatCurrency(totalValue);
        }
        
        if (footerTotalDisbursedElement) {
            footerTotalDisbursedElement.textContent = formatCurrency(totalDisbursed);
        }
    }
    
    function handleExport() {
        try {
            const csvContent = generateFinancialCSV();
            downloadCSV(csvContent, 'financial-summary.csv');
            showNotification('Financial summary exported successfully!', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            showNotification('Export failed. Please try again.', 'error');
        }
    }
    
    function generateFinancialCSV() {
        const headers = [
            'Partner ID',
            'Partner Name',
            'Total Price',
            'Q1 Paid',
            'Q2 Paid',
            'Q3 Paid',
            'Q4 Paid',
            'Total Disbursed',
            'Utilization Rate',
            'Comments'
        ];
        
        let csv = headers.join(',') + '\n';
        
        filteredData.forEach(item => {
            const row = [
                item.partnerId,
                `"${item.partnerName}"`,
                `"${item.totalPrice}"`,
                `"${item.q1Paid}"`,
                `"${item.q2Paid}"`,
                `"${item.q3Paid}"`,
                `"${item.q4Paid}"`,
                `"${item.totalDisbursed}"`,
                item.utilizationRate,
                `"${item.comments}"`
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
    
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount).replace('UGX', 'UGX ');
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
    window.viewFinancialDetails = function(partnerId) {
        const partner = financialData.find(p => p.partnerId === partnerId);
        if (partner) {
            const details = `
Financial Details for ${partner.partnerName}

Partner ID: ${partner.partnerId}
Total Contract Value: ${partner.totalPrice}
Total Disbursed: ${partner.totalDisbursed}
Financial Status: ${partner.financialStatus || 'Not specified'}
Utilization Rate: ${partner.utilizationRate}

Quarterly Payments:
• Q1: ${partner.q1Paid}
• Q2: ${partner.q2Paid}
• Q3: ${partner.q3Paid}
• Q4: ${partner.q4Paid}

Comments: ${partner.comments}
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
    });
});
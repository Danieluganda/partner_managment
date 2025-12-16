// Consortium Events JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Page elements
    const searchInput = document.getElementById('eventsSearch');
    const statusFilter = document.getElementById('statusFilter');
    const formatFilter = document.getElementById('formatFilter');
    const monthFilter = document.getElementById('monthFilter');
    const dataTable = document.getElementById('eventsTable');
    const refreshBtn = document.getElementById('refreshEventsBtn');
    const exportBtn = document.getElementById('exportEventsBtn');
    
    // Stats elements
    const totalEventsElement = document.getElementById('totalEvents');
    const upcomingEventsElement = document.getElementById('upcomingEvents');
    const completedEventsElement = document.getElementById('completedEvents');
    const thisMonthEventsElement = document.getElementById('thisMonthEvents');
    
    // Footer elements
    const showingCountElement = document.getElementById('showingEventsCount');
    const totalCountElement = document.getElementById('totalEventsCount');
    const footerUpcomingCountElement = document.getElementById('footerUpcomingCount');
    const footerCompletedCountElement = document.getElementById('footerCompletedCount');
    
    // Use real database data if available
    let eventsData = [];
    
    if (window.eventsData && Array.isArray(window.eventsData)) {
        eventsData = window.eventsData.map(item => ({
            id: item.id,
            eventName: item.eventName || '',
            description: item.description || '',
            leadPartner: item.leadPartner || '',
            coOrganizingPartners: item.coOrganizingPartners || '',
            targetAudience: item.targetAudience || '',
            keyObjectives: item.keyObjectives || '',
            programOutput: item.programOutput || '',
            eventDate: item.eventDate || '',
            eventTime: item.eventTime || '',
            format: item.format || '',
            location: item.location || '',
            status: item.status || 'Planning',
            responsiblePerson: item.responsiblePerson || '',
            requiredAttendees: item.requiredAttendees || '',
            materialsLink: item.materialsLink || '',
            reportLink: item.reportLink || '',
            reviewNotes: item.reviewNotes || ''
        }));
    } else {
        // No data available
        eventsData = [];
    }
    
    let filteredData = [...eventsData];
    let currentSort = { field: null, direction: 'asc' };
    
    // Initialize the page
    init();
    
    function init() {
        console.log('Initializing consortium events with', eventsData.length, 'events');
        populateMonthFilter();
        renderTable();
        updateStats();
        updateFooterStats();
        bindEvents();
    }
    
    function populateMonthFilter() {
        if (!monthFilter) return;
        
        const months = new Set();
        eventsData.forEach(event => {
            if (event.eventDate) {
                const date = new Date(event.eventDate);
                const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                months.add(monthYear);
            }
        });
        
        Array.from(months).sort().forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = month;
            monthFilter.appendChild(option);
        });
    }
    
    function bindEvents() {
        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
        
        // Filter functionality
        if (statusFilter) {
            statusFilter.addEventListener('change', handleFilter);
        }
        
        if (formatFilter) {
            formatFilter.addEventListener('change', handleFilter);
        }
        
        if (monthFilter) {
            monthFilter.addEventListener('change', handleFilter);
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
    
    function handleFilter(event) {
        performFilter();
    }
    
    function performFilter() {
        const searchTerm = (searchInput?.value || '').toLowerCase().trim();
        const statusValue = statusFilter?.value || '';
        const formatValue = formatFilter?.value || '';
        const monthValue = monthFilter?.value || '';
        
        filteredData = eventsData.filter(event => {
            // Search filter
            const matchesSearch = searchTerm === '' || 
                event.eventName.toLowerCase().includes(searchTerm) ||
                event.leadPartner.toLowerCase().includes(searchTerm) ||
                event.targetAudience.toLowerCase().includes(searchTerm) ||
                event.location.toLowerCase().includes(searchTerm) ||
                event.responsiblePerson.toLowerCase().includes(searchTerm);
            
            // Status filter
            const matchesStatus = statusValue === '' || event.status === statusValue;
            
            // Format filter
            const matchesFormat = formatValue === '' || event.format === formatValue;
            
            // Month filter
            let matchesMonth = true;
            if (monthValue && event.eventDate) {
                const date = new Date(event.eventDate);
                const eventMonth = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                matchesMonth = eventMonth === monthValue;
            }
            
            return matchesSearch && matchesStatus && matchesFormat && matchesMonth;
        });
        
        renderTable();
        updateStats();
        updateFooterStats();
    }
    
    function handleRefresh() {
        window.location.reload();
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
            if (field === 'eventDate') {
                valueA = valueA ? new Date(valueA) : new Date('9999-12-31');
                valueB = valueB ? new Date(valueB) : new Date('9999-12-31');
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
                    <td colspan="9" class="no-data">
                        <div class="empty-state">
                            <div class="empty-icon">📅</div>
                            <div class="empty-text">No events found</div>
                            <div class="empty-subtext">Try adjusting your search criteria or filters</div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = filteredData.map(event => `
            <tr>
                <td class="date-cell">
                    ${formatDate(event.eventDate)}
                    ${event.eventTime ? `<br><small>${event.eventTime}</small>` : ''}
                </td>
                <td class="event-name-cell">
                    <div class="event-name-text" title="${event.eventName}">
                        ${event.eventName}
                    </div>
                </td>
                <td>${event.leadPartner || '-'}</td>
                <td class="audience-cell">
                    <span class="audience-text" title="${event.targetAudience}">
                        ${truncate(event.targetAudience, 30)}
                    </span>
                </td>
                <td class="format-cell">
                    <span class="format-badge format-${(event.format || 'unknown').toLowerCase()}">
                        ${event.format || 'TBD'}
                    </span>
                </td>
                <td class="location-cell">
                    <span class="location-text" title="${event.location}">
                        ${truncate(event.location, 25)}
                    </span>
                </td>
                <td class="status-cell">
                    <span class="status-badge status-${event.status.toLowerCase()}">
                        ${event.status}
                    </span>
                </td>
                <td>${event.responsiblePerson || '-'}</td>
                <td class="actions-cell">
                    <button class="action-btn view" onclick="viewEventDetails('${event.id}')">
                        View
                    </button>
                    ${event.id ? `<a href="/forms/event/${event.id}/edit" class="action-btn edit">Edit</a>` : ''}
                </td>
            </tr>
        `).join('');
    }
    
    function updateStats() {
        const totalEvents = filteredData.length;
        const today = new Date();
        const upcomingEvents = filteredData.filter(e => {
            if (!e.eventDate) return false;
            return new Date(e.eventDate) >= today && e.status !== 'Completed' && e.status !== 'Cancelled';
        }).length;
        const completedEvents = filteredData.filter(e => e.status === 'Completed').length;
        
        const thisMonth = filteredData.filter(e => {
            if (!e.eventDate) return false;
            const eventDate = new Date(e.eventDate);
            return eventDate.getMonth() === today.getMonth() && 
                   eventDate.getFullYear() === today.getFullYear();
        }).length;
        
        if (totalEventsElement) {
            totalEventsElement.textContent = totalEvents.toLocaleString();
        }
        
        if (upcomingEventsElement) {
            upcomingEventsElement.textContent = upcomingEvents.toLocaleString();
        }
        
        if (completedEventsElement) {
            completedEventsElement.textContent = completedEvents.toLocaleString();
        }
        
        if (thisMonthEventsElement) {
            thisMonthEventsElement.textContent = thisMonth.toLocaleString();
        }
    }
    
    function updateFooterStats() {
        const totalEvents = filteredData.length;
        const today = new Date();
        const upcomingCount = filteredData.filter(e => {
            if (!e.eventDate) return false;
            return new Date(e.eventDate) >= today && e.status !== 'Completed' && e.status !== 'Cancelled';
        }).length;
        const completedCount = filteredData.filter(e => e.status === 'Completed').length;
        
        if (showingCountElement) {
            showingCountElement.textContent = totalEvents.toLocaleString();
        }
        
        if (totalCountElement) {
            totalCountElement.textContent = eventsData.length.toLocaleString();
        }
        
        if (footerUpcomingCountElement) {
            footerUpcomingCountElement.textContent = upcomingCount.toLocaleString();
        }
        
        if (footerCompletedCountElement) {
            footerCompletedCountElement.textContent = completedCount.toLocaleString();
        }
    }
    
    function handleExport() {
        try {
            const csvContent = generateEventsCSV();
            downloadCSV(csvContent, 'consortium-events.csv');
            showNotification('Events exported successfully!', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            showNotification('Export failed. Please try again.', 'error');
        }
    }
    
    function generateEventsCSV() {
        const headers = [
            'Date',
            'Event Name',
            'Lead Partner',
            'Target Audience',
            'Format',
            'Location',
            'Status',
            'Responsible Person',
            'Key Objectives'
        ];
        
        let csv = headers.join(',') + '\n';
        
        filteredData.forEach(event => {
            const row = [
                event.eventDate || '',
                `"${event.eventName}"`,
                `"${event.leadPartner}"`,
                `"${event.targetAudience}"`,
                event.format || '',
                `"${event.location}"`,
                event.status,
                `"${event.responsiblePerson}"`,
                `"${event.keyObjectives}"`
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
        if (!dateString || dateString === '-') return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        });
    }
    
    function truncate(str, maxLength) {
        if (!str) return '-';
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
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
    window.viewEventDetails = function(eventId) {
        const event = eventsData.find(e => e.id === eventId);
        
        if (event) {
            const details = `
Event Details

Event: ${event.eventName}
Date: ${formatDate(event.eventDate)} ${event.eventTime ? `at ${event.eventTime}` : ''}

Lead Partner: ${event.leadPartner || 'Not specified'}
Co-Organizing Partners: ${event.coOrganizingPartners || 'None'}

Format: ${event.format || 'TBD'}
Location: ${event.location || 'TBD'}

Target Audience: ${event.targetAudience || 'Not specified'}
Key Objectives: ${event.keyObjectives || 'Not specified'}

Status: ${event.status}
Responsible Person: ${event.responsiblePerson || 'Not assigned'}

${event.materialsLink ? `Materials: ${event.materialsLink}` : ''}
${event.reportLink ? `Report: ${event.reportLink}` : ''}
${event.reviewNotes ? `Notes: ${event.reviewNotes}` : ''}
            `.trim();
            
            alert(details);
        }
    };
});

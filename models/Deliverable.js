/**
 * Deliverable Model
 * Represents a deliverable/milestone in the system with validation and formatting
 */

class Deliverable {
    constructor(data = {}) {
        // Required fields
        this.id = data.id || null;
        this.deliverableName = data.deliverableName || '';
        this.partnerId = data.partnerId || '';
        this.partnerName = data.partnerName || '';
        this.description = data.description || '';
        this.dueDate = data.dueDate || '';
        this.assignedTo = data.assignedTo || '';
        this.status = data.status || 'not-started';
        this.priority = data.priority || 'medium';
        this.completionPercentage = parseInt(data.completionPercentage) || 0;
        
        // Metadata
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
    }

    // Validation
    validate() {
        const errors = [];

        // Required field validation
        if (!this.deliverableName?.trim()) {
            errors.push('Deliverable name is required');
        }

        if (!this.partnerName?.trim()) {
            errors.push('Partner name is required');
        }

        if (!this.dueDate?.trim()) {
            errors.push('Due date is required');
        }

        if (!this.assignedTo?.trim()) {
            errors.push('Assigned person is required');
        }

        // Format validation
        if (this.dueDate && !this.isValidDate(this.dueDate)) {
            errors.push('Due date must be a valid date');
        }

        // Status validation
        const validStatuses = ['not-started', 'in-progress', 'review', 'completed', 'overdue'];
        if (!validStatuses.includes(this.status)) {
            errors.push('Invalid status selected');
        }

        // Priority validation
        const validPriorities = ['low', 'medium', 'high', 'critical'];
        if (!validPriorities.includes(this.priority)) {
            errors.push('Invalid priority selected');
        }

        // Completion percentage validation
        if (this.completionPercentage < 0 || this.completionPercentage > 100) {
            errors.push('Completion percentage must be between 0 and 100');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Helper method to validate date format
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
    }

    // Format data for database storage
    toDatabaseFormat() {
        return {
            deliverableName: this.deliverableName.trim(),
            partnerId: this.partnerId?.trim() || null,
            partnerName: this.partnerName.trim(),
            description: this.description?.trim() || null,
            dueDate: this.dueDate,
            assignedTo: this.assignedTo.trim(),
            status: this.status,
            priority: this.priority,
            completionPercentage: this.completionPercentage
        };
    }

    // Format data for API response
    toJSON() {
        return {
            id: this.id,
            deliverableName: this.deliverableName,
            partnerId: this.partnerId,
            partnerName: this.partnerName,
            description: this.description,
            dueDate: this.dueDate,
            assignedTo: this.assignedTo,
            status: this.status,
            priority: this.priority,
            completionPercentage: this.completionPercentage,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            formattedDueDate: this.getFormattedDueDate(),
            statusLabel: this.getStatusLabel(),
            priorityLabel: this.getPriorityLabel(),
            isOverdue: this.isOverdue(),
            daysUntilDue: this.getDaysUntilDue()
        };
    }

    // Get summary data for lists
    getSummary() {
        return {
            id: this.id,
            deliverableName: this.deliverableName,
            partnerName: this.partnerName,
            status: this.status,
            priority: this.priority,
            dueDate: this.dueDate,
            completionPercentage: this.completionPercentage,
            isOverdue: this.isOverdue()
        };
    }

    // Format due date for display
    getFormattedDueDate() {
        if (!this.dueDate) return 'No due date';
        
        try {
            const date = new Date(this.dueDate);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return this.dueDate;
        }
    }

    // Get status label
    getStatusLabel() {
        const statusLabels = {
            'not-started': 'Not Started',
            'in-progress': 'In Progress', 
            'review': 'Under Review',
            'completed': 'Completed',
            'overdue': 'Overdue'
        };
        return statusLabels[this.status] || this.status;
    }

    // Get priority label
    getPriorityLabel() {
        const priorityLabels = {
            'low': 'Low',
            'medium': 'Medium',
            'high': 'High',
            'critical': 'Critical'
        };
        return priorityLabels[this.priority] || this.priority;
    }

    // Check if deliverable is overdue
    isOverdue() {
        if (!this.dueDate || this.status === 'completed') return false;
        
        try {
            const today = new Date();
            const due = new Date(this.dueDate);
            return due < today;
        } catch (error) {
            return false;
        }
    }

    // Get days until due
    getDaysUntilDue() {
        if (!this.dueDate) return null;
        
        try {
            const today = new Date();
            const due = new Date(this.dueDate);
            const diffTime = due - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        } catch (error) {
            return null;
        }
    }

    // Get status color class
    getStatusColorClass() {
        const statusColors = {
            'not-started': 'secondary',
            'in-progress': 'primary',
            'review': 'warning',
            'completed': 'success',
            'overdue': 'danger'
        };
        return statusColors[this.status] || 'secondary';
    }

    // Get priority color class
    getPriorityColorClass() {
        const priorityColors = {
            'low': 'success',
            'medium': 'primary',
            'high': 'warning',
            'critical': 'danger'
        };
        return priorityColors[this.priority] || 'primary';
    }

    // Static method to create from database record
    static fromDatabase(record) {
        if (!record) return null;
        return new Deliverable(record);
    }

    // Static method to create multiple from database records
    static fromDatabaseArray(records) {
        if (!Array.isArray(records)) return [];
        return records.map(record => new Deliverable(record));
    }

    // Static method to get available statuses
    static getAvailableStatuses() {
        return [
            { value: 'not-started', label: 'Not Started', color: 'secondary' },
            { value: 'in-progress', label: 'In Progress', color: 'primary' },
            { value: 'review', label: 'Under Review', color: 'warning' },
            { value: 'completed', label: 'Completed', color: 'success' },
            { value: 'overdue', label: 'Overdue', color: 'danger' }
        ];
    }

    // Static method to get available priorities
    static getAvailablePriorities() {
        return [
            { value: 'low', label: 'Low', color: 'success' },
            { value: 'medium', label: 'Medium', color: 'primary' },
            { value: 'high', label: 'High', color: 'warning' },
            { value: 'critical', label: 'Critical', color: 'danger' }
        ];
    }
}

module.exports = Deliverable;
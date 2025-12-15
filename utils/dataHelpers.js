const logger = require('./logger');

function safeGetSummary(item) {
    try {
        if (!item) {
            return null;
        }
        
        if (item && typeof item.getSummary === 'function') {
            return item.getSummary();
        }
        
        // Fallback for personnel objects
        if (item.fullName) {
            return {
                id: item.id,
                fullName: item.fullName,
                jobTitle: item.jobTitle,
                partnerName: item.partnerName,
                partnerType: item.partnerType,
                emailAddress: item.emailAddress,
                phoneNumber: item.phoneNumber,
                workStatus: item.workStatus,
                department: item.department,
                seniority: item.seniority,
                responsibilities: item.responsibilities,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
            };
        }
        
        // Fallback for partner objects
        if (item.partnerName) {
            return {
                id: item.id,
                partnerName: item.partnerName,
                partnerType: item.partnerType,
                contactEmail: item.contactEmail,
                contactPhone: item.contactPhone,
                keyPersonnel: item.keyPersonnel,
                regionsOfOperation: item.regionsOfOperation,
                contractStatus: item.contractStatus,
                contractValue: item.contractValue,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
            };
        }
        
        // Fallback for external partner objects
        if (item.keyContact) {
            return {
                id: item.id,
                partnerName: item.partnerName || item.name,
                partnerType: item.partnerType,
                keyContact: item.keyContact,
                contactEmail: item.contactEmail,
                contactPhone: item.contactPhone,
                currentStage: item.currentStage,
                status: item.status,
                region: item.region,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
            };
        }
        
        // Generic fallback - return the item as-is
        return item;
    } catch (error) {
        logger.error('Error in safeGetSummary', { 
            error: error.message, 
            itemType: typeof item,
            hasGetSummary: item && typeof item.getSummary === 'function'
        });
        return item;
    }
}

function formatDate(date) {
    if (!date) return '';
    
    try {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        logger.warn('Error formatting date', { error: error.message, date });
        return date.toString();
    }
}

function formatCurrency(amount) {
    if (!amount) return '$0';
    
    try {
        const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[,$]/g, '')) : amount;
        
        if (isNaN(numAmount)) return '$0';
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(numAmount);
    } catch (error) {
        logger.warn('Error formatting currency', { error: error.message, amount });
        return `$${amount}`;
    }
}

function formatPhone(phone) {
    if (!phone) return '';
    
    try {
        // Remove all non-digit characters
        const cleaned = phone.replace(/\D/g, '');
        
        // Format based on length
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        } else if (cleaned.length === 11 && cleaned[0] === '1') {
            return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
        }
        
        // Return original if can't format
        return phone;
    } catch (error) {
        logger.warn('Error formatting phone', { error: error.message, phone });
        return phone;
    }
}

function truncateText(text, maxLength = 100) {
    if (!text) return '';
    
    try {
        if (text.length <= maxLength) return text;
        
        return text.substring(0, maxLength).trim() + '...';
    } catch (error) {
        logger.warn('Error truncating text', { error: error.message, textLength: text?.length });
        return text;
    }
}

function getStatusBadgeClass(status) {
    if (!status) return 'badge-secondary';
    
    const statusLower = status.toLowerCase();
    
    switch (statusLower) {
        case 'active':
        case 'completed':
        case 'approved':
        case 'paid':
            return 'badge-success';
        case 'pending':
        case 'in progress':
        case 'review':
            return 'badge-warning';
        case 'inactive':
        case 'cancelled':
        case 'rejected':
        case 'overdue':
            return 'badge-danger';
        case 'draft':
            return 'badge-info';
        default:
            return 'badge-secondary';
    }
}

function getPriorityClass(priority) {
    if (!priority) return 'priority-medium';
    
    const priorityLower = priority.toLowerCase();
    
    switch (priorityLower) {
        case 'high':
        case 'urgent':
            return 'priority-high';
        case 'medium':
        case 'normal':
            return 'priority-medium';
        case 'low':
            return 'priority-low';
        default:
            return 'priority-medium';
    }
}

function calculateDaysUntilDue(dueDate) {
    if (!dueDate) return null;
    
    try {
        const due = new Date(dueDate);
        const today = new Date();
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    } catch (error) {
        logger.warn('Error calculating days until due', { error: error.message, dueDate });
        return null;
    }
}

function isOverdue(dueDate) {
    const days = calculateDaysUntilDue(dueDate);
    return days !== null && days < 0;
}

function generateId(prefix = '') {
    try {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 5);
        return `${prefix}${timestamp}-${random}`.toUpperCase();
    } catch (error) {
        logger.error('Error generating ID', { error: error.message, prefix });
        return `${prefix}${Date.now()}`;
    }
}

function validateEmail(email) {
    if (!email) return false;
    
    try {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    } catch (error) {
        logger.warn('Error validating email', { error: error.message, email });
        return false;
    }
}

function validatePhone(phone) {
    if (!phone) return false;
    
    try {
        // Remove all non-digit characters
        const cleaned = phone.replace(/\D/g, '');
        
        // Check if it's a valid length (10 or 11 digits)
        return cleaned.length === 10 || (cleaned.length === 11 && cleaned[0] === '1');
    } catch (error) {
        logger.warn('Error validating phone', { error: error.message, phone });
        return false;
    }
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    try {
        return input
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .substring(0, 1000); // Limit length
    } catch (error) {
        logger.warn('Error sanitizing input', { error: error.message, inputType: typeof input });
        return input;
    }
}

function deepClone(obj) {
    try {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => deepClone(item));
        if (obj instanceof Object) {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    } catch (error) {
        logger.error('Error in deep clone', { error: error.message, objType: typeof obj });
        return obj;
    }
}

function extractInitials(name) {
    if (!name) return '';
    
    try {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 3);
    } catch (error) {
        logger.warn('Error extracting initials', { error: error.message, name });
        return '';
    }
}

module.exports = {
    safeGetSummary,
    formatDate,
    formatCurrency,
    formatPhone,
    truncateText,
    getStatusBadgeClass,
    getPriorityClass,
    calculateDaysUntilDue,
    isOverdue,
    generateId,
    validateEmail,
    validatePhone,
    sanitizeInput,
    deepClone,
    extractInitials
};
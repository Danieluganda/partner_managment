// Personnel model for Key Personnel Directory
class Personnel {
    constructor(data = {}) {
        // Core identification
        this.id = data.id || null;
        
        // Partner Association
        this.partnerType = data.partnerType || '';
        this.partnerId = data.partnerId || null;
        this.partnerName = data.partnerName || '';
        this.partnerStatus = data.partnerStatus || '';
        
        // Personal Information
        this.fullName = data.fullName || '';
        this.jobTitle = data.jobTitle || '';
        this.department = data.department || '';
        this.seniority = data.seniority || '';
        
        // Contact Information
        this.emailAddress = data.emailAddress || '';
        this.phoneNumber = data.phoneNumber || '';
        this.alternateEmail = data.alternateEmail || '';
        this.alternatePhone = data.alternatePhone || '';
        
        // Work Information
        this.officeLocation = data.officeLocation || '';
        this.reportsTo = data.reportsTo || '';
        this.workStatus = data.workStatus || 'Active';
        this.preferredContact = data.preferredContact || 'Email';
        
        // Responsibilities & Projects
        this.responsibilities = data.responsibilities || '';
        this.projectAssignments = data.projectAssignments || '';
        this.teamMembers = data.teamMembers || '';
        
        // Additional Information
        this.skills = data.skills || '';
        this.notes = data.notes || '';
        
        // Timestamps
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
    }

    // Create a summary object for displays
    getSummary() {
        return {
            id: this.id,
            fullName: this.fullName,
            jobTitle: this.jobTitle,
            partnerName: this.partnerName,
            partnerType: this.partnerType,
            emailAddress: this.emailAddress,
            phoneNumber: this.phoneNumber,
            workStatus: this.workStatus,
            department: this.department,
            seniority: this.seniority,
            responsibilities: this.responsibilities,
            partnerId: this.partnerId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Get contact information for quick access
    getContactInfo() {
        return {
            name: this.fullName,
            email: this.emailAddress,
            phone: this.phoneNumber,
            title: this.jobTitle
        };
    }

    // Check if personnel is active
    isActive() {
        return this.workStatus === 'Active';
    }

    // Get display name
    getDisplayName() {
        return `${this.fullName} (${this.jobTitle})`;
    }

    // Get professional information
    getProfessionalInfo() {
        return {
            title: this.jobTitle,
            department: this.department,
            seniority: this.seniority,
            reportsTo: this.reportsTo,
            workStatus: this.workStatus,
            responsibilities: this.responsibilities,
            projects: this.projectAssignments,
            team: this.teamMembers,
            skills: this.skills
        };
    }

    // Get partner association details
    getPartnerInfo() {
        return {
            type: this.partnerType,
            id: this.partnerId,
            name: this.partnerName,
            status: this.partnerStatus
        };
    }

    // Validate personnel data
    validate() {
        const errors = [];

        // Required fields validation
        if (!this.fullName?.trim()) {
            errors.push('Full name is required');
        }

        if (!this.jobTitle?.trim()) {
            errors.push('Job title is required');
        }

        if (!this.emailAddress?.trim()) {
            errors.push('Email address is required');
        }

        if (!this.partnerType?.trim()) {
            errors.push('Partner type is required');
        }

        if (!this.partnerId?.trim()) {
            errors.push('Partner selection is required');
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (this.emailAddress && !emailRegex.test(this.emailAddress)) {
            errors.push('Primary email address format is invalid');
        }

        if (this.alternateEmail && !emailRegex.test(this.alternateEmail)) {
            errors.push('Alternate email address format is invalid');
        }

        // Phone number validation (basic)
        const phoneRegex = /^(\+\d{1,3}[\s-]?)?\d{10,15}$/;
        if (this.phoneNumber && !phoneRegex.test(this.phoneNumber.replace(/[\s-]/g, ''))) {
            errors.push('Primary phone number format is invalid');
        }

        if (this.alternatePhone && !phoneRegex.test(this.alternatePhone.replace(/[\s-]/g, ''))) {
            errors.push('Alternate phone number format is invalid');
        }

        // Partner type validation
        const validPartnerTypes = ['internal', 'external'];
        if (this.partnerType && !validPartnerTypes.includes(this.partnerType)) {
            errors.push('Partner type must be either internal or external');
        }

        // Work status validation
        const validWorkStatuses = ['Active', 'On Leave', 'Inactive', 'Terminated'];
        if (this.workStatus && !validWorkStatuses.includes(this.workStatus)) {
            errors.push('Work status must be one of: Active, On Leave, Inactive, Terminated');
        }

        // Department validation
        const validDepartments = [
            'Executive', 'Operations', 'Technology', 'Finance', 
            'Human Resources', 'Marketing', 'Sales', 'Legal', 'Compliance', 'Other'
        ];
        if (this.department && !validDepartments.includes(this.department)) {
            errors.push('Department must be one of the predefined options');
        }

        // Seniority validation
        const validSeniorities = [
            'C-Level', 'Senior Management', 'Middle Management', 
            'Team Lead', 'Senior', 'Mid-Level', 'Junior'
        ];
        if (this.seniority && !validSeniorities.includes(this.seniority)) {
            errors.push('Seniority level must be one of the predefined options');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Format data for database storage
    toDatabase() {
        const validation = this.validate();
        if (!validation.isValid) {
            throw new Error(`Personnel validation failed: ${validation.errors.join(', ')}`);
        }

        return {
            // Partner Association
            partnerType: this.partnerType,
            partnerId: this.partnerId,
            partnerName: this.partnerName,
            partnerStatus: this.partnerStatus,
            
            // Personal Information
            fullName: this.fullName.trim(),
            jobTitle: this.jobTitle.trim(),
            department: this.department || null,
            seniority: this.seniority || null,
            
            // Contact Information
            emailAddress: this.emailAddress.trim().toLowerCase(),
            phoneNumber: this.phoneNumber || null,
            alternateEmail: this.alternateEmail?.trim().toLowerCase() || null,
            alternatePhone: this.alternatePhone || null,
            
            // Work Information
            officeLocation: this.officeLocation || null,
            reportsTo: this.reportsTo || null,
            workStatus: this.workStatus || 'Active',
            preferredContact: this.preferredContact || 'Email',
            
            // Responsibilities & Projects
            responsibilities: this.responsibilities || null,
            projectAssignments: this.projectAssignments || null,
            teamMembers: this.teamMembers || null,
            
            // Additional Information
            skills: this.skills || null,
            notes: this.notes || null
        };
    }

    // Create Personnel instance from database record
    static fromDatabase(record) {
        if (!record) return null;
        
        return new Personnel({
            id: record.id,
            partnerType: record.partnerType,
            partnerId: record.partnerId,
            partnerName: record.partnerName,
            partnerStatus: record.partnerStatus,
            fullName: record.fullName,
            jobTitle: record.jobTitle,
            department: record.department,
            seniority: record.seniority,
            emailAddress: record.emailAddress,
            phoneNumber: record.phoneNumber,
            alternateEmail: record.alternateEmail,
            alternatePhone: record.alternatePhone,
            officeLocation: record.officeLocation,
            reportsTo: record.reportsTo,
            workStatus: record.workStatus,
            preferredContact: record.preferredContact,
            responsibilities: record.responsibilities,
            projectAssignments: record.projectAssignments,
            teamMembers: record.teamMembers,
            skills: record.skills,
            notes: record.notes,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt
        });
    }

    // Get display-friendly values
    getDisplayValues() {
        return {
            id: this.id,
            fullName: this.fullName,
            jobTitle: this.jobTitle,
            department: this.department || 'Not specified',
            seniority: this.seniority || 'Not specified',
            emailAddress: this.emailAddress,
            phoneNumber: this.phoneNumber || 'Not provided',
            alternateEmail: this.alternateEmail || 'Not provided',
            alternatePhone: this.alternatePhone || 'Not provided',
            partnerName: this.partnerName || 'Not assigned',
            partnerType: this.partnerType === 'internal' ? 'Internal Partner' : 'External Partner',
            workStatus: this.workStatus || 'Active',
            officeLocation: this.officeLocation || 'Not specified',
            preferredContact: this.preferredContact || 'Email',
            reportsTo: this.reportsTo || 'Not specified',
            responsibilities: this.responsibilities || 'Not specified',
            projectAssignments: this.projectAssignments || 'None assigned',
            teamMembers: this.teamMembers || 'None specified',
            skills: this.skills || 'Not specified',
            notes: this.notes || 'No notes'
        };
    }

    // Search functionality
    static searchFields() {
        return [
            'fullName', 'jobTitle', 'department', 'emailAddress', 
            'partnerName', 'officeLocation', 'responsibilities', 
            'skills', 'notes'
        ];
    }

    // Check if personnel matches search term
    matchesSearch(searchTerm) {
        if (!searchTerm) return true;
        
        const term = searchTerm.toLowerCase();
        const searchableFields = Personnel.searchFields();
        
        return searchableFields.some(field => {
            const value = this[field];
            return value && value.toString().toLowerCase().includes(term);
        });
    }

    // Get status badge info for UI display
    getStatusBadge() {
        const statusMap = {
            'Active': { class: 'status-active', icon: '✅' },
            'On Leave': { class: 'status-leave', icon: '🏖️' },
            'Inactive': { class: 'status-inactive', icon: '⏸️' },
            'Terminated': { class: 'status-terminated', icon: '❌' }
        };
        
        return statusMap[this.workStatus] || { class: 'status-unknown', icon: '❓' };
    }

    // Get partner type badge info for UI display
    getPartnerTypeBadge() {
        const typeMap = {
            'internal': { class: 'partner-internal', icon: '🏢', label: 'Internal' },
            'external': { class: 'partner-external', icon: '🤝', label: 'External' }
        };
        
        return typeMap[this.partnerType] || { class: 'partner-unknown', icon: '❓', label: 'Unknown' };
    }

    // Export to various formats
    toJSON() {
        return this.getDisplayValues();
    }

    toString() {
        return `${this.fullName} (${this.jobTitle}) - ${this.partnerName}`;
    }
}

module.exports = Personnel;
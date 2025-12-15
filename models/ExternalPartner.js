// External Partner Data Model
class ExternalPartner {
    constructor(data = {}) {
        // Support both database field names and old JSON field names for backward compatibility
        this.partnerName = data.partnerName || data['Partner Name'] || '';
        this.keyContact = data.keyContact || data['Key Contact & Details'] || '';
        this.dateInitiated = data.dateInitiated || data['Date Initiated'] || '';
        this.currentStage = data.currentStage || data['Current Stage'] || '';
        this.keyObjectives = data.keyObjectives || data['Key Objectives / Focus Areas'] || '';
        this.status = data.status || data['Status'] || '';
        this.pendingTasks = data.pendingTasks || data['Pending Tasks & Next Steps'] || '';
        this.responsiblePerson = data.responsible || data['Responsible Person(s)'] || '';
        this.deadline = data.deadline || data['Deadline'] || '';
        this.notes = data.notesBlockers || data['Notes & Blockers'] || '';
        
        // Additional database fields
        this.id = data.id || '';
        this.partnerType = data.partnerType || '';
        this.contactEmail = data.contactEmail || '';
        this.contactPhone = data.contactPhone || '';
        this.estimatedValue = data.estimatedValue || '';
        this.priority = data.priority || '';
        this.region = data.region || '';
        this.tags = data.tags || '';
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
    }

    // Get formatted date initiated
    getFormattedDateInitiated() {
        if (!this.dateInitiated) return '-';
        return new Date(this.dateInitiated).toLocaleDateString('en-US');
    }

    // Get status class for styling
    getStatusClass() {
        if (!this.status) return 'unknown';
        
        switch (this.status.toLowerCase()) {
            case 'on track':
                return 'approved';
            case 'needs attention':
                return 'warning';
            case 'stalled / blocked':
            case 'stalled':
            case 'blocked':
                return 'danger';
            case 'not started / exploratory':
            case 'not started':
            case 'exploratory':
                return 'pending';
            default:
                return 'unknown';
        }
    }

    // Get current stage class
    getStageClass() {
        if (!this.currentStage) return 'stage-unknown';
        
        const stage = this.currentStage.toLowerCase();
        if (stage.includes('exploratory')) return 'stage-exploratory';
        if (stage.includes('mou') || stage.includes('drafting')) return 'stage-mou';
        if (stage.includes('review')) return 'stage-review';
        if (stage.includes('sign-off')) return 'stage-signoff';
        if (stage.includes('activation')) return 'stage-activation';
        return 'stage-other';
    }

    // Check if deadline is approaching (within 7 days)
    isDeadlineApproaching() {
        if (!this.deadline || this.deadline === '-' || this.deadline === 'ASAP') return false;
        
        const deadlineDate = new Date(this.deadline);
        const today = new Date();
        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays <= 7 && diffDays >= 0;
    }

    // Check if deadline is overdue
    isOverdue() {
        if (!this.deadline || this.deadline === '-' || this.deadline === 'ASAP') return false;
        
        const deadlineDate = new Date(this.deadline);
        const today = new Date();
        
        return deadlineDate < today;
    }

    // Get priority level based on status and deadlines
    getPriority() {
        if (this.isOverdue()) return 'high';
        if (this.isDeadlineApproaching()) return 'medium';
        if (this.getStatusClass() === 'danger') return 'high';
        if (this.getStatusClass() === 'warning') return 'medium';
        return 'normal';
    }

    // Get objectives as array
    getObjectivesArray() {
        if (!this.keyObjectives) return [];
        return this.keyObjectives.split(',').map(obj => obj.trim());
    }

    // Get responsible persons as array
    getResponsiblePersonsArray() {
        if (!this.responsiblePerson) return [];
        return this.responsiblePerson.split(',').map(person => person.trim());
    }

    // Check if partner has complete information
    isComplete() {
        return !!(
            this.partnerName &&
            this.keyContact &&
            this.currentStage &&
            this.status &&
            this.responsiblePerson
        );
    }

    // Get summary for dashboard
    getSummary() {
        return {
            id: this.id,
            name: this.partnerName,
            partnerType: this.partnerType,
            contact: this.keyContact || 'Not specified',
            contactEmail: this.contactEmail,
            contactPhone: this.contactPhone,
            stage: this.currentStage || 'Not specified',
            status: this.status || 'Unknown',
            statusClass: this.getStatusClass(),
            stageClass: this.getStageClass(),
            priority: this.priority || this.getPriority(),
            isComplete: this.isComplete(),
            isOverdue: this.isOverdue(),
            isDeadlineApproaching: this.isDeadlineApproaching(),
            objectives: this.getObjectivesArray(),
            responsiblePersons: this.getResponsiblePersonsArray(),
            responsible: this.responsiblePerson,
            deadline: this.deadline,
            estimatedValue: this.estimatedValue,
            region: this.region,
            tags: this.tags,
            createdAt: this.createdAt,
            
            // Legacy field names for compatibility
            'Partner Name': this.partnerName,
            'Key Contact & Details': this.keyContact,
            'Current Stage': this.currentStage,
            'Status': this.status,
            'Responsible Person(s)': this.responsiblePerson,
            'Deadline': this.deadline
        };
    }
}

module.exports = ExternalPartner;
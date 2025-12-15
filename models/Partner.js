// Partner Data Model
class Partner {
    constructor(data = {}) {
        // Support both database field names and old JSON field names for backward compatibility
        this.id = data.id || data['Partner ID'] || '';
        this.name = data.partnerName || data['Partner Name'] || '';
        this.contractStatus = data.contractStatus || data['Contract Status'] || '';
        this.frameworkAgreementDate = data.frameworkAgreementDate || data['Framework Agreement Date'] || null;
        this.commencementDate = data.commencementDate || data['Commencement Date'] || null;
        this.termYears = data.termYears || data['Term (Years)'] || 0;
        this.currentTaskOrder = data.currentTaskOrder || data['Current Task Order'] || '';
        this.regionsOfOperation = data.regionsOfOperation || data['Regions of Operation'] || '';
        this.keyPersonnel = data.keyPersonnel || data['Key Personnel'] || '';
        this.taskOrderPrice = data.taskOrderPrice || data['Task Order Price (Y1)'] || '';
        this.contractLink = data.contractLink || data['Contract Link'] || '';
        
        // Additional database fields
        this.partnerType = data.partnerType || '';
        this.contactEmail = data.contactEmail || '';
        this.contactPhone = data.contactPhone || '';
        this.contractValue = data.contractValue || '';
        this.contractStartDate = data.contractStartDate || '';
        this.contractEndDate = data.contractEndDate || '';
        this.contractDuration = data.contractDuration || '';
        
        // Financial fields
        this.budgetAllocated = data.budgetAllocated || 0;
        this.actualSpent = data.actualSpent || 0;
        this.financialStatus = data.financialStatus || '';
        this.paymentSchedule = data.paymentSchedule || '';
        this.lastPaymentDate = data.lastPaymentDate || null;
        this.nextPaymentDue = data.nextPaymentDue || null;
        this.q1ActualPaid = data.q1ActualPaid || 0;
        this.q2ActualPaid = data.q2ActualPaid || 0;
        this.q3ActualPaid = data.q3ActualPaid || 0;
        this.q4ActualPaid = data.q4ActualPaid || 0;
        this.utilizationRate = data.utilizationRate || 0;
        this.comments = data.comments || data.financialComments || '';
        
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
    }

    // Convert timestamp to readable date
    getFormattedFrameworkDate() {
        if (!this.frameworkAgreementDate || this.frameworkAgreementDate === '-') return '-';
        return new Date(this.frameworkAgreementDate).toLocaleDateString('en-US');
    }

    getFormattedCommencementDate() {
        if (!this.commencementDate || this.commencementDate === '-') return '-';
        return new Date(this.commencementDate).toLocaleDateString('en-US');
    }

    // Get contract status badge class
    getStatusClass() {
        switch (this.contractStatus.toLowerCase()) {
            case 'signed':
                return 'signed';
            case 'in contracting':
                return 'contracting';
            default:
                return 'pending';
        }
    }

    // Extract numeric value from price string
    getNumericPrice() {
        if (!this.taskOrderPrice || this.taskOrderPrice === '-') return 0;
        const numericString = this.taskOrderPrice.replace(/[^0-9]/g, '');
        return parseInt(numericString) || 0;
    }

    // Get regions as array
    getRegionsArray() {
        if (!this.regionsOfOperation || this.regionsOfOperation === '-') return [];
        return this.regionsOfOperation.split(',').map(region => region.trim());
    }

    // Check if partner is active (signed contract)
    isActive() {
        return this.contractStatus.toLowerCase() === 'signed';
    }

    // Get partner summary for dashboard
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            partnerType: this.partnerType,
            status: this.contractStatus,
            statusClass: this.getStatusClass(),
            regions: this.getRegionsArray(),
            regionsCount: this.getRegionsArray().length,
            keyPersonnel: this.keyPersonnel,
            taskOrderPrice: this.taskOrderPrice,
            contractValue: this.contractValue,
            contactEmail: this.contactEmail,
            contactPhone: this.contactPhone,
            contractStartDate: this.contractStartDate,
            contractEndDate: this.contractEndDate,
            
            // Financial fields
            budgetAllocated: this.budgetAllocated,
            actualSpent: this.actualSpent,
            financialStatus: this.financialStatus,
            paymentSchedule: this.paymentSchedule,
            lastPaymentDate: this.lastPaymentDate,
            nextPaymentDue: this.nextPaymentDue,
            q1ActualPaid: this.q1ActualPaid,
            q2ActualPaid: this.q2ActualPaid,
            q3ActualPaid: this.q3ActualPaid,
            q4ActualPaid: this.q4ActualPaid,
            utilizationRate: this.utilizationRate,
            comments: this.comments,
            
            price: this.getNumericPrice(),
            formattedPrice: this.taskOrderPrice,
            isActive: this.isActive(),
            createdAt: this.createdAt,
            
            // Legacy field names for compatibility
            'Partner ID': this.id,
            'Partner Name': this.name,
            'Contract Status': this.contractStatus,
            'Regions of Operation': this.regionsOfOperation,
            'Key Personnel': this.keyPersonnel,
            'Task Order Price (Y1)': this.taskOrderPrice
        };
    }
}

module.exports = Partner;
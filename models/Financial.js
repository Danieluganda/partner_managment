// Financial Data Model
class Financial {
    constructor(data = {}) {
        // Support both database field names and old JSON field names for backward compatibility
        this.id = data.id || '';
        this.partnerId = data.partnerId || data['Partner ID'] || '';
        this.partnerName = data.partnerName || data['Partner Name'] || '';
        this.contractValue = data.contractValue || data['Total Task Order Price'] || '';
        this.budgetAllocated = data.budgetAllocated || '';
        this.actualSpent = data.actualSpent || '';
        this.remainingBudget = data.remainingBudget || '';
        this.paymentSchedule = data.paymentSchedule || '';
        this.lastPaymentDate = data.lastPaymentDate || '';
        this.nextPaymentDue = data.nextPaymentDue || '';
        this.financialStatus = data.financialStatus || '';
        
        // Legacy fields for backward compatibility
        this.totalTaskOrderPrice = data.contractValue || data['Total Task Order Price'] || null;
        this.q1Advance = data['Q1 Advance'] || null;
        this.q1ActualPaid = data['Q1 Actual Paid'] || null;
        this.q1ReportReceived = data['Q1 Report Received'] || null;
        this.q1ReportApproved = data['Q1 Report Approved'] || null;
        this.q2Advance = data['Q2 Advance'] || null;
        this.q2ActualPaid = data['Q2 Actual Paid'] || null;
        this.q2ReportReceived = data['Q2 Report Received'] || null;
        this.q2ReportApproved = data['Q2 Report Approved'] || null;
        this.q3Advance = data['Q3 Advance'] || null;
        this.q3ActualPaid = data['Q3 Actual Paid'] || null;
        this.q4Advance = data['Q4 Advance'] || null;
        this.q4ActualPaid = data['Q4 Actual Paid'] || null;
        this.totalDisbursed = data['Total Disbursed'] || null;
        this.utilizationRate = data['Utilization Rate'] || null;
        this.comments = data['Comments'] || null;
        
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
    }

    // Get formatted utilization rate
    getFormattedUtilizationRate() {
        if (!this.utilizationRate) return '-';
        return `${(this.utilizationRate * 100).toFixed(1)}%`;
    }

    // Get report status class
    getReportStatusClass(quarter) {
        const reportReceived = this[`q${quarter}ReportReceived`];
        if (reportReceived === 'Yes') return 'approved';
        if (reportReceived === 'No') return 'pending';
        return 'unknown';
    }

    // Calculate total payments made
    getTotalPayments() {
        let total = 0;
        for (let i = 1; i <= 4; i++) {
            const payment = this[`q${i}ActualPaid`];
            if (payment && typeof payment === 'number') {
                total += payment;
            }
        }
        return total;
    }

    // Get quarterly payment summary
    getQuarterlySummary() {
        return {
            q1: {
                advance: this.q1Advance || 0,
                paid: this.q1ActualPaid || 0,
                reportReceived: this.q1ReportReceived || 'Pending',
                reportApproved: this.q1ReportApproved || 'Pending',
                statusClass: this.getReportStatusClass(1)
            },
            q2: {
                advance: this.q2Advance || 0,
                paid: this.q2ActualPaid || 0,
                reportReceived: this.q2ReportReceived || 'Pending',
                reportApproved: this.q2ReportApproved || 'Pending',
                statusClass: this.getReportStatusClass(2)
            },
            q3: {
                advance: this.q3Advance || 0,
                paid: this.q3ActualPaid || 0,
                reportReceived: this.q3ReportReceived || 'Pending',
                reportApproved: this.q3ReportApproved || 'Pending',
                statusClass: this.getReportStatusClass(3)
            },
            q4: {
                advance: this.q4Advance || 0,
                paid: this.q4ActualPaid || 0,
                reportReceived: this.q4ReportReceived || 'Pending',
                reportApproved: this.q4ReportApproved || 'Pending',
                statusClass: this.getReportStatusClass(4)
            }
        };
    }

    // Check if financial data is complete
    isComplete() {
        return !!(this.totalTaskOrderPrice && this.utilizationRate);
    }

    // Get financial health status
    getHealthStatus() {
        if (!this.utilizationRate) return 'unknown';
        
        if (this.utilizationRate >= 0.8) return 'excellent';
        if (this.utilizationRate >= 0.6) return 'good';
        if (this.utilizationRate >= 0.4) return 'fair';
        return 'poor';
    }

    // Get summary for dashboard
    getSummary() {
        return {
            id: this.id,
            partnerId: this.partnerId,
            partnerName: this.partnerName,
            contractValue: this.contractValue,
            budgetAllocated: this.budgetAllocated,
            actualSpent: this.actualSpent,
            remainingBudget: this.remainingBudget,
            financialStatus: this.financialStatus,
            totalPrice: this.contractValue || this.totalTaskOrderPrice || 0,
            utilizationRate: this.utilizationRate || 0,
            formattedUtilizationRate: this.getFormattedUtilizationRate(),
            healthStatus: this.getHealthStatus(),
            isComplete: this.isComplete(),
            totalPayments: this.getTotalPayments(),
            createdAt: this.createdAt,
            
            // Legacy field names for compatibility
            'Partner ID': this.partnerId,
            'Partner Name': this.partnerName,
            'Total Task Order Price': this.contractValue || this.totalTaskOrderPrice,
            'Q1 Report Received': this.q1ReportReceived,
            'Q2 Report Received': this.q2ReportReceived,
            'Utilization Rate': this.utilizationRate
        };
    }
}

module.exports = Financial;
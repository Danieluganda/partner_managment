// Data Service for managing dashboard data
const fs = require('fs').promises;
const path = require('path');
const Partner = require('../models/Partner');
const Financial = require('../models/Financial');
const ExternalPartner = require('../models/ExternalPartner');

class DataService {
    constructor() {
        this.dataFilePath = path.join(__dirname, '../home/dashboard_data.json');
        this.rawData = {};
        this.lastModified = null;
    }

    // Load data from JSON file
    async loadData() {
        try {
            const stats = await fs.stat(this.dataFilePath);
            
            // Only reload if file has been modified
            if (!this.lastModified || stats.mtime > this.lastModified) {
                const data = await fs.readFile(this.dataFilePath, 'utf8');
                this.rawData = JSON.parse(data);
                this.lastModified = stats.mtime;
                console.log('📊 Data reloaded from file');
            }
            
            return this.rawData;
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            return this.getEmptyData();
        }
    }

    // Get empty data structure
    getEmptyData() {
        return {
            masterRegister: [],
            financialSummary: [],
            keyPersonnel: [],
            deliverables: [],
            compliance: [],
            externalPartners: []
        };
    }

    // Get all partners as Partner model instances
    async getPartners() {
        const data = await this.loadData();
        return (data.masterRegister || []).map(partnerData => new Partner(partnerData));
    }

    // Get partner by ID
    async getPartnerById(id) {
        const partners = await this.getPartners();
        return partners.find(partner => partner.id === id);
    }

    // Create new partner
    async createPartner(partnerData) {
        try {
            const data = await this.loadData();
            
            // Generate ID if not provided
            if (!partnerData.id) {
                partnerData.id = this.generatePartnerId();
            }
            
            // Add timestamps
            partnerData.createdAt = new Date().toISOString();
            partnerData.updatedAt = new Date().toISOString();
            
            // Ensure masterRegister array exists
            if (!data.masterRegister) {
                data.masterRegister = [];
            }
            
            // Add new partner to data
            data.masterRegister.push(partnerData);
            
            // Save data
            await this.saveData(data);
            
            // Return new Partner instance
            return new Partner(partnerData);
        } catch (error) {
            console.error('Error creating partner:', error);
            throw error;
        }
    }

    // Update existing partner
    async updatePartner(id, updateData) {
        try {
            const data = await this.loadData();
            
            if (!data.masterRegister) {
                return null;
            }
            
            const partnerIndex = data.masterRegister.findIndex(p => p.id === id);
            
            if (partnerIndex === -1) {
                return null;
            }
            
            // Update partner data
            updateData.updatedAt = new Date().toISOString();
            data.masterRegister[partnerIndex] = {
                ...data.masterRegister[partnerIndex],
                ...updateData
            };
            
            // Save data
            await this.saveData(data);
            
            // Return updated Partner instance
            return new Partner(data.masterRegister[partnerIndex]);
        } catch (error) {
            console.error('Error updating partner:', error);
            throw error;
        }
    }

    // Delete partner
    async deletePartner(id) {
        try {
            const data = await this.loadData();
            
            if (!data.masterRegister) {
                return false;
            }
            
            const initialLength = data.masterRegister.length;
            data.masterRegister = data.masterRegister.filter(p => p.id !== id);
            
            if (data.masterRegister.length === initialLength) {
                return false; // Partner not found
            }
            
            // Save data
            await this.saveData(data);
            
            return true;
        } catch (error) {
            console.error('Error deleting partner:', error);
            throw error;
        }
    }

    // Save data to JSON file
    async saveData(data) {
        try {
            await fs.writeFile(this.dataFilePath, JSON.stringify(data, null, 2), 'utf8');
            this.rawData = data;
            this.lastModified = new Date();
            console.log('💾 Data saved to file');
        } catch (error) {
            console.error('❌ Error saving data:', error);
            throw error;
        }
    }

    // Generate unique partner ID
    generatePartnerId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `P-${timestamp}-${random}`.toUpperCase();
    }

    // Generate unique external partner ID
    generateExternalPartnerId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `EXT-${timestamp}-${random}`.toUpperCase();
    }

    // Get financial data as Financial model instances
    async getFinancialData() {
        const data = await this.loadData();
        return (data.financialSummary || []).map(financialData => new Financial(financialData));
    }

    // Get external partners as ExternalPartner model instances
    async getExternalPartners() {
        const data = await this.loadData();
        return (data.externalPartners || []).map(partnerData => new ExternalPartner(partnerData));
    }

    // Get external partner by ID
    async getExternalPartnerById(id) {
        const externalPartners = await this.getExternalPartners();
        return externalPartners.find(partner => partner.id === id);
    }

    // Create new external partner
    async createExternalPartner(partnerData) {
        try {
            const data = await this.loadData();
            
            // Generate ID if not provided
            if (!partnerData.id) {
                partnerData.id = this.generateExternalPartnerId();
            }
            
            // Add timestamps
            partnerData.createdAt = new Date().toISOString();
            partnerData.updatedAt = new Date().toISOString();
            
            // Ensure externalPartners array exists
            if (!data.externalPartners) {
                data.externalPartners = [];
            }
            
            // Add new external partner to data
            data.externalPartners.push(partnerData);
            
            // Save data
            await this.saveData(data);
            
            // Return new ExternalPartner instance
            return new ExternalPartner(partnerData);
        } catch (error) {
            console.error('Error creating external partner:', error);
            throw error;
        }
    }

    // Update existing external partner
    async updateExternalPartner(id, updateData) {
        try {
            const data = await this.loadData();
            
            if (!data.externalPartners) {
                return null;
            }
            
            const partnerIndex = data.externalPartners.findIndex(p => p.id === id);
            
            if (partnerIndex === -1) {
                return null;
            }
            
            // Update external partner data
            updateData.updatedAt = new Date().toISOString();
            data.externalPartners[partnerIndex] = {
                ...data.externalPartners[partnerIndex],
                ...updateData
            };
            
            // Save data
            await this.saveData(data);
            
            // Return updated ExternalPartner instance
            return new ExternalPartner(data.externalPartners[partnerIndex]);
        } catch (error) {
            console.error('Error updating external partner:', error);
            throw error;
        }
    }

    // Delete external partner
    async deleteExternalPartner(id) {
        try {
            const data = await this.loadData();
            
            if (!data.externalPartners) {
                return false;
            }
            
            const initialLength = data.externalPartners.length;
            data.externalPartners = data.externalPartners.filter(p => p.id !== id);
            
            if (data.externalPartners.length === initialLength) {
                return false; // External partner not found
            }
            
            // Save data
            await this.saveData(data);
            
            return true;
        } catch (error) {
            console.error('Error deleting external partner:', error);
            throw error;
        }
    }

    // Get dashboard statistics
    async getDashboardStats() {
        const partners = await this.getPartners();
        const externalPartners = await this.getExternalPartners();
        const financialData = await this.getFinancialData();

        const signedPartners = partners.filter(p => p.isActive());
        const contractingPartners = partners.filter(p => p.contractStatus === 'In Contracting');

        // Calculate total budget
        const totalBudget = partners.reduce((total, partner) => {
            return total + partner.getNumericPrice();
        }, 0);

        // Calculate regions coverage
        const allRegions = new Set();
        partners.forEach(partner => {
            partner.getRegionsArray().forEach(region => {
                if (region && region !== '-') {
                    allRegions.add(region);
                }
            });
        });

        return {
            totalPartners: partners.length,
            signedPartners: signedPartners.length,
            contractingPartners: contractingPartners.length,
            externalPartners: externalPartners.length,
            totalBudget,
            formattedBudget: this.formatCurrency(totalBudget),
            regionsCount: allRegions.size,
            completedFinancialRecords: financialData.filter(f => f.isComplete()).length
        };
    }

    // Get contract status distribution
    async getContractStatusDistribution() {
        const partners = await this.getPartners();
        const distribution = {};
        
        partners.forEach(partner => {
            const status = partner.contractStatus || 'Unknown';
            distribution[status] = (distribution[status] || 0) + 1;
        });

        return distribution;
    }

    // Get regional distribution
    async getRegionalDistribution() {
        const partners = await this.getPartners();
        const distribution = {};
        
        partners.forEach(partner => {
            const regions = partner.getRegionsArray();
            regions.forEach(region => {
                if (region && region !== '-') {
                    // Take first word or main region name
                    const mainRegion = region.split(' ')[0];
                    distribution[mainRegion] = (distribution[mainRegion] || 0) + 1;
                }
            });
        });

        return distribution;
    }

    // Get external partners by status
    async getExternalPartnersByStatus() {
        const externalPartners = await this.getExternalPartners();
        const byStatus = {};
        
        externalPartners.forEach(partner => {
            const status = partner.status || 'Unknown';
            byStatus[status] = (byStatus[status] || 0) + 1;
        });

        return byStatus;
    }

    // Get partners with approaching deadlines
    async getUpcomingDeadlines() {
        const externalPartners = await this.getExternalPartners();
        return externalPartners.filter(partner => 
            partner.isDeadlineApproaching() || partner.isOverdue()
        ).map(partner => partner.getSummary());
    }

    // Get recent partners (last 30 days)
    async getRecentPartners(limit = 5) {
        const partners = await this.getPartners();
        
        // Sort by commencement date, most recent first
        const recentPartners = partners
            .filter(partner => partner.commencementDate && partner.commencementDate !== '-')
            .sort((a, b) => new Date(b.commencementDate) - new Date(a.commencementDate))
            .slice(0, limit);

        return recentPartners.map(partner => partner.getSummary());
    }

    // Search partners
    async searchPartners(query) {
        const partners = await this.getPartners();
        const lowercaseQuery = query.toLowerCase();
        
        return partners.filter(partner => {
            return (
                partner.name.toLowerCase().includes(lowercaseQuery) ||
                partner.id.toLowerCase().includes(lowercaseQuery) ||
                partner.regionsOfOperation.toLowerCase().includes(lowercaseQuery) ||
                partner.keyPersonnel.toLowerCase().includes(lowercaseQuery)
            );
        });
    }

    // Filter partners by criteria
    async filterPartners(criteria = {}) {
        const partners = await this.getPartners();
        
        return partners.filter(partner => {
            let matches = true;
            
            if (criteria.status && partner.contractStatus !== criteria.status) {
                matches = false;
            }
            
            if (criteria.region && !partner.regionsOfOperation.toLowerCase().includes(criteria.region.toLowerCase())) {
                matches = false;
            }
            
            if (criteria.minPrice && partner.getNumericPrice() < criteria.minPrice) {
                matches = false;
            }
            
            if (criteria.maxPrice && partner.getNumericPrice() > criteria.maxPrice) {
                matches = false;
            }
            
            return matches;
        });
    }

    // Utility function to format currency
    formatCurrency(amount) {
        if (!amount || amount === 0) return 'UGX 0';
        return `UGX ${amount.toLocaleString()}`;
    }

    // Get raw data for specific section
    async getRawData(section) {
        const data = await this.loadData();
        return data[section] || [];
    }

    // Export data to different formats (future enhancement)
    async exportData(format = 'json', section = null) {
        const data = await this.loadData();
        const exportData = section ? data[section] : data;
        
        switch (format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);
            case 'csv':
                // CSV export logic would go here
                return 'CSV export not implemented yet';
            default:
                return exportData;
        }
    }

    // Health check for data integrity
    async performHealthCheck() {
        const data = await this.loadData();
        const health = {
            status: 'healthy',
            issues: [],
            sections: {}
        };

        // Check each section
        const sections = ['masterRegister', 'financialSummary', 'externalPartners'];
        
        sections.forEach(section => {
            const sectionData = data[section] || [];
            health.sections[section] = {
                count: sectionData.length,
                hasData: sectionData.length > 0
            };
            
            if (sectionData.length === 0) {
                health.issues.push(`${section} is empty`);
            }
        });

        if (health.issues.length > 0) {
            health.status = 'warning';
        }

        return health;
    }
}

module.exports = new DataService();
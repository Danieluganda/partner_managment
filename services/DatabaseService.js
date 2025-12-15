const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto'); // Add this at the top if not already present
const { v4: uuidv4 } = require('uuid');

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient({
      log: ['error'],
    });
  }

  async connect() {
    return this.initialize();
  }

  async initialize() {
    try {
      await this.prisma.$connect();
      console.log('📚 Database connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  async getDashboardStats() {
    try {
      if (!this.prisma) {
        console.error('❌ Prisma client not initialized');
        return {
          partnersCount: 0,
          externalPartnersCount: 0,
          personnelCount: 0,
          deliverablesCount: 0
        };
      }

      const [partnersCount, externalPartnersCount, personnelCount, deliverablesCount] = await Promise.all([
        this.prisma.partners.count(),
        this.prisma.external_partners.count(),
        this.prisma.personnel.count(),
        this.prisma.deliverables.count()
      ]);

      return {
        partnersCount,
        externalPartnersCount,
        personnelCount,
        deliverablesCount
      };
    } catch (error) {
      console.error('❌ Error calculating dashboard stats:', error);
      return {
        partnersCount: 0,
        externalPartnersCount: 0,
        personnelCount: 0,
        deliverablesCount: 0
      };
    }
  }

  async getPartners() {
    try {
        if (!this.prisma) {
            throw new Error('Prisma client not initialized');
        }
        const partners = await this.prisma.partners.findMany({
            orderBy: { createdAt: 'desc' }
        });
        
        console.log(`🔍 DatabaseService: Found ${partners.length} partners`);
        
        // Return plain objects with getSummary method
        return partners.map(partner => {
            const partnerObj = {
                ...partner,
                getSummary() {
                    return {
                        id: this.id,
                        partnerName: this.partnerName,
                        partnerType: this.partnerType,
                        contactEmail: this.contactEmail,
                        contactPhone: this.contactPhone,
                        keyPersonnel: this.keyPersonnel,
                        regionsOfOperation: this.regionsOfOperation,
                        contractStatus: this.contractStatus,
                        contractValue: this.contractValue,
                        estimatedValue: this.estimatedValue,
                        priority: this.priority,
                        createdAt: this.createdAt,
                        updatedAt: this.updatedAt
                    };
                }
            };
            return partnerObj;
        });
    } catch (error) {
        console.error('❌ Error fetching partners:', error);
        return [];
    }
  }

  async getExternalPartners() {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      const partners = await this.prisma.external_partners.findMany({
        orderBy: { createdAt: 'desc' }
      });
      
      return partners.map(partner => ({
        ...partner,
        getSummary() {
          return {
            id: this.id,
            partnerName: this.partnerName,
            keyContact: this.keyContact,
            dateInitiated: this.dateInitiated,
            currentStage: this.currentStage,
            keyObjectives: this.keyObjectives,
            status: this.status,
            pendingTasks: this.pendingTasks,
            responsible: this.responsible,
            deadline: this.deadline,
            notesBlockers: this.notesBlockers,
            contactEmail: this.contactEmail,
            contactPhone: this.contactPhone,
            partnerType: this.partnerType,
            estimatedValue: this.estimatedValue,
            priority: this.priority,
            region: this.region,
            tags: this.tags,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
          };
        }
      }));
    } catch (error) {
      console.error('❌ Error fetching external partners:', error);
      return [];
    }
  }

  async getFinancialData() {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.financial_records.findMany({
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('❌ Error fetching financial data:', error);
      return [];
    }
  }

  async getPersonnel() {
    try {
      console.log('🔍 DatabaseService: Getting personnel...');
      
      const personnel = await this.prisma.personnel.findMany({
        orderBy: {
          fullName: 'asc'
        }
      });
      
      console.log(`🔍 DatabaseService: Found ${personnel.length} personnel records`);
      
      if (personnel.length > 0) {
        console.log('🔍 Sample personnel record:', {
          id: personnel[0].id,
          fullName: personnel[0].fullName,
          partnerName: personnel[0].partnerName,
          emailAddress: personnel[0].emailAddress
        });
      }
      
      // Import Personnel model
      const Personnel = require('../models/Personnel');
      
      return personnel.map(p => new Personnel(p));
    } catch (error) {
      console.error('❌ Error getting personnel:', error);
      throw error;
    }
  }

  async getDeliverables() {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.deliverables.findMany({
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('❌ Error fetching deliverables:', error);
      throw error;
    }
  }

  async createExternalPartner(partnerData) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.external_partners.create({
        data: partnerData
      });
    } catch (error) {
      console.error('❌ Error creating external partner:', error);
      throw error;
    }
  }

  async createPartner(partnerData) {
    if (!this.prisma) {
        throw new Error('Prisma client not initialized');
    }
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const now = new Date();

    // Ensure required fields are present
    if (!partnerData.partnerName || !partnerData.partnerType || !partnerData.contactEmail) {
        throw new Error('partnerName, partnerType, and contactEmail are required');
    }

    // Helper to parse float or fallback to 0
    const parseFloatOrZero = (val) => {
        if (val === undefined || val === null || val === '') return 0;
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    };

    return await this.prisma.partners.create({
        data: {
            id,
            partnerName: partnerData.partnerName,
            partnerType: partnerData.partnerType,
            contactEmail: partnerData.contactEmail,
            contactPhone: partnerData.contactPhone || null,
            keyPersonnel: partnerData.keyPersonnel || null,
            regionsOfOperation: partnerData.regionsOfOperation || null,
            taskOrderPrice: partnerData.taskOrderPrice || null,
            contractStatus: partnerData.contractStatus || null,
            commencementDate: partnerData.commencementDate || null,
            contractDuration: partnerData.contractDuration || null,
            contractValue: partnerData.contractValue || null,
            contractStartDate: partnerData.contractStartDate || null,
            contractEndDate: partnerData.contractEndDate || null,
            createdAt: now,
            updatedAt: now,
            actualSpent: parseFloatOrZero(partnerData.actualSpent),
            budgetAllocated: parseFloatOrZero(partnerData.budgetAllocated),
            comments: partnerData.comments || null,
            financialStatus: partnerData.financialStatus || null,
            lastPaymentDate: partnerData.lastPaymentDate || null,
            nextPaymentDue: partnerData.nextPaymentDue || null,
            paymentSchedule: partnerData.paymentSchedule || null,
            q1ActualPaid: parseFloatOrZero(partnerData.q1ActualPaid),
            q2ActualPaid: parseFloatOrZero(partnerData.q2ActualPaid),
            q3ActualPaid: parseFloatOrZero(partnerData.q3ActualPaid),
            q4ActualPaid: parseFloatOrZero(partnerData.q4ActualPaid),
            utilizationRate: parseFloatOrZero(partnerData.utilizationRate)
            // DO NOT include: notes
        }
    });
}

  async getComplianceRecords() {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.compliance_records.findMany({
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('❌ Error fetching compliance records:', error);
      return [];
    }
  }

  async createComplianceRecord(payload) {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized');
    }

    const now = new Date();

    // resolve partnerName: prefer payload, otherwise try to lookup by partnerId, otherwise fallback
    let resolvedPartnerName = payload && payload.partnerName ? payload.partnerName : null;
    if (!resolvedPartnerName && payload && payload.partnerId) {
      try {
        const internal = await this.prisma.partners.findUnique({ where: { id: payload.partnerId } });
        if (internal) resolvedPartnerName = internal.partnerName || internal.name || null;
        else {
          const external = await this.prisma.external_partners.findUnique({ where: { id: payload.partnerId } });
          if (external) resolvedPartnerName = external.partnerName || external.name || null;
        }
      } catch (lookupErr) {
        console.warn('Partner lookup failed for partnerId', payload && payload.partnerId, lookupErr && lookupErr.message);
      }
    }

    // Ensure partnerName is a non-null string (Prisma requires this field)
    if (!resolvedPartnerName) resolvedPartnerName = 'Unknown Partner';
    resolvedPartnerName = String(resolvedPartnerName);

    const data = {
      id: uuidv4(),
      partnerId: payload && payload.partnerId ? payload.partnerId : null,
      partnerName: resolvedPartnerName,
      // Prisma expects `requirement` — map from reportingRequirement
      requirement: (payload && (payload.reportingRequirement || payload.requirement)) || null,
      reportingRequirement: payload && payload.reportingRequirement ? payload.reportingRequirement : null,
      dueDate: payload && payload.dueDate ? new Date(payload.dueDate) : null,
      reportingPeriod: payload && payload.reportingPeriod ? payload.reportingPeriod : null,
      submissionDate: payload && payload.submissionDate ? new Date(payload.submissionDate) : null,
      status: payload && payload.status ? payload.status : null,
      fmcsAuditStatus: payload && (payload.fmcsAuditStatus || payload.auditStatus) ? (payload.fmcsAuditStatus || payload.auditStatus) : null,
      notes: (payload && (payload.notes || payload.comments)) || null,
      complianceType: (payload && (payload.complianceType || payload.type)) || 'reporting',
      createdAt: now,
      updatedAt: now,
      createdBy: (payload && (payload.createdBy || payload.username)) || null
      // add other fields required by your Prisma schema here
    };

    // debug: show exact object sent to Prisma
    console.debug('DEBUG createComplianceRecord payload ->', data);

    return await this.prisma.compliance_records.create({ data });
  }

  async searchPartners(query) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.partners.findMany({
        where: {
          OR: [
            { partnerName: { contains: query } },
            { keyContact: { contains: query } },
            { region: { contains: query } }
          ]
        }
      });
    } catch (error) {
      console.error('❌ Error searching partners:', error);
      return [];
    }
  }

  async performHealthCheck() {
    try {
      if (!this.prisma) {
        return { status: 'error', message: 'Prisma client not initialized' };
      }
      
      await this.prisma.$queryRaw`SELECT 1`;
      return { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        database: 'connected'
      };
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return { 
        status: 'error', 
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getPartnerById(id) {
    try {
      return await this.prisma.partners.findUnique({ where: { id } });
    } catch (error) {
      console.error('❌ Error getting partner by ID:', error);
      return null;
    }
  }

  async getExternalPartnerById(id) {
    try {
      return await this.prisma.external_partners.findUnique({ where: { id } });
    } catch (error) {
      console.error('❌ Error getting external partner by ID:', error);
      return null;
    }
  }

  async migrateFromJSON(data) {
    try {
      console.log(`🔄 Migrating ${data.length} records...`);
      
      for (const item of data) {
        try {
          if (item['Partner Name'] || item.partnerName) {
            await this.createExternalPartner({
              partnerName: item['Partner Name'] || item.partnerName,
              keyContact: item['Key Contact & Details'] || item.keyContact || null,
              dateInitiated: item['Date Initiated'] || item.dateInitiated || null,
              currentStage: item['Current Stage'] || item.currentStage || null,
              keyObjectives: item['Key Objectives / Focus Areas'] || item.keyObjectives || null,
              status: item.Status || item.status || null,
              pendingTasks: item['Pending Tasks & Next Steps'] || item.pendingTasks || null,
              responsible: item['Responsible Person(s)'] || item.responsible || null,
              deadline: item.Deadline || item.deadline || null,
              notesBlockers: item['Notes & Blockers'] || item.notesBlockers || null,
              contactEmail: item.contactEmail || null,
              contactPhone: item.contactPhone || null,
              partnerType: item.partnerType || 'unknown',
              estimatedValue: item.estimatedValue || null,
              priority: item.priority || 'medium',
              region: item.region || null,
              tags: item.tags || null,
            });
          }
        } catch (itemError) {
          console.error('❌ Failed to migrate item:', item, itemError.message);
        }
      }
      
      console.log('✅ Data migration completed!');
    } catch (error) {
      console.error('❌ Migration error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }

  async updatePartner(id, updateData) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.partners.update({
        where: { id },
        data: updateData
      });
    } catch (error) {
      console.error('❌ Error updating partner:', error);
      throw error;
    }
  }

  async updateExternalPartner(id, updateData) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.external_partners.update({
        where: { id },
        data: updateData
      });
    } catch (error) {
      console.error('❌ Error updating external partner:', error);
      throw error;
    }
  }

  async deletePartner(id) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      await this.prisma.partners.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error('❌ Error deleting partner:', error);
      return false;
    }
  }

  async deleteExternalPartner(id) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      await this.prisma.external_partners.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error('❌ Error deleting external partner:', error);
      return false;
    }
  }

  async getPersonnelById(id) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.personnel.findUnique({
        where: { id }
      });
    } catch (error) {
      console.error('❌ Error getting personnel by ID:', error);
      return null;
    }
  }

  async createPersonnel(personnelData) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.personnel.create({
        data: personnelData
      });
    } catch (error) {
      console.error('❌ Error creating personnel:', error);
      throw error;
    }
  }

  async updatePersonnel(id, personnelData) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.personnel.update({
        where: { id },
        data: personnelData
      });
    } catch (error) {
      console.error('❌ Error updating personnel:', error);
      throw error;
    }
  }

  async deletePersonnel(id) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      await this.prisma.personnel.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error('❌ Error deleting personnel:', error);
      return false;
    }
  }

  async searchPersonnel(query) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.personnel.findMany({
        where: {
          OR: [
            { fullName: { contains: query } },
            { position: { contains: query } },
            { department: { contains: query } }
          ]
        }
      });
    } catch (error) {
      console.error('❌ Error searching personnel:', error);
      return [];
    }
  }

  async getDeliverableById(id) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.deliverables.findUnique({
        where: { id }
      });
    } catch (error) {
      console.error('❌ Error getting deliverable by ID:', error);
      return null;
    }
  }

  async createDeliverable(deliverableData) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.deliverables.create({
        data: deliverableData
      });
    } catch (error) {
      console.error('❌ Error creating deliverable:', error);
      throw error;
    }
  }

  async updateDeliverable(id, deliverableData) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      return await this.prisma.deliverables.update({
        where: { id },
        data: deliverableData
      });
    } catch (error) {
      console.error('❌ Error updating deliverable:', error);
      throw error;
    }
  }

  async deleteDeliverable(id) {
    try {
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }
      await this.prisma.deliverables.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error('❌ Error deleting deliverable:', error);
      return false;
    }
  }
}

module.exports = DatabaseService;
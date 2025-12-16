const { PrismaClient } = require('@prisma/client');
const { ensureId } = require('./idHelper');
const dataService = require('./DataService');

class DatabaseService {
  constructor(opts = {}) {
    this.logger = opts.logger || console;
    // Prefer existing global prisma (app.js sets it later). May be null.
    this.prisma = global.prisma || null;
    this.dataService = dataService;
  }

  // Connect to Prisma if DATABASE_URL present or global.prisma not set.
  async connect() {
    try {
      // if already have a connected client, assume ok
      if (this.prisma && this.prisma.$connect) {
        try {
          await this.prisma.$connect();
          this.logger.log('DatabaseService: connected to Prisma (existing client)');
          return true;
        } catch (err) {
          this.logger.warn('DatabaseService: existing prisma $connect failed, continuing with fallback', err.message);
        }
      }

      // If environment indicates a DB, create PrismaClient and connect
      if (process.env.DATABASE_URL) {
        this.prisma = new PrismaClient();
        await this.prisma.$connect();
        this.logger.log('DatabaseService: connected to Prisma (new client)');
        return true;
      }

      // No Prisma configured — operate with JSON fallback
      this.logger.warn('DatabaseService: prisma not configured, using JSON fallback only');
      // ensure data loaded so subsequent calls have rawData
      try { await this.dataService.loadData(); } catch (e) { /* ignore */ }
      return true;
    } catch (err) {
      this.logger.error('DatabaseService.connect error:', err.message || err);
      // still allow fallback when DB connection fails
      try { await this.dataService.loadData(); } catch (e) { /* ignore */ }
      return true;
    }
  }

  async disconnect() {
    try {
      if (this.prisma && this.prisma.$disconnect) await this.prisma.$disconnect();
      this.logger.log('DatabaseService: disconnected');
    } catch (err) {
      this.logger.warn('DatabaseService.disconnect error:', err && err.message);
    }
  }

  // Internal helpers for JSON fallback
  async _loadStore() {
    await this.dataService.loadData();
    return this.dataService.rawData || {};
  }

  async _saveStore(store) {
    await this.dataService.saveData(store);
    return store;
  }

  async _saveToJson(collectionKey, item) {
    const store = await this._loadStore();
    store[collectionKey] = Array.isArray(store[collectionKey]) ? store[collectionKey] : [];
    const copy = Object.assign({}, item || {});
    ensureId(copy);
    if (!copy.createdAt) copy.createdAt = new Date().toISOString();
    copy.updatedAt = new Date().toISOString();
    store[collectionKey].push(copy);
    await this._saveStore(store);
    return copy;
  }

  _prepareCreatePayload(payload) {
    const copy = Object.assign({}, payload || {});
    ensureId(copy);
    if (!copy.createdAt) copy.createdAt = new Date().toISOString();
    copy.updatedAt = new Date().toISOString();
    return copy;
  }

  // Reads with DB-first then JSON fallback
  async getPartners() {
    try {
      if (this.prisma && this.prisma.partners) {
        return await this.prisma.partners.findMany();
      }
    } catch (err) {
      this.logger.warn('getPartners prisma read failed:', err.message);
    }
    const store = await this._loadStore();
    return store.masterRegister || store.partners || [];
  }

  async getExternalPartners() {
    try {
      if (this.prisma && this.prisma.external_partners) {
        return await this.prisma.external_partners.findMany();
      }
    } catch (err) {
      this.logger.warn('getExternalPartners prisma read failed:', err.message);
    }
    const store = await this._loadStore();
    return store.externalPartners || store.external || [];
  }

  async getFinancialData() {
    try {
      if (this.prisma && this.prisma.financials) {
        return await this.prisma.financials.findMany();
      }
    } catch (err) {
      this.logger.warn('getFinancialData prisma read failed:', err.message);
    }
    const store = await this._loadStore();
    return store.financials || store.financialSummary || [];
  }

  async getPersonnel() {
    try {
      if (this.prisma && this.prisma.personnel) {
        return await this.prisma.personnel.findMany();
      }
    } catch (err) {
      this.logger.warn('getPersonnel prisma read failed:', err.message);
    }
    const store = await this._loadStore();
    return store.keyPersonnel || store.personnelList || store.personnel || [];
  }

  async getDeliverables() {
    try {
      if (this.prisma && this.prisma.deliverables) {
        return await this.prisma.deliverables.findMany();
      }
    } catch (err) {
      this.logger.warn('getDeliverables prisma read failed:', err.message);
    }
    const store = await this._loadStore();
    return store.deliverables || store.deliverableList || [];
  }

  async getComplianceRecords() {
    try {
      if (this.prisma && this.prisma.compliance) {
        return await this.prisma.compliance.findMany();
      }
    } catch (err) {
      this.logger.warn('getComplianceRecords prisma read failed:', err.message);
    }
    const store = await this._loadStore();
    return store.compliance || store.complianceRecords || [];
  }

  async getDashboardStats() {
    // compute simple stats from available sources
    try {
      const partners = await this.getPartners();
      const personnel = await this.getPersonnel();
      const deliverables = await this.getDeliverables();
      return {
        totalPartners: (partners || []).length,
        personnelCount: (personnel || []).length,
        deliverablesCount: (deliverables || []).length
      };
    } catch (err) {
      this.logger.warn('getDashboardStats failed:', err && err.message);
      return {};
    }
  }

  // Creates with DB-first then JSON fallback
  async createPartner(partnerData) {
    const payload = this._prepareCreatePayload(partnerData);
    try {
      if (this.prisma && this.prisma.partners) {
        return await this.prisma.partners.create({ data: payload });
      }
    } catch (err) {
      this.logger.warn('createPartner prisma failed:', err.message);
    }
    return await this._saveToJson('masterRegister', payload);
  }

  async createExternalPartner(externalData) {
    const payload = this._prepareCreatePayload(externalData);
    try {
      if (this.prisma && this.prisma.external_partners) {
        return await this.prisma.external_partners.create({ data: payload });
      }
    } catch (err) {
      this.logger.warn('createExternalPartner prisma failed:', err.message);
    }
    return await this._saveToJson('externalPartners', payload);
  }

  // helper: ensure required DB string fields are not null/undefined
  _ensurePersonnelDefaults(payload = {}) {
    return Object.assign({
      fullName: '',
      emailAddress: '',
      jobTitle: '',
      phoneNumber: null,
      partnerId: null,
      partnerName: null,
      partnerType: '',
      workStatus: null
    }, payload);
  }

  _ensureDeliverableDefaults(payload = {}) {
    return Object.assign({
      deliverableName: '',
      deliverableNumber: '',
      description: '',
      milestoneDate: null,
      dueDate: '',
      status: 'pending',
      actualSubmission: null,
      approvalDate: null,
      paymentPercentage: null,
      paymentAmount: null,
      paymentStatus: null,
      assignedTo: '',
      notes: null,
      importedFromExcel: false,
      importedAt: null
    }, payload);
  }

  async createPersonnel(personnelData = {}) {
    const payload = this._prepareCreatePayload(personnelData);
    // coerce required fields
    const safePayload = this._ensurePersonnelDefaults(payload);
    try {
      if (this.prisma && this.prisma.personnel) {
        // explicit prisma payload (avoid sending unknown keys)
        const prismaPayload = {
          id: safePayload.id,
          fullName: String(safePayload.fullName || ''),
          emailAddress: String(safePayload.emailAddress || ''),
          jobTitle: String(safePayload.jobTitle || ''),
          phoneNumber: safePayload.phoneNumber || null,
          partnerId: safePayload.partnerId || null,
          partnerName: safePayload.partnerName || null,
          partnerType: String(safePayload.partnerType || ''),
          workStatus: safePayload.workStatus || null,
          createdAt: safePayload.createdAt,
          updatedAt: safePayload.updatedAt
        };
        return await this.prisma.personnel.create({ data: prismaPayload });
      }
      // existing fallback logic...
      if (this.dataService && typeof this.dataService.createPersonnel === 'function') {
        return await this.dataService.createPersonnel(safePayload);
      }
      await this._saveToJsonFallback('keyPersonnel', safePayload);
      return safePayload;
    } catch (err) {
      this.logger.error('createPersonnel prisma failed:', err && (err.message || err));
      throw err;
    }
  }

  async createDeliverable(deliverableData = {}) {
    const payload = this._prepareCreatePayload(deliverableData);
    // coerce required fields
    const safePayload = this._ensureDeliverableDefaults(payload);
    try {
      if (this.prisma && this.prisma.deliverables) {
        const prismaPayload = {
          id: safePayload.id,
          deliverableName: String(safePayload.deliverableName || 'Deliverable'),
          description: safePayload.description || null,
          // milestoneDate not in schema, map to dueDate if dueDate is empty
          dueDate: String(safePayload.dueDate || safePayload.milestoneDate || ''),
          status: String(safePayload.status || 'pending'),
          // actualSubmission, approvalDate, payment* fields not in schema
          assignedTo: String(safePayload.assignedTo || ''),
          // notes not in schema
          // importedFromExcel not in schema
          partnerId: safePayload.partnerId || null,
          partnerName: safePayload.partnerName || 'Unknown Partner',
          createdAt: safePayload.createdAt,
          updatedAt: safePayload.updatedAt,
          completionPercentage: safePayload.completionPercentage ? parseInt(safePayload.completionPercentage) : 0,
          priority: safePayload.priority || null
        };
        return await this.prisma.deliverables.create({ data: prismaPayload });
      }
      // existing fallback logic...
      if (this.dataService && typeof this.dataService.createDeliverable === 'function') {
        return await this.dataService.createDeliverable(safePayload);
      }
      await this._saveToJsonFallback('deliverables', safePayload);
      return safePayload;
    } catch (err) {
      this.logger.error('createDeliverable prisma failed:', err && (err.message || err));
      throw err;
    }
  }

  // helper: append to JSON fallback (if used elsewhere adapt name)
  async _saveToJsonFallback(collectionName, item) {
    try {
      const ds = this.dataService || require('./DataService');
      const store = await ds.loadData();
      store[collectionName] = store[collectionName] || [];
      store[collectionName].push(item);
      await ds.saveData(store);
    } catch (e) {
      this.logger.error('DatabaseService: JSON fallback save failed', e && (e.message || e));
    }
  }

  // Simple find/update/delete implementations that use either DB or JSON fallback
  async getPartnerById(id) {
    try {
      if (this.prisma && this.prisma.partners) {
        return await this.prisma.partners.findUnique({ where: { id } });
      }
    } catch (err) {
      this.logger.warn('getPartnerById prisma failed:', err.message);
    }
    const store = await this._loadStore();
    return (store.masterRegister || []).find(p => p.id === id || p.partnerId === id) || null;
  }

  async getExternalPartnerById(id) {
    try {
      if (this.prisma && this.prisma.external_partners) {
        return await this.prisma.external_partners.findUnique({ where: { id } });
      }
    } catch (err) {
      this.logger.warn('getExternalPartnerById prisma failed:', err.message);
    }
    const store = await this._loadStore();
    return (store.externalPartners || []).find(p => p.id === id) || null;
  }

  async getPersonnelById(id) {
    try {
      if (this.prisma && this.prisma.personnel) {
        return await this.prisma.personnel.findUnique({ where: { id } });
      }
    } catch (err) {
      this.logger.warn('getPersonnelById prisma failed:', err.message);
    }
    const store = await this._loadStore();
    return (store.keyPersonnel || store.personnelList || []).find(p => p.id === id) || null;
  }

  async getDeliverableById(id) {
    try {
      if (this.prisma && this.prisma.deliverables) {
        return await this.prisma.deliverables.findUnique({ where: { id } });
      }
    } catch (err) {
      this.logger.warn('getDeliverableById prisma failed:', err.message);
    }
    const store = await this._loadStore();
    return (store.deliverables || []).find(d => d.id === id) || null;
  }

  async updatePartner(id, updateData) {
    try {
      if (this.prisma && this.prisma.partners) {
        return await this.prisma.partners.update({ where: { id }, data: updateData });
      }
    } catch (err) {
      this.logger.warn('updatePartner prisma failed:', err.message);
    }
    const store = await this._loadStore();
    const arr = store.masterRegister = store.masterRegister || [];
    const idx = arr.findIndex(p => p.id === id);
    if (idx === -1) return null;
    arr[idx] = Object.assign({}, arr[idx], updateData, { updatedAt: new Date().toISOString() });
    await this._saveStore(store);
    return arr[idx];
  }

  async updateExternalPartner(id, updateData) {
    try {
      if (this.prisma && this.prisma.external_partners) {
        return await this.prisma.external_partners.update({ where: { id }, data: updateData });
      }
    } catch (err) {
      this.logger.warn('updateExternalPartner prisma failed:', err.message);
    }
    const store = await this._loadStore();
    const arr = store.externalPartners = store.externalPartners || [];
    const idx = arr.findIndex(p => p.id === id);
    if (idx === -1) return null;
    arr[idx] = Object.assign({}, arr[idx], updateData, { updatedAt: new Date().toISOString() });
    await this._saveStore(store);
    return arr[idx];
  }

  async updatePersonnel(id, personnelData) {
    try {
      if (this.prisma && this.prisma.personnel) {
        return await this.prisma.personnel.update({ where: { id }, data: personnelData });
      }
    } catch (err) {
      this.logger.warn('updatePersonnel prisma failed:', err.message);
    }
    const store = await this._loadStore();
    const arr = store.keyPersonnel = store.keyPersonnel || store.personnelList || [];
    const idx = arr.findIndex(p => p.id === id);
    if (idx === -1) return null;
    arr[idx] = Object.assign({}, arr[idx], personnelData, { updatedAt: new Date().toISOString() });
    await this._saveStore(store);
    return arr[idx];
  }

  async updateDeliverable(id, updateData) {
    try {
      if (this.prisma && this.prisma.deliverables) {
        return await this.prisma.deliverables.update({ where: { id }, data: updateData });
      }
    } catch (err) {
      this.logger.warn('updateDeliverable prisma failed:', err.message);
    }
    const store = await this._loadStore();
    store.deliverables = store.deliverables || [];
    const idx = store.deliverables.findIndex(d => d.id === id);
    if (idx === -1) return null;
    store.deliverables[idx] = Object.assign({}, store.deliverables[idx], updateData, { updatedAt: new Date().toISOString() });
    await this._saveStore(store);
    return store.deliverables[idx];
  }

  async deletePartner(id) {
    try {
      if (this.prisma && this.prisma.partners) {
        await this.prisma.partners.delete({ where: { id } });
        return true;
      }
    } catch (err) {
      this.logger.warn('deletePartner prisma failed:', err.message);
    }
    const store = await this._loadStore();
    store.masterRegister = (store.masterRegister || []).filter(p => p.id !== id);
    await this._saveStore(store);
    return true;
  }

  async deleteExternalPartner(id) {
    try {
      if (this.prisma && this.prisma.external_partners) {
        await this.prisma.external_partners.delete({ where: { id } });
        return true;
      }
    } catch (err) {
      this.logger.warn('deleteExternalPartner prisma failed:', err.message);
    }
    const store = await this._loadStore();
    store.externalPartners = (store.externalPartners || []).filter(p => p.id !== id);
    await this._saveStore(store);
    return true;
  }

  async deletePersonnel(id) {
    try {
      if (this.prisma && this.prisma.personnel) {
        await this.prisma.personnel.delete({ where: { id } });
        return true;
      }
    } catch (err) {
      this.logger.warn('deletePersonnel prisma failed:', err.message);
    }
    const store = await this._loadStore();
    const key = store.keyPersonnel ? 'keyPersonnel' : (store.personnelList ? 'personnelList' : 'personnel');
    store[key] = (store[key] || []).filter(p => p.id !== id);
    await this._saveStore(store);
    return true;
  }

  async deleteDeliverable(id) {
    try {
      if (this.prisma && this.prisma.deliverables) {
        await this.prisma.deliverables.delete({ where: { id } });
        return true;
      }
    } catch (err) {
      this.logger.warn('deleteDeliverable prisma failed:', err.message);
    }
    const store = await this._loadStore();
    store.deliverables = (store.deliverables || []).filter(d => d.id !== id);
    await this._saveStore(store);
    return true;
  }

  // Simple search implementation — uses DB when available, otherwise scans JSON arrays
  async searchPartners(query) {
    const q = String(query || '').toLowerCase();
    if (!q) return [];
    try {
      if (this.prisma && this.prisma.partners) {
        // try a basic prisma query if available
        return await this.prisma.partners.findMany({
          where: {
            OR: [
              { partnerName: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { partnerId: { contains: q, mode: 'insensitive' } }
            ]
          },
          take: 50
        });
      }
    } catch (err) {
      this.logger.warn('searchPartners prisma query failed:', err.message);
    }
    const store = await this._loadStore();
    const arr = store.masterRegister || store.partners || [];
    return arr.filter(p => {
      const s = (p.partnerName || p.name || p.partnerId || '').toString().toLowerCase();
      return s.includes(q);
    });
  }

  async searchPersonnel(query) {
    const q = String(query || '').toLowerCase();
    if (!q) return [];
    try {
      if (this.prisma && this.prisma.personnel) {
        return await this.prisma.personnel.findMany({
          where: {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { emailAddress: { contains: q, mode: 'insensitive' } },
              { partnerName: { contains: q, mode: 'insensitive' } }
            ]
          },
          take: 100
        });
      }
    } catch (err) {
      this.logger.warn('searchPersonnel prisma query failed:', err.message);
    }
    const store = await this._loadStore();
    const arr = store.keyPersonnel || store.personnelList || store.personnel || [];
    return arr.filter(p => {
      const s = ((p.fullName || '') + ' ' + (p.emailAddress || '') + ' ' + (p.partnerName || '')).toLowerCase();
      return s.includes(q);
    });
  }

  async performHealthCheck() {
    try {
      if (this.prisma) {
        // simple query that should succeed
        await this.prisma.$queryRaw`SELECT 1`;
        return { status: 'ok', provider: 'prisma' };
      }
    } catch (err) {
      this.logger.warn('performHealthCheck prisma query failed:', err.message);
    }
    // If prisma unavailable, indicate fallback healthy state
    return { status: 'ok', provider: 'json_fallback' };
  }

  // Attempt to replay JSON data into DB when available; best-effort no-op if no DB.
  async migrateFromJSON(data = null) {
    try {
      const store = data || (await this._loadStore());
      if (!this.prisma) {
        this.logger.warn('migrateFromJSON: no prisma client available, skipping migration');
        return false;
      }

      // Best-effort migration for common collections
      const mappings = [
        { key: 'masterRegister', model: 'partners' },
        { key: 'externalPartners', model: 'external_partners' },
        { key: 'keyPersonnel', model: 'personnel' },
        { key: 'deliverables', model: 'deliverables' },
        { key: 'financials', model: 'financials' },
        { key: 'compliance', model: 'compliance' }
      ];

      for (const m of mappings) {
        const items = store[m.key] || [];
        if (!Array.isArray(items) || items.length === 0) continue;
        const model = this.prisma[m.model];
        if (!model) continue;
        // Insert items if not present (naive)
        for (const it of items) {
          const payload = Object.assign({}, it);
          ensureId(payload);
          try {
            // Upsert by id where possible
            await model.upsert({
              where: { id: payload.id },
              update: payload,
              create: payload
            });
          } catch (err) {
            this.logger.warn(`migrateFromJSON: upsert ${m.model} item failed:`, err.message);
          }
        }
      }
      this.logger.log('migrateFromJSON: migration attempted');
      return true;
    } catch (err) {
      this.logger.error('migrateFromJSON failed:', err && err.message);
      return false;
    }
  }
}

module.exports = DatabaseService;
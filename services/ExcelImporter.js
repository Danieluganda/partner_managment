const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const crypto = require('crypto');
const { ensureId } = require('./idHelper');
const DataService = require('./DataService'); // add near top if not present

class ExcelImporter {
  constructor(prisma, opts = {}) {
    this.dir = opts.dir || path.join(process.cwd(), 'data', 'excel');
    this.prisma = opts.prisma || null;
    this.databaseService = opts.databaseService || null;
    this._dataService = DataService; // fallback singleton
    this.logger = opts.logger || console;
    this._stateFile = path.join(this.dir, '.imported.json');
    this._state = {};
    try { this._state = fs.existsSync(this._stateFile) ? JSON.parse(fs.readFileSync(this._stateFile, 'utf8')) : {}; } catch (e) { this._state = {}; }
    this.handlers = {
      'worksheet_deliverables.xlsx': this._importDeliverables.bind(this),
      'worksheet_key_personnel.xlsx': this._importPersonnel.bind(this),
      // add explicit sheet name handlers if desired
    };
  }

  normalizeSheetName(name = '') { return String(name || '').toLowerCase().replace(/\s+/g, '_'); }

  async _processAllFiles() {
    const files = fs.readdirSync(this.dir).map(f => path.join(this.dir, f));
    for (const f of files) {
      try {
        if (fs.statSync(f).isDirectory()) continue;
        await this.processFile(f);
      } catch (e) {
        // ignore stat errors or processFile errors
      }
    }
  }

  // Parses file and returns structured data (preview mode)
  async parseFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const filename = path.basename(filePath);
    const workbook = xlsx.readFile(filePath, { cellDates: true, raw: false });
    const result = { filename, sheets: [] };

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rowsMatrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
      
      // find header row
      let headerIdx = -1;
      for (let i = 0; i < Math.min(rowsMatrix.length, 12); i++) {
        const nonEmpty = (rowsMatrix[i] || []).filter(c => c !== null && String(c).trim() !== '');
        if (nonEmpty.length >= 2) { headerIdx = i; break; }
      }
      
      if (headerIdx === -1) continue; // skip empty sheets

      const headerRow = rowsMatrix[headerIdx] || [];
      const normalizedHeader = headerRow.map(h => (h === null || h === undefined) ? '' : String(h).trim()).filter(Boolean);
      
      if (normalizedHeader.length < 2) continue;

      const dataArrays = rowsMatrix.slice(headerIdx + 1);
      const dataRows = dataArrays.map(arr => {
        const obj = {};
        for (let i = 0; i < normalizedHeader.length; i++) {
          const key = normalizedHeader[i];
          const val = (arr && arr[i] !== undefined) ? arr[i] : null;
          obj[key] = (typeof val === 'string') ? val.trim() : val;
        }
        return obj;
      });

      // Identifier handler type
        const sheetKey = this.normalizeSheetName(sheetName);
        let handlerType = null;
        if (this.handlers[sheetKey]) {
            handlerType = this.handlers[sheetKey].name; // e.g. "bound _importDeliverables"
        } else {
             // heuristic
             const hLower = normalizedHeader.map(h => String(h).toLowerCase());
             if (hLower.some(h => /deliverable|milestone|payment|deliverable #/.test(h))) handlerType = 'deliverables';
             else if (hLower.some(h => /contract status|task order price|partner id/.test(h))) handlerType = 'partners';
             else if (hLower.some(h => /contact type|job title|key personnel/.test(h))) handlerType = 'personnel';
             else if (hLower.some(h => /requirement|reporting period|fmcs/.test(h))) handlerType = 'compliance';
             // Fallback for personnel if it has email/phone but didn't match above strict checks
             else if (hLower.some(h => /email|phone/.test(h))) handlerType = 'personnel';
        }

      result.sheets.push({
        name: sheetName,
        header: normalizedHeader,
        rows: dataRows,
        preview: dataRows.slice(0, 5), // first 5 rows for UI
        totalRows: dataRows.length,
        type: handlerType || 'unknown'
      });
      // this.logger.info(`ExcelImporter: Parsed sheet '${sheetName}' as type '${handlerType || 'unknown'}' with ${dataRows.length} rows`);
    }
    return result;
  }

  // Takes parsed data (from parseFile or similar) and saves it
  async importData(parsedData) {
      const results = { summary: [], errors: [] };
      
      for (const sheet of parsedData.sheets) {
          if (!sheet.rows || sheet.rows.length === 0) continue;
          
          let handler = null;
          // map type back to handler
          if (sheet.type === 'deliverables') handler = this._importDeliverables.bind(this);
          else if (sheet.type === 'personnel') handler = this._importPersonnel.bind(this);
          else if (sheet.type === 'compliance') handler = this._importCompliance.bind(this);
          else if (sheet.type === 'partners') handler = this._importPartners.bind(this);
          // try explicit name match if type inference failed
          else {
               const sheetKey = this.normalizeSheetName(sheet.name);
               handler = this.handlers[sheetKey];
          }

          if (handler) {
              try {
                  await handler(sheet.rows);
                  results.summary.push(`Imported ${sheet.rows.length} rows from ${sheet.name} as ${sheet.type}`);
              } catch (err) {
                  results.errors.push(`Failed sheet ${sheet.name}: ${err.message}`);
              }
          } else {
              results.summary.push(`Skipped ${sheet.name} (unknown type)`);
              this.logger.warn(`ExcelImporter: Skipped sheet '${sheet.name}' - could not identify type from headers: ${sheet.header.join(', ')}`);
          }
      }
      return results;
  }

  async processFile(filePath) {
    // Legacy/Watcher method: parse then immediately import
    try {
        const parsed = await this.parseFile(filePath);
        await this.importData(parsed);
        // ... (logging/state updates logic merged or simplified)
        
        // Finalize state (logic from original processFile)
        const filename = path.basename(filePath);
        const fileBuf = fs.readFileSync(filePath);
        const fileHash = crypto.createHash('sha256').update(fileBuf).digest('hex');
        const relKey = path.relative(this.dir, filePath) || filename;
        const sheetSummaries = parsed.sheets.map(s => ({ sheetName: s.name, rows: s.totalRows }));
        
        this._state[relKey] = { lastImportedAt: new Date().toISOString(), fileHash, sheets: sheetSummaries };
        try { fs.writeFileSync(this._stateFile, JSON.stringify(this._state, null, 2), 'utf8'); } catch (err) {}
        
    } catch (err) {
        this.logger.error('ExcelImporter.processFile failed', err.message);
    }
  }

  // stubbed/simple handlers — adapt to your DB API
  async _importPersonnel(rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) return;
    let processed = 0;
    for (const r of rows) {
      // produce safe payloads for DB (avoid null for required string fields)
      const personnel = {
        fullName: (r['Name'] || r['Full Name'] || r['Contact Name'] || '').trim(),
        jobTitle: (r['Job Title'] || r['Contact Type'] || '').trim(),
        emailAddress: (r['Email'] || r['Email Address'] || '').trim() || '', // use '' instead of null
        phoneNumber: (r['Phone'] || r['Phone Number'] || '').trim() || null,
        partnerId: (r['Partner ID'] || '').trim() || null,
        partnerName: (r['Partner Name'] || '').trim() || null,
        partnerType: (r['Partner Type'] || '').trim() || '', // use '' instead of null
        workStatus: (r['Status'] || '').trim() || null
      };
      try {
        const createData = Object.assign({}, personnel);
        ensureId(createData);
        // use guarded helper - this will persist to DB if available, otherwise to JSON fallback
        await this._persistPersonnel(createData);
        processed++;
      } catch (err) {
        this.logger.error('ExcelImporter: personnel upsert error', err && (err.message || err), personnel);
      }
    }
    this.logger.info(`ExcelImporter: imported ${processed}/${rows.length} personnel rows`);
  }
  
  async _importDeliverables(rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) return;
    let processed = 0;
    for (const r of rows) {
      const deliverableNumber = (r['Deliverable #'] || r['Deliverable No'] || '').toString().trim() || null;
      const description = (r['Description'] || '').toString().trim();
      const deliverableObj = {
        partnerId: (r['Partner ID'] || '').toString().trim() || null,
        partnerName: (r['Partner Name'] || '').toString().trim() || null,
        deliverableNumber,
        deliverableName: description || (deliverableNumber ? `Deliverable ${deliverableNumber}` : 'Deliverable'),
        description: description || null,
        milestoneDate: r['Milestone Date'] || null,
        status: (r['Status'] || 'pending') || null,
        actualSubmission: r['Actual Submission'] || null,
        approvalDate: r['Approval Date'] || null,
        paymentPercentage: r['% Payment'] || null,
        paymentAmount: r['Payment Amount'] || null,
        paymentStatus: r['Payment Status'] || null,
        assignedTo: r['Responsible Person'] || null,
        notes: r['Notes'] || null,
        importedFromExcel: true,
        importedAt: new Date()
      };
      try {
        const createObj = Object.assign({}, deliverableObj);
        ensureId(createObj);
        // use guarded helper which will fallback to JSON if DB unavailable
        await this._createDeliverable(createObj);
        processed++;
      } catch (err) {
        this.logger.error('ExcelImporter: deliverable import error', err && (err.message || err), r);
      }
    }
    this.logger.info(`ExcelImporter: imported ${processed}/${rows.length} deliverable rows`);
  }

  async _importPartners(rows = []) {
    // basic partner import - implement as needed
    if (!Array.isArray(rows) || rows.length === 0) return;
    let processed = 0;
    for (const r of rows) {
      const partner = {
        partnerId: r['Partner ID'] || r['ID'] || null,
        partnerName: r['Partner Name'] || r['Name'] || null,
        contractStatus: r['Contract Status'] || null,
        frameworkAgreementDate: r['Framework Agreement Date'] || null,
        commencementDate: r['Commencement Date'] || null,
        termYears: r['Term (Years)'] || null,
        regionsOfOperation: r['Regions of Operation'] || null,
        createdAt: new Date()
      };
      try {
        const createData = Object.assign({}, partner); ensureId(createData);
        if (this.databaseService && typeof this.databaseService.createPartner === 'function') {
          await this.databaseService.createPartner(createData);
        } else if (this.prisma && this.prisma.partners) {
          await this.prisma.partners.create({ data: createData });
        } else {
          this.logger.warn('ExcelImporter: cannot create partner (no DB API)');
        }
        processed++;
      } catch (err) {
        this.logger.error('ExcelImporter: partner import error', err && (err.message || err), partner);
      }
    }
    this.logger.info(`ExcelImporter: imported ${processed}/${rows.length} partner rows`);
  }

  async _importCompliance(rows = []) {
    this.logger.info(`ExcelImporter: (compliance) rows=${rows.length} - handler not implemented`);
  }

  // helper: persist single item to JSON fallback collection
  async _persistToFallback(collectionName, item) {
    try {
      const store = await this._dataService.loadData();
      store[collectionName] = store[collectionName] || [];
      store[collectionName].push(item);
      await this._dataService.saveData(store);
      this.logger.log(`ExcelImporter: persisted to fallback ${collectionName}`);
      return true;
    } catch (e) {
      this.logger.error('ExcelImporter: fallback persist failed', e.message || e);
      return false;
    }
  }

  // example: replace direct DB calls with guarded calls
  async _createDeliverable(deliverable) {
    if (this.databaseService && typeof this.databaseService.createDeliverable === 'function') {
      return await this.databaseService.createDeliverable(deliverable);
    }
    // fallback
    return await this._persistToFallback('deliverables', deliverable);
  }

  async _persistPersonnel(person) {
    if (this.databaseService && typeof this.databaseService.createPersonnel === 'function') {
      return await this.databaseService.createPersonnel(person);
    }
    return await this._persistToFallback('keyPersonnel', person);
  }
}

module.exports = ExcelImporter;

// convenience static helper
ExcelImporter.processFile = async (filePath, prisma = null, options = {}) => {
  const imp = new ExcelImporter(prisma, options);
  // ensure importer directory exists before calling processFile
  if (!fs.existsSync(imp.dir)) fs.mkdirSync(imp.dir, { recursive: true });
  return imp.processFile(filePath);
};
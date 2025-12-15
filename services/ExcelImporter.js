const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

function normalizeSheetName(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^a-z0-9 ]/g, '');
}

// add helpers for robust header picking and detection
function pick(row, keys = []) {
    if (!row || typeof row !== 'object') return null;
    for (const k of keys) {
        // try exact, trimmed, and lower-case variants
        if (k in row && row[k] !== null && row[k] !== undefined && String(row[k]).trim() !== '') return row[k];
        const lower = Object.keys(row).find(rk => String(rk).trim().toLowerCase() === String(k).trim().toLowerCase());
        if (lower && row[lower] !== null && row[lower] !== undefined && String(row[lower]).trim() !== '') return row[lower];
    }
    return null;
}
function detectHeaders(rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const keys = new Set();
    for (const r of rows.slice(0, 20)) Object.keys(r || {}).forEach(k => keys.add(String(k).trim()));
    return Array.from(keys);
}

// new helpers: ignore temp files and robust header detection
function isTempExcelFile(filename) {
    const base = path.basename(filename || '').trim();
    return base.startsWith('~$') || base.startsWith('.') || base.toLowerCase().includes('temp');
}

function sanitizeCellValue(v) {
    if (v === null || v === undefined) return '';
    try {
        return String(v).replace(/\u0000/g, '').replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '').trim();
    } catch {
        return '';
    }
}

/**
 * Find best header row in sheet:
 * - look at first maxRows rows
 * - prefer row with most non-empty sanitized cells (>=2)
 * - skip single very-long garbled cell rows
 */
function findHeaderRowIndex(sheet, maxRows = 10) {
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    let bestIdx = -1;
    let bestCount = 0;
    for (let i = 0; i < Math.min(rows.length, maxRows); i++) {
        const row = rows[i] || [];
        const sanitized = row.map(sanitizeCellValue);
        const nonEmpty = sanitized.filter(s => s.length > 0);
        const combinedLen = sanitized.join('').length;
        // skip garbled single-cell rows
        if (nonEmpty.length === 1 && combinedLen > 120) continue;
        if (nonEmpty.length > bestCount) {
            bestCount = nonEmpty.length;
            bestIdx = i;
        }
    }
    return bestIdx;
}

class ExcelImporter {
    /**
     * prisma: an instantiated PrismaClient (or DatabaseService exposing prisma-like upsert API)
     * options: { dir, logger, debounceMs, databaseService }
     */
    constructor(prisma, options = {}) {
        this.prisma = prisma;
        this.dir = options.dir || path.join(process.cwd(), 'data', 'excel');
        this.logger = options.logger || console;
        this.debounceMs = options.debounceMs || 1000;
        this._queue = new Map();
        this._stateFile = path.join(this.dir, '.imported.json');
        this._state = {};
        this._timer = null;
        this.databaseService = options.databaseService || null;

        // register sheet handlers (keys are normalized)
        const handlers = {
            'master register': this._importPartners.bind(this),
            'master_register': this._importPartners.bind(this),
            'partners': this._importPartners.bind(this),

            'key personnel': this._importPersonnel.bind(this),
            'key_personnel': this._importPersonnel.bind(this),
            'personnel': this._importPersonnel.bind(this),

            'financial summary': this._importFinancial.bind(this),
            'deliverables': this._importDeliverables.bind(this),
            'compliance & reporting': this._importCompliance.bind(this),
        };

        // build normalized handlers index
        this.handlers = Object.keys(handlers).reduce((acc, k) => {
            acc[normalizeSheetName(k)] = handlers[k];
            return acc;
        }, {});
    }

    async init() {
        if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
        try {
            if (fs.existsSync(this._stateFile)) {
                const content = fs.readFileSync(this._stateFile, 'utf8') || '{}';
                this._state = JSON.parse(content);
            }
        } catch (e) {
            this.logger.warn('ExcelImporter: failed to load state file, starting fresh', e && e.message);
            this._state = {};
        }
        await this._processAllFiles();
        this._watch();
    }

    _watch() {
        // ignore the importer state file and any non-xlsx files to avoid self-triggering loops
        const ignored = (p) => {
            try {
                const base = path.basename(p);
                if (base === path.basename(this._stateFile)) return true;
                // ignore temporary/hidden files and non-xlsx/xls files
                if (!/\.(xlsx|xls)$/i.test(base)) return true;
            } catch (e) {
                return false;
            }
            return false;
        };

        const watcher = chokidar.watch(this.dir, { ignoreInitial: true, ignored });
        const schedule = file => {
            this._queue.set(file, Date.now());
            clearTimeout(this._timer);
            this._timer = setTimeout(() => this._drainQueue(), this.debounceMs);
        };
        watcher.on('add', schedule).on('change', schedule).on('unlink', file => {
            this.logger.info(`ExcelImporter: file removed ${file}`);
        });
        this.logger.info(`ExcelImporter: watching ${this.dir} (ignoring ${path.basename(this._stateFile)} and non-xlsx files)`);
    }

    async _drainQueue() {
        const files = Array.from(this._queue.keys());
        this._queue.clear();
        for (const f of files) {
            try { await this.processFile(f); }
            catch (err) { this.logger.error('ExcelImporter: processFile error', err && err.message); }
        }
    }

    async _processAllFiles() {
        const files = fs.readdirSync(this.dir).filter(f => /\.(xlsx|xls)$/i.test(f)).map(f => path.join(this.dir, f));
        for (const f of files) {
            try { await this.processFile(f); }
            catch (err) { this.logger.error('ExcelImporter: processFile error', err && err.message); }
        }
    }

    async processFile(filePath) {
        const filename = path.basename(filePath);
        if (isTempExcelFile(filename)) {
            console.log('ExcelImporter: skipping temp file ->', filename);
            return;
        }
        if (!/\.(xlsx|xls|csv)$/i.test(filename)) {
            console.log('ExcelImporter: skipping non-excel file ->', filename);
            return;
        }

        let workbook;
        try {
            workbook = xlsx.readFile(filePath, { cellDates: true, raw: false });
        } catch (err) {
            console.warn('ExcelImporter: failed to read file', filename, err && err.message);
            return;
        }

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const headerIdx = findHeaderRowIndex(sheet, 12);
            const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' }).slice(headerIdx >= 0 ? headerIdx : 0);
            const headerRow = headerIdx >= 0 ? (rows[0] || []) : [];
            const normalizedHeader = headerRow.map(sanitizeCellValue).filter(h => h.length > 0);
            console.log(`ExcelImporter: inferred header row at index ${headerIdx}:`, normalizedHeader);

            if (!normalizedHeader || normalizedHeader.length < 2) {
                console.log(`ExcelImporter: insufficient headers in sheet "${sheetName}" - skipping`);
                continue;
            }

            // existing sheet-specific handling (unchanged)...
            // e.g. if (sheetNameMatch) { parse rows starting at headerIdx + 1 ... }
            // ...existing code...
        }

    }

    // --- Example import handlers (adjust to your Prisma schema) ---
    async _importPartners(rows = []) {
        if (!Array.isArray(rows) || rows.length === 0) return;
        const headers = detectHeaders(rows);
        this.logger.info('ExcelImporter: partner sheet headers sample ->', headers.slice(0, 12));

        let processed = 0;
        for (const r of rows) {
            const partner = {
                partnerId: pick(r, ['Partner ID', 'partnerId', 'Partner No', 'Partner#', 'partner_id']),
                partnerName: pick(r, ['Partner Name', 'Name', 'Organisation', 'Organization', 'Org Name', 'partnerName']),
                partnerType: pick(r, ['Partner Type', 'Type', 'Organisation Type', 'partnerType']),
                contactEmail: pick(r, ['Contact Email', 'Email', 'Email Address', 'contactEmail', 'email']),
                contractStatus: pick(r, ['Status', 'Contract Status']),
                contractStartDate: pick(r, ['Agreement Date', 'Start Date']),
                commencementDate: pick(r, ['Commencement', 'Commencement Date']),
                contractDuration: pick(r, ['Term', 'Contract Duration', 'Duration']),
                contractValue: pick(r, ['Price (Y1)', 'Contract Value', 'Value']),
                regionsOfOperation: pick(r, ['Regions', 'Regions of Operation', 'regions']),
                keyPersonnel: pick(r, ['Key Personnel', 'Key_personnel', 'Key personnel'])
            };

            // Skip obvious placeholder/empty rows
            const isEmptyRow = Object.values(r).every(v => v === null || v === undefined || String(v).trim() === '');
            if (isEmptyRow) {
                this.logger.debug('ExcelImporter: skipping empty placeholder row');
                continue;
            }

            // If critical fields are missing, attempt sensible fallbacks, otherwise skip.
            if (!partner.partnerName) {
                // try to build a partnerName from other columns
                partner.partnerName = pick(r, ['Organisation', 'Organisation Name', 'Org Name', 'Company']) || null;
            }
            if (!partner.contactEmail) {
                // try alternative email-like columns
                partner.contactEmail = pick(r, ['Contact', 'Primary Contact Email', 'Email Address']) || null;
            }

            if (!partner.partnerName || !partner.partnerType || !partner.contactEmail) {
                this.logger.warn('ExcelImporter: skipping partner row - missing required fields (partnerName, partnerType, contactEmail)', {
                    partnerPreview: { partnerId: partner.partnerId, partnerName: partner.partnerName, partnerType: partner.partnerType, contactEmail: partner.contactEmail }
                });
                continue;
            }

            try {
                let existing = null;
                if (partner.partnerId && this.prisma && this.prisma.partner) {
                    existing = await this.prisma.partner.findUnique({ where: { partnerId: partner.partnerId } });
                }

                if (existing && existing.id) {
                    const data = Object.assign({}, partner);
                    if (this.prisma && this.prisma.partner) {
                        await this.prisma.partner.update({ where: { id: existing.id }, data });
                    } else if (this.databaseService && this.databaseService.updatePartner) {
                        await this.databaseService.updatePartner(existing.id, data);
                    }
                } else {
                    // when partnerId missing, avoid creating duplicates — try to find by name+email
                    if (!partner.partnerId && this.prisma && this.prisma.partner) {
                        const byNameEmail = await this.prisma.partner.findFirst({
                            where: { partnerName: partner.partnerName, contactEmail: partner.contactEmail }
                        });
                        if (byNameEmail && byNameEmail.id) {
                            await this.prisma.partner.update({ where: { id: byNameEmail.id }, data: partner });
                            processed++;
                            continue;
                        }
                    }
                    if (this.prisma && this.prisma.partner) {
                        await this.prisma.partner.create({ data: partner });
                    } else if (this.databaseService && this.databaseService.createPartner) {
                        await this.databaseService.createPartner(partner);
                    }
                }
                processed++;
            } catch (err) {
                this.logger.error('ExcelImporter: partner upsert error', err && (err.message || err), partner);
            }
        }
        this.logger.info(`ExcelImporter: imported ${processed}/${rows.length} partner rows`);
    }

    async _importPersonnel(rows = []) {
        if (!Array.isArray(rows) || rows.length === 0) return;
        let processed = 0;
        for (const r of rows) {
            const personnel = {
                fullName: r['Full Name'] || r['Name'] || null,
                jobTitle: r['Job Title'] || null,
                emailAddress: r['Email'] || null,
                phoneNumber: r['Phone'] || null,
                partnerId: r['Partner ID'] || r['partnerId'] || null,
                partnerName: r['Partner Name'] || null,
                partnerType: r['Partner Type'] || null,
                workStatus: r['Status'] || null,
            };
            try {
                if (personnel.emailAddress && this.prisma && this.prisma.personnel) {
                    await this.prisma.personnel.upsert({
                        where: { emailAddress: personnel.emailAddress },
                        create: personnel,
                        update: personnel
                    });
                } else if (this.databaseService && this.databaseService.createOrUpdatePersonnel) {
                    await this.databaseService.createOrUpdatePersonnel(personnel);
                } else if (this.prisma && this.prisma.personnel) {
                    await this.prisma.personnel.create({ data: personnel });
                }
                processed++;
            } catch (err) {
                this.logger.error('ExcelImporter: personnel upsert error', err && (err.message || err), personnel);
            }
        }
        this.logger.info(`ExcelImporter: imported ${processed}/${rows.length} personnel rows`);
    }

    async _importFinancial(rows = []) {
        this.logger.info(`ExcelImporter: (financial) rows=${rows.length} - handler not implemented`);
    }

    async _importDeliverables(rows = []) {
        if (!Array.isArray(rows) || rows.length === 0) {
            this.logger.info('ExcelImporter: no deliverables rows to import');
            return;
        }

        let processed = 0;
        const existingMap = new Map();

        try {
            if (this.databaseService && typeof this.databaseService.getDeliverables === 'function') {
                const existing = await this.databaseService.getDeliverables();
                (existing || []).forEach(d => {
                    const key = `${d.partnerId || ''}||${d.deliverableNumber || ''}`;
                    existingMap.set(key, d);
                });
            } else if (this.prisma && this.prisma.deliverables) {
                const existing = await this.prisma.deliverables.findMany();
                (existing || []).forEach(d => {
                    const key = `${d.partnerId || ''}||${d.deliverableNumber || ''}`;
                    existingMap.set(key, d);
                });
            } else {
                this.logger.warn('ExcelImporter: no databaseService or prisma.deliverables available; will attempt create-only operations');
            }
        } catch (err) {
            this.logger.warn('ExcelImporter: failed to build existing deliverables index', err && err.message);
        }

        const normalizeDate = (v) => {
            if (!v) return null;
            if (v instanceof Date) return v.toISOString();
            const parsed = new Date(v);
            return isNaN(parsed.getTime()) ? null : parsed.toISOString();
        };

        for (const r of rows) {
            try {
                const partnerId = r['Partner ID'] || r['partnerId'] || r['Partner'] || null;
                const partnerName = r['Partner Name'] || r['partnerName'] || null;
                const deliverableNumber = r['Deliverable #'] || r['deliverableNumber'] || r['No'] || null;
                const description = r['Description'] || r['Deliverable Description'] || r['description'] || null;
                const milestoneDate = r['Milestone Date'] || r['Due Date'] || r['milestoneDate'] || null;
                const status = (r['Status'] || r['status'] || 'pending') ? String(r['Status'] || r['status'] || 'pending') : 'pending';
                const actualSubmission = r['Actual Submission'] || r['Submission Date'] || null;
                const approvalDate = r['Approval Date'] || r['approvalDate'] || null;
                const paymentPercentage = r['% Payment'] || r['Payment %'] || r['paymentPercentage'] || null;
                const paymentAmountRaw = r['Payment Amount'] || r['paymentAmount'] || null;
                const paymentAmount = (typeof paymentAmountRaw === 'number') ? paymentAmountRaw : (paymentAmountRaw ? String(paymentAmountRaw).replace(/[^\d.-]/g, '') : null);
                const paymentStatus = r['Payment Status'] || r['paymentStatus'] || null;
                const priority = r['Priority'] || r['priority'] || null;
                const assignedTo = r['Assigned To'] || r['assignedTo'] || null;

                const deliverableObj = {
                    partnerId,
                    partnerName,
                    deliverableNumber,
                    description,
                    milestoneDate: normalizeDate(milestoneDate),
                    status,
                    actualSubmission: normalizeDate(actualSubmission),
                    approvalDate: normalizeDate(approvalDate),
                    paymentPercentage: paymentPercentage || null,
                    paymentAmount: paymentAmount || null,
                    paymentStatus,
                    priority,
                    assignedTo,
                    importedFromExcel: true,
                    importedAt: new Date().toISOString()
                };

                const key = `${partnerId || ''}||${deliverableNumber || ''}`;
                const existing = existingMap.get(key);

                if (existing && existing.id) {
                    if (this.databaseService && typeof this.databaseService.updateDeliverable === 'function') {
                        await this.databaseService.updateDeliverable(existing.id, deliverableObj);
                    } else if (this.prisma && this.prisma.deliverables) {
                        await this.prisma.deliverables.update({ where: { id: existing.id }, data: deliverableObj });
                    } else if (this.databaseService && typeof this.databaseService.createDeliverable === 'function') {
                        await this.databaseService.createDeliverable(deliverableObj);
                    } else if (this.prisma && this.prisma.deliverables) {
                        await this.prisma.deliverables.create({ data: deliverableObj });
                    } else {
                        this.logger.warn('ExcelImporter: cannot update or create deliverable (no DB API)');
                    }
                } else {
                    if (this.databaseService && typeof this.databaseService.createDeliverable === 'function') {
                        await this.databaseService.createDeliverable(deliverableObj);
                    } else if (this.prisma && this.prisma.deliverables) {
                        await this.prisma.deliverables.create({ data: deliverableObj });
                    } else {
                        this.logger.warn('ExcelImporter: cannot create deliverable (no DB API)');
                    }
                }

                processed++;
            } catch (err) {
                this.logger.error('ExcelImporter: deliverable import error', err && (err.message || err), r);
            }
        }

        this.logger.info(`ExcelImporter: imported ${processed}/${rows.length} deliverable rows`);
    }

    async _importCompliance(rows = []) {
        this.logger.info(`ExcelImporter: (compliance) rows=${rows.length} - handler not implemented`);
    }
}

/* Replace the previous object export with the class as the default export,
   and attach the convenience helper as a static function so both:
     - `new ExcelImporter(...)` works, and
     - `const ExcelImporter = require(...); ExcelImporter.processFile(...)` works.
*/

module.exports = ExcelImporter;

// convenience static helper
ExcelImporter.processFile = async (filePath, prisma = null, options = {}) => {
  const imp = new ExcelImporter(prisma, options);
  // ensure importer directory exists before calling processFile
  if (!fs.existsSync(imp.dir)) fs.mkdirSync(imp.dir, { recursive: true });
  return imp.processFile(filePath);
};
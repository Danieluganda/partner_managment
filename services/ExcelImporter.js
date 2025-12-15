const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const xlsx = require('xlsx');
const crypto = require('crypto');

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

// --- new helper: detect a real header row inside noisy sheets and return object rows ---
function extractRowsWithInferredHeader(sheet, logger) {
    // get raw rows as arrays
    const raw = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    if (!Array.isArray(raw) || raw.length === 0) return [];

    const headerTokens = [
        'partner', 'name', 'email', 'contact', 'id', 'deliver', 'description',
        'due', 'milestone', 'status', 'payment', 'amount', 'role', 'job', 'key personnel',
        'organization', 'organisation', 'contract', 'start', 'commence'
    ];

    const normalize = v => String(v || '').trim().toLowerCase();

    const lookForHeader = (row) => {
        if (!Array.isArray(row)) return 0;
        let matches = 0;
        for (const cell of row) {
            const txt = normalize(cell);
            for (const token of headerTokens) {
                if (txt.includes(token)) { matches++; break; }
            }
        }
        return matches;
    };

    // scan first N rows for a header-like row (prefer rows with >=2 token matches)
    const maxScan = Math.min(10, raw.length);
    let headerRowIdx = -1;
    for (let i = 0; i < maxScan; i++) {
        const score = lookForHeader(raw[i]);
        if (score >= 2) { headerRowIdx = i; break; }
    }

    // fallback: prefer first row that isn't all empty and not generic Excel column letters
    if (headerRowIdx === -1) {
        for (let i = 0; i < maxScan; i++) {
            const row = raw[i] || [];
            const nonEmpty = row.some(c => c !== null && String(c).trim() !== '');
            const allGeneric = row.every(c => {
                const s = normalize(c);
                return s === '' || /^[a-z]$/i.test(s) || /^__empty/.test(s) || s === 'a' || s === 'b' || s === 'row';
            });
            if (nonEmpty && !allGeneric) { headerRowIdx = i; break; }
        }
    }

    if (headerRowIdx === -1) {
        logger && logger.debug && logger.debug('ExcelImporter: no clear header row detected; falling back to default json parser');
        // fallback to object parser which uses first non-empty row as header
        return xlsx.utils.sheet_to_json(sheet, { defval: null });
    }

    const headerRow = raw[headerRowIdx].map(h => String(h || '').trim());
    logger && logger.info && logger.info(`ExcelImporter: inferred header row at index ${headerRowIdx}:`, headerRow.slice(0, 12));

    const objs = [];
    for (let r = headerRowIdx + 1; r < raw.length; r++) {
        const row = raw[r];
        if (!row) continue;
        // skip completely empty rows
        const isEmpty = row.every(c => c === null || String(c).trim() === '');
        if (isEmpty) continue;
        const obj = {};
        for (let c = 0; c < headerRow.length; c++) {
            const key = headerRow[c] || `col_${c}`;
            obj[key] = (c < row.length) ? row[c] : null;
        }
        // also include extra cells beyond header length using numeric keys
        for (let c = headerRow.length; c < row.length; c++) {
            obj[`col_${c}`] = row[c];
        }
        objs.push(obj);
    }
    return objs;
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

    async processFile(filepath) {
        const stat = fs.statSync(filepath);
        const buffer = fs.readFileSync(filepath);
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        const rel = path.relative(this.dir, filepath);

        const previous = this._state[rel];
        if (previous && previous.hash === hash && previous.mtimeMs === stat.mtimeMs) {
            this.logger.info(`ExcelImporter: skipping unchanged ${rel}`);
            return;
        }

        this.logger.info(`ExcelImporter: processing ${rel}`);
        const workbook = xlsx.read(buffer, { cellDates: true });
        const sheetNames = workbook.SheetNames || [];

        for (const sheetName of sheetNames) {
            try {
                const normalized = normalizeSheetName(sheetName);
                let handler = this.handlers[normalized];

                // Heuristic fallbacks for noisy sheet names (handles the "Put this in excel sheet ..." cases)
                if (!handler) {
                    const n = normalized;
                    if (n.includes('deliver') || n.includes('deliverab')) {
                        handler = this.handlers[normalizeSheetName('deliverables')];
                    } else if (n.includes('master') || n.includes('register') || n.includes('worksh')) {
                        handler = this.handlers[normalizeSheetName('master register')];
                    } else if (n.includes('key') && n.includes('person')) {
                        handler = this.handlers[normalizeSheetName('key personnel')];
                    } else if (n.includes('financ') || n.includes('financial')) {
                        handler = this.handlers[normalizeSheetName('financial summary')];
                    } else if (n.includes('compli') || n.includes('report')) {
                        handler = this.handlers[normalizeSheetName('compliance & reporting')];
                    } else {
                        // try matching any handler whose normalized key appears inside sheet name
                        const fallback = Object.entries(this.handlers).find(([k]) => n.includes(k) || k.includes(n));
                        if (fallback) handler = fallback[1];
                    }
                }

                // File-name based fallback (covers files where sheet titles are placeholders)
                if (!handler) {
                    const fileLower = String(rel || '').toLowerCase();
                    if (fileLower.includes('deliver')) {
                        handler = this.handlers[normalizeSheetName('deliverables')];
                        this.logger.info(`ExcelImporter: fallback -> using 'deliverables' handler based on filename ${rel}`);
                    } else if (fileLower.includes('key') && fileLower.includes('person')) {
                        handler = this.handlers[normalizeSheetName('key personnel')];
                        this.logger.info(`ExcelImporter: fallback -> using 'key personnel' handler based on filename ${rel}`);
                    } else if (fileLower.includes('master') || fileLower.includes('register')) {
                        handler = this.handlers[normalizeSheetName('master register')];
                        this.logger.info(`ExcelImporter: fallback -> using 'master register' handler based on filename ${rel}`);
                    } else if (fileLower.includes('compliance') || fileLower.includes('report')) {
                        handler = this.handlers[normalizeSheetName('compliance & reporting')];
                        this.logger.info(`ExcelImporter: fallback -> using 'compliance & reporting' handler based on filename ${rel}`);
                    } else if (fileLower.includes('financial')) {
                        handler = this.handlers[normalizeSheetName('financial summary')];
                        this.logger.info(`ExcelImporter: fallback -> using 'financial summary' handler based on filename ${rel}`);
                    }
                }

                const rows = extractRowsWithInferredHeader(workbook.Sheets[sheetName], this.logger);
                this.logger.info(`ExcelImporter: handling sheet "${sheetName}" (${rows.length} rows) -> normalized: ${normalized}`);

                if (handler && typeof handler === 'function') {
                    this.logger.info(`ExcelImporter: using handler for sheet "${sheetName}"`);
                    await handler(rows, { file: rel, sheet: sheetName });
                } else {
                    this.logger.info('ExcelImporter: no handler for sheet:', sheetName, 'normalized:', normalized);
                }
            } catch (err) {
                this.logger.error(`ExcelImporter: error processing sheet "${sheetName}"`, err && (err.message || err));
            }
        }

        this._state[rel] = {
            hash,
            mtimeMs: stat.mtimeMs,
            importedAt: new Date().toISOString()
        };

        try {
            fs.writeFileSync(this._stateFile, JSON.stringify(this._state, null, 2), 'utf8');
        } catch (err) {
            this.logger.warn('ExcelImporter: failed to write state file', err && err.message);
        }

        this.logger.info(`ExcelImporter: finished ${rel}`);
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

module.exports = ExcelImporter;
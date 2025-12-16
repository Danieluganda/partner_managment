const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const ROOT = process.cwd();
const TEMPLATES_DIR = path.join(ROOT, 'data', 'templates');
const UPLOAD_DIR = path.join(ROOT, 'data', 'excel', 'uploads');

fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const prisma = new PrismaClient();

// multer setup...
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const name = `${Date.now()}-${file.originalname.replace(/\s+/g,'_')}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    cb(ok ? null : new Error('Invalid file type'), ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ...existing helper/constants (MASTER_HEADERS, createTemplateIfMissing, normalizeHeader, validateMasterSheetHeaders) ...

// NEW: options landing page - choose Manual form or Excel upload
router.get('/', (req, res) => {
  res.render('excel-options', { title: 'Data Update Options' });
});

// Manual partner entry form
router.get('/manual', (req, res) => {
  // form fields follow owner's spec
  res.render('manual-partner-form', {
    title: 'Add / Update Partner',
    regions: ['Busia','Tororo','Pallisa','Bulambuli','Kapchorwa','Mbale','Sironko']
  });
});

// handle manual form submission
router.post('/manual-add', async (req, res) => {
  try {
    const body = req.body || {};
    const partner = {
      partnerId: body.partner_id || undefined,
      partnerName: body.partner_name || null,
      contractStatus: body.contract_status || null,
      frameworkAgreementDate: body.framework_agreement_date || null,
      commencementDate: body.commencement_date || null,
      contractTermYears: body.contract_term_years ? Number(body.contract_term_years) : null,
      currentTaskOrder: body.current_task_order || null,
      regionsOfOperation: Array.isArray(body.regions_of_operation) ? body.regions_of_operation : (body.regions_of_operation ? [body.regions_of_operation] : []),
      keyPersonnel: body.key_personnel || null,
      taskOrderPriceY1: body.task_order_price_y1 ? Number(String(body.task_order_price_y1).replace(/[^\d.-]/g,'')) : null,
      contractLink: body.contract_link || null
    };

    // simple required validation
    if (!partner.partnerName) {
      return res.status(400).send('partner_name is required');
    }

    // use prisma if partner model exists; otherwise return saved-to-uploads fallback
    if (prisma && prisma.partner && typeof prisma.partner.upsert === 'function') {
      // upsert by partnerId or by partnerName
      const where = partner.partnerId ? { partnerId: partner.partnerId } : { partnerName: partner.partnerName };
      await prisma.partner.upsert({
        where,
        create: partner,
        update: partner
      });
      return res.redirect('/?msg=partner_saved');
    }

    // fallback: persist to a JSON file in uploads for manual review
    const out = path.join(UPLOAD_DIR, `manual_${Date.now()}.json`);
    fs.writeFileSync(out, JSON.stringify(partner, null, 2));
    return res.redirect('/?msg=partner_saved_file');
  } catch (err) {
    return res.status(500).send(err && err.message ? err.message : String(err));
  }
});

// existing template & upload routes remain; ensure paths not conflicted
// GET: download template
router.get('/template', (req, res) => {
  const templatePath = path.join(TEMPLATES_DIR, 'excel-template.xlsx');
  createTemplateIfMissing(templatePath);
  res.download(templatePath, 'kulg-excel-template.xlsx');
});

// GET: upload form (existing)
router.get('/upload-form', (req, res) => {
  res.render('upload-excel', { title: 'Upload Excel' });
});

// POST: upload and preview
router.post('/upload', upload.single('excel_file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  try {
    const filePath = req.file.path;
    const ExcelImporter = require('../services/ExcelImporter');
    const importer = new ExcelImporter(prisma, { dir: UPLOAD_DIR });
    
    // Parse file for preview
    const parsedData = await importer.parseFile(filePath);
    
    // Render preview page
    res.render('preview-excel', { 
        title: 'Preview Data Import', 
        filename: req.file.originalname,
        uploadedPath: req.file.filename, // just the basename in uploads
        data: parsedData
    });
  } catch (err) {
    console.error('Upload preview error:', err);
    res.status(500).render('error', { error: err });
  }
});

// POST: confirm import
router.post('/confirm', async (req, res) => {
    try {
        const { uploadedPath, sheetsToImport } = req.body; // sheetsToImport is array of sheet names
        if (!uploadedPath) return res.status(400).send('Missing file reference.');

        const filePath = path.join(UPLOAD_DIR, uploadedPath);
        if (!fs.existsSync(filePath)) return res.status(400).send('File expired or missing.');

        // Re-initialize importer
        const databaseService = require('../services/DatabaseService'); // ensure we use the singleton instance style or new instance connected
        // Actually, we should use the existing initialized service if possible, or just create new one
        const dbService = new (require('../services/DatabaseService'))();
        await dbService.connect();

        const ExcelImporter = require('../services/ExcelImporter');
        const importer = new ExcelImporter(prisma, { 
            dir: UPLOAD_DIR, 
            databaseService: dbService 
        });

        // Re-parse (safe since it's local)
        const parsed = await importer.parseFile(filePath);
        
        // Filter sheets if user deselected some (optional feature, for now import all valid)
        // ... (can implement filtering based on sheetsToImport)

        // Run import
        const result = await importer.importData(parsed);

        res.render('import-success', { 
            title: 'Import Complete', 
            summary: result.summary,
            errors: result.errors
        });

    } catch (err) {
        console.error('Import confirm error:', err);
        res.status(500).render('error', { error: err });
    }
});

module.exports = router;
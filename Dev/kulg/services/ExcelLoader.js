const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EXCEL_DIR = path.join(__dirname, '..', 'data', 'excel');
const IMPORTED_JSON = path.join(EXCEL_DIR, '.imported.json');
const POLL_INTERVAL_MS = parseInt(process.env.EXCEL_POLL_MS || '10000', 10); // 10s default

let cache = { _meta: { hash: null, loadedAt: null }, data: {} };
let importing = false;

// Safe read .imported.json
function loadImportedJson() {
  try {
    if (fs.existsSync(IMPORTED_JSON)) {
      const raw = fs.readFileSync(IMPORTED_JSON, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      cache.data = parsed;
      cache._meta.loadedAt = new Date().toISOString();
      return true;
    }
  } catch (err) {
    console.warn('ExcelLoader: failed to read .imported.json', err.message);
  }
  return false;
}

function computeFilesHash(dir) {
  try {
    const files = fs.readdirSync(dir)
      .filter(f => /\.(xlsx|xls|csv|json)$/i.test(f) && f !== '.imported.json')
      .map(f => path.join(dir, f))
      .sort();

    const hash = crypto.createHash('sha256');
    for (const file of files) {
      const st = fs.statSync(file);
      hash.update(file + '|' + st.mtimeMs + '|' + st.size + '\n');
    }
    return hash.digest('hex');
  } catch (err) {
    console.warn('ExcelLoader: computeFilesHash error', err && err.message);
    return null;
  }
}

async function runImporterIfNeeded(prisma, databaseService) {
  if (importing) return;
  try {
    const currentHash = computeFilesHash(EXCEL_DIR);
    if (!currentHash) return;

    if (cache._meta.hash && cache._meta.hash === currentHash) {
      // nothing changed
      return;
    }

    // prefer to seed cache from .imported.json immediately if present
    loadImportedJson();

    importing = true;
    console.log('ExcelLoader: change detected or first run — running importer...');

    // Attempt to require existing importer; it's optional
    let ExcelImporter = null;
    try {
      ExcelImporter = require('./ExcelImporter');
    } catch (e) {
      ExcelImporter = null;
    }

    if (ExcelImporter) {
      const importer = new ExcelImporter(prisma, { dir: EXCEL_DIR, logger: console, databaseService });
      // prefer a public method names used in repo
      if (typeof importer._processAllFiles === 'function') {
        await importer._processAllFiles();
      } else if (typeof importer.importAll === 'function') {
        await importer.importAll();
      } else if (typeof importer.init === 'function') {
        await importer.init();
      }
      // importer should write .imported.json; reload it
      loadImportedJson();
    } else {
      console.warn('ExcelLoader: ExcelImporter not found — ensure services/ExcelImporter.js exists');
    }

    cache._meta.hash = currentHash;
    cache._meta.loadedAt = new Date().toISOString();
    console.log('ExcelLoader: import complete, hash=', cache._meta.hash);
  } catch (err) {
    console.error('ExcelLoader: importer run failed', err && err.message);
  } finally {
    importing = false;
  }
}

function startWatcher(prisma, databaseService) {
  // Polling fallback - reliable across platforms
  setInterval(() => {
    runImporterIfNeeded(prisma, databaseService).catch(err => {
      console.error('ExcelLoader: periodic import error', err && err.message);
    });
  }, POLL_INTERVAL_MS);
}

module.exports = {
  async init(options = {}) {
    // options: prisma, databaseService
    const { prisma = null, databaseService = null } = options;
    // initial load from .imported.json if present
    loadImportedJson();

    // compute hash and import if needed (non-blocking)
    try {
      await runImporterIfNeeded(prisma, databaseService);
    } catch (err) {
      console.error('ExcelLoader.init: initial import failed', err && err.message);
    }

    // start watcher
    startWatcher(prisma, databaseService);
    return cache.data;
  },

  // returns plain parsed data object (from .imported.json or importer output)
  get() {
    return cache.data || {};
  },

  // force reload of .imported.json into memory
  reload() {
    loadImportedJson();
    return cache.data;
  },

  // expose meta for debug
  meta() {
    return cache._meta;
  }
};
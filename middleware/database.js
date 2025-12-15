const DatabaseService = require('../services/DatabaseService');

let dbInstance = null;

async function ensureDatabase(req, res, next) {
  try {
    if (!dbInstance) {
      dbInstance = new DatabaseService();
      await dbInstance.initialize();
    }
    req.db = dbInstance;
    req.app.locals.db = dbInstance;
    next();
  } catch (error) {
    console.error('Database middleware error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
}

module.exports = ensureDatabase;
// ...new file...
const crypto = require('crypto');
/**
 * Ensure an object has an `id` property.
 * Uses crypto.randomUUID() when available to generate new IDs.
 */
function ensureId(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (!obj.id) {
    if (typeof crypto.randomUUID === 'function') {
      obj.id = crypto.randomUUID();
    } else {
      // fallback to UUID v4 if older Node (rare)
      const { v4: uuidv4 } = require('uuid');
      obj.id = uuidv4();
    }
  }
  return obj;
}

module.exports = { ensureId };
// ...new file...
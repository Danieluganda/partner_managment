// Use window.apiBase (set by server) or fall back to empty string (relative)
window.apiBase = window.apiBase !== undefined ? window.apiBase : '';
// Example usage: fetch(`${window.apiBase}/api/partners`)
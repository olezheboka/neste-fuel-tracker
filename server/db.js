const path = require('path');

// Simple In-Memory Database for Serverless/Ephemeral environments
class MemoryDatabase {
  constructor() {
    this.prices = [];
    console.log('[MemoryDB] Initialized in-memory storage');
  }

  async exec(sql) {
    // Mock table creation - do nothing
    return Promise.resolve();
  }

  async get(sql, params) {
    // Basic Mocking for specific queries used in the app
    if (sql.includes('ORDER BY id DESC LIMIT 1')) {
      // Return latest timestamp
      if (this.prices.length === 0) return undefined;
      // Sort by timestamp desc
      const sorted = [...this.prices].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return sorted[0];
    }
    return undefined;
  }

  async all(sql, params) {
    if (sql.includes('WHERE timestamp = ?')) {
      const ts = params; // params is single val here from index.js
      return this.prices.filter(p => p.timestamp === ts);
    }
    if (sql.includes('GROUP BY type')) {
      // Fallback latest
      return []; // simplistic
    }
    if (sql.includes('SELECT * FROM fuel_prices')) {
      let filtered = [...this.prices];
      // Very basic filter support
      if (params && params.length > 0 && sql.includes('WHERE type = ?')) {
        filtered = filtered.filter(p => p.type === params[0]);
      }
      // Sort asc
      return filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    return [];
  }

  async run(sql, params) {
    if (sql.includes('INSERT INTO')) {
      // params: [type, price, location, timestamp]
      this.prices.push({
        type: params[0],
        price: params[1],
        location: params[2],
        timestamp: params[3]
      });
    }
    return Promise.resolve();
  }
}

// Global instance to persist across HMR/warm starts
let memoryInstance = null;

async function openDb() {
  // force memory db in vercel to avoid native crashes
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    if (!memoryInstance) memoryInstance = new MemoryDatabase();
    return memoryInstance;
  }

  // Lazy load sqlite3 ONLY for local dev to avoid build/runtime crash in Vercel
  const sqlite3 = require('sqlite3');
  const { open } = require('sqlite');

  return open({
    filename: './prices.db',
    driver: sqlite3.Database
  });
}

async function initDb() {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS fuel_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      price REAL NOT NULL,
      location TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Database initialized (Type: ' + (db instanceof MemoryDatabase ? 'Memory' : 'SQLite') + ')');
  return db;
}

module.exports = { openDb, initDb };

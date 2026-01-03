const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const path = require('path');

async function openDb() {
  const dbPath = process.env.VERCEL || process.env.NODE_ENV === 'production'
    ? path.join('/tmp', 'prices.db')
    : './prices.db';

  return open({
    filename: dbPath,
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
  console.log('Database initialized');
  return db;
}

module.exports = { openDb, initDb };

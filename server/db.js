const path = require('path');

// Helper to convert SQLite parameters (?) to Postgres parameters ($1, $2, ...)
function convertQueryToPg(sql) {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
}

class PostgresDatabase {
    constructor(pool) {
        this.pool = pool;
    }

    async exec(sql) {
        return this.pool.query(sql);
    }

    async get(sql, params = []) {
        const pgSql = convertQueryToPg(sql);
        const { rows } = await this.pool.query(pgSql, params);
        return rows[0];
    }

    async all(sql, params = []) {
        const pgSql = convertQueryToPg(sql);
        const { rows } = await this.pool.query(pgSql, params);
        return rows;
    }

    async run(sql, params = []) {
        const pgSql = convertQueryToPg(sql);
        await this.pool.query(pgSql, params);
        return { changes: 1 };
    }
}

// Global instance to persist across HMR/warm starts
let dbInstance = null;

async function openDb() {
    if (dbInstance) return dbInstance;

    // 1. Production / Vercel with Postgres
    if (process.env.POSTGRES_URL) {
        console.log('[DB] Connecting to Vercel Postgres...');
        try {
            const { createPool } = require('@vercel/postgres');
            const pool = createPool({
                connectionString: process.env.POSTGRES_URL,
            });
            dbInstance = new PostgresDatabase(pool);
            return dbInstance;
        } catch (e) {
            console.error('[DB] Failed to connect to Postgres:', e);
            throw e;
        }
    }

    // 2. Local Development (SQLite) or Fallback
    // Ensure we don't try to load sqlite3 in Vercel environment where it might fail build if not present/compatible
    // But since we are moving away from MemoryDB, we only fallback to SQLite if NOT in Vercel OR if just running locally.
    // If we are in Vercel with NO Postgres, we can't persist anyway.
    
    console.log('[DB] Using Local SQLite');
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');

    dbInstance = await open({
        filename: path.join(__dirname, 'prices.db'),
        driver: sqlite3.Database
    });
    
    return dbInstance;
}

async function initDb() {
    const db = await openDb();
    
    // Check if we are using Postgres or SQLite
    const isPostgres = db instanceof PostgresDatabase;

    if (isPostgres) {
        // Postgres Schema
        await db.exec(`
            CREATE TABLE IF NOT EXISTS fuel_prices (
                id SERIAL PRIMARY KEY,
                type TEXT NOT NULL,
                price REAL NOT NULL,
                location TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    } else {
        // SQLite Schema
        await db.exec(`
            CREATE TABLE IF NOT EXISTS fuel_prices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                price REAL NOT NULL,
                location TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    console.log('Database initialized (' + (isPostgres ? 'Postgres' : 'SQLite') + ')');
    return db;
}

module.exports = { openDb, initDb };

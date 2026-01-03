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

// Mock Database for when Postgres is missing (avoids sqlite3 crashes)
class MockDatabase {
    async exec(sql) { console.log('[MockDB] exec:', sql); }
    async get(sql, params) { console.log('[MockDB] get:', sql, params); return null; }
    async all(sql, params) { console.log('[MockDB] all:', sql, params); return []; }
    async run(sql, params) { console.log('[MockDB] run:', sql, params); return {}; }
}

// Global instance to persist across HMR/warm starts
let dbInstance = null;

async function openDb() {
    if (dbInstance) return dbInstance;

    // 1. Production / Vercel with Postgres
    if (process.env.POSTGRES_URL) {
        console.log('[DB] Connecting to Vercel Postgres...');
        try {
            const { createPool, createClient } = require('@vercel/postgres');

            // Try Pool first
            try {
                const pool = createPool({
                    connectionString: process.env.POSTGRES_URL,
                });
                dbInstance = new PostgresDatabase(pool);
                return dbInstance;
            } catch (poolErr) {
                // Fallback for Direct Connection String
                if (poolErr.message.includes('direct connection') || poolErr.code === 'VercelPostgresError') {
                    console.warn('[DB] Pool creation failed. Switching to Client.');
                    const client = createClient({
                        connectionString: process.env.POSTGRES_URL,
                    });
                    await client.connect();
                    dbInstance = new PostgresDatabase(client);
                    return dbInstance;
                }
                throw poolErr;
            }
        } catch (e) {
            console.error('[DB] Failed to connect to Postgres:', e);
            throw e;
        }
    }

    // 2. Fallback (NO SQLite native dependency to avoid Vercel crashes)
    console.warn('[DB] No POSTGRES_URL found. Using Mock In-Memory DB (Data will not save).');
    console.warn('[DB] SQLite is disabled in this debug build to prevent invocation failures.');

    dbInstance = new MockDatabase();
    return dbInstance;
}

async function initDb() {
    const db = await openDb();

    // Check if we are using Postgres or Mock
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
        console.log('[DB] Mock DB initialized (No table creation needed)');
    }

    console.log('Database initialized (' + (isPostgres ? 'Postgres' : 'Mock') + ')');
    return db;
}

module.exports = { openDb, initDb };

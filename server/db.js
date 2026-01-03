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
        // Log masked URL for debugging to verify format
        const maskedUrl = process.env.POSTGRES_URL.replace(/:([^:@]+)@/, ':***@');
        console.log(`[DB] Connecting to Vercel Postgres... URL: ${maskedUrl}`);

        try {
            const { createPool } = require('@vercel/postgres');

            // Try Pool with explicit SSL settings
            try {
                const pool = createPool({
                    connectionString: process.env.POSTGRES_URL,
                    ssl: { rejectUnauthorized: false }
                });
                dbInstance = new PostgresDatabase(pool);
                return dbInstance;
            } catch (poolErr) {
                // Fallback for Direct Connection String (Neon/Vercel quirk)
                const msg = poolErr.message || '';
                if (msg.includes('direct connection') || poolErr.code === 'invalid_connection_string' || poolErr.code === 'VercelPostgresError') {
                    console.warn('[DB] Pool creation failed (Direct Connection URL detected). Switching to single Client fallback.');
                    try {
                        const { createClient } = require('@vercel/postgres');
                        const client = createClient({
                            connectionString: process.env.POSTGRES_URL,
                            ssl: { rejectUnauthorized: false }
                        });
                        await client.connect();
                        dbInstance = new PostgresDatabase(client);
                        return dbInstance;
                    } catch (clientErr) {
                        console.error('[DB] Failed to create Client fallback:', clientErr);
                        throw clientErr;
                    }
                }
                console.error('[DB] Pool creation error (Fatal):', poolErr);
                throw poolErr;
            }
        } catch (e) {
            console.error('[DB] Failed to load @vercel/postgres or connect:', e);
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

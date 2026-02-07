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



class SQLiteDatabase {
    constructor(db) {
        this.db = db;
    }

    async exec(sql) {
        return this.db.exec(sql);
    }

    async get(sql, params = []) {
        return this.db.get(sql, params);
    }

    async all(sql, params = []) {
        return this.db.all(sql, params);
    }

    async run(sql, params = []) {
        return this.db.run(sql, params);
    }
}

// Mock Database for when Postgres is missing (avoids sqlite3 crashes)
// Mock Database for when Postgres is missing (avoids sqlite3 crashes)
class MockDatabase {
    constructor() {
        this.prices = [];
    }

    async exec(sql) {
        // Simple mock for table creation
        console.log('[MockDB] exec:', sql.substring(0, 50) + '...');
    }

    async get(sql, params) {
        // console.log('[MockDB] get:', sql, params);
        if (sql.includes('SELECT timestamp FROM fuel_prices ORDER BY id DESC LIMIT 1')) {
            return this.prices.length > 0 ? { timestamp: this.prices[this.prices.length - 1].timestamp } : undefined;
        }
        return null;
    }

    async all(sql, params) {
        // console.log('[MockDB] all:', sql, params);

        // Very basic query handling for specific app queries
        if (sql.includes('SELECT type, price, location, timestamp') && sql.includes('MAX(timestamp)')) {
            if (this.prices.length === 0) return [];
            // Find latest timestamp
            const latest = this.prices[this.prices.length - 1].timestamp;
            // Return all items with that timestamp
            return this.prices.filter(p => p.timestamp === latest);
        }

        // Return all for history
        if (sql.includes('SELECT * FROM fuel_prices')) {
            // Sort by timestamp if requested
            if (sql.includes('ORDER BY timestamp ASC')) {
                return [...this.prices].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            }
            return this.prices;
        }

        return [];
    }

    async run(sql, params) {
        // console.log('[MockDB] run:', sql, params);
        if (sql.includes('INSERT INTO fuel_prices')) {
            // Params: [type, price, location, timestamp]
            const [type, price, location, timestamp] = params;
            this.prices.push({
                id: this.prices.length + 1,
                type,
                price,
                location,
                timestamp
            });
            // Keep memory check in bounds (last 1000 records)
            if (this.prices.length > 5000) {
                this.prices = this.prices.slice(-4000);
            }
        }
        return { changes: 1 };
    }
}

// Global instance to persist across HMR/warm starts
let dbInstance = null;

async function openDb() {
    if (dbInstance) return dbInstance;

    // 1. Production / Vercel with Postgres
    if (process.env.POSTGRES_URL) {
        // Log masked URL for debugging
        const maskedUrl = process.env.POSTGRES_URL.replace(/:([^:@]+)@/, ':***@');
        console.log(`[DB] Connecting to Postgres via 'pg' native driver... URL: ${maskedUrl}`);

        try {
            // Use standard pg driver to avoid Vercel wrapper validation issues
            const { Pool, Client } = require('pg');

            // Try Pool first
            try {
                const pool = new Pool({
                    connectionString: process.env.POSTGRES_URL,
                    ssl: { rejectUnauthorized: false },
                    max: 1 // Limit pool size for serverless to avoid exhaustion
                });

                // Validate connection immediately
                const client = await pool.connect();
                client.release(); // release back to pool

                console.log('[DB] pg.Pool connected successfully.');
                dbInstance = new PostgresDatabase(pool);
                return dbInstance;
            } catch (poolErr) {
                console.warn('[DB] pg.Pool failed. Switching to single pg.Client fallback.', poolErr.message);

                // Fallback for direct connection strings (no pool)
                try {
                    const client = new Client({
                        connectionString: process.env.POSTGRES_URL,
                        ssl: { rejectUnauthorized: false }
                    });
                    await client.connect();
                    console.log('[DB] pg.Client connected successfully.');
                    dbInstance = new PostgresDatabase(client);
                    return dbInstance;
                } catch (clientErr) {
                    console.error('[DB] Failed to connect with pg.Client:', clientErr);
                    throw clientErr;
                }
            }
        } catch (e) {
            console.error('[DB] Failed to load pg or connect:', e);
            throw e;
        }
    }

    // 2. Local SQLite Development
    console.log('[DB] No POSTGRES_URL found. Attempting to use Local SQLite Database.');

    try {
        const sqlite3 = require('sqlite3');
        const { open } = require('sqlite');

        const db = await open({
            filename: path.join(__dirname, 'fuel_prices.db'),
            driver: sqlite3.Database
        });

        console.log('[DB] SQLite connected successfully.');
        dbInstance = new SQLiteDatabase(db);
        return dbInstance;
    } catch (e) {
        console.warn('[DB] SQLite initialization failed. Falling back to Mock In-Memory DB (Data will not save).', e.message);
        dbInstance = new MockDatabase();
        return dbInstance;
    }
}

async function initDb() {
    const db = await openDb();

    // Check if we are using Postgres or Mock
    // Check if we are using Postgres, SQLite, or Mock
    const isPostgres = db instanceof PostgresDatabase;
    const isSQLite = db instanceof SQLiteDatabase;

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
    } else if (isSQLite) {
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
        console.log('[DB] SQLite Table initialized');
    } else {
        console.log('[DB] Mock DB initialized (No table creation needed)');
    }

    console.log('Database initialized (' + (isPostgres ? 'Postgres' : 'Mock') + ')');
    return db;
}

module.exports = { openDb, initDb };

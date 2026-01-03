const express = require('express');
const cors = require('cors');
// const cron = require('node-cron'); // Disable cron
const { initDb, openDb } = require('./db');
// const { scrapePrices } = require('./scraper'); // Disable scraper

const app = express();
const PORT = process.env.PORT || 3000;

console.log('[Server] Startup... Environment:', process.env.NODE_ENV);

app.use(cors());
app.use(express.json());

// Initialize DB and start server logic (Serverless compatible)
let dbReady = false;
// Initialize DB manually via API to debug crashes
async function initializeDatabase() {
    try {
        console.log('[Server] Initializing DB...');
        await initDb();
        dbReady = true;
        console.log('[Server] Database initialized');
        return { success: true };
    } catch (e) {
        console.error('[Server] Failed to initialize DB:', e);
        return { success: false, error: e.message, stack: e.stack };
    }
}
// initPromise removed (Automatic start disabled for debugging)

// Middleware to ensure DB is ready - WITH TIMEOUT BYPASS
const ensureDb = async (req, res, next) => {
    if (req.path === '/api/debug' || req.path === '/debug' || req.path === '/api/init') {
        return next();
    }

    if (!dbReady) {
        // initPromise was removed. We now require manual init via /api/init
        return res.status(503).json({ error: 'Database not initialized. Please call /api/init first (Debug Mode).' });
    }
    next();
};

// Debug routes to diagnose 404s - Placed BEFORE ensureDb to always work
app.get('/debug', (req, res) => {
    res.json({ message: 'Root /debug hit', url: req.url, originalUrl: req.originalUrl, headers: req.headers });
});

app.get('/api/debug', async (req, res) => {
    try {
        console.log('[Debug] /api/debug hit');
        let dbError = null;
        let last = null;
        let count = null;
        let dbType = 'Unknown';

        try {
            // Race openDb with 2s timeout to prevent hanging
            const dbPromise = openDb();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB Connection Timeout (2s)')), 2000));
            const db = await Promise.race([dbPromise, timeoutPromise]);

            dbType = process.env.POSTGRES_URL ? 'Postgres' : 'SQLite (Local/Fallback)';

            // Just check generic query to ensure table usage works
            try {
                const cRow = await db.get('SELECT count(*) as c FROM fuel_prices');
                count = cRow ? cRow.c : 0;
            } catch (err) {
                // Table might not exist if scraper never ran
                console.warn('[Debug] Count query failed:', err);
                if (err.message.includes('relation "fuel_prices" does not exist')) {
                    count = 'Table Missing';
                } else {
                    throw err;
                }
            }

        } catch (e) {
            dbError = { message: e.message, stack: e.stack, code: e.code };
            console.error('[Debug] DB Error inside /api/debug:', e);
        }

        res.json({
            status: 'ok',
            env: process.env.NODE_ENV,
            vercel: process.env.VERCEL,
            hasPostgres: !!process.env.POSTGRES_URL,
            postgresUrlPrefix: process.env.POSTGRES_URL ? process.env.POSTGRES_URL.substring(0, 10) + '...' : 'N/A',
            dbReady,
            lastRecord: last,
            totalRows: count,
            dbType,
            dbError
        });
    } catch (e) {
        res.status(500).json({ error: 'Critical Debug Error', details: e.message });
    }
});

app.use('/api', ensureDb);

// Helper: Ensure data exists, otherwise scrape (Blocking) - DISABLED FOR DIAGNOSIS
async function ensureDataExists() {
    /* 
    const db = await openDb();
    const last = await db.get('SELECT timestamp FROM fuel_prices ORDER BY id DESC LIMIT 1');
    if (!last) {
        console.log('[Server] No data found (cold start). Scraping synchronously...');
        // Force blocking scrape so user gets data
        await scrapePrices();
        console.log('[Server] Cold start scrape complete.');
    }
    */
    console.log('[Server] ensureDataExists skipped (Diagnosis Mode)');
}

// Schedule scraping (ONLY in local development or persistent server)
// In Vercel serverless, cron jobs should be configured via vercel.json (crons), not node-cron.
/*
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    cron.schedule('0 * * * *', () => {
        console.log('Running scheduled scrape...');
        scrapePrices();
    });
}
*/

// API Endpoints

// Get latest prices
app.get('/api/prices/latest', async (req, res) => {
    try {
        // Ensure we have data before querying
        await ensureDataExists();

        const db = await openDb();
        // Get the latest timestamp
        try {
            const latestRecord = await db.get('SELECT timestamp FROM fuel_prices ORDER BY id DESC LIMIT 1');

            if (!latestRecord) {
                return res.json([]);
            }

            // Get all prices with that timestamp (fuzzy match or exact)
            // Actually, simpler: get the latest entry for each type
            const prices = await db.all(`
        SELECT type, price, location, timestamp 
        FROM fuel_prices 
        WHERE timestamp = ?
        `, latestRecord.timestamp);

            if (prices.length === 0) {
                // Fallback: group by type
                const fallback = await db.all(`
            SELECT type, price, location, MAX(timestamp) as timestamp
            FROM fuel_prices
            GROUP BY type
        `);
                return res.json(fallback);
            }

            res.json(prices);
        } catch (e) {
            if (e.message.includes('does not exist')) return res.json([]);
            throw e;
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get history
app.get('/api/prices/history', async (req, res) => {
    try {
        await ensureDataExists();
        const { type } = req.query;
        const db = await openDb();

        let query = 'SELECT * FROM fuel_prices';
        const params = [];

        if (type) {
            query += ' WHERE type = ?';
            params.push(type);
        }

        query += ' ORDER BY timestamp ASC'; // Ascending for graphs

        // If we want to limit data points, we might need smart sampling, 
        // but for now let's just return all or a hard limit if needed.
        // query += ' LIMIT ?';
        // params.push(limit);

        const data = await db.all(query, params);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual Initialization Endpoint
app.get('/api/init', async (req, res) => {
    console.log('[Debug] Manual /api/init triggered');
    const result = await initializeDatabase();
    res.json(result);
});

// Manual trigger for testing
app.post('/api/scrape', async (req, res) => {
    /*
    try {
        console.log('Manual scrape triggered');
        const results = await scrapePrices();
        res.json(results);
    } catch (error) {
        console.error('Manual scrape failed:', error);
        res.status(500).json({ error: 'Scrape failed: ' + error.message });
    }
    */
    res.json({ message: 'Scraper disabled in diagnosis mode' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), dbReady, env: process.env.NODE_ENV });
});

// Catch-all info for unhandled API routes (Must be last)
app.use('/api', (req, res) => {
    console.log('[Warning] Unhandled API route:', req.originalUrl);
    res.status(404).json({ error: 'API Route Not Found', path: req.originalUrl, method: req.method });
});

module.exports = app;

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { initDb, openDb } = require('./db');
const { scrapePrices } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('[Server] Startup... Environment:', process.env.NODE_ENV);

app.use(cors());
app.use(express.json());

// Initialize DB and start server logic (Serverless compatible)
let dbReady = false;
const initPromise = (async () => {
    try {
        await initDb();
        dbReady = true;
        console.log('[Server] Database initialized');
    } catch (e) {
        console.error('[Server] Failed to initialize DB:', e);
    }
})();

// Middleware to ensure DB is ready
const ensureDb = async (req, res, next) => {
    if (!dbReady) {
        try {
            await initPromise;
        } catch (e) {
            console.error('[Server] DB init failed during request:', e);
            return res.status(500).json({ error: 'Database initialization failed' });
        }
    }
    next();
};

app.use('/api', ensureDb);

// Helper: Ensure data exists, otherwise scrape (Blocking)
async function ensureDataExists() {
    const db = await openDb();
    const last = await db.get('SELECT timestamp FROM fuel_prices ORDER BY id DESC LIMIT 1');
    if (!last) {
        console.log('[Server] No data found (cold start). Scraping synchronously...');
        // Force blocking scrape so user gets data
        await scrapePrices();
        console.log('[Server] Cold start scrape complete.');
    }
}

// Schedule scraping (ONLY in local development or persistent server)
// In Vercel serverless, cron jobs should be configured via vercel.json (crons), not node-cron.
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    cron.schedule('0 * * * *', () => {
        console.log('Running scheduled scrape...');
        scrapePrices();
    });
}

// API Endpoints

// Get latest prices
app.get('/api/prices/latest', async (req, res) => {
    try {
        // Ensure we have data before querying
        await ensureDataExists();

        const db = await openDb();
        // Get the latest timestamp
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

// Manual trigger for testing
app.post('/api/scrape', async (req, res) => {
    try {
        console.log('Manual scrape triggered');
        const results = await scrapePrices();
        res.json(results);
    } catch (error) {
        console.error('Manual scrape failed:', error);
        res.status(500).json({ error: 'Scrape failed: ' + error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), dbReady, env: process.env.NODE_ENV });
});

app.get('/api/debug', async (req, res) => {
    try {
        const db = await openDb();
        const last = await db.get('SELECT timestamp FROM fuel_prices ORDER BY id DESC LIMIT 1');
        const count = await db.get('SELECT count(*) as c FROM fuel_prices');

        res.json({
            status: 'ok',
            env: process.env.NODE_ENV,
            vercel: process.env.VERCEL,
            hasPostgres: !!process.env.POSTGRES_URL,
            postgresUrlPrefix: process.env.POSTGRES_URL ? process.env.POSTGRES_URL.substring(0, 10) + '...' : 'N/A',
            dbReady,
            lastRecord: last,
            totalRows: count ? count.c : 0,
            dbType: process.env.POSTGRES_URL ? 'Postgres' : 'SQLite (Local/Fallback)'
        });
    } catch (e) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

// For local development
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;

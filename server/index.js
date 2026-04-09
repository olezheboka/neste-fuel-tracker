require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb, openDb } = require('./db');
const { scrapePrices } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

if (!IS_PRODUCTION) {
    console.log('[Server] Startup... Environment:', process.env.NODE_ENV);
}

// --- Security: CORS whitelist ---
const ALLOWED_ORIGINS = [
    'https://neste-fuel-tracker.vercel.app',
    'https://neste-fuel-tracker-olezhebokas-projects.vercel.app',
];
if (!IS_PRODUCTION) {
    ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:3000');
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. cron, server-to-server, curl)
        if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET'],
}));

app.use(express.json());

// --- Security: Basic rate limiting (in-memory, per-instance) ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute per IP

const rateLimiter = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    const now = Date.now();

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return next();
    }

    const entry = rateLimitMap.get(ip);
    if (now > entry.resetAt) {
        entry.count = 1;
        entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
        return next();
    }

    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
};

app.use('/api', rateLimiter);

// Periodic cleanup of stale rate limit entries (every 5 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
        if (now > entry.resetAt) rateLimitMap.delete(ip);
    }
}, 5 * 60 * 1000);

// Initialize DB and start server logic (Serverless compatible)
let dbReady = false;
let initPromise = null;

// Initialize DB safely
async function initializeDatabase() {
    if (dbReady) return { success: true };
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            if (!IS_PRODUCTION) console.log('[Server] Initializing DB...');
            await initDb();
            dbReady = true;
            if (!IS_PRODUCTION) console.log('[Server] Database initialized');
            return { success: true };
        } catch (e) {
            console.error('[Server] Failed to initialize DB:', e.message);
            initPromise = null; // Allow retry
            throw e;
        }
    })();
    return initPromise;
}

// Middleware to ensure DB is ready
const ensureDb = async (req, res, next) => {
    if (!dbReady) {
        try {
            await initializeDatabase();
        } catch (e) {
            console.error('[Server] DB init failed during request:', e.message);
            return res.status(503).json({ error: 'Service temporarily unavailable' });
        }
    }
    next();
};


// --- Debug routes: Development only ---
if (!IS_PRODUCTION) {
    app.get('/debug', (req, res) => {
        res.json({ message: 'Debug endpoint (dev only)', url: req.url });
    });

    app.get('/api/debug', async (req, res) => {
        try {
            let count = null;
            let dbType = 'Unknown';
            let dbError = null;

            try {
                const dbPromise = openDb();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('DB Connection Timeout (2s)')), 2000)
                );
                const db = await Promise.race([dbPromise, timeoutPromise]);
                dbType = process.env.POSTGRES_URL ? 'Postgres' : 'SQLite';

                try {
                    const cRow = await db.get('SELECT count(*) as c FROM fuel_prices');
                    count = cRow ? cRow.c : 0;
                } catch (err) {
                    if (err.message.includes('does not exist')) {
                        count = 'Table Missing';
                    } else {
                        throw err;
                    }
                }
            } catch (e) {
                dbError = e.message;
            }

            res.json({
                status: 'ok',
                dbReady,
                totalRows: count,
                dbType,
                dbError
            });
        } catch (e) {
            res.status(500).json({ error: 'Debug error' });
        }
    });

    // Manual init — dev only
    app.get('/api/init', async (req, res) => {
        console.log('[Debug] Manual /api/init triggered');
        const result = await initializeDatabase();
        res.json(result);
    });
}

app.use('/api', ensureDb);

// --- API Endpoints ---

// Get latest prices
app.get('/api/prices/latest', async (req, res) => {
    try {
        const db = await openDb();

        const prices = await db.all(`
            SELECT type, price, location, timestamp 
            FROM fuel_prices 
            WHERE timestamp = (SELECT MAX(timestamp) FROM fuel_prices)
        `);

        res.json(prices.length === 0 ? [] : prices);
    } catch (error) {
        console.error('[API] /prices/latest error:', error.message);
        res.status(500).json({ error: 'Failed to fetch latest prices' });
    }
});

// Get history
app.get('/api/prices/history', async (req, res) => {
    try {
        const { type } = req.query;
        const db = await openDb();

        let query = 'SELECT * FROM fuel_prices';
        const params = [];

        if (type) {
            query += ' WHERE type = ?';
            params.push(type);
        }

        query += ' ORDER BY timestamp ASC';

        const data = await db.all(query, params);
        res.json(data);
    } catch (error) {
        console.error('[API] /prices/history error:', error.message);
        res.status(500).json({ error: 'Failed to fetch price history' });
    }
});

// Scrape endpoint — now uses a 5 minute debounce instead of auth to allow UI refresh
let lastScrapeTime = 0;
const SCRAPE_DEBOUNCE_MS = 5 * 60 * 1000;

app.get('/api/scrape', async (req, res) => {
    try {
        const now = Date.now();
        if (now - lastScrapeTime < SCRAPE_DEBOUNCE_MS) {
            if (!IS_PRODUCTION) console.log('Scrape skipped (debounced)');
            return res.json({ status: 'ok', count: 0, debounced: true });
        }
        
        if (!IS_PRODUCTION) console.log('Scrape triggered');
        const results = await scrapePrices();
        lastScrapeTime = Date.now();
        res.json({ status: 'ok', count: results.length });
    } catch (error) {
        console.error('Scrape failed:', error.message);
        res.status(500).json({ error: 'Scrape failed' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', dbReady });
});

// Catch-all for unhandled API routes (must be last)
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;

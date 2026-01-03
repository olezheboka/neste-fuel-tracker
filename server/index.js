const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { initDb, openDb } = require('./db');
const { scrapePrices } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize DB and start server logic (Serverless compatible)
const initialize = async () => {
    try {
        await initDb();
        const db = await openDb();
        const last = await db.get('SELECT timestamp FROM fuel_prices ORDER BY id DESC LIMIT 1');

        if (!last) {
            console.log('No data found (cold start), running initial scrape...');
            await scrapePrices();
        } else {
            console.log('Data exists, skipping initial scrape.');
        }
    } catch (e) {
        console.error('Failed to initialize or scrape:', e);
    }
};

// Start initialization immediately
initialize();

// Schedule scraping (only works if process stays alive)
cron.schedule('0 * * * *', () => {
    console.log('Running scheduled scrape...');
    scrapePrices();
});

// API Endpoints

// Get latest prices
app.get('/api/prices/latest', async (req, res) => {
    try {
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
        const { type, limit = 100 } = req.query;
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
    const results = await scrapePrices();
    res.json(results);
});

// For local development
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;

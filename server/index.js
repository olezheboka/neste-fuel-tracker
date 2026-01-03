const express = require('express');
const cors = require('cors');
// const cron = require('node-cron');
// const { initDb, openDb } = require('./db');
// const { scrapePrices } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('[Server] Startup... Environment:', process.env.NODE_ENV);

app.use(cors());
app.use(express.json());

app.get('/api/debug', (req, res) => {
    res.json({ status: 'Minimal Mode', env: process.env.NODE_ENV });
});

// For local development
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;

const axios = require('axios');
const cheerio = require('cheerio');
const { openDb } = require('./db');

const PRICES_URL = 'https://www.neste.lv/lv/content/degvielas-cenas';

const FUEL_TYPES = [
    'Neste Futura 95',
    'Neste Futura 98',
    'Neste Futura D',
    'Neste Pro Diesel'
];

/**
 * Scrape fuel prices and station addresses from the Neste prices page.
 * Each fuel type has:
 * - A lowest price for today
 * - A list of station addresses (DUS) where this price is valid
 */
async function scrapePrices() {
    try {
        console.log(`[SCRAPER] Fetching ${PRICES_URL}...`);
        const { data } = await axios.get(PRICES_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 8000 // 8 second timeout
        });
        const $ = cheerio.load(data);
        const db = await openDb();

        const results = [];
        const timestamp = new Date().toISOString();

        // Parse the table - each row contains: Fuel Type | Price | DUS (addresses)
        $('table tbody tr, table tr').each((i, row) => {
            const cells = $(row).find('td');
            if (cells.length >= 3) {
                // Clean up text - remove tabs, newlines, extra whitespace
                const fuelNameRaw = $(cells[0]).text().replace(/[\t\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
                const priceRaw = $(cells[1]).text().trim().replace(',', '.');
                const dusRaw = $(cells[2]).text().replace(/[\t\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();

                // Match to known fuel types (handle non-breaking spaces)
                const fuelName = fuelNameRaw.replace(/\u00A0/g, ' ');
                const matchedFuel = FUEL_TYPES.find(f =>
                    fuelName.includes(f) || f.includes(fuelName)
                );

                if (matchedFuel) {
                    const price = parseFloat(priceRaw);
                    if (!isNaN(price)) {
                        // Parse DUS addresses - they are comma-separated
                        // Each address is a street name/number in Rīga
                        const addresses = dusRaw
                            .split(',')
                            .map(addr => addr.trim())
                            .filter(addr => addr.length > 0);

                        // Join with pipe separator for storage
                        const location = addresses.length > 0
                            ? addresses.join(' | ')
                            : 'Rīga';

                        console.log(`[SCRAPER] ${matchedFuel}: €${price.toFixed(3)}, ${addresses.length} DUS`);
                        console.log(`[SCRAPER]   Addresses: ${addresses.slice(0, 3).join(', ')}${addresses.length > 3 ? '...' : ''}`);

                        results.push({
                            type: matchedFuel,
                            price,
                            location,
                            timestamp
                        });
                    }
                }
            }
        });

        if (results.length === 0) {
            console.warn("[SCRAPER] No fuel data found. Check the page structure.");
        }

        // Save to database
        for (const res of results) {
            await db.run(
                'INSERT INTO fuel_prices (type, price, location, timestamp) VALUES (?, ?, ?, ?)',
                [res.type, res.price, res.location, res.timestamp]
            );
        }

        console.log(`[SCRAPER] Scrape complete. Found ${results.length} fuel types.`);
        return results;

    } catch (error) {
        console.error('[SCRAPER] Error:', error.message);
        return [];
    }
}

module.exports = { scrapePrices };

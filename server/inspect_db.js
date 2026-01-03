const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

(async () => {
    const db = await open({
        filename: '/Users/olegsjarosevics/.gemini/antigravity/scratch/neste-fuel-tracker/server/prices.db',
        driver: sqlite3.Database
    });

    const rows = await db.all('SELECT type, price, location FROM fuel_prices ORDER BY timestamp DESC LIMIT 4');
    console.log(JSON.stringify(rows, null, 2));
})();

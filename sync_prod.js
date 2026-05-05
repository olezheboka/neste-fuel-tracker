const { openDb } = require('./server/db');

async function syncFromProd() {
  const PROD_API = 'https://neste-fuel-tracker.vercel.app/api';
  const db = await openDb();
  
  console.log('Fetching production data...');
  try {
    const [latestRes, historyRes] = await Promise.all([
      fetch(`${PROD_API}/prices/latest`),
      fetch(`${PROD_API}/prices/history`)
    ]);

    if (!latestRes.ok || !historyRes.ok) {
        throw new Error(`API error: ${latestRes.status} / ${historyRes.status}`);
    }

    const latest = await latestRes.json();
    const history = await historyRes.json();

    console.log(`Received ${latest.length} latest prices and ${history.length} history rows.`);

    // Clear local data
    await db.exec('DELETE FROM fuel_prices');

    // Insert history (includes latest)
    for (const p of history) {
      await db.run(
        'INSERT INTO fuel_prices (type, price, location, timestamp) VALUES (?, ?, ?, ?)',
        [p.type, p.price, p.location, p.timestamp]
      );
    }

    console.log('Local database synced with production data!');
  } catch (err) {
    console.error('Failed to sync from production:', err.message);
  }
}

syncFromProd().catch(console.error);

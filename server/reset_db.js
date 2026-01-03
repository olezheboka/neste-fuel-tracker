const { openDb } = require('./db');

(async () => {
    try {
        const db = await openDb();
        console.log('Dropping table fuel_prices...');
        await db.run('DROP TABLE IF EXISTS fuel_prices');
        console.log('Table dropped. Run server to recreate.');
    } catch (err) {
        console.error(err);
    }
})();

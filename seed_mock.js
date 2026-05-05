const { openDb } = require('./server/db');

async function seedMockData() {
  const db = await openDb();
  console.log('Seeding mock data for local development...');

  const fuels = ['Neste Futura 95', 'Neste Futura 98', 'Neste Futura D', 'Neste Pro Diesel'];
  const basePrices = [1.654, 1.754, 1.624, 1.724];
  
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  // Insert 30 days of data
  for (let i = 0; i < 60; i++) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    const timestamp = date.toISOString();

    for (let f = 0; f < fuels.length; f++) {
      // Add some random variation
      const price = basePrices[f] + (Math.random() * 0.1 - 0.05);
      await db.run(
        'INSERT INTO fuel_prices (type, price, location, timestamp) VALUES (?, ?, ?, ?)',
        [fuels[f], price, 'Local Mock Station', timestamp]
      );
    }
  }

  console.log('Mock data seeded successfully!');
}

seedMockData().catch(console.error);

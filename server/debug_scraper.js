const axios = require('axios');
const cheerio = require('cheerio');

const URL = 'https://www.neste.lv/lv/content/degvielas-cenas';

(async () => {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);
    // Log table rows for Pro Diesel
    $('table tbody tr').each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 3) {
            const fuel = $(cells[0]).text().trim();
            const dus = $(cells[2]).text().trim();
            console.log('--- Row ---');
            console.log('FUEL:', fuel);
            console.log('DUS:', JSON.stringify(dus));
        }
    });

})();

const axios = require('axios');
const cheerio = require('cheerio');

const URL = 'https://www.neste.lv/lv/content/degvielas-cenas';

async function debug() {
    try {
        const { data } = await axios.get(URL);
        const $ = cheerio.load(data);

        console.log('Table count:', $('table').length);

        $('table tbody tr').each((i, row) => {
            const cells = $(row).find('td');
            console.log(`Row ${i}: ${cells.length} cells`);
            cells.each((j, cell) => {
                console.log(`  Cell ${j}: ${$(cell).text().trim().substring(0, 50)}...`);
            });
        });

    } catch (e) {
        console.error(e);
    }
}

debug();

'use strict';

// Multi-station scrape orchestrator.
//
// All four sources are fetched in PARALLEL and share ONE timestamp so the
// latest-price query (WHERE timestamp = MAX(...)) returns every station from the
// same cycle. Promise.allSettled means one failing source never breaks the rest
// (and each scraper already try/catches to [] internally — belt and suspenders).

const { scrapePrices } = require('../scraper'); // Neste (extended, not rewritten)
const { scrapeCircleK } = require('./circlek');
const { scrapeVirsi } = require('./virsi');
const { scrapeViada } = require('./viada');

const SOURCES = ['Neste', 'CircleK', 'Virsi', 'Viada'];

// Pure: fold Promise.allSettled results into a flat row list. Fulfilled arrays
// are concatenated; a rejected (or non-array) source is logged and skipped so a
// single failure never breaks the cycle. Extracted from scrapeAll so the
// graceful-degradation guarantee is unit-testable without network/DB.
function collectSettled(settled, sources = SOURCES) {
    const results = [];
    settled.forEach((s, i) => {
        if (s.status === 'fulfilled' && Array.isArray(s.value)) {
            results.push(...s.value);
        } else if (s.status === 'rejected') {
            console.warn(`[SCRAPER] ${sources[i]} rejected (non-fatal):`, s.reason && s.reason.message);
        }
    });
    return results;
}

async function scrapeAll() {
    const timestamp = new Date().toISOString();

    const settled = await Promise.allSettled([
        scrapePrices(timestamp),
        scrapeCircleK(timestamp),
        scrapeVirsi(timestamp),
        scrapeViada(timestamp),
    ]);

    const results = collectSettled(settled);
    console.log(`[SCRAPER] scrapeAll complete: ${results.length} rows across ${SOURCES.length} sources.`);
    return results;
}

module.exports = { scrapeAll, collectSettled, SOURCES };

'use strict';

// ---------------------------------------------------------------------------
// Snapshot module — in-memory cache + optional Vercel Blob persistence
//
// Warm instances: serve from memLatest / memHistory in <1ms (no DB hit).
// Cold instances: fetch from Blob CDN (~50ms) if BLOB_URL_PREFIX is set,
//   then populate memory for subsequent requests on the same instance.
//
// BLOB_URL_PREFIX env var should be set to:
//   https://<your-store-id>.public.blob.vercel-storage.com
// (obtained after the first successful writeSnapshot() in production)
// ---------------------------------------------------------------------------

let memLatest = null;   // [{ type, price, location, timestamp }, ...]
let memHistory = null;  // deduplicated daily rows — same shape, ~1 row/day/fuel
let memWrittenAt = 0;   // ms epoch of the last setMemory() — drives TTL revalidation

// Signatures of the data last persisted to Blob. We rewrite a blob only when its
// signature changes (or, for latest.json, when it's gone stale — see
// LATEST_MAX_AGE_MS below), so identical re-scrapes (the common case — prices
// move ~once/day) cost zero "advanced" Blob operations. Seeded on hydrate so the
// skip survives cold starts.
let lastLatestSig = null;
let lastHistorySig = null;

// Epoch ms of the data currently believed to be persisted in latest.json — i.e.
// the scrape timestamp of the last write (or, on hydrate, of whatever the blob
// already contained). Drives the staleness force-write below; NOT the same as
// memWrittenAt, which is this process's own cache time.
let latestDataAt = 0;

// middleware.js reads latest.json directly from the Blob CDN, unvalidated
// against the DB, for every page's SSR first paint. If we only rewrote on price
// changes, its `timestamp` would freeze at the last price *change* instead of
// the last scrape — misleading the "prices updated" display for however long
// prices stay flat. Force a write past this age so that staleness is bounded
// instead of unbounded, while still skipping the (common) unchanged-content case.
const LATEST_MAX_AGE_MS = 2 * 60 * 60 * 1000;

function tsToMs(t) {
    if (t == null) return NaN;
    return t instanceof Date ? t.getTime() : new Date(t).getTime();
}

// Stable content fingerprints that EXCLUDE the volatile per-scrape timestamp, so
// two scrapes of identical prices compare equal even though their timestamps differ.
function sigLatest(latest) {
    return (latest || [])
        .map(r => `${r.source}|${r.type}|${r.location}|${r.price}`)
        .sort()
        .join('\n');
}
function sigHistory(history) {
    // dayKey buckets the daily-deduplicated rows by date, so intra-day timestamp
    // drift on the representative row doesn't register as a change.
    return (history || [])
        .map(r => `${String(r.timestamp).slice(0, 10)}|${r.source}|${r.type}|${r.price}`)
        .sort()
        .join('\n');
}

function setMemory(latest, history) {
    memLatest = latest;
    memHistory = history;
    memWrittenAt = Date.now();
}

function getMemory() {
    if (!memLatest || !memHistory) return null;
    return { latest: memLatest, history: memHistory };
}

// Extend the TTL without touching the data — used after a cheap freshness probe
// confirms the in-memory snapshot still matches the DB, so we skip the full
// (history) recompute until the next TTL window.
function touchMemory() {
    if (memLatest && memHistory) memWrittenAt = Date.now();
}

// Age (ms) of the current in-memory snapshot. Infinity when empty. Used by the
// request path to revalidate a WARM instance's snapshot against the DB — without
// this, a warm Lambda keeps serving the snapshot it cached at cold-start/scrape
// time forever, so after an hourly scrape on another instance its /history (and
// /latest) silently lag by a full cycle until the instance is recycled.
function getMemoryAge() {
    return memWrittenAt ? Date.now() - memWrittenAt : Infinity;
}

// ---------------------------------------------------------------------------
// Write to memory + Vercel Blob (non-blocking; Blob write is fire-and-forget)
// ---------------------------------------------------------------------------
async function writeSnapshot(latest, history) {
    setMemory(latest, history);

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return; // Blob not configured — memory-only

    const newLatestSig = sigLatest(latest);
    const newHistorySig = sigHistory(history);
    const latestStale = Date.now() - latestDataAt >= LATEST_MAX_AGE_MS;
    const writeLatest = newLatestSig !== lastLatestSig || latestStale;
    const writeHistory = newHistorySig !== lastHistorySig;

    if (!writeLatest) console.log('[SNAPSHOT] latest.json unchanged; skipped write.');
    if (!writeHistory) console.log('[SNAPSHOT] history.json unchanged; skipped write.');
    if (!writeLatest && !writeHistory) return;

    try {
        const { put } = require('@vercel/blob');
        // @vercel/blob v2 throws when overwriting an existing pathname unless
        // allowOverwrite is set. We intentionally rewrite the same two fixed
        // pathnames (addRandomSuffix: false), so this is required.
        const opts = {
            access: 'public',
            contentType: 'application/json',
            addRandomSuffix: false,
            allowOverwrite: true,
            cacheControlMaxAge: 3600,
            token,
        };
        const jobs = [];
        if (writeLatest) jobs.push(put('prices/latest.json', JSON.stringify(latest), opts));
        if (writeHistory) jobs.push(put('prices/history.json', JSON.stringify(history), opts));

        const [first] = await Promise.all(jobs);
        // Only advance signatures/staleness clock for writes that actually
        // happened, so a failed write retries on the next scrape.
        if (writeLatest) {
            lastLatestSig = newLatestSig;
            latestDataAt = tsToMs(latest[0]?.timestamp) || Date.now();
        }
        if (writeHistory) lastHistorySig = newHistorySig;
        console.log(
            `[SNAPSHOT] Blob updated (${[writeLatest && 'latest', writeHistory && 'history'].filter(Boolean).join(', ')}). ` +
            `URL prefix: ${first.url.split('/prices/')[0]}`
        );
    } catch (e) {
        console.warn('[SNAPSHOT] Blob write failed (non-fatal):', e.message, e.cause || '');
    }
}

// ---------------------------------------------------------------------------
// Hydrate memory from Blob CDN on cold start.
// Call this at module init; await it in the first request handler.
// ---------------------------------------------------------------------------
async function hydrateFromBlob() {
    const prefix = process.env.BLOB_URL_PREFIX;
    if (!prefix || getMemory()) return false;

    try {
        const [lr, hr] = await Promise.all([
            fetch(`${prefix}/prices/latest.json`),
            fetch(`${prefix}/prices/history.json`),
        ]);

        if (!lr.ok || !hr.ok) {
            console.warn('[SNAPSHOT] Blob CDN returned non-200; falling back to DB.');
            return false;
        }

        const [latest, history] = await Promise.all([lr.json(), hr.json()]);
        setMemory(latest, history);
        // Seed the skip signatures (and latest.json's staleness clock, from the
        // blob's own data timestamp rather than "now") so a freshly-hydrated
        // instance neither redundantly rewrites unchanged content nor resets the
        // staleness countdown on every cold start.
        lastLatestSig = sigLatest(latest);
        lastHistorySig = sigHistory(history);
        latestDataAt = tsToMs(latest[0]?.timestamp) || Date.now();
        console.log('[SNAPSHOT] Hydrated from Blob CDN.');
        return true;
    } catch (e) {
        console.warn('[SNAPSHOT] Blob hydration failed (non-fatal):', e.message);
        return false;
    }
}

module.exports = { writeSnapshot, hydrateFromBlob, getMemory, getMemoryAge, setMemory, touchMemory };

import { serializeForScript } from './edge-serialize.js';
import { PAGES, PAGE_META, pageFromPath, SITE_NAME } from './client/src/lib/seo-meta.js';
import { fuelGroupId, stationKey, STATIONS, FUEL_GROUPS } from './client/src/lib/fuel.js';
import { DISCOUNT_MARKER_RE } from './client/src/lib/discounts.js';

// Run on the three canonical language homes, the bare `/` entry (redirected here
// rather than via a static vercel.json rule, so a returning visitor's `lang`
// cookie can send them to their remembered language instead of always
// defaulting to lv), and every provider/fuel landing page (P1). The
// no-trailing-slash variants (/lv) are still 308'd to /lv/ by vercel.json, so by
// the time we run those paths are already canonical.
//
// Must stay a literal array — Vercel statically parses `config.matcher` to wire
// up routing middleware, so a computed expression here (e.g. built from PAGES)
// would silently fail to register, the same class of bug fixed for this file
// once already (see git history: migrating off legacy vercel.json builds/routes).
export const config = {
  matcher: [
    '/', '/lv/', '/ru/', '/en/',
    '/lv/neste/', '/lv/circle-k/', '/lv/virsi/', '/lv/viada/', '/lv/95/', '/lv/98/', '/lv/diesel/', '/lv/pro/', '/lv/gas/',
    '/ru/neste/', '/ru/circle-k/', '/ru/virsi/', '/ru/viada/', '/ru/95/', '/ru/98/', '/ru/diesel/', '/ru/pro/', '/ru/gas/',
    '/en/neste/', '/en/circle-k/', '/en/virsi/', '/en/viada/', '/en/95/', '/en/98/', '/en/diesel/', '/en/pro/', '/en/gas/',
  ],
};

export { serializeForScript };

// Localized labels for the static (pre-JS) price snapshot. React replaces #root on
// mount, so this exists purely so non-JS crawlers see today's numbers + station and
// fuel keywords, and to paint meaningful content immediately (LCP).
const LABELS = {
  lv: { h1: 'Degvielas cenas Latvijā šodien', gas: 'Gāze', liter: 'l', code: 'LV', flag: '🇱🇻', sameEverywhere: 'Visās stacijās cenas vienādas' },
  ru: { h1: 'Цены на топливо в Латвии сегодня', gas: 'Газ', liter: 'л', code: 'RU', flag: '🇷🇺', sameEverywhere: 'Одинаковая цена на всех АЗС' },
  en: { h1: 'Fuel prices in Latvia today', gas: 'LPG', liter: 'L', code: 'EN', flag: '🇬🇧', sameEverywhere: 'Same price at all stations' },
};

// id -> short display code, matching the app's fuel-label pills (App.jsx).
const FUEL_DISPLAY_ID = { diesel: 'D', pro: 'D+' };
const fuelDisplayLabel = (fuelId, lang) =>
  fuelId === 'gas' ? LABELS[lang].gas : FUEL_DISPLAY_ID[fuelId] || fuelId;

// Same cheapest-row highlight as App.jsx's CHEAPEST_COLOR.
const CHEAPEST_COLOR = '#16a34a';
const CARD_SHADOW = '0 1px 8px rgba(0,0,0,0.05),0 1px 2px rgba(0,0,0,0.03)';

const escHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function langFromPath(pathname) {
  const seg = pathname.split('/').filter(Boolean)[0];
  return LABELS[seg] ? seg : 'lv';
}

function getCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Build a crawlable price snapshot from the latest-prices array
// ([{ type, price, source, ... }]), styled inline to match the app's own card
// look (see FuelGroupBlock/StationRow in App.jsx) so the pre-hydration paint
// isn't a jarring "plain text table" flash — it already looks like the real UI.
// Station + fuel + per-litre price = the keyword + freshness signal we want in
// the raw HTML. `page` (from pageFromPath), when present, narrows the rows to
// that one station/fuel and swaps in its own h1.
// Shared font stack + the CircleDollarSign lucide icon that prefixes the app's
// real H1 — mirrored here so the static H1 matches the hydrated one exactly.
const FONT_STACK = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
const DOLLAR_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>';

function buildSeoBlock(prices, lang, page) {
  const L = LABELS[lang] || LABELS.lv;
  const h1 = page ? PAGE_META[page.slug][lang].h1 : L.h1;
  let filtered = Array.isArray(prices) ? prices : [];
  if (page?.kind === 'station') filtered = filtered.filter((p) => stationKey(p) === page.filterId);
  if (page?.kind === 'fuel') filtered = filtered.filter((p) => fuelGroupId(p) === page.filterId);
  filtered = filtered.filter((p) => p && typeof p.price === 'number');

  const byGroup = new Map();
  for (const p of filtered) {
    const id = fuelGroupId(p);
    if (!byGroup.has(id)) byGroup.set(id, []);
    byGroup.get(id).push(p);
  }

  // One card per fuel group, mirroring App.jsx's FuelGroupBlock + StationRow:
  // label pill, then cheapest-first station rows (station name + first address +
  // €price), the cheapest row highlighted with the same green wash + inset ring.
  const groupsHtml = FUEL_GROUPS.map((g) => g.id)
    .filter((id) => byGroup.has(id))
    .map((id) => {
      const rows = [...byGroup.get(id)].sort((a, b) => a.price - b.price);
      const rowsHtml = rows.map((p, i) => {
        const st = STATIONS[stationKey(p)] || { label: p.source || '', color: '#334155' };
        const cheapest = i === 0;
        // Neste discount days replace the address with a "same price everywhere"
        // marker (see App.jsx's StationRow `isMarker` check) — match it here too
        // so the snapshot shows the localized label instead of the raw marker text.
        const rawLoc = p.location ? String(p.location).trim() : '';
        const isMarker = rawLoc && (/vienād/i.test(rawLoc) || DISCOUNT_MARKER_RE.test(rawLoc));
        const loc = isMarker ? L.sameEverywhere : (rawLoc ? rawLoc.split('|')[0].trim() : '');
        const rowStyle = cheapest
          ? `background:${hexToRgba(CHEAPEST_COLOR, 0.09)};box-shadow:inset 0 0 0 1.5px ${hexToRgba(CHEAPEST_COLOR, 0.45)};`
          : '';
        const priceStyle = cheapest
          ? `color:#fff;background:${CHEAPEST_COLOR};border-radius:6px;padding:2px 6px;`
          : 'color:#111827;';
        return `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-radius:12px;padding:${cheapest ? '10px' : '8px'} 10px;${rowStyle}">` +
          `<span style="min-width:0;display:flex;flex-direction:column;gap:4px;">` +
            `<span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;color:${st.color}">${escHtml(st.label)}</span>` +
            (loc ? `<span style="font-size:12px;color:#6b7280;font-weight:500;line-height:1.3;">${escHtml(loc)}</span>` : '') +
          `</span>` +
          `<span style="flex-shrink:0;display:flex;align-items:baseline;gap:4px;line-height:1.1;">` +
            `<span style="font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-0.01em;${priceStyle}">&euro;${p.price.toFixed(3)}</span>` +
            `<span style="font-size:10px;color:#9ca3af;font-weight:500;">/ ${escHtml(L.liter)}</span>` +
          `</span>` +
          `</div>`;
      }).join('');
      return `<div style="background:#fff;border-radius:16px;padding:14px;box-shadow:${CARD_SHADOW}">` +
        `<div style="margin-bottom:8px;padding:0 4px;"><span style="display:inline-block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:4px 10px;border-radius:6px;background:#f3f4f6;color:#374151;">${escHtml(fuelDisplayLabel(id, lang))}</span></div>` +
        `<div style="display:flex;flex-direction:column;gap:2px;">${rowsHtml}</div>` +
        `</div>`;
    }).join('');

  // Reproduce the real app's above-the-fold chrome — full-bleed page bg, white
  // header bar, a filter-bar placeholder (reserves the sticky filter bar's height
  // so the card doesn't jump down on hydration), then the prices card with its
  // left-aligned icon+H1 and the 1-/2-column fuel grid. React replaces #root on
  // mount, so matching the structure here makes that swap visually seamless
  // instead of a jarring centered-snapshot → full-app flash.
  // SYNC: mirrors App.jsx's <header> + sticky filter bar + prices <Card>. Match
  // the STRUCTURE, not exact pixels (fast hydration forgives detail drift); only
  // revisit when that above-the-fold structure changes.
  const style = '<style>#seo-prices,#seo-prices *{box-sizing:border-box;}' +
    '#seo-prices .seo-grid{display:grid;grid-template-columns:1fr;gap:12px;}' +
    '@media(min-width:1024px){#seo-prices .seo-grid{grid-template-columns:1fr 1fr;}}</style>';

  const header = '<div style="background:rgba(255,255,255,0.95);border-bottom:1px solid #e5e7eb;">' +
    '<div style="max-width:1024px;margin:0 auto;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;">' +
      `<span style="font-weight:700;font-size:22px;letter-spacing:-0.02em;color:#0f172a;">${escHtml(SITE_NAME)}</span>` +
      // Mirrors the real, collapsed LanguageDropdown button exactly (App.jsx):
      // gray-100/80 pill, flag + uppercase lang code, trailing ChevronDown.
      `<span style="display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#111827;background:rgba(243,244,246,0.8);border-radius:12px;padding:8px 12px;">` +
        `<span>${L.flag}</span><span style="text-transform:uppercase;">${escHtml(L.code)}</span>` +
        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>` +
      `</span>` +
    '</div></div>';

  const filterBar = '<div style="background:rgba(255,255,255,0.95);border-radius:16px;padding:16px;box-shadow:' + CARD_SHADOW + ';margin-bottom:32px;">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
      '<div style="height:40px;border-radius:10px;background:#f1f5f9;"></div>' +
      '<div style="height:40px;border-radius:10px;background:#f1f5f9;"></div>' +
    '</div></div>';

  const card = '<div style="background:#fff;border-radius:16px;padding:24px;box-shadow:' + CARD_SHADOW + ';">' +
    `<h1 style="display:flex;align-items:center;gap:8px;font-size:18px;font-weight:600;color:#0f172a;margin:0 0 12px;">${DOLLAR_ICON}<span>${escHtml(h1)}</span></h1>` +
    `<div class="seo-grid">${groupsHtml}</div>` +
    '</div>';

  return `<div id="seo-prices" style="min-height:100vh;background:#f5f5f7;color:#0f172a;font-family:${FONT_STACK};">` +
    style + header +
    '<div style="max-width:1024px;margin:0 auto;padding:24px 16px 40px;">' +
      filterBar + card +
    '</div></div>';
}

function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default async function middleware(request) {
  const url = new URL(request.url);

  // 1. Only intercept GET, and avoid looping on the bypass fetch below.
  if (request.method !== 'GET' || url.searchParams.has('_middleware_skip')) {
    return;
  }

  // 1a. Bare `/` → redirect to the visitor's remembered language (cookie set by
  // the client whenever it resolves/changes language), falling back to lv for
  // first-time visitors and crawlers.
  if (url.pathname === '/') {
    const cookieLang = getCookie(request, 'lang');
    const lang = LABELS[cookieLang] ? cookieLang : 'lv';
    return Response.redirect(new URL(`/${lang}/`, url), 308);
  }

  const blobUrl = process.env.BLOB_URL_PREFIX;
  if (!blobUrl) {
    console.warn('[Middleware] BLOB_URL_PREFIX not set, skipping injection');
    return;
  }

  const lang = langFromPath(url.pathname);
  const page = pageFromPath(url.pathname);

  try {
    // 2. Latest prices from Blob CDN (warm, <10ms).
    const pricesPromise = fetch(`${blobUrl}/prices/latest.json`, {
      headers: { 'Cache-Control': 'no-cache' },
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

    // 3. The prerendered, language-specific HTML from origin (bypass this middleware).
    const bypassUrl = new URL(request.url);
    bypassUrl.searchParams.set('_middleware_skip', '1');
    const htmlPromise = fetch(bypassUrl.toString());

    const [latestPrices, htmlResponse] = await Promise.all([pricesPromise, htmlPromise]);

    if (!latestPrices || !htmlResponse.ok) {
      return; // Fall back to the static page as-is.
    }

    let html = await htmlResponse.text();

    // 4a. Inline the live prices for hydration (escaped against </script> breakouts).
    const safe = serializeForScript(latestPrices);
    const injection = `<script>window.__INITIAL_PRICES__ = ${safe};</script>`;
    const marker = '<!-- __INITIAL_PRICES_INJECTED_HERE__ -->';
    html = html.includes(marker)
      ? html.replace(marker, injection)
      : html.replace('</head>', `${injection}\n</head>`);

    // 4b. Inject the crawlable price snapshot into #root (React overwrites it on mount).
    const seoBlock = buildSeoBlock(latestPrices, lang, page);
    html = html.replace('<div id="root"></div>', `<div id="root">${seoBlock}</div>`);

    // 5. Return the freshly-injected HTML. We deliberately DO NOT spread the
    // bypassed static shell's headers: doing so leaked its caching/validation
    // headers (`etag`, `last-modified`, `age`, `x-vercel-cache`, and its own
    // `cache-control: public, max-age=0, must-revalidate`) onto this dynamic
    // response, letting the CDN/browser revalidate to — and keep serving — a
    // stale snapshot, which is what froze the "prices updated" timestamp. It
    // could also mismatch `content-encoding` vs. our decoded text body. This is
    // a per-request injection of just-read live prices, so it must never be
    // cached. The site's security headers (CSP/HSTS/etc.) are applied
    // separately by vercel.json's `headers` rule on `/(.*)`, so dropping the
    // spread doesn't lose them.
    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'private, no-store, max-age=0, must-revalidate',
        'x-middleware-injected': '1',
      },
    });
  } catch (error) {
    console.error('[Middleware] Error during injection:', error);
    return; // Fall back to normal flow.
  }
}

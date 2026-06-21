// Chart data-layer, extracted from App.jsx so the per-day aggregation and the
// Brush (timeline slider) window math are pure and unit-testable. The chart is
// day-granularity only (the old Days/Weeks/Months switcher was removed).

import { getRigaDateParts } from './dates.js';
import { fuelGroupId, stationKey, FUEL_GROUPS } from './fuel.js';
import { DISCOUNT_MARKER_RE, EXTERNAL_DISCOUNT_RE, droppedEnough, isDiscountDay } from './discounts.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Riga-local YYYY-MM-DD bucket key for a timestamp.
const dayKey = (ts) => {
  const { year, month, day } = getRigaDateParts(ts);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Stable noon-UTC timestamp for a YYYY-MM-DD key (immune to DST when sorting).
const dayKeyToTs = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 12, 0, 0);
};

// Build the per-day chart series from raw history rows.
//   historyData: [{ type, price, location, source, timestamp }]
//   opts.now:    reference "now" for the 365-day window (default: current time)
// Returns one entry per Riga day, sorted ascending, each carrying per
// `${fuelId}__${source}` series: final price, _min, _max, _range ([down,up]
// whisker when it moved intraday), _history (distinct intraday changes), plus
// the finalized Neste-based `isDiscount` flag. Pure — no React, no globals.
export function buildChartData(historyData, { now = new Date() } = {}) {
  if (!historyData || !historyData.length) return [];

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 365);
  const filtered = historyData.filter((d) => new Date(d.timestamp) >= cutoff);

  // Accumulate by day → series key `${fuelGroupId}__${source}`.
  const periodData = new Map();
  for (const item of filtered) {
    const key = dayKey(item.timestamp);
    if (!periodData.has(key)) periodData.set(key, { series: {}, locations: [] });
    const period = periodData.get(key);
    const ck = `${fuelGroupId(item)}__${stationKey(item)}`;
    (period.series[ck] ||= []).push({ price: item.price, timestamp: item.timestamp });
    // Discount markers are a Neste-only signal.
    if (item.location && (item.source || 'Neste') === 'Neste') period.locations.push(item.location);
  }

  const NESTE_KEYS = FUEL_GROUPS.map((g) => `${g.id}__Neste`);

  const result = Array.from(periodData.entries()).map(([key, data]) => {
    const [year, month, day] = key.split('-');
    const entry = {
      date: dayKeyToTs(key),
      periodKey: key,
      formattedTime: `${day}.${month}.${year}`,
      hasDiscountLocation: data.locations.some((l) => DISCOUNT_MARKER_RE.test(l)),
      hasExternalDiscount: data.locations.some((l) => EXTERNAL_DISCOUNT_RE.test(l)),
      isDiscount: false,
    };

    for (const ck of Object.keys(data.series)) {
      const sortedItems = data.series[ck].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const prices = sortedItems.map((p) => p.price);
      const last = prices[prices.length - 1];
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      entry[ck] = last;
      entry[`${ck}_min`] = min;
      entry[`${ck}_max`] = max;
      if (max - min > 0.0001) entry[`${ck}_range`] = [last - min, max - last]; // [downErr, upErr]
      entry[`${ck}_history`] = sortedItems
        .filter((it, i, arr) => i === 0 || Math.abs(it.price - arr[i - 1].price) > 0.0001)
        .map((d) => ({ price: d.price, timestamp: d.timestamp }));
    }
    return entry;
  });

  const sorted = result.sort((a, b) => a.date - b.date);

  // Finalize the Neste-based discount flag (see discounts.isDiscountDay).
  for (let i = 0; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const anyFuelDropped = i === 0 ? false : NESTE_KEYS.some((k) => {
      const a = prev[k];
      const b = curr[k];
      if (a === undefined || b === undefined) return false;
      return droppedEnough(a, b);
    });
    sorted[i].isDiscount = isDiscountDay({
      hasExternalDiscount: curr.hasExternalDiscount,
      isFirst: i === 0,
      hasDiscountLocation: curr.hasDiscountLocation,
      prevHasDiscountLocation: prev ? prev.hasDiscountLocation : false,
      anyFuelDropped,
    });
  }

  return sorted;
}

// Default Brush window: the last `visibleCount` days (30) of the series.
export function defaultBrushWindow(length, visibleCount = 30) {
  if (!length) return { startIndex: 0, endIndex: 0 };
  return { startIndex: Math.max(0, length - visibleCount), endIndex: length - 1 };
}

// Map a shared date window (br_start/br_end, "YYYY-MM-DD") back to Brush indices,
// clamping to a minimum span (minSpan=6 → 7 inclusive days). chartData must be
// the sorted output of buildChartData.
export function resolveBrushFromDates(chartData, { s, e }, { minSpan = 6 } = {}) {
  if (!chartData || !chartData.length) return { startIndex: 0, endIndex: 0 };
  const lastIdx = chartData.length - 1;
  const ymd = (ts) => dayKey(ts);

  let startIndex = chartData.findIndex((p) => ymd(p.date) >= s);
  if (startIndex < 0) startIndex = 0;
  let endIndex = lastIdx;
  for (let i = lastIdx; i >= 0; i--) {
    if (ymd(chartData[i].date) <= e) { endIndex = i; break; }
  }
  startIndex = Math.min(Math.max(0, startIndex), lastIdx);
  endIndex = Math.min(Math.max(0, endIndex), lastIdx);
  if (endIndex < startIndex) endIndex = startIndex;
  if (endIndex - startIndex < minSpan) endIndex = Math.min(lastIdx, startIndex + minSpan);
  return { startIndex, endIndex };
}

// URL/localStorage filter (de)serialization, extracted from App.jsx.

// Pure: parse a CSV filter value into a validated Set, or null if nothing valid.
// Unknown tokens are dropped so a hand-edited URL can't inject bogus filters.
export const parseFilterCsv = (raw, all) => {
  if (!raw) return null;
  const picked = raw.split(',').map((s) => s.trim()).filter((v) => all.includes(v));
  return picked.length ? new Set(picked) : null;
};

// Pure: serialize a filter Set for the URL, OMITTING it when everything is
// selected (the default) so a fresh visit's URL stays bare. Returns a CSV string
// or null (= omit the param). Order follows `all` for stable, shareable links.
export const serializeFilterSet = (set, all) => {
  if (!set || set.size === 0 || set.size === all.length) return null;
  const csv = all.filter((v) => set.has(v)).join(',');
  return csv.length ? csv : null;
};

// Read a filter Set from URL param (CSV) → persisted fallback (CSV) → default
// to "all". `fallbackRaw` is the value from the unified prefs store (see
// lib/prefs.js); persistence is no longer read here directly. Guarded so it
// degrades to "all" under SSR / parse errors.
export const initFilterSet = (paramKey, all, fallbackRaw) => {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(paramKey) ?? fallbackRaw;
    const parsed = parseFilterCsv(raw, all);
    if (parsed) return parsed;
  } catch { /* SSR / parsing guard */ }
  return new Set(all);
};

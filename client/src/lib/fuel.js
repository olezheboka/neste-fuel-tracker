// Canonical fuel/station config + pure filtering helpers, extracted from App.jsx.

export const FUEL_COLORS = {
  'Neste Futura 95': '#22c55e', // green-500
  'Neste Futura 98': '#06b6d4', // cyan-500
  'Neste Futura D': '#111827',  // gray-900 (black)
  'Neste Pro Diesel': '#EAB308' // yellow-500
};

// Station brand metadata. Key = the `source` value returned by the API.
export const STATIONS = {
  Neste:   { label: 'Neste',    color: '#003C96' },
  CircleK: { label: 'Circle K', color: '#DA281C' },
  Virsi:   { label: 'Virši',    color: '#7C3AED' },
  Viada:   { label: 'Viada',    color: '#E08A00' },
};
export const STATION_ORDER = ['Neste', 'CircleK', 'Virsi', 'Viada'];

// Which fuel groups each station sells. Neste has no gas/LPG; Virši has no
// premium diesel ('pro'). The rest sell all five groups.
export const STATION_FUEL_SUPPORT = {
  Neste:   new Set(['95', '98', 'diesel', 'pro']),
  CircleK: new Set(['95', '98', 'diesel', 'pro', 'gas']),
  Virsi:   new Set(['95', '98', 'diesel', 'gas']),
  Viada:   new Set(['95', '98', 'diesel', 'pro', 'gas']),
};

// Canonical fuel groups. `id` matches the canonical ids the new stations store.
export const FUEL_GROUPS = [
  { id: '95',     color: '#22c55e', labelKey: 'Futura 95' },
  { id: '98',     color: '#06b6d4', labelKey: 'Futura 98' },
  { id: 'diesel', color: '#111827', labelKey: 'Futura D' },
  { id: 'pro',    color: '#EAB308', labelKey: 'Pro Diesel' },
  { id: 'gas',    color: '#8b5cf6', labelKey: 'Gas' },
];
export const FUEL_GROUP_IDS = FUEL_GROUPS.map((g) => g.id);

// Map a price record to its canonical fuel-group id. Neste rows carry full names
// ("Neste Futura 95"); new stations already store the canonical id ("95").
export const NESTE_TYPE_TO_GROUP = {
  'Neste Futura 95': '95',
  'Neste Futura 98': '98',
  'Neste Futura D': 'diesel',
  'Neste Pro Diesel': 'pro',
};
export const fuelGroupId = (rec) => NESTE_TYPE_TO_GROUP[rec.type] || rec.type;
export const stationKey = (rec) => rec.source || 'Neste';

// The set of fuels actually sellable by the currently selected stations — the
// union of each selected station's supported groups. Drives the fuel filter so a
// group disappears when no selected station sells it (e.g. only Neste hides gas).
export const stationSupportedFuels = (selectedStations) => {
  const supported = new Set();
  for (const s of selectedStations) {
    (STATION_FUEL_SUPPORT[s] || new Set()).forEach((f) => supported.add(f));
  }
  return supported;
};

// Intersect the user's fuel selection with what the selected stations sell.
export const effectiveSelectedFuels = (selectedFuels, selectedStations) => {
  const supported = stationSupportedFuels(selectedStations);
  return new Set([...selectedFuels].filter((f) => supported.has(f)));
};

// Cheapest row (lowest price) from a list of station rows for one fuel, or null.
// Stable: ties keep the earliest row. Ignores rows without a finite price.
export const cheapestRow = (rows) => {
  let best = null;
  for (const r of rows) {
    if (typeof r.price !== 'number' || !Number.isFinite(r.price)) continue;
    if (best === null || r.price < best.price) best = r;
  }
  return best;
};

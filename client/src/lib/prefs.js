// Single, versioned localStorage store for ALL user selections.
//
// Replaces the old scattered per-key reads/writes (`showDiscounts`,
// `selectedStations`, `historyPreset_v2`, ...). URL params still take priority on
// read (deep-linking / shareable links keep working); this store is the reliable
// fallback for EVERY setting — including the two that previously lived only in the
// URL and so were forgotten on a bare visit (analytics fuel selection + the chart
// timeline slider window).
//
// Why one versioned object instead of many keys: renaming an individual key (the
// old `_v2` suffix bump) silently abandons the returning visitor's value — a reset
// that lands exactly when a new build deploys. Here a schema change runs `migrate`
// on read and UPGRADES the old data in place, so deploys never wipe preferences.

const KEY = 'fpt:prefs';
const VERSION = 2;

// Module-level cache so the several useState initializers that call loadPrefs()
// during the first render share one parse, and savePrefs() keeps it in sync.
let cache = null;

// One-time import from the legacy per-key scheme, so existing visitors keep their
// saved settings on the first load after this ships. Absent keys fall through to
// the app's own defaults (e.g. no `selectedStations` meant "all selected").
const importLegacy = () => {
  const out = { v: VERSION };
  try {
    const d = localStorage.getItem('showDiscounts');
    if (d !== null) out.discounts = d === 'true';
    const st = localStorage.getItem('selectedStations');
    if (st) out.stations = st.split(',');
    const fu = localStorage.getItem('selectedFuels');
    if (fu) out.fuels = fu.split(',');
    const hp = localStorage.getItem('historyPreset_v2');
    if (hp) out.historyPreset = hp;
    const hs = localStorage.getItem('historyStartDate_v2');
    if (hs) out.historyStart = hs;
    const he = localStorage.getItem('historyEndDate_v2');
    if (he) out.historyEnd = he;
  } catch { /* storage unavailable */ }
  return out;
};

// Upgrade an older stored object to the current schema. Add `if (obj.v < N)`
// branches here when the shape changes — never rename the key.
const migrate = (obj) => {
  if (!obj || typeof obj !== 'object') return { v: VERSION };
  // v2: added the `cities` filter. No backfill needed — an absent `cities`
  // correctly reads as "all cities" (the unfiltered default), so just stamp
  // the version forward without touching the rest of the object.
  if (obj.v < 2) obj.v = 2;
  return obj;
};

// Read the full prefs object (cached). Returns {} only if storage is unreadable.
export const loadPrefs = () => {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      cache = migrate(JSON.parse(raw));
      return cache;
    }
  } catch { /* fall through to legacy import */ }
  cache = importLegacy();
  return cache;
};

// Merge a partial update into the stored object and persist. The first call after
// load also writes the legacy-imported values under the new key.
export const savePrefs = (patch) => {
  const next = { ...loadPrefs(), ...patch, v: VERSION };
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* storage unavailable (private mode / quota) */ }
};

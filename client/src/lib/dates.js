// Riga-timezone date helpers, extracted from App.jsx so the date logic lives in
// ONE place (App.jsx, HistoryTable and InsightsPanel previously each had their
// own copy) and can be unit-tested across DST boundaries.

const RIGA_TZ = 'Europe/Riga';

// Extract Riga-local year/month/day for a timestamp without double-parsing.
// Uses Intl to read the components directly — immune to DST shifts.
export const getRigaDateParts = (timestamp) => {
  const utcDate = new Date(timestamp);
  const year = parseInt(utcDate.toLocaleString('en-US', { timeZone: RIGA_TZ, year: 'numeric' }));
  const month = parseInt(utcDate.toLocaleString('en-US', { timeZone: RIGA_TZ, month: 'numeric' }));
  const day = parseInt(utcDate.toLocaleString('en-US', { timeZone: RIGA_TZ, day: 'numeric' }));
  return { year, month, day };
};

// Format a timestamp as a Riga-local YYYY-MM-DD string (used for brush URL params
// and history bucketing keys).
export const fmtRigaYmd = (ts) => {
  const { year, month, day } = getRigaDateParts(ts);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Format a timestamp as a short Riga-local dd.mm.yy display string.
export const fmtRigaShort = (ts) => {
  const { year, month, day } = getRigaDateParts(ts);
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${String(year).slice(-2)}`;
};

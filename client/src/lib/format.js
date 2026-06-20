// Pure presentation formatters, extracted from App.jsx / InsightsPanel.jsx.

// Translate a #rrggbb color into an rgba() string so a row can be tinted/ringed
// in an accent color at a chosen opacity.
export const hexToRgba = (hex, alpha) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Fuel prices are shown to 3 decimals (e.g. 1.717). Returns an em dash for
// missing/non-finite values so the UI never prints "NaN"/"undefined".
export const formatPrice = (value) =>
  (typeof value === 'number' && Number.isFinite(value)) ? value.toFixed(3) : '—';

// A price delta in €/L shown as signed cents (e.g. +2.5, -1.2). One decimal.
export const formatCents = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const cents = value * 100;
  const sign = cents > 0 ? '+' : '';
  return `${sign}${cents.toFixed(1)}`;
};

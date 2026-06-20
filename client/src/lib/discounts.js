// Discount detection, extracted from App.jsx. The chart (chartData) and the
// history table (allDaysData) previously each carried a copy of this decision
// tree; both now call isDiscountDay so the rule can never drift between them.

export const DISCOUNT_COLOR = '#44D62C'; // Vibrant Pantone Green for discounts

// Matches all known discount marker phrasings: the prices-page text
// ("Visās stacijās cenas vienādas", "...cena vienāda") and the homepage-banner
// marker injected by server/scraper.js (contains "samazināta cena").
export const DISCOUNT_MARKER_RE = /vis[āa]s[\s\S]*stacij[āa]s|samazin[āa]ta\s+cena/i;

// Matches ONLY the server-injected marker (homepage / Instagram / manual
// override). When present it is authoritative — bypass the price-drop gate,
// since external confirmation is independent of how many cents the price moved.
export const EXTERNAL_DISCOUNT_RE = /samazin[āa]ta\s+cena/i;

// Minimum day-over-day drop (€/L) on any single fuel to confirm a marker-only
// discount; EPSILON guards floating-point comparison. Mirrors the server.
export const MIN_DISCOUNT_DROP = 0.04;
export const EPSILON = 0.001;

// True when a day-over-day price move clears the discount threshold.
export const droppedEnough = (prevPrice, currPrice) =>
  (prevPrice - currPrice) >= MIN_DISCOUNT_DROP - EPSILON;

// The single discount-day decision tree shared by chart + history table:
//   (1) external confirmation → always a discount day (any magnitude);
//   (2) otherwise the marker must be NEW (absent the previous period — the
//       onset guard stops a lingering "uniform price" text from re-flagging)
//       AND some fuel must have dropped ≥4¢ (anyFuelDropped, computed by the
//       caller against its own row shape).
// No carry-forward: only the day with the visible drop is flagged.
export const isDiscountDay = ({
  hasExternalDiscount,
  isFirst,
  hasDiscountLocation,
  prevHasDiscountLocation,
  anyFuelDropped,
}) => {
  if (hasExternalDiscount) return true;
  if (isFirst || !hasDiscountLocation) return false;
  if (prevHasDiscountLocation) return false;
  return Boolean(anyFuelDropped);
};

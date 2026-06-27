// Per-fuel mini line charts, lazy-loaded so recharts (~106KB gzipped) stays out
// of the initial bundle and never blocks first paint/hydration. The chart lives
// below the fold in the Analytics card, so it's loaded on demand via React.lazy
// (see App.jsx). Everything recharts touches lives here; App.jsx imports only the
// default-exported FuelTrendChart.
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, LabelList, ErrorBar } from 'recharts';
import { STATIONS } from './lib/fuel.js';
import { DISCOUNT_COLOR } from './lib/discounts.js';

// Tooltip for the per-fuel station charts: date + each station's price (sorted
// cheapest first). payload dataKeys are `${fuelId}__${source}`.
const StationChartTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const date = payload[0]?.payload?.date;
  const dateStr = date
    ? new Date(date).toLocaleDateString('lv-LV', { timeZone: 'Europe/Riga', day: '2-digit', month: '2-digit', year: '2-digit' })
    : '';
  // Keep numeric rows for known stations only (excludes the pills overlay line,
  // which keys off a synthetic `${id}__${src}_min` dataKey), de-duped by dataKey.
  const seen = new Set();
  const rows = payload
    .filter(p => typeof p.value === 'number' && STATIONS[String(p.dataKey).split('__')[1]])
    .filter(p => { const k = String(p.dataKey); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.value - b.value);
  if (!rows.length) return null;
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString('lv-LV', { timeZone: 'Europe/Riga', hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <div className="rounded-lg bg-white/95 backdrop-blur shadow-lg ring-1 ring-gray-100 px-3 py-2 text-xs">
      <div className="font-semibold text-gray-400 mb-1 tabular-nums">{dateStr}</div>
      {rows.map(p => {
        const src = String(p.dataKey).split('__')[1];
        const st = STATIONS[src] || { label: src, color: p.stroke };
        const history = p.payload[`${p.dataKey}_history`] || [];
        const showHistory = history.length > 1; // only when the price moved within the day
        return (
          <div key={p.dataKey} className="py-0.5">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }} />
                <span className="font-medium text-gray-700">{st.label}</span>
              </span>
              <span className="font-bold tabular-nums text-gray-900">€{p.value.toFixed(3)}</span>
            </div>
            {showHistory && (
              <div className="mt-0.5 ml-3.5 pl-2 border-l border-gray-200 space-y-0.5">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-[10px] text-gray-400">
                    <span className="tabular-nums">{fmtTime(h.timestamp)}</span>
                    <span className="font-medium tabular-nums text-gray-500">€{h.price.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// One fuel's mini line chart: a line per station, end dots, discount shading.
// Shares the global brush window (visibleData) and period/discount settings.
// End-of-line price pills. Rendered via a <LabelList> inside the chart's last
// (transparent) <Line> so they paint ON TOP of every station line and dot — the
// same layering the old single-chart badges had (recharts <Customized> renders
// under the graphical items, which buried them). Each pill is collision-resolved
// vertically and linked to its datapoint by a thin dashed leader, visually
// distinct from the solid graph lines.
const PILL_HEIGHT = 24;
const PLOT_TOP = 14; // matches LineChart top margin
const PLOT_BOTTOM = 148; // chart height (150) − bottom margin (2)

// Build the vertically collision-resolved pill stack for the final datapoint.
// Each item keeps its true datapoint y plus a labelY (pill center) after overlap
// resolution; the whole stack is shifted as a unit to stay inside the plot box.
function buildEndPillStack(activeSrcs, lastPoint, groupId, toY) {
  const items = activeSrcs
    .map((src) => {
      const price = lastPoint[`${groupId}__${src}`];
      const y = toY(price);
      return {
        src,
        price,
        color: (STATIONS[src] || {}).color || '#6b7280',
        label: (STATIONS[src] || {}).label || src,
        y,
        labelY: y,
      };
    })
    // Drop any pill whose geometry isn't finite — a degenerate domain mid-drag
    // could otherwise produce NaN coordinates and (downstream) an empty-stack read.
    .filter((it) => typeof it.price === 'number' && Number.isFinite(it.y));
  // Nothing to stack — bail before the items[0] reads below would throw.
  if (items.length === 0) return [];
  items.sort((a, b) => a.y - b.y);
  const GAP = PILL_HEIGHT + 6; // a little breathing room between stacked chips
  const top = PLOT_TOP + PILL_HEIGHT / 2;
  const bottom = PLOT_BOTTOM - PILL_HEIGHT / 2;
  for (let iter = 0; iter < 50; iter++) {
    let changed = false;
    for (let i = 0; i < items.length - 1; i++) {
      const a = items[i];
      const b = items[i + 1];
      const overlap = GAP - (b.labelY - a.labelY);
      if (overlap > 0) {
        a.labelY -= overlap / 2;
        b.labelY += overlap / 2;
        changed = true;
      }
    }
    if (!changed) break;
  }
  const first = items[0].labelY;
  const last = items[items.length - 1].labelY;
  let shift = 0;
  if (last - first > bottom - top) shift = top - first; // taller than box → anchor top
  else if (first < top) shift = top - first;
  else if (last > bottom) shift = bottom - last;
  items.forEach((it) => {
    it.labelY += shift;
  });
  return items;
}

// A single end-of-line price pill: white rounded chip with bold € price + the
// station name. A dashed leader connects it to its datapoint whenever the pill
// has been displaced from it (which, given the horizontal offset, is always).
function EndPricePill({ item, dpX }) {
  // Guard against non-finite geometry during a rapid brush drag (transient
  // degenerate domain → NaN). Skip the pill rather than emit NaN SVG attributes.
  if (!item || !Number.isFinite(item.price) || !Number.isFinite(dpX) ||
      !Number.isFinite(item.y) || !Number.isFinite(item.labelY)) {
    return null;
  }
  const priceText = `€${item.price.toFixed(3)}`;
  const pillWidth = priceText.length * 7 + 12;
  const pillX = dpX - pillWidth - 14;
  const rightX = pillX + pillWidth + 2;
  const dist = Math.hypot(dpX - rightX, item.y - item.labelY);
  return (
    <g>
      {dist > 6 && (
        <line
          x1={dpX}
          y1={item.y}
          x2={rightX}
          y2={item.labelY}
          stroke={item.color}
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={1}
        />
      )}
      <g transform={`translate(${pillX}, ${item.labelY - PILL_HEIGHT / 2})`}>
        <rect
          width={pillWidth}
          height={PILL_HEIGHT}
          rx={8}
          fill="#ffffff"
          stroke="#e5e7eb"
          strokeWidth={1}
        />
        <text
          x={pillWidth / 2}
          y={PILL_HEIGHT / 2 - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fontWeight={700}
          fill={item.color}
        >
          {priceText}
        </text>
        <text
          x={pillWidth / 2}
          y={PILL_HEIGHT / 2 + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={9}
          fontWeight={500}
          fill={item.color}
          opacity={1}
        >
          {item.label}
        </text>
      </g>
    </g>
  );
}

const FuelTrendChart = ({ group, visibleData, chartDataFinal, graphInterval, showDiscounts, t, isActiveChart }) => {
  // Defensive: a brush window can transiently slice to an empty set while state
  // settles. Recharts dislikes an empty/degenerate-domain chart, so render a
  // neutral placeholder rather than risk a throw that blanks the panel.
  const safeData = Array.isArray(visibleData) ? visibleData : [];
  // Only render stations that actually have a numeric value WITHIN the visible
  // window. `group.stations` is derived from the full dataset, so in a historical
  // window (e.g. before the non-Neste chains began scraping) it would otherwise
  // render empty all-null <Line>/<ErrorBar> series plus a pills overlay keyed off
  // them — degenerate input Recharts has to mount/unmount as the brush window
  // crosses the sparse boundary during a fast drag. Scoping to the visible window
  // removes that whole class of churn (the multi-provider regression).
  const visibleStations = group.stations.filter((s) =>
    safeData.some((d) => typeof d[`${group.id}__${s}`] === 'number'));
  let dMin = Infinity, dMax = -Infinity, hasVals = false;
  safeData.forEach(d => visibleStations.forEach(s => {
    const v = d[`${group.id}__${s}`];
    if (typeof v === 'number') { hasVals = true; if (v < dMin) dMin = v; if (v > dMax) dMax = v; }
  }));
  if (!safeData.length) {
    return (
      <div>
        <div className="mb-1">
          <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-gray-100 text-gray-700">
            {t(group.labelKey)}
          </span>
        </div>
        <div className="h-[140px] w-full" />
      </div>
    );
  }
  if (!hasVals) { dMin = 0; dMax = 1; }

  // Y-axis spans the full period: min price at bottom, max price at top.
  // A small 5 % pad on each side keeps dots from touching the chart edges.
  const periodRange = dMax - dMin;
  const pad = Math.max(periodRange * 0.05, 0.005);
  const domainLow = dMin - pad;
  const domainHigh = dMax + pad;

  // Price-pill geometry for the final datapoint. toY mirrors the (explicit,
  // linear) YAxis domain → pixel mapping so pills line up with the real dots.
  const lastPoint = visibleData[visibleData.length - 1] || {};
  const activeSrcs = visibleStations.filter((s) => typeof lastPoint[`${group.id}__${s}`] === 'number');
  const anchorSrc = activeSrcs[0];
  const domainMin = domainLow;
  const domainSpan = domainHigh - domainLow;
  const toY = (price) => PLOT_TOP + (PLOT_BOTTOM - PLOT_TOP) * (1 - (price - domainMin) / domainSpan);
  const lastIndex = visibleData.length - 1;

  return (
    <div>
      <div className="mb-1">
        <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-gray-100 text-gray-700">
          {t(group.labelKey)}
        </span>
      </div>
      <div className="h-[150px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData} margin={{ top: 14, right: 18, left: 8, bottom: 2 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
            <XAxis dataKey="date" type="number" domain={['dataMin', 'dataMax']} hide />
            <YAxis domain={[domainLow, domainHigh]} hide />
            <Tooltip content={<StationChartTooltip />} cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5 5' }} wrapperStyle={{ zIndex: 20, display: isActiveChart === false ? 'none' : undefined }} />
            {graphInterval === 'days' && (() => {
              // Clamp each discount band to the visible window's date range. Without
              // this, the band for the LAST point (e.g. today's discount) extends to
              // point.date + ½·gap — past the axis max — and Recharts' ReferenceArea
              // (ifOverflow="discard" by default) drops the whole band, so the most
              // recent discount day never highlighted even though mid-chart ones did.
              const visMin = visibleData[0]?.date;
              const visMax = visibleData[visibleData.length - 1]?.date;
              return chartDataFinal.reduce((areas, point, i, arr) => {
                if (!point.isDiscount) return areas;
                const avgGap = arr.length > 1 ? (arr[arr.length - 1].date - arr[0].date) / (arr.length - 1) : 0;
                const prevDate = i > 0 ? arr[i - 1].date : point.date - avgGap;
                const nextDate = i < arr.length - 1 ? arr[i + 1].date : point.date + avgGap;
                let x1 = (prevDate + point.date) / 2;
                let x2 = (point.date + nextDate) / 2;
                if (visMin !== undefined) { x1 = Math.max(visMin, x1); x2 = Math.max(visMin, x2); }
                if (visMax !== undefined) { x1 = Math.min(visMax, x1); x2 = Math.min(visMax, x2); }
                if (x2 <= x1) return areas; // fully outside the visible window
                areas.push(
                  <ReferenceArea
                    key={`disc-${point.periodKey}`}
                    x1={x1}
                    x2={x2}
                    ifOverflow="visible"
                    fill={showDiscounts ? `${DISCOUNT_COLOR}33` : 'transparent'}
                    stroke="none"
                  />
                );
                return areas;
              }, []);
            })()}
            {/* One line per station, each with an intraday min–max ErrorBar
                whisker. Scoped to stations present in the visible window so we
                never feed Recharts empty all-null series. */}
            {visibleStations.map((src) => {
              const color = (STATIONS[src] || {}).color || '#6b7280';
              return (
                <Line
                  key={src}
                  type="monotone"
                  dataKey={`${group.id}__${src}`}
                  stroke={color}
                  strokeWidth={2}
                  connectNulls
                  isAnimationActive={false}
                  dot={{ r: 3, fill: color, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
                >
                  <ErrorBar
                    dataKey={`${group.id}__${src}_range`}
                    width={3}
                    strokeWidth={1.5}
                    stroke={color}
                    direction="y"
                  />
                </Line>
              );
            })}
            {/* Transparent overlay line rendered LAST so its LabelList paints the
                price pills on top of every line, dot, and whisker. It keys off the
                anchor's `_min` field — a DISTINCT dataKey from the real station
                line — so recharts doesn't collide two layers on the same key, and
                the StationChartTooltip filter (known stations only) hides it. */}
            {anchorSrc && domainSpan > 0 && (
              <Line
                key="__pills"
                type="monotone"
                dataKey={`${group.id}__${anchorSrc}_min`}
                stroke="transparent"
                strokeWidth={0}
                dot={false}
                activeDot={false}
                connectNulls
                isAnimationActive={false}
                legendType="none"
              >
                <LabelList
                  dataKey={`${group.id}__${anchorSrc}_min`}
                  content={(props) => {
                    if (!props || props.index !== lastIndex) return null;
                    const stack = buildEndPillStack(activeSrcs, lastPoint, group.id, toY);
                    return (
                      <g>
                        {stack.map((it) => (
                          <EndPricePill key={it.src} item={it} dpX={props.x} />
                        ))}
                      </g>
                    );
                  }}
                />
              </Line>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FuelTrendChart;

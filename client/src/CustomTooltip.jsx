import React from 'react';

// Custom Tooltip Component for Graph
const CustomTooltip = ({ active, payload, label, t, interval }) => {
    if (active && payload && payload.length) {
        // Determine formatted date based on interval is tricky inside tooltip if we don't have the formatter
        // But payload[0].payload.formattedTime usually carries the pre-formatted time
        // Or we can re-format based on label (which is unix time)
        const dateLabel = payload[0]?.payload?.formattedTime || label;

        // Sort payload to ensure consistent order if needed, or just map
        // We want to filter out trends
        const items = payload.filter(p => !p.name.includes('_trend'));

        if (items.length === 0) return null;

        return (
            <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl shadow-xl p-3 text-xs">
                <p className="font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-100">
                    {dateLabel}
                </p>
                <div className="space-y-1">
                    {items.map((entry, index) => {
                        const historyKey = `${entry.name}_history`;
                        const history = entry.payload[historyKey];
                        const hasHistory = history && history.length > 1;

                        // Limit history entries based on interval
                        const maxHistory = interval === 'months' ? 0 : interval === 'weeks' ? 5 : Infinity;
                        const showHistory = history && history.length > 1 && maxHistory > 0;
                        const visibleHistory = showHistory ? history.slice(0, maxHistory) : [];
                        const hiddenCount = showHistory ? history.length - visibleHistory.length : 0;

                        // For monthly view, show compact min–max range instead of history
                        const minPrice = entry.payload[`${entry.name}_min`];
                        const maxPrice = entry.payload[`${entry.name}_max`];
                        const showRange = interval === 'months' && minPrice != null && maxPrice != null && minPrice !== maxPrice;

                        return (
                            <div key={index} className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 min-w-[140px]">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-gray-600 flex-1">
                                        {t(entry.name.replace('Neste ', ''))}
                                    </span>
                                    <span className="font-semibold text-gray-900 tabular-nums">
                                        €{parseFloat(entry.value).toFixed(3)}
                                    </span>
                                </div>
                                {showRange && (
                                    <div className="pl-4 ml-1 text-[10px] text-gray-400">
                                        {t('avg_prices.min')}: €{minPrice.toFixed(3)} — {t('avg_prices.max')}: €{maxPrice.toFixed(3)}
                                    </div>
                                )}
                                {showHistory && visibleHistory.length > 0 && (
                                    <div className="pl-4 ml-1 space-y-0.5 border-l border-gray-200">
                                        {visibleHistory.map((h, i) => (
                                            <div key={i} className="flex justify-between gap-4 text-[10px] text-gray-500">
                                                <span>
                                                    {(() => {
                                                        const dateObj = new Date(h.timestamp);
                                                        const tz = 'Europe/Riga';
                                                        const timeStr = dateObj.toLocaleTimeString('lv-LV', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
                                                        if (interval === 'days') return timeStr;
                                                        const dateStr = dateObj.toLocaleDateString('lv-LV', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric' });
                                                        return `${dateStr} ${timeStr}`;
                                                    })()}
                                                </span>
                                                <span className="font-medium">€{h.price.toFixed(3)}</span>
                                            </div>
                                        ))}
                                        {hiddenCount > 0 && (
                                            <div className="text-[10px] text-gray-400 italic">
                                                +{hiddenCount} more
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div >
        );
    }
    return null;
};

export default CustomTooltip;

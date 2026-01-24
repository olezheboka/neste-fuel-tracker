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
                                {hasHistory && (
                                    <div className="pl-4 ml-1 space-y-0.5 border-l border-gray-200">
                                        {history.map((h, i) => (
                                            <div key={i} className="flex justify-between gap-4 text-[10px] text-gray-500">
                                                <span>
                                                    {(() => {
                                                        const dateObj = new Date(h.timestamp);
                                                        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                                                        if (interval === 'days') return timeStr;
                                                        const dateStr = dateObj.toLocaleDateString('lv-LV', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                                        return `${dateStr} ${timeStr}`;
                                                    })()}
                                                </span>
                                                <span className="font-medium">€{h.price.toFixed(3)}</span>
                                            </div>
                                        ))}
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

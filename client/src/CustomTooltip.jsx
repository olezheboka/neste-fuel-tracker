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
                    {items.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 min-w-[140px]">
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
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export default CustomTooltip;

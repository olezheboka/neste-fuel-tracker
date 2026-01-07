import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const FUEL_COLORS = {
    'Neste Futura 95': '#22c55e',
    'Neste Futura 98': '#15803d',
    'Neste Futura D': '#111827',
    'Neste Pro Diesel': '#EAB308'
};

const FUEL_STYLES = {
    'Neste Futura 95': {
        active: 'bg-green-500 text-white',
        inactive: 'bg-green-50 text-green-700 hover:bg-green-100'
    },
    'Neste Futura 98': {
        active: 'bg-green-700 text-white',
        inactive: 'bg-green-50 text-green-800 hover:bg-green-100'
    },
    'Neste Futura D': {
        active: 'bg-gray-900 text-white',
        inactive: 'bg-gray-100 text-gray-900 hover:bg-gray-200'
    },
    'Neste Pro Diesel': {
        active: 'bg-yellow-500 text-white',
        inactive: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
    }
};

// Helper function to calculate analysis for given fuel types
const calculateAnalysis = (historyData, fuelTypes) => {
    if (!historyData || historyData.length === 0 || fuelTypes.length === 0) return null;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalChange24h = 0;
    let totalChange7d = 0;
    let totalChange30d = 0;
    let totalPct24h = 0;
    let totalPct7d = 0;
    let totalPct30d = 0;
    let count = 0;

    fuelTypes.forEach(type => {
        const typeHistory = historyData
            .filter(item => item.type === type)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (typeHistory.length === 0) return;

        const current = typeHistory[0].price;

        const price24h = typeHistory.find(d => new Date(d.timestamp) <= oneDayAgo)?.price || current;
        const price7d = typeHistory.find(d => new Date(d.timestamp) <= sevenDaysAgo)?.price || current;
        const price30d = typeHistory.find(d => new Date(d.timestamp) <= thirtyDaysAgo)?.price || current;

        totalChange24h += (current - price24h);
        totalChange7d += (current - price7d);
        totalChange30d += (current - price30d);

        if (price24h > 0) totalPct24h += ((current - price24h) / price24h) * 100;
        if (price7d > 0) totalPct7d += ((current - price7d) / price7d) * 100;
        if (price30d > 0) totalPct30d += ((current - price30d) / price30d) * 100;

        count++;
    });

    if (count === 0) return null;

    return {
        avgChange24h: (totalChange24h / count),
        avgChange7d: (totalChange7d / count),
        avgChange30d: (totalChange30d / count),
        avgPct24h: (totalPct24h / count),
        avgPct7d: (totalPct7d / count),
        avgPct30d: (totalPct30d / count)
    };
};

export default function InsightsPanel({ historyData, latestPrices, selectedFuel, setSelectedFuel }) {
    const { t } = useTranslation();

    // Get all fuel types from latest prices
    const allFuelTypes = useMemo(() => {
        if (!latestPrices) return [];
        return latestPrices.map(p => p.type);
    }, [latestPrices]);

    // Global analysis (all fuel types) - for summary
    const globalAnalysis = useMemo(() => {
        return calculateAnalysis(historyData, allFuelTypes);
    }, [historyData, allFuelTypes]);

    // Filtered analysis (based on selection) - for Change cards
    const filteredFuelTypes = useMemo(() => {
        if (selectedFuel === 'all') {
            return allFuelTypes;
        }
        return allFuelTypes.filter(type => type === selectedFuel);
    }, [allFuelTypes, selectedFuel]);

    const filteredAnalysis = useMemo(() => {
        return calculateAnalysis(historyData, filteredFuelTypes);
    }, [historyData, filteredFuelTypes]);

    if (!globalAnalysis || !filteredAnalysis) return null;

    // Generate Natural Language Summary (based on global analysis)
    const generateSummary = () => {
        const { avgChange24h, avgChange7d, avgChange30d } = globalAnalysis;

        let trendText = '';
        let reasonText = '';

        // Determine trend
        if (Math.abs(avgChange24h) < 0.002 && Math.abs(avgChange7d) < 0.005) {
            trendText = t('insights.summary_multifuel_stable');
            reasonText = t('insights.reason_stable');
        } else if (avgChange7d > 0.01 || avgChange30d > 0.02) {
            trendText = t('insights.summary_multifuel_increase');
            reasonText = t('insights.reason_increase');
        } else if (avgChange7d < -0.01 || avgChange30d < -0.02) {
            trendText = t('insights.summary_multifuel_decrease');
            reasonText = t('insights.reason_decrease');
        } else {
            trendText = t('insights.summary_multifuel_stable');
            reasonText = t('insights.reason_stable');
        }

        return { trendText, reasonText };
    };

    const { trendText, reasonText } = generateSummary();

    const renderTrend = (val, pct, label) => {
        const num = parseFloat(val);
        const cents = num * 100;
        const pctNum = parseFloat(pct);
        let colorClass = "text-blue-600";
        let bgClass = "bg-blue-50";
        let Icon = Minus;

        if (num > 0.001) {
            colorClass = "text-red-500";
            bgClass = "bg-red-50";
            Icon = TrendingUp;
        } else if (num < -0.001) {
            colorClass = "text-green-500";
            bgClass = "bg-green-50";
            Icon = TrendingDown;
        }

        return (
            <div className={`p-3 sm:p-4 rounded-xl flex flex-col items-center text-center ${bgClass}`}>
                <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide mb-1 sm:mb-2 whitespace-nowrap">{label}</span>
                <div className="flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
                    <span className={`text-base sm:text-xl font-semibold ${colorClass}`}>
                        {cents > 0 ? '+' : ''}{cents.toFixed(1)}¢
                    </span>
                    <Icon size={16} className={`${colorClass} sm:w-[18px] sm:h-[18px]`} strokeWidth={2} />
                </div>
                <span className={`text-[9px] sm:text-[10px] ${colorClass} opacity-70 mt-0.5`}>
                    ({pctNum > 0 ? '+' : ''}{pctNum.toFixed(2)}%)
                </span>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('insights.title')}
            </h3>

            {/* Global Market Summary */}
            <div className="mb-6">
                <p className="text-sm text-gray-700 mb-2">
                    {trendText}
                </p>
                <p className="text-xs text-gray-500 italic">
                    {reasonText}
                </p>
            </div>

            {/* Fuel Type Selector - Only affects Change cards */}
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{t('fuel_type')}</p>
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => setSelectedFuel('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedFuel === 'all' ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    {t('all')}
                </button>
                {Object.keys(FUEL_COLORS).map(fuel => {
                    const isActive = selectedFuel === fuel;
                    const style = FUEL_STYLES[fuel];

                    return (
                        <button
                            key={fuel}
                            onClick={() => setSelectedFuel(fuel)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? style.active : style.inactive}`}
                        >
                            {t(fuel.replace('Neste ', ''))}
                        </button>
                    );
                })}
            </div>

            {/* Change Cards - Based on filtered analysis */}
            <div className="grid grid-cols-3 gap-3">
                {renderTrend(filteredAnalysis.avgChange24h, filteredAnalysis.avgPct24h, t('insights.change_24h'))}
                {renderTrend(filteredAnalysis.avgChange7d, filteredAnalysis.avgPct7d, t('insights.change_7d'))}
                {renderTrend(filteredAnalysis.avgChange30d, filteredAnalysis.avgPct30d, t('insights.change_30d'))}
            </div>
        </div>
    );
}

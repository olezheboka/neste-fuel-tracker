import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function InsightsPanel({ historyData, latestPrices }) {
    const { t } = useTranslation();

    // We analyze ALL fuels now, not just one.
    // latestPrices contains current prices.
    // historyData contains historical points.

    const fuelTypes = useMemo(() => {
        if (!latestPrices) return [];
        return latestPrices.map(p => p.type);
    }, [latestPrices]);

    const analysis = useMemo(() => {
        if (!historyData || historyData.length === 0 || fuelTypes.length === 0) return null;

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let totalChange24h = 0;
        let totalChange7d = 0;
        let totalChange30d = 0;
        let count = 0;

        fuelTypes.forEach(type => {
            const typeHistory = historyData
                .filter(item => item.type === type)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first

            if (typeHistory.length === 0) return;

            const current = typeHistory[0].price;

            const price24h = typeHistory.find(d => new Date(d.timestamp) <= oneDayAgo)?.price || current;
            const price7d = typeHistory.find(d => new Date(d.timestamp) <= sevenDaysAgo)?.price || current;
            const price30d = typeHistory.find(d => new Date(d.timestamp) <= thirtyDaysAgo)?.price || current;

            // Note: Positive difference means Increase (Bad for consumer -> Red)
            // Negative difference means Decrease (Good for consumer -> Green)
            totalChange24h += (current - price24h);
            totalChange7d += (current - price7d);
            totalChange30d += (current - price30d);
            count++;
        });

        if (count === 0) return null;

        return {
            avgChange24h: (totalChange24h / count),
            avgChange7d: (totalChange7d / count),
            avgChange30d: (totalChange30d / count)
        };
    }, [historyData, fuelTypes]);

    if (!analysis) return null;

    // Generate Natural Language Summary
    const generateSummary = () => {
        const { avgChange24h, avgChange7d, avgChange30d } = analysis;

        // Prioritize 30d trend if significant
        if (Math.abs(avgChange24h) < 0.002 && Math.abs(avgChange7d) < 0.005) {
            return t('insights.summary_multifuel_stable');
        } else if (avgChange7d > 0.01 || avgChange30d > 0.02) {
            return t('insights.summary_multifuel_increase');
        } else if (avgChange7d < -0.01 || avgChange30d < -0.02) {
            return t('insights.summary_multifuel_decrease');
        } else {
            return t('insights.summary_multifuel_stable');
        }
    };

    const renderTrend = (val, label) => {
        const num = parseFloat(val);
        let colorClass = "text-amber-500";
        let bgClass = "bg-amber-50";
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
            <div className={`p-4 rounded-xl flex flex-col items-center text-center ${bgClass}`}>
                <span className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</span>
                <div className="flex items-center gap-1">
                    <span className={`text-xl font-semibold ${colorClass}`}>
                        {num > 0 ? '+' : ''}{num.toFixed(3)}
                    </span>
                    <Icon size={18} className={colorClass} strokeWidth={2} />
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('insights.title')}
            </h3>

            <p className="text-sm text-gray-500 mb-6">
                {generateSummary()}
            </p>

            <div className="grid grid-cols-3 gap-3">
                {renderTrend(analysis.avgChange24h, t('insights.change_24h'))}
                {renderTrend(analysis.avgChange7d, t('insights.change_7d'))}
                {renderTrend(analysis.avgChange30d, t('insights.change_30d'))}
            </div>
        </div>
    );
}

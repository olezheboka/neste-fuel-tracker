import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, RefreshCw, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import InsightsPanel from './InsightsPanel';

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

const FUEL_COLORS = {
  'Neste Futura 95': '#22c55e', // green-500
  'Neste Futura 98': '#15803d', // green-700
  'Neste Futura D': '#111827',  // gray-900 (black)
  'Neste Pro Diesel': '#EAB308' // yellow-500
};

const FUEL_STYLES = {
  'Neste Futura 95': {
    active: 'bg-green-500 text-white',
    inactive: 'bg-green-50 text-green-700 hover:bg-green-100',
    border: 'border-l-green-500',
    icon: 'text-green-500'
  },
  'Neste Futura 98': {
    active: 'bg-green-700 text-white',
    inactive: 'bg-green-50 text-green-800 hover:bg-green-100', // Maybe darker text for 98 inactive
    border: 'border-l-green-700',
    icon: 'text-green-700'
  },
  'Neste Futura D': {
    active: 'bg-gray-900 text-white',
    inactive: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    border: 'border-l-gray-900',
    icon: 'text-gray-900'
  },
  'Neste Pro Diesel': {
    active: 'bg-yellow-500 text-white',
    inactive: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
    border: 'border-l-yellow-500',
    icon: 'text-yellow-500'
  }
};

const lngs = {
  lv: { nativeName: 'Latviešu', flag: '🇱🇻' },
  ru: { nativeName: 'Русский', flag: '🇷🇺' },
  en: { nativeName: 'English', flag: '🇬🇧' }
};

// Apple-style Segmented Control
const SegmentedControl = ({ options, value, onChange, layoutId, className, size = 'default' }) => (
  <div className={twMerge("inline-flex bg-gray-100/80 p-1 rounded-xl relative", className)}>
    {options.map((opt) => {
      const isActive = value === opt.value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            "relative rounded-lg transition-all duration-200 z-10 flex items-center justify-center gap-1.5",
            size === 'small' ? "px-3 py-1.5 text-xs font-semibold" : "px-4 py-2 text-sm font-semibold",
            isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
          )}
        >
          {isActive && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 bg-white rounded-lg shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              style={{ zIndex: -1 }}
            />
          )}
          {opt.label}
        </button>
      );
    })}
  </div>
);

// Clean Card Component
const Card = ({ children, className }) => (
  <div className={twMerge("bg-white rounded-2xl p-5", className)}>
    {children}
  </div>
);

const FuelCard = ({ type, price, location }) => {
  const { t } = useTranslation();

  // Parse addresses from pipe-separated string
  let addressList = [];
  if (location && location.trim().length > 0) {
    addressList = location.split(/\|/).map(s => s.trim()).filter(s => s.length > 0);
  }

  // Determine accent color style based on specific fuel type
  const style = FUEL_STYLES[type] || FUEL_STYLES['Neste Futura 95'];

  return (
    <Card className={`bg-white shadow-md border-l-4 ${style.border}`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
        {t(type.replace('Neste ', ''))}
      </p>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-3xl font-bold text-gray-900 tracking-tight">
          {price.toFixed(3)}
        </span>
        <span className="text-sm text-gray-400 font-medium">€/L</span>
      </div>
      <div className="text-xs text-gray-400">
        <div className="flex items-center gap-1.5 mb-2">
          <span>{t('valid_at')} ({addressList.length} DUS)</span>
        </div>
        <div className="pl-3 space-y-1 max-h-32 overflow-y-auto">
          {addressList.length > 0 ? (
            addressList.map((addr, i) => {
              // Add "Rīga" for Google Maps search since these are the lowest prices in Rīga
              const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Neste ${addr}, Rīga, Latvia`)}`;
              return (
                <a
                  key={i}
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-gray-500 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <MapPin size={12} className="inline text-green-500 mr-1" /> {addr}
                </a>
              );
            })
          ) : (
            <span>{t('location')}</span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default function App() {
  const { t, i18n } = useTranslation();
  const [latestPrices, setLatestPrices] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [selectedFuel, setSelectedFuel] = useState('all');
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);
  const [graphInterval, setGraphInterval] = useState('days');

  const fetchData = async (forceScrape = false) => {
    try {
      setLoading(true);

      if (forceScrape) {
        await axios.post(`${API_BASE}/scrape`);
      }

      const latestRes = await axios.get(`${API_BASE}/prices/latest`);
      setLatestPrices(latestRes.data);
      if (latestRes.data.length > 0) {
        setLastCheck(latestRes.data[0].timestamp);
      }

      const historyRes = await axios.get(`${API_BASE}/prices/history`);
      setHistoryData(historyRes.data);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format date helper (European/Latvian: DD.MM.YYYY HH:mm)
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('lv-LV', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const petrolPrices = latestPrices.filter(p => !p.type.includes('D') && !p.type.includes('Diesel'));
  const dieselPrices = latestPrices.filter(p => p.type.includes('D') || p.type.includes('Diesel'));

  // Filter Data based on Interval (same logic as before)
  // Filter Data based on Interval and Group by Timestamp
  const chartData = useMemo(() => {
    if (!historyData.length) return [];

    const now = new Date();
    let cutoff = new Date();

    if (graphInterval === 'hours') cutoff.setHours(now.getHours() - 24);
    if (graphInterval === 'days') cutoff.setDate(now.getDate() - 30);
    if (graphInterval === 'weeks') cutoff.setDate(now.getDate() - 90);
    if (graphInterval === 'months') cutoff.setMonth(now.getMonth() - 12);
    // Removed years as requested

    // Filter by date first
    const filteredByTime = historyData.filter(d => new Date(d.timestamp) >= cutoff);

    // Group by timestamp (pivot data)
    const groupedMap = new Map();

    filteredByTime.forEach(item => {
      const timeKey = item.timestamp;
      if (!groupedMap.has(timeKey)) {
        groupedMap.set(timeKey, {
          date: new Date(timeKey).getTime(),
          formattedTime: formatDate(timeKey),
        });
      }
      const entry = groupedMap.get(timeKey);
      entry[item.type] = item.price;
    });

    return Array.from(groupedMap.values()).sort((a, b) => a.date - b.date);
  }, [historyData, graphInterval]);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  // Calculate trend line helper
  const calculateTrendLine = (data, dataKey) => {
    if (!data || data.length < 2) return null;

    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    // Map data points to index (x) and value (y)
    const points = data.map((d, i) => {
      const val = parseFloat(d[dataKey]);
      if (isNaN(val)) return null;
      return { x: i, y: val };
    }).filter(p => p !== null);

    if (points.length < 2) return null;

    points.forEach(p => {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    });

    const count = points.length;
    // Linear regression formula: y = mx + c
    const slope = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / count;

    // Return mapped data with trend values
    return data.map((d, i) => ({
      ...d,
      [`${dataKey}_trend`]: slope * i + intercept
    }));
  };

  // Prepare data with trend lines
  const chartDataWithTrend = useMemo(() => {
    if (!chartData) return [];
    let data = [...chartData];

    if (selectedFuel === 'all') {
      Object.keys(FUEL_COLORS).forEach(fuel => {
        const trend = calculateTrendLine(data, fuel);
        if (trend) {
          // Merge trend data back into main data array
          trend.forEach((t, i) => {
            if (data[i]) data[i][`${fuel}_trend`] = t[`${fuel}_trend`];
          });
        }
      });
    } else {
      const trend = calculateTrendLine(data, selectedFuel);
      if (trend) data = trend;
    }
    return data;
  }, [chartData, selectedFuel]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 pb-24">

      {/* Header */}
      <header className="bg-white backdrop-blur-xl sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            {t('app_title')}
          </h1>
          <SegmentedControl
            options={Object.keys(lngs).map(lng => ({
              value: lng,
              label: <span className="flex items-center gap-1">{lngs[lng].flag} {lngs[lng].nativeName}</span>
            }))}
            value={i18n.language}
            onChange={(val) => i18n.changeLanguage(val)}
            layoutId="active-lang"
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Subheading with last update */}
        <div className="text-sm text-gray-500">
          {t('data_source')} {lastCheck && (
            <span>• {t('last_update')}: {new Date(lastCheck).toLocaleString('lv-LV', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          )}
        </div>

        {/* Loading State */}
        {loading && latestPrices.length === 0 && (
          <div className="text-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">{t('loading_initial') || t('loading')}</p>
          </div>
        )}

        {/* Fuel Prices */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('fuel_group.petrol')}</h2>
          {petrolPrices.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {petrolPrices.map((item) => (
                <FuelCard key={item.type} {...item} />
              ))}
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('fuel_group.diesel')}</h2>
          {dieselPrices.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {dieselPrices.map((item) => (
                <FuelCard key={item.type} {...item} />
              ))}
            </div>
          )}

          {latestPrices.length === 0 && !loading && (
            <div className="text-center text-gray-400 py-10">
              {t('no_data')}
            </div>
          )}
        </section>

        {/* Insights */}
        <section>
          <InsightsPanel historyData={historyData} latestPrices={latestPrices} />
        </section>

        {/* Chart Section */}
        <section>
          <Card className="p-6">
            {/* Header with Time Period Pills */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">{t('history')}</h2>
              </div>
              <div className="flex gap-1">
                {['days', 'weeks', 'months'].map(step => {
                  const isActive = graphInterval === step;
                  return (
                    <button
                      key={step}
                      onClick={() => setGraphInterval(step)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isActive
                        ? 'bg-blue-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {t(`intervals.${step}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fuel Type Section */}
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{t('fuel_type')}</p>
            <div className="flex flex-wrap gap-2 mb-6">
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

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartDataWithTrend}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#a3a3a3"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                    tickFormatter={(unixTime) => {
                      const d = new Date(unixTime);
                      if (graphInterval === 'hours') return d.toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' });
                      if (graphInterval === 'weeks') {
                        // Simple ISO week number calculation
                        const date = new Date(d.getTime());
                        date.setHours(0, 0, 0, 0);
                        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
                        const week1 = new Date(date.getFullYear(), 0, 4);
                        const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
                        return `W${weekNumber}`;
                      }
                      if (graphInterval === 'months') return d.toLocaleDateString('lv-LV', { month: 'short', year: '2-digit' });
                      return d.toLocaleDateString('lv-LV', { day: '2-digit', month: '2-digit' });
                    }}
                  />
                  <YAxis
                    stroke="#a3a3a3"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[dataMin => (dataMin - 0.02), dataMax => (dataMax + 0.02)]}
                    allowDataOverflow={true}
                    tickFormatter={(value) => `€${parseFloat(value).toFixed(2)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                      padding: '12px 16px'
                    }}
                    formatter={(value, name) => {
                      if (name.includes('_trend')) return [null, null]; // Hide trend values
                      return [`€${parseFloat(value).toFixed(3)}`, t((name || '').replace('Neste ', ''))];
                    }}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.formattedTime || label}
                  />
                  {selectedFuel === 'all' ? (
                    Object.keys(FUEL_COLORS).map(fuel => (
                      <React.Fragment key={fuel}>
                        <Line
                          type="monotone"
                          dataKey={fuel}
                          stroke={FUEL_COLORS[fuel]}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 5, strokeWidth: 0, fill: FUEL_COLORS[fuel] }}
                        />
                        <Line
                          type="linear"
                          dataKey={`${fuel}_trend`}
                          stroke={FUEL_COLORS[fuel]}
                          strokeWidth={1}
                          strokeDasharray="5 5"
                          dot={false}
                          activeDot={false}
                          legendType="none"
                          isAnimationActive={false}
                          opacity={0.5}
                        />
                      </React.Fragment>
                    ))
                  ) : (
                    <>
                      <Line
                        type="monotone"
                        dataKey={selectedFuel}
                        stroke={FUEL_COLORS[selectedFuel]}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0, fill: FUEL_COLORS[selectedFuel] }}
                      />
                      <Line
                        type="linear"
                        dataKey={`${selectedFuel}_trend`}
                        stroke={FUEL_COLORS[selectedFuel]}
                        strokeWidth={1.5}
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={false}
                        legendType="none"
                        isAnimationActive={false}
                        opacity={0.6}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Floating Refresh Button */}
        <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-50">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleRefresh}
            disabled={loading}
            className="flex flex-col items-center px-6 py-2 bg-gray-900 text-white rounded-full pointer-events-auto shadow-2xl disabled:opacity-50 transition-all"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
              <span className="text-sm font-semibold">{loading ? t('loading') : t('refresh')}</span>
            </div>
            {!loading && lastCheck && (
              <span className="text-[10px] opacity-60 font-medium">
                {t('updated')}: {new Date(lastCheck).toLocaleString('lv-LV', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
          </motion.button>
        </div>

      </main>
    </div >
  );
}

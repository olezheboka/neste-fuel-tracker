import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ErrorBar } from 'recharts';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { Calendar, RefreshCw, MapPin, ExternalLink, Info, X, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import PriceChangeCards from './InsightsPanel';
import CustomTooltip from './CustomTooltip';

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

const FUEL_COLORS = {
  'Neste Futura 95': '#22c55e', // green-500
  'Neste Futura 98': '#06b6d4', // cyan-500
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
    active: 'bg-cyan-500 text-white',
    inactive: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
    border: 'border-l-cyan-500',
    icon: 'text-cyan-500'
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

const FUEL_URL_MAP = {
  '95': 'Neste Futura 95',
  '98': 'Neste Futura 98',
  'diesel': 'Neste Futura D',
  'pro': 'Neste Pro Diesel',
  'all': 'all'
};

const FUEL_TO_URL = Object.fromEntries(
  Object.entries(FUEL_URL_MAP).map(([k, v]) => [v, k])
);

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

// Toast Notification Component - Apple Liquid Style

const Toast = ({ notification, onDismiss, t }) => {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -60, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="fixed top-4 inset-x-0 mx-auto z-[100] max-w-sm w-[calc(100%-2rem)] sm:w-[92%]"
        >
          {/* Apple liquid-style container */}
          <div
            className="rounded-[22px] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden border border-white/20"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(22, 163, 74, 0.95) 100%)'
            }}
          >
            <div className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                  {notification.hasChanges ? (
                    <TrendingUp size={16} className="text-white sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
                  ) : (
                    <Info size={16} className="text-white sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] sm:text-[15px] font-semibold text-white leading-tight">
                    {notification.title}
                  </p>
                  {notification.changes && notification.changes.length > 0 ? (
                    <div className="mt-1.5 space-y-1">
                      {notification.changes.map((change, i) => {
                        let textKey = 'notification.item_unchanged';
                        if (change.diff > 0.0001) textKey = 'notification.item_increased';
                        if (change.diff < -0.0001) textKey = 'notification.item_decreased';

                        return (
                          <div key={i} className="flex items-center gap-1.5 text-[12px] sm:text-[13px]">
                            <span className={`font-medium ${change.diff > 0.0001 ? 'text-red-200' :
                              change.diff < -0.0001 ? 'text-emerald-100' : 'text-white/80'
                              }`}>
                              {t(textKey, {
                                fuel: change.fuel,
                                diff: Math.abs(change.diff * 100).toFixed(1)
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[12px] sm:text-[13px] text-white/75 mt-0.5 leading-tight">{notification.message}</p>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={onDismiss}
                  className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X size={12} className="text-white sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-white/10">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="h-full bg-white/50"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Chart Legend Component
const ChartLegend = ({ selectedFuel, fuelColors, t }) => {
  const fuelsToDisplay = selectedFuel === 'all'
    ? Object.keys(fuelColors)
    : [selectedFuel];

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-6 pt-4 border-t border-gray-100">
      {fuelsToDisplay.map(fuel => (
        <div key={fuel} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: fuelColors[fuel] }}
          />
          <span className="text-xs font-medium text-gray-600">
            {t(fuel.replace('Neste ', ''))}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-0.5 border-t border-dashed"
          style={{
            borderColor: selectedFuel === 'all' ? '#9ca3af' : fuelColors[selectedFuel]
          }}
        />
        <span className="text-xs font-medium text-gray-500 italic">
          Trend
        </span>
      </div>
    </div>
  );
};

const FuelCard = ({ type, price, location }) => {
  const { t } = useTranslation();

  // Parse addresses from pipe-separated string
  let addressList = [];
  if (location && location.trim().length > 0) {
    addressList = location.split(/\|/).map(s => s.trim()).filter(s => s.length > 0);
  }

  // Determine accent color style based on specific fuel type
  const style = FUEL_STYLES[type] || FUEL_STYLES['Neste Futura 95'];

  const isPremium = type.includes('98') || type.includes('Pro Diesel');

  return (
    <Card className={`bg-white shadow-md border-l-4 ${style.border} relative overflow-hidden`}>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {t(type.replace('Neste ', ''))}
        </p>
        {isPremium && (
          <span className="bg-blue-100 text-blue-600 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">
            Premium
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-3xl font-bold text-gray-900 tracking-tight">
          {price.toFixed(3)}
        </span>
        <span className="text-sm text-gray-400 font-medium">€/l</span>
      </div>
      <div className="text-xs text-gray-400">
        <div className="flex items-center gap-1.5 mb-2">
          <span>{t('station', { count: addressList.length })}</span>
        </div>
        <div className="pl-3 space-y-2 mt-1">
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
                  className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors cursor-pointer leading-tight"
                >
                  <MapPin size={12} className="text-green-500 shrink-0" />
                  <span className="font-medium tracking-tight underline">{addr}</span>
                  <ExternalLink size={10} className="translate-y-[-1px]" />
                </a>
              );
            })
          ) : (
            <span className="text-gray-400 italic">{t('location')}</span>
          )}
        </div>
      </div>
    </Card>
  );
};

// Calculate trend line helper
const calculateTrendLine = (data, dataKey) => {
  if (!data || data.length < 2) return null;

  // const n = data.length; // unused
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

export default function App() {
  const { t, i18n } = useTranslation();
  const [latestPrices, setLatestPrices] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // URL and Storage Initialization - Priority: URL params > localStorage > defaults
  const [selectedFuel, setSelectedFuel] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fuelParam = params.get('fuel');
    const storedFuel = localStorage.getItem('selectedFuel');

    // URL params take priority, then localStorage, then default
    if (fuelParam && FUEL_URL_MAP[fuelParam]) {
      return FUEL_URL_MAP[fuelParam];
    }
    if (storedFuel && (storedFuel === 'all' || Object.keys(FUEL_COLORS).includes(storedFuel))) {
      return storedFuel;
    }
    return 'all';
  });

  const [graphInterval, setGraphInterval] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const periodParam = params.get('period');
    const storedPeriod = localStorage.getItem('graphInterval');

    // URL params take priority, then localStorage, then default
    if (['days', 'weeks', 'months'].includes(periodParam)) {
      return periodParam;
    }
    if (['days', 'weeks', 'months'].includes(storedPeriod)) {
      return storedPeriod;
    }
    return 'days';
  });

  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);
  const [notification, setNotification] = useState(null);
  const previousPricesRef = React.useRef([]);

  // Sync state to URL and localStorage
  useEffect(() => {
    // Create fresh params to avoid keeping deprecated parameters
    const params = new URLSearchParams();

    // Sync Language
    const currentLang = i18n.language;
    if (currentLang) {
      params.set('lang', currentLang);
      localStorage.setItem('i18nextLng', currentLang);
    }

    // Sync Period
    params.set('period', graphInterval);
    localStorage.setItem('graphInterval', graphInterval);

    // Sync Fuel (used for both chart and change cards)
    const fuelUrlKey = FUEL_TO_URL[selectedFuel] || 'all';
    params.set('fuel', fuelUrlKey);
    localStorage.setItem('selectedFuel', selectedFuel);

    const newRelativePathQuery = window.location.pathname + '?' + params.toString();
    window.history.replaceState(null, '', newRelativePathQuery);
  }, [i18n.language, graphInterval, selectedFuel]);

  // Handle Initial Language
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    const storedLang = localStorage.getItem('i18nextLng');
    const initialLang = langParam || storedLang || 'en';

    if (lngs[initialLang] && i18n.language !== initialLang) {
      i18n.changeLanguage(initialLang);
    }
  }, []);

  const fetchData = async (forceScrape = false, showNotification = false) => {
    try {
      setLoading(true);

      if (forceScrape) {
        await axios.get(`${API_BASE}/scrape`);
      }

      const latestRes = await axios.get(`${API_BASE}/prices/latest`);
      const newPrices = latestRes.data;

      // Compare prices if we have previous data and notification is requested
      if (showNotification && previousPricesRef.current.length > 0) {
        const changes = [];
        let hasAnyChange = false;

        newPrices.forEach(newPrice => {
          const oldPrice = previousPricesRef.current.find(p => p.type === newPrice.type);
          if (oldPrice) {
            const diff = newPrice.price - oldPrice.price;
            // Check if there is a significant change
            if (Math.abs(diff) >= 0.001) {
              hasAnyChange = true;
            }
            // Always add to changes array
            changes.push({
              fuel: newPrice.type.replace('Neste ', '').replace('Futura ', ''), // Clean up names further if needed, or keep as is. User asked for "95", "98".
              oldPrice: oldPrice.price,
              newPrice: newPrice.price,
              diff: diff
            });
          }
        });

        // Filter/Map names to be cleaner:
        // Current names: "Futura 95", "Futura 98", "Futura D", "Pro Diesel"
        // User wants: "95", "98", "Diesel", "Pro Diesel"
        const cleanName = (name) => {
          return name.replace('Futura D', 'Diesel').replace('Futura ', '');
        };

        const processedChanges = changes.map(c => ({
          ...c,
          fuel: cleanName(c.fuel)
        }));

        if (hasAnyChange) {
          setNotification({
            hasChanges: true,
            title: t('notification.prices_changed'),
            changes: processedChanges
          });
        } else {
          setNotification({
            hasChanges: false,
            title: t('notification.data_refreshed'),
            message: t('notification.no_changes')
          });
        }
      }

      // Store current prices for future comparison
      previousPricesRef.current = newPrices;

      setLatestPrices(newPrices);
      if (newPrices.length > 0) {
        setLastCheck(newPrices[0].timestamp);
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
    fetchData(true, true);
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh data every 15 minutes to catch automated backend updates
    const interval = setInterval(() => {
      fetchData();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);



  const petrolPrices = latestPrices.filter(p => !p.type.includes('D') && !p.type.includes('Diesel'));
  const dieselPrices = latestPrices.filter(p => p.type.includes('D') || p.type.includes('Diesel'));

  // Filter Data based on Interval and Group by Period (Day/Week/Month)
  // Calculate AVERAGE price per period instead of showing every data point
  const chartData = useMemo(() => {
    if (!historyData.length) return [];

    const now = new Date();
    let cutoff = new Date();

    if (graphInterval === 'days') cutoff.setDate(now.getDate() - (isMobile ? 14 : 30));
    if (graphInterval === 'weeks') cutoff.setDate(now.getDate() - (isMobile ? 60 : 90));
    if (graphInterval === 'months') cutoff.setMonth(now.getMonth() - (isMobile ? 6 : 12));

    // Filter by date first
    const filteredByTime = historyData.filter(d => new Date(d.timestamp) >= cutoff);

    // Helper to get period key based on interval (using Riga timezone GMT+2)
    const getPeriodKey = (timestamp) => {
      // Adjust to Riga timezone (GMT+2)
      const utcDate = new Date(timestamp);
      const rigaOffset = 2 * 60 * 60 * 1000; // +2 hours in milliseconds
      const d = new Date(utcDate.getTime() + rigaOffset);
      if (graphInterval === 'days') {
        // Group by day: YYYY-MM-DD
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else if (graphInterval === 'weeks') {
        // Group by ISO week: YYYY-WXX
        const date = new Date(d.getTime());
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
      } else if (graphInterval === 'months') {
        // Group by month: MM.YYYY.
        return `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}.`;
      }
      return timestamp; // Default fallback
    };

    // Helper to get a normalized timestamp for a period key (for consistent sorting)
    const getPeriodTimestamp = (periodKey) => {
      if (graphInterval === 'days') {
        // Parse YYYY-MM-DD
        return new Date(periodKey + 'T12:00:00').getTime();
      } else if (graphInterval === 'weeks') {
        // Parse YYYY-WXX - use Monday of that week
        const [year, weekStr] = periodKey.split('-W');
        const jan4 = new Date(parseInt(year), 0, 4);
        const weekNum = parseInt(weekStr);
        const mondayOfWeek = new Date(jan4.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
        mondayOfWeek.setDate(mondayOfWeek.getDate() - (mondayOfWeek.getDay() + 6) % 7);
        return mondayOfWeek.getTime();
      } else if (graphInterval === 'months') {
        // Parse MM.YYYY. - use middle of month for sorting/positioning
        const parts = periodKey.split('.');
        const month = parts[0];
        const year = parts[1];
        return new Date(`${year}-${month}-15T12:00:00`).getTime();
      }
      return new Date(periodKey).getTime();
    };

    // Accumulate prices by period and fuel type
    // Structure: { periodKey: { fuelType: { sum: X, count: Y }, ... } }
    const periodData = new Map();

    filteredByTime.forEach(item => {
      const periodKey = getPeriodKey(item.timestamp);

      if (!periodData.has(periodKey)) {
        periodData.set(periodKey, {});
      }

      const period = periodData.get(periodKey);

      if (!period[item.type]) {
        period[item.type] = { prices: [] };
      }

      period[item.type].prices.push({
        price: item.price,
        timestamp: item.timestamp
      });
    });

    // Convert to chart format with High-Low Range logic (Option 1)
    const result = Array.from(periodData.entries()).map(([periodKey, data]) => {
      let formattedTime = periodKey;
      if (graphInterval === 'days') {
        const [year, month, day] = periodKey.split('-');
        formattedTime = `${day}.${month}.${year}`;
      } else if (graphInterval === 'weeks') {
        const timestamp = getPeriodTimestamp(periodKey);
        const start = new Date(timestamp);
        const end = new Date(timestamp + 6 * 24 * 60 * 60 * 1000);
        const startStr = start.toLocaleDateString('lv-LV', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const endStr = end.toLocaleDateString('lv-LV', { day: '2-digit', month: '2-digit', year: 'numeric' });
        formattedTime = `${startStr} - ${endStr}`;
      }

      const entry = {
        date: getPeriodTimestamp(periodKey),
        periodKey,
        formattedTime,
      };

      // Calculate stats for each fuel type
      Object.keys(data).forEach(key => {
        // Sort by timestamp to find the true "last" price
        const sortedItems = data[key].prices.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Filter out duplicates (keep only changes) for tooltip history
        const distinctItems = sortedItems.filter((item, index, arr) => {
          if (index === 0) return true;
          return Math.abs(item.price - arr[index - 1].price) > 0.0001;
        });

        const priceValues = sortedItems.map(p => p.price); // Use ALL values for min/max to be safe

        const lastPrice = priceValues[priceValues.length - 1];
        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);

        entry[key] = lastPrice; // Main line plots LAST price
        entry[`${key}_min`] = minPrice;
        entry[`${key}_max`] = maxPrice;

        // Error range for Recharts ErrorBar: [negativeError, positiveError]
        // This draws a line from (last - (last-min)) to (last + (max-last)) => min to max
        entry[`${key}_range`] = [lastPrice - minPrice, maxPrice - lastPrice];

        entry[`${key}_history`] = distinctItems.reverse(); // Store CLEAN history for tooltip (Newest first)
      });

      return entry;
    });

    return result.sort((a, b) => a.date - b.date);
  }, [historyData, graphInterval, isMobile]);





  // Prepare data with trend lines
  const chartDataWithTrend = useMemo(() => {
    if (!chartData) return [];
    // Deep copy objects to avoid mutating memoized chartData
    let data = chartData.map(item => ({ ...item }));

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

  // No smoothing - use raw daily aggregation (High-Low)
  const chartDataFinal = chartDataWithTrend;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 pb-24">

      {/* Toast Notification */}
      <Toast
        notification={notification}
        onDismiss={() => setNotification(null)}
        t={t}
      />

      {/* Header */}
      <header className="bg-white backdrop-blur-xl sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <a
            href="/"
            className="text-2xl font-semibold text-gray-900 tracking-tight hover:text-gray-600 transition-colors cursor-pointer"
          >
            {t('app_title')}
          </a>
          <SegmentedControl
            options={Object.keys(lngs).map(lng => ({
              value: lng,
              label: <span className="flex items-center gap-1">{lngs[lng].flag} {lng.toUpperCase()}</span>
            }))}
            value={i18n.language}
            onChange={(val) => i18n.changeLanguage(val)}
            layoutId="active-lang"
            size="small"
          />
        </div>
      </header>

      {/* Disclaimer */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <p className="text-sm text-blue-700 text-center font-medium">
            {t('disclaimer')}
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">


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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {petrolPrices.map((item) => (
                <FuelCard key={item.type} {...item} />
              ))}
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('fuel_group.diesel')}</h2>
          {dieselPrices.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all ${isActive
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
                className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${selectedFuel === 'all' ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {t('all')}
              </button>
              {Object.keys(FUEL_COLORS).map(fuel => {
                const isActive = selectedFuel === fuel;
                // Reuse same neutral styling as 'all' and time periods
                return (
                  <button
                    key={fuel}
                    onClick={() => setSelectedFuel(fuel)}
                    className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${isActive ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {t(fuel.replace('Neste ', ''))}
                  </button>
                );
              })}
            </div>

            {/* Chart Warning Notice */}


            {/* Horizontal Scroll Wrapper - REVERTED */}
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartDataFinal}
                  margin={{ top: 40, right: 60, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#a3a3a3"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                    dy={8}
                    tickFormatter={(unixTime) => {
                      const d = new Date(unixTime);
                      if (graphInterval === 'hours') return d.toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' });
                      if (graphInterval === 'weeks') {
                        const start = new Date(d);
                        const end = new Date(d.getTime() + 6 * 24 * 60 * 60 * 1000);
                        const startStr = start.toLocaleDateString('lv-LV', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        const endStr = end.toLocaleDateString('lv-LV', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        return `${startStr} - ${endStr}`;
                      }
                      if (graphInterval === 'months') {
                        const d = new Date(unixTime);
                        return `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}.`;
                      }
                      return d.toLocaleDateString('lv-LV', { day: '2-digit', month: '2-digit' });
                    }}
                  />
                  <YAxis
                    stroke="#a3a3a3"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[dataMin => (dataMin - 0.02), dataMax => (dataMax + 0.10)]}
                    allowDataOverflow={true}
                    tickFormatter={(value) => `€${parseFloat(value).toFixed(2)}`}
                  />
                  <Tooltip
                    content={<CustomTooltip t={t} interval={graphInterval} />}
                    cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />

                  {selectedFuel === 'all' ? (
                    Object.keys(FUEL_COLORS).map((fuel) => {
                      const fuelShortName = t(fuel.replace('Neste ', ''));
                      return (
                        <React.Fragment key={fuel}>
                          <Line
                            type="monotone"
                            dataKey={fuel}
                            stroke={FUEL_COLORS[fuel]}
                            strokeWidth={2}
                            dot={{ r: 3, fill: FUEL_COLORS[fuel], strokeWidth: 0 }}
                            activeDot={{ r: 5, strokeWidth: 0, fill: FUEL_COLORS[fuel] }}
                          >
                            <ErrorBar
                              dataKey={`${fuel}_range`}
                              width={4}
                              strokeWidth={2}
                              stroke={FUEL_COLORS[fuel]}
                              direction="y"
                            />
                            <LabelList
                              dataKey={fuel}
                              position="top"
                              offset={8}
                              fontSize={9}
                              fill={FUEL_COLORS[fuel]}
                              content={({ x, y, value, index: pointIndex }) => {
                                if (!value) return null;
                                if (pointIndex !== chartDataFinal.length - 1) return null;

                                // Guaranteed non-overlapping stacking logic
                                const lastPoint = chartDataFinal[chartDataFinal.length - 1];
                                const activeFuels = Object.keys(FUEL_COLORS)
                                  .filter(f => lastPoint[f] !== undefined)
                                  .sort((a, b) => lastPoint[a] - lastPoint[b]); // Lowest price first

                                const myRank = activeFuels.indexOf(fuel);
                                // Start closer (-14) and stack more tightly (22px gap)
                                const yOffset = -14 - (myRank * 22);

                                const text = `€${value.toFixed(3)}`;
                                const textWidth = text.length * 6.5;
                                const pillWidth = textWidth + 12;
                                const pillHeight = 22;

                                return (
                                  <g>
                                    {/* Connector line - solid but subtle */}
                                    <path
                                      d={`M ${x} ${y} L ${x} ${y + yOffset + pillHeight / 2}`}
                                      stroke={FUEL_COLORS[fuel]}
                                      strokeWidth={1}
                                      opacity={0.4}
                                    />
                                    {/* Anchor dot */}
                                    <circle cx={x} cy={y} r={2.5} fill={FUEL_COLORS[fuel]} />

                                    <g transform={`translate(${x - pillWidth / 2}, ${y + yOffset - pillHeight / 2})`}>
                                      {/* Clean, borderless pill with shadow */}
                                      <rect
                                        width={pillWidth}
                                        height={pillHeight}
                                        rx={11}
                                        fill="white"
                                        style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.12))' }}
                                      />
                                      <text
                                        x={pillWidth / 2}
                                        y={pillHeight / 2 + 1}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fontSize={11}
                                        fontWeight="700"
                                        fill={FUEL_COLORS[fuel]}
                                      >
                                        {text}
                                      </text>
                                    </g>
                                  </g>
                                );
                              }}
                            />
                            <LabelList
                              dataKey={fuel}
                              position="right"
                              offset={5}
                              content={({ x, y, index: pointIndex }) => {
                                if (pointIndex !== chartDataFinal.length - 1) return null;
                                return (
                                  <text x={x + 8} y={y + 4} textAnchor="start" fontSize={10} fontWeight="600" fill={FUEL_COLORS[fuel]}>
                                    {fuelShortName}
                                  </text>
                                );
                              }}
                            />
                          </Line>
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
                      );
                    })
                  ) : (
                    (() => {
                      const fuelShortName = t(selectedFuel.replace('Neste ', ''));
                      return (
                        <>
                          <Line
                            type="monotone"
                            dataKey={selectedFuel}
                            stroke={FUEL_COLORS[selectedFuel]}
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: FUEL_COLORS[selectedFuel], strokeWidth: 0 }}
                            activeDot={{ r: 6, strokeWidth: 0, fill: FUEL_COLORS[selectedFuel] }}
                          >
                            <ErrorBar
                              dataKey={`${selectedFuel}_range`}
                              width={4}
                              strokeWidth={2}
                              stroke={FUEL_COLORS[selectedFuel]}
                              direction="y"
                            />
                            <LabelList
                              dataKey={selectedFuel}
                              position="top"
                              offset={10}
                              fontSize={10}
                              fill={FUEL_COLORS[selectedFuel]}
                              content={({ x, y, value, index: pointIndex }) => {
                                if (!value) return null;
                                if (pointIndex !== chartDataFinal.length - 1) return null;

                                const yOffset = -16;
                                const text = `€${value.toFixed(3)}`;
                                const textWidth = text.length * 7;
                                const pillWidth = textWidth + 14;
                                const pillHeight = 24;

                                return (
                                  <g>
                                    {/* Connector line */}
                                    <path
                                      d={`M ${x} ${y} L ${x} ${y + yOffset + pillHeight / 2}`}
                                      stroke={FUEL_COLORS[selectedFuel]}
                                      strokeWidth={1.5}
                                      opacity={0.4}
                                    />
                                    <circle cx={x} cy={y} r={3.5} fill={FUEL_COLORS[selectedFuel]} />

                                    <g transform={`translate(${x - pillWidth / 2}, ${y + yOffset - pillHeight / 2})`}>
                                      <rect
                                        width={pillWidth}
                                        height={pillHeight}
                                        rx={12}
                                        fill="white"
                                        style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))' }}
                                      />
                                      <text
                                        x={pillWidth / 2}
                                        y={pillHeight / 2 + 1}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fontSize={12}
                                        fontWeight="700"
                                        fill={FUEL_COLORS[selectedFuel]}
                                      >
                                        {text}
                                      </text>
                                    </g>
                                  </g>
                                );
                              }}
                            />
                            <LabelList
                              dataKey={selectedFuel}
                              position="right"
                              offset={5}
                              content={({ x, y, index: pointIndex }) => {
                                if (pointIndex !== chartDataFinal.length - 1) return null;
                                return (
                                  <text x={x + 8} y={y + 4} textAnchor="start" fontSize={11} fontWeight="600" fill={FUEL_COLORS[selectedFuel]}>
                                    {fuelShortName}
                                  </text>
                                );
                              }}
                            />
                          </Line>
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
                      );
                    })()
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Price Change Cards */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">{t('insights.title')}</p>
              <PriceChangeCards
                historyData={historyData}
                latestPrices={latestPrices}
                selectedFuel={selectedFuel}
              />
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

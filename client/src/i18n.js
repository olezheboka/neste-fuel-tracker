import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
    en: {
        translation: {
            app_title: "Fuel Prices",
            price: 'Price',
            latest: 'Latest',
            history: 'History',
            loading: 'Loading...',
            loading_initial: 'Loading...',
            chart_warning: 'Note: Displayed price is an average per period.',
            refresh: 'Refresh Data',
            updated: 'Updated',
            no_data: 'No data',
            valid_at: 'Valid at:',
            station_one: 'Valid at {{count}} station',
            station_other: 'Valid at {{count}} stations',
            location: 'Location:',
            fuel_type: 'Fuel Type',
            all: 'All',
            data_source: 'Fuel prices from Neste',
            disclaimer: 'Currently tracking fuel prices from Neste stations only',
            last_update: 'Last update',
            fuel_group: {
                petrol: 'Petrol',
                diesel: 'Diesel'
            },
            // Shortened names
            // Standardized names as requested
            'Futura 95': '95',
            'Futura 98': '98',
            'Futura D': 'Diesel',
            'Pro Diesel': 'Pro Diesel',

            map_title: 'Station Prices',
            show_map: 'Show Map',
            hide_map: 'Hide Map',

            insights: {
                title: "Price Insights",
                period_24h: "24 hours",
                period_7d: "7 days",
                period_30d: "30 days",
                period_3m: "90 days"
            },
            intervals: {
                hours: "Hours",
                days: "Days",
                weeks: "Weeks",
                "months": "Months",
                "years": "Years"
            },
            notification: {
                prices_changed: "Prices Updated",
                data_refreshed: "Updated",
                data_refreshed: "Updated",
                no_changes: "Prices haven't changed",
                item_increased: "{{fuel}} price increased by {{diff}}¢",
                item_decreased: "{{fuel}} price decreased by {{diff}}¢",
                item_unchanged: "{{fuel}} price has not changed"
            }
        }
    },
    lv: {
        translation: {
            app_title: "Degvielas cenas",
            price: 'Cena',
            latest: 'Jaunākie',
            history: 'Vēsture',
            loading: 'Ielādē...',
            loading_initial: 'Ielādē...',
            chart_warning: 'Piezīme: Rādītā cena ir vidējā cena par periodu.',
            refresh: 'Atjaunot datus',
            updated: 'Atjaunots',
            no_data: 'Nav datu',
            valid_at: 'Spēkā:',
            station: 'Spēkā {{count}} DUS',
            location: 'Atrašanās vieta:',
            fuel_type: 'Degvielas veids',
            all: 'Visi',
            data_source: 'Degvielas cenas no Neste',
            disclaimer: 'Tiek rādītas cenas tikai Neste stacijās.',
            last_update: 'Pēdējā atjaunošana',
            fuel_group: {
                petrol: 'Benzīns',
                diesel: 'Dīzeļdegviela'
            },
            // Shortened names
            // Standardized names as requested
            'Futura 95': '95',
            'Futura 98': '98',
            'Futura D': 'Diesel',
            'Pro Diesel': 'Pro Diesel',

            map_title: 'Staciju Cenas',
            show_map: 'Rādīt Karti',
            hide_map: 'Slēpt Karti',

            insights: {
                title: "Tirgus analīze",
                period_24h: "24 stundas",
                period_7d: "7 dienas",
                period_30d: "30 dienas",
                period_3m: "90 dienas"
            },
            intervals: {
                hours: "Stundas",
                days: "Dienas",
                weeks: "Nedēļas",
                months: "Mēneši",
                years: "Gadi"
            },
            notification: {
                prices_changed: "Cenas atjauninātas",
                data_refreshed: "Atjaunots",
                data_refreshed: "Atjaunots",
                no_changes: "Cenas nav mainījušās",
                item_increased: "{{fuel}} cena pieauga par {{diff}}¢",
                item_decreased: "{{fuel}} cena samazinājās par {{diff}}¢",
                item_unchanged: "{{fuel}} cena nav mainījusies"
            }
        }
    },
    ru: {
        translation: {
            app_title: "Цены на топливо",
            price: 'Цена',
            latest: 'Последние',
            history: 'История',
            loading: 'Загрузка...',
            loading_initial: 'Загрузка...',
            chart_warning: 'Примечание: Отображается средняя цена за период.',
            refresh: 'Обновить данные',
            updated: 'Обновлено',
            no_data: 'Нет данных',
            valid_at: 'Действует:',
            station: 'Актуально на {{count}} АЗС',
            location: 'Адрес:',
            fuel_type: 'Тип топлива',
            all: 'Все',
            data_source: 'Цены на топливо от Neste',
            disclaimer: 'Отображаются цены только на АЗС Neste',
            last_update: 'Последнее обновление',
            fuel_group: {
                petrol: 'Бензин',
                diesel: 'Дизель'
            },
            // Shortened names
            // Standardized names as requested
            'Futura 95': '95',
            'Futura 98': '98',
            'Futura D': 'Diesel',
            'Pro Diesel': 'Pro Diesel',

            map_title: 'Цены на АЗС',
            show_map: 'Показать карту',
            hide_map: 'Скрыть карту',

            insights: {
                title: "Анализ цен",
                period_24h: "24 часа",
                period_7d: "7 дней",
                period_30d: "30 дней",
                period_3m: "90 дней"
            },
            intervals: {
                hours: "Часы",
                days: "Дни",
                weeks: "Недели",
                months: "Месяцы",
                years: "Годы"
            },
            notification: {
                prices_changed: "Цены обновлены",
                data_refreshed: "Обновлено",
                data_refreshed: "Обновлено",
                no_changes: "Цены не изменились",
                item_increased: "Цена {{fuel}} выросла на {{diff}}¢",
                item_decreased: "Цена {{fuel}} снизилась на {{diff}}¢",
                item_unchanged: "Цена {{fuel}} не изменилась"
            }
        }
    }
};

// Get initial language from URL params or localStorage
const getInitialLanguage = () => {
    // Check URL params first
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    if (langParam && ['en', 'lv', 'ru'].includes(langParam)) {
        return langParam;
    }

    // Then check localStorage
    const storedLang = localStorage.getItem('i18nextLng');
    if (storedLang && ['en', 'lv', 'ru'].includes(storedLang)) {
        return storedLang;
    }

    // Default to English
    return 'en';
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: getInitialLanguage(),
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;

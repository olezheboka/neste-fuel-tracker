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
            station_one: '{{count}} station',
            station_other: '{{count}} stations',
            location: 'Location:',
            fuel_type: 'Fuel Type',
            all: 'All',
            data_source: 'Fuel prices from Neste',
            disclaimer: 'Currently displaying fuel prices only from Neste gas stations',
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
                change_24h: "Change (24h)",
                change_7d: "Change (7d)",
                change_30d: "Change (30d)",
                change_3m: "Change (3 M)"
            },
            intervals: {
                hours: "Hours",
                days: "Days",
                weeks: "Weeks",
                "months": "Months",
                "years": "Years"
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
            station_one: '{{count}} DUS',
            station_other: '{{count}} DUS',
            location: 'Atrašanās vieta:',
            fuel_type: 'Degvielas veids',
            all: 'Visi',
            data_source: 'Degvielas cenas no Neste',
            disclaimer: 'Pašlaik rādām degvielas cenas tikai no Neste degvielas uzpildes stacijām',
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
                change_24h: "Izmaiņas (24st)",
                change_7d: "Izmaiņas (7d)",
                change_30d: "Izmaiņas (30d)",
                change_3m: "Izmaiņas (3 mēn.)"
            },
            intervals: {
                hours: "Stundas",
                days: "Dienas",
                weeks: "Nedēļas",
                months: "Mēneši",
                years: "Gadi"
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
            station_one: '{{count}} АЗС',
            station_other: '{{count}} АЗС',
            location: 'Адрес:',
            fuel_type: 'Тип топлива',
            all: 'Все',
            data_source: 'Цены на топливо от Neste',
            disclaimer: 'В настоящее время отображаются цены на топливо только с АЗС Neste',
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
                change_24h: "Изменение (24ч)",
                change_7d: "Изменение (7д)",
                change_30d: "Изменение (30д)",
                change_3m: "Изменение (3 мес.)"
            },
            intervals: {
                hours: "Часы",
                days: "Дни",
                weeks: "Недели",
                months: "Месяцы",
                years: "Годы"
            }
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "en",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;

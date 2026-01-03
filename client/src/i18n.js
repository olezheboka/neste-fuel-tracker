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
            loading_initial: 'Connecting to database & fetching latest prices...',
            refresh: 'Refresh Data',
            updated: 'Updated',
            no_data: 'No data',
            valid_at: 'Valid at:',
            location: 'Location:',
            fuel_type: 'Fuel Type',
            all: 'All',
            data_source: 'Fuel prices from Neste',
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
                summary_intro: "Current market analysis for {{fuel}}:",
                summary_stable: "Prices have remained stable over the selected period.",
                summary_increase: "We observed a price increase of {{amount}}€ since {{period}}.",
                summary_decrease: "Prices have dropped by {{amount}}€ since {{period}}.",
                trend_stable: "Price is stable",
                trend_up: "Price uptrend",
                trend_down: "Price downtrend",
                change_24h: "Change (24h)",
                change_7d: "Change (7d)",
                change_30d: "Change (30d)",
                lowest_recent: "Lowest recently",
                summary_multifuel_stable: "Market is stable across all fuel types.",
                summary_multifuel_increase: "General price increase observed.",
                summary_multifuel_decrease: "Prices are trending down across the board."
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
            loading_initial: 'Savienojas ar datubāzi...',
            refresh: 'Atjaunot datus',
            updated: 'Atjaunots',
            no_data: 'Nav datu',
            valid_at: 'Spēkā:',
            location: 'Atrašanās vieta:',
            fuel_type: 'Degvielas veids',
            all: 'Visi',
            data_source: 'Degvielas cenas no Neste',
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
                summary_intro: "Tirgus analīze priekš {{fuel}}:",
                summary_stable: "Cenas izvēlētajā periodā saglabājušās stabilas.",
                summary_increase: "Novērots cenu pieaugums par {{amount}}€ kopš {{period}}.",
                summary_decrease: "Cenas kritušās par {{amount}}€ kopš {{period}}.",
                trend_stable: "Cena ir stabila",
                trend_up: "Cena aug",
                trend_down: "Cena krīt",
                change_24h: "Izmaiņas (24st)",
                change_7d: "Izmaiņas (7d)",
                change_30d: "Izmaiņas (30d)",
                lowest_recent: "Zemākā nesen",
                summary_multifuel_stable: "Tirgus ir stabils visos degvielas veidos.",
                summary_multifuel_increase: "Novērots vispārējs cenu pieaugums.",
                summary_multifuel_decrease: "Cenas kopumā samazinās."
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
            loading_initial: 'Подключение к базе данных...',
            refresh: 'Обновить данные',
            updated: 'Обновлено',
            no_data: 'Нет данных',
            valid_at: 'Действует:',
            location: 'Адрес:',
            fuel_type: 'Тип топлива',
            all: 'Все',
            data_source: 'Цены на топливо от Neste',
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
                summary_intro: "Анализ рынка для {{fuel}}:",
                summary_stable: "Цены оставались стабильными в выбранном периоде.",
                summary_increase: "Наблюдается рост цен на {{amount}}€ с {{period}}.",
                summary_decrease: "Цены снизились на {{amount}}€ с {{period}}.",
                trend_stable: "Цена стабильна",
                trend_up: "Цена растет",
                trend_down: "Цена падает",
                change_24h: "Изменение (24ч)",
                change_7d: "Изменение (7д)",
                change_30d: "Изменение (30д)",
                lowest_recent: "Минимум недавно",
                summary_multifuel_stable: "Рынок стабилен по всем видам топлива.",
                summary_multifuel_increase: "Наблюдается общий рост цен.",
                summary_multifuel_decrease: "Цены в целом снижаются."
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
        lng: "lv",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;

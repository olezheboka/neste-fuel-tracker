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
                // Unified market insight template
                market_insight: "Over the past 30 days, fuel prices in Latvia have {{trend}} by approximately {{cents30d}}¢ per liter ({{pct30d}}%). This represents a {{magnitude}} change in the local market. {{context}}",
                // Trend verbs
                trend_increased: "increased",
                trend_decreased: "decreased",
                trend_stable_verb: "remained stable",
                // Magnitude descriptions
                magnitude_significant: "significant",
                magnitude_moderate: "moderate",
                magnitude_minor: "minor",
                // Context explanations
                context_increase: "Fuel price increases in Latvia typically correlate with rising global crude oil prices, seasonal demand changes, or adjustments in excise taxes. The Latvian fuel market closely follows European wholesale prices and refinery costs.",
                context_decrease: "Lower fuel prices are often driven by decreasing global crude oil costs, reduced regional demand, or favorable exchange rates. Competition among fuel retailers in Latvia also contributes to price adjustments.",
                context_stable: "Stable fuel prices indicate balanced market conditions with steady global oil prices and consistent local demand. The Latvian fuel market is currently experiencing equilibrium between supply and consumer demand."
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
                // Unified market insight template
                market_insight: "Pēdējo 30 dienu laikā degvielas cenas Latvijā ir {{trend}} par aptuveni {{cents30d}}¢ uz litru ({{pct30d}}%). Tas ir {{magnitude}} izmaiņas vietējā tirgū. {{context}}",
                // Trend verbs
                trend_increased: "pieaugušas",
                trend_decreased: "samazinājušās",
                trend_stable_verb: "saglabājušās stabilas",
                // Magnitude descriptions
                magnitude_significant: "būtiskas",
                magnitude_moderate: "mērenas",
                magnitude_minor: "nelielas",
                // Context explanations
                context_increase: "Degvielas cenu pieaugums Latvijā parasti ir saistīts ar augošām pasaules jēlnaftas cenām, sezonālām pieprasījuma izmaiņām vai akcīzes nodokļu korekcijām. Latvijas degvielas tirgus cieši seko Eiropas vairumtirdzniecības cenām un naftas pārstrādes izmaksām.",
                context_decrease: "Zemākas degvielas cenas bieži ir saistītas ar pasaules jēlnaftas cenu kritumu, samazinātu reģionālo pieprasījumu vai labvēlīgiem valūtas kursiem. Konkurence starp degvielas mazumtirgotājiem Latvijā arī veicina cenu pielāgošanos.",
                context_stable: "Stabilas degvielas cenas norāda uz līdzsvarotiem tirgus apstākļiem ar stabilām pasaules naftas cenām un konsekventu vietējo pieprasījumu. Latvijas degvielas tirgū pašlaik valda līdzsvars starp piedāvājumu un patērētāju pieprasījumu."
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
                // Unified market insight template
                market_insight: "За последние 30 дней цены на топливо в Латвии {{trend}} примерно на {{cents30d}}¢ за литр ({{pct30d}}%). Это {{magnitude}} изменение на местном рынке. {{context}}",
                // Trend verbs
                trend_increased: "выросли",
                trend_decreased: "снизились",
                trend_stable_verb: "оставались стабильными",
                // Magnitude descriptions
                magnitude_significant: "значительное",
                magnitude_moderate: "умеренное",
                magnitude_minor: "незначительное",
                // Context explanations
                context_increase: "Рост цен на топливо в Латвии обычно связан с повышением мировых цен на сырую нефть, сезонными изменениями спроса или корректировкой акцизных налогов. Латвийский топливный рынок тесно следует за европейскими оптовыми ценами и затратами на переработку нефти.",
                context_decrease: "Снижение цен на топливо часто обусловлено падением мировых цен на нефть, уменьшением регионального спроса или благоприятными валютными курсами. Конкуренция между топливными розничными продавцами в Латвии также способствует корректировке цен.",
                context_stable: "Стабильные цены на топливо указывают на сбалансированные рыночные условия со стабильными мировыми ценами на нефть и постоянным местным спросом. На латвийском топливном рынке в настоящее время сохраняется баланс между предложением и потребительским спросом."
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

# CLAUDE.md

## Project Overview

Neste Fuel Tracker — a full-stack web app that scrapes, stores, and visualizes fuel prices from Neste gas stations in Latvia. Deployed on Vercel at https://neste-fuel-tracker.vercel.app.

## Tech Stack

- **Frontend**: React 19 + Vite, Tailwind CSS, Recharts, Framer Motion, i18next (EN/LV/RU)
- **Backend**: Express 5 (CommonJS), Cheerio scraper
- **Database**: PostgreSQL (production via Vercel Postgres), SQLite (local dev), MockDatabase fallback
- **Deployment**: Vercel (serverless functions + static build), hourly cron scrape

## Project Structure

```
client/              # React frontend (ES modules)
  src/
    App.jsx          # Main component (~1900 lines)
    InsightsPanel.jsx
    CustomTooltip.jsx
    i18n.js          # Inline translations for 3 languages
    components/ui/   # Calendar, DatePicker, Popover (Radix-based)
server/              # Express backend (CommonJS)
  index.js           # API routes, CORS, rate limiting
  db.js              # Database abstraction (Postgres/SQLite/Mock)
  scraper.js         # Cheerio-based price scraper
vercel.json          # Deployment config, routes, cron, security headers
```

## Commands

```bash
# Frontend dev
cd client && npm install && npm run dev    # Vite on port 5173

# Backend dev
cd server && npm install && node index.js  # Express on port 3000

# Frontend build
cd client && npm run build                 # Output: client/dist/

# Lint
cd client && npm run lint
```

There is no test suite.

## API Endpoints

- `GET /api/prices/latest` — current fuel prices
- `GET /api/prices/history?type=<fuel_type>` — historical data
- `GET /api/scrape` — trigger scrape (5min debounce)
- `GET /api/health` — health check

## Key Conventions

- **Module systems differ**: client uses ES modules, server uses CommonJS
- **Naming**: camelCase for variables/functions, PascalCase for React components
- **Styling**: Tailwind utility classes in JSX; clsx + tailwind-merge for conditional styles
- **Timezone**: All dates normalized to Europe/Riga
- **i18n**: Translations are inline in `client/src/i18n.js`, not separate files
- **Log prefixes**: `[Server]`, `[API]`, `[SCRAPER]`, `[DB]` in backend logs
- **No TypeScript** — project uses plain JavaScript throughout
- **Commit style**: conventional commits (`feat`, `fix`, `chore`, etc.)

## Environment Variables

Server expects `POSTGRES_URL` in `server/.env` for production database. SQLite is used as fallback for local development.

## Fuel Types

95 (Futura), 98 (Futura), Diesel (Futura D), Pro Diesel — each with distinct color coding (green, cyan, dark/black, yellow).

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n';
import { Analytics } from '@vercel/analytics/react';
import ErrorBoundary from './ErrorBoundary';
import RootCrashFallback from './RootCrashFallback';
import posthog from 'posthog-js';

if (import.meta.env.PROD) {
  posthog.init('phc_mGRzF8BAsyYJo8ckgzQuGLupg3EyfsPavWDx83Uo4bfJ', {
    api_host: 'https://eu.i.posthog.com',
    ui_host: 'https://eu.posthog.com',
    person_profiles: 'identified_only',
    session_recording: { recordCrossOriginIframes: false },
  });
}

// On landing pages, prerender.mjs stamps a static `#seo-intro` paragraph above
// `#root` (crawler-visible body copy for the pre-hydration window). App now
// renders the same copy inline under its H1 (see `pageMeta` in App.jsx), so
// drop the static one once JS takes over — otherwise it sits permanently above
// the app header as duplicate, oddly-placed text.
document.getElementById('seo-intro')?.remove();

// Likewise on the home, prerender.mjs stamps a static `#seo-faq` block below
// `#root` for non-JS crawlers (Yandex/Bing). App renders the same FAQ as a styled
// accordion once mounted, so remove the static one to avoid a duplicate.
document.getElementById('seo-faq')?.remove();

// Ultimate backstop: should a render fault ever escape the in-app boundaries,
// show a minimal recover affordance instead of a blank white page. The real fix
// lives in App (stable boundary reset keys so a transient chart throw can't
// escalate here, plus a deferred chart slice). `autoResetMs` makes even this
// last resort self-heal: any escaped fault clears after a moment instead of
// leaving a permanently dead screen requiring a manual reload.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary fallback={<RootCrashFallback />} autoResetMs={2000} name="root">
      <App />
    </ErrorBoundary>
    <Analytics />
  </React.StrictMode>,
)

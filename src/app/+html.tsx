import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Custom root HTML for the web export (`npx expo export -p web`) — replaces
 * Expo Router's default `+html.tsx` so the PWA manifest, icons, and
 * `viewport-fit=cover` can be wired in. `viewport-fit=cover` matters beyond
 * PWA installability: `react-native-safe-area-context`'s web insets read the
 * CSS `env(safe-area-inset-*)` values, which browsers only report once this
 * is set — without it, the bottom tab bar / FAB never accounted for the iOS
 * home-indicator area when the app is opened as an installed PWA.
 *
 * This file only ever runs in Node during static rendering, so no hooks and
 * no imported global CSS — see the Expo Router docs on root HTML.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* The page <title> is NOT set here — expo-router's Head (react-helmet)
            takes exclusive ownership of the <title> element on hydration and
            blanks anything set statically in this file. It's set once in
            src/app/_layout.tsx instead, which Helmet also honors during
            static export (see mixHeadComponentsWithStaticResults). */}
        <meta
          name="description"
          content="Personal life and finance management — tasks, habits, notes, and a full ledger, offline-first."
        />

        {/* Matches src/constants/theme.ts background colors so the browser
            chrome/PWA title bar never flashes the wrong color on load. */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F8F9FB" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#101828" />

        {/* Expo's own build step auto-generates /favicon.ico from app.json's
            web.favicon and injects its own <link rel="icon">, so only the
            PWA-specific links need adding here. */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* iOS "Add to Home Screen" standalone mode. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LifeOS" />
        {/* Android/Chrome standalone mode (manifest.json covers this too, but
            some Chrome versions only look at the meta tag). */}
        <meta name="mobile-web-app-capable" content="yes" />

        <ScrollViewStyleReset />

        {/* Registered after `load` so it never competes with the initial
            render for bandwidth/CPU; scoped to same-origin GET requests only
            (see public/sw.js) so it can't intercept Supabase API calls. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function () {});
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

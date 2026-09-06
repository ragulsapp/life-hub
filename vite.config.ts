import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Where the app is served from.
 *
 * The Capacitor WebView serves the bundle from the root of the APK, so the
 * Android build MUST stay at "/". GitHub Pages serves a project site under
 * /<repo>/, so the iPhone-installable PWA build needs that prefix instead —
 * set PAGES_BASE in that workflow only. Hardcoding either one breaks the
 * other, which is why this is an env var rather than a constant.
 */
const base = process.env.PAGES_BASE ?? "/";

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // We register the service worker ourselves in main.tsx, gated on
      // Capacitor.isNativePlatform() — see the comment there for why.
      injectRegister: false,
      includeAssets: ["icons/icon.svg", "icons/icon-192.png"],
      manifest: {
        name: "Life Mentor",
        short_name: "Life Mentor",
        description:
          "Your offline life coach — habits, health, money, notes and goals, all on your device.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        // Must follow `base`: on a project Pages site a start_url of "/" sends
        // the installed icon to the domain root, not the app.
        start_url: base,
        scope: base,
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // wav so the built-in tones still play offline; woff2 so the app
        // doesn't fall back to a system face when opened without a network.
        globPatterns: ["**/*.{js,css,html,svg,ico,png,wav,woff2}"],
      },
    }),
  ],
});

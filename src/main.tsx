import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { toast } from './lib/toast'

// Surface silent async failures (e.g. IndexedDB writes) instead of losing
// them in the console — audit finding M6.
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason)
  toast('Something failed to save. Check free storage space.', 'error')
})

/**
 * Service worker registration — deliberately NOT the vite-plugin-pwa default
 * (injectRegister is off in vite.config.ts; this replaces it).
 *
 * Root cause this fixes: a service worker was registering unconditionally,
 * including inside the Capacitor Android WebView. Android preserves WebView
 * storage across an app UPDATE (as opposed to uninstall) — by design, so
 * IndexedDB data survives between releases. But that same preserved storage
 * meant the OLD cached index.html and JS bundle kept being served by the OLD
 * service worker after every APK update: the native shell updated (so e.g.
 * the app name changed) while the actual web content silently never did.
 *
 * A service worker also has no job to do inside the native shell in the
 * first place — Capacitor bundles a fresh copy of every asset into each APK
 * build, so there's no offline gap for a cache to fill. It was pure
 * inherited risk with no benefit.
 *
 * On native: unregister anything a previous build left running and clear
 * every cache — this SELF-HEALS existing installs (like this one) the moment
 * this code ships, with no uninstall required. Never register a new one.
 * On the browser/PWA path: register as before, so `vite preview`/hosted use
 * still gets offline support.
 */
if ('serviceWorker' in navigator) {
  if (Capacitor.isNativePlatform()) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const r of regs) r.unregister()
    })
    caches?.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
    })
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

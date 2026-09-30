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
    // Path and scope both come from BASE_URL, never hardcoded: the bundle is
    // served from "/" inside the APK but from "/<repo>/" on GitHub Pages, and
    // a worker cannot claim a scope above its own directory. Hardcoding "/"
    // 404s on Pages, which silently costs the app its entire offline story.
    // The catch matters too — an unhandled rejection here trips the global
    // handler above and toasts a misleading "failed to save" at the user.
    const swUrl = `${import.meta.env.BASE_URL}sw.js`

    // Reload once the new worker takes over.
    //
    // Registering a worker is not the same as ever getting a new one. Without
    // this the installed PWA serves its cached bundle indefinitely: the app
    // was still showing a build from three weeks earlier, so every shipped fix
    // was invisible on the device. The generated worker calls skipWaiting, so
    // a new version activates as soon as it installs and `controllerchange`
    // fires — that is the moment the page is still running old code against a
    // new worker, and the only correct response is to reload.
    //
    // The guard matters: controllerchange can fire more than once, and without
    // it the page reloads in a loop.
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    })

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(swUrl, { scope: import.meta.env.BASE_URL })
        .then((reg) => {
          // An iOS home-screen app is suspended and resumed rather than
          // relaunched, so the browser's own update check may not run for
          // days. Ask explicitly whenever the app comes back to the
          // foreground; this is a cheap conditional request when nothing
          // changed.
          const checkForUpdate = () => {
            if (document.visibilityState === 'visible') {
              reg.update().catch(() => {
                /* offline is the normal case here, not an error */
              })
            }
          }
          document.addEventListener('visibilitychange', checkForUpdate)
          checkForUpdate()
        })
        .catch((err) => console.error('Service worker registration failed:', err))
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

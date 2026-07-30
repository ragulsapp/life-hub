import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { SystemBars, SystemBarsStyle } from "@capacitor/core";
import { db } from "../db/db";

export function useDarkMode(): [boolean, () => void] {
  const settings = useLiveQuery(() => db.appSettings.get(1));
  const darkMode = settings?.darkMode ?? true;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
    // Mirror for the pre-paint script in index.html. Written on every
    // resolution rather than only on toggle, so an Import that rewrites
    // appSettings also corrects the mirror.
    try {
      localStorage.setItem("lm-dark", darkMode ? "1" : "0");
    } catch {
      /* private mode — the app still works, just flashes on cold start */
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", darkMode ? "#0b1120" : "#f1f5f9");
    // The status bar now sits over our own header, so its icons must follow
    // OUR theme rather than Android's night setting. `Dark` means light
    // content on a dark background. No-ops off-device.
    SystemBars.setStyle({
      style: darkMode ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
    }).catch(() => {});
  }, [darkMode]);

  const toggle = () => {
    db.appSettings.update(1, { darkMode: !darkMode });
  };

  return [darkMode, toggle];
}

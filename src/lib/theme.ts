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

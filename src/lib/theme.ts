import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";

export function useDarkMode(): [boolean, () => void] {
  const settings = useLiveQuery(() => db.appSettings.get(1));
  const darkMode = settings?.darkMode ?? true;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const toggle = () => {
    db.appSettings.update(1, { darkMode: !darkMode });
  };

  return [darkMode, toggle];
}

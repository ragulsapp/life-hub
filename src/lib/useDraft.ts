import { useEffect, useRef, useState } from "react";

/**
 * A piece of form state that survives leaving the screen.
 *
 * Every view in this app is unmounted when you switch tabs — `AnimatePresence
 * mode="wait"` in App.tsx tears the old one down before mounting the next. Any
 * half-typed input held in plain `useState` is destroyed at that moment. It
 * reads as "the app deleted my note", but nothing was deleted: the text only
 * ever existed in component memory.
 *
 * Drafts go to localStorage rather than Dexie deliberately. It is synchronous,
 * so the value is already there on the first render and the field never flashes
 * empty before rehydrating; and an unfinished draft is not user data worth
 * putting in the backup file or restoring onto another device. Dexie stays the
 * store for things the user actually saved.
 *
 * Writes are debounced because this runs on every keystroke, and localStorage
 * is synchronous on the main thread.
 */
export function useDraft<T>(key: string, initial: T, debounceMs = 300) {
  const storageKey = `lm-draft:${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      // Private mode, quota, or a corrupt value from an older shape. Losing a
      // draft is bad; refusing to render the screen is worse.
      return initial;
    }
  });

  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        /* nothing useful to do — the draft just won't survive this time */
      }
    }, debounceMs);
    return () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current);
    };
  }, [storageKey, value, debounceMs]);

  /**
   * Call after a successful save. Clears the stored copy AND cancels any
   * pending debounced write — without that cancel, a write scheduled by the
   * last keystroke lands after the clear and resurrects the draft the user
   * just saved.
   */
  const clear = (reset: T) => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setValue(reset);
  };

  return [value, setValue, clear] as const;
}

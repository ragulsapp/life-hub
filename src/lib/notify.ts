import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

/**
 * Notification delivery. The standard Web Notification API is NOT reliably
 * supported inside a Capacitor Android WebView (this is exactly why Capacitor
 * ships a dedicated plugin) — using it there silently no-ops. Use the native
 * plugin whenever running as the packaged app; fall back to the Web API only
 * for browser/PWA testing (`npm run dev` / `vite preview`).
 */
export const isNative = Capacitor.isNativePlatform();

export function notificationsSupported(): boolean {
  return isNative || "Notification" in window;
}

export async function notificationPermission(): Promise<
  "granted" | "denied" | "default"
> {
  if (isNative) {
    const { display } = await LocalNotifications.checkPermissions();
    return display === "granted" ? "granted" : display === "prompt" || display === "prompt-with-rationale" ? "default" : "denied";
  }
  return "Notification" in window ? Notification.permission : "denied";
}

export async function requestNotificationPermission(): Promise<
  "granted" | "denied" | "default"
> {
  if (isNative) {
    const { display } = await LocalNotifications.requestPermissions();
    return display === "granted" ? "granted" : "denied";
  }
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/** Fire a notification right now (used by the in-app 15s reminder/alarm tick). */
export async function showLocalNotification(
  title: string,
  body: string,
): Promise<void> {
  if ((await notificationPermission()) !== "granted") return;
  try {
    if (isNative) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 2_000_000_000),
            title,
            body,
          },
        ],
      });
      return;
    }
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: "/icons/icon.svg",
        badge: "/icons/icon.svg",
        tag: "life-hub-reminder",
      });
    } else {
      new Notification(title, { body, icon: "/icons/icon.svg" });
    }
  } catch {
    /* ignore */
  }
}

/**
 * Schedule a daily-repeating native notification at HH:MM — fires from the
 * OS even if the app is fully closed. Native-only; a no-op in the browser
 * (browser/PWA testing still gets the in-app 15s poll as before).
 */
export async function scheduleDailyReminder(
  id: number,
  title: string,
  body: string,
  time: string, // "HH:MM"
): Promise<void> {
  if (!isNative) return;
  const [hour, minute] = time.split(":").map(Number);
  await LocalNotifications.cancel({ notifications: [{ id }] });
  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      },
    ],
  });
}

export async function cancelReminder(id: number): Promise<void> {
  if (!isNative) return;
  await LocalNotifications.cancel({ notifications: [{ id }] });
}

// Stable, collision-free notification ids per record type + row id.
export const habitNotifId = (habitId: number) => 100_000 + habitId;
export const taskNotifId = (taskId: number) => 200_000 + taskId;
export const noteNotifId = (noteId: number) => 300_000 + noteId;

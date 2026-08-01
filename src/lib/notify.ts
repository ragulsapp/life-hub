import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  BUILT_IN_SOUNDS,
  DEFAULT_REMINDER_SOUND,
  soundResource,
  type SoundId,
} from "../db/db";

/**
 * Notification delivery. The standard Web Notification API is NOT reliably
 * supported inside a Capacitor Android WebView (this is exactly why Capacitor
 * ships a dedicated plugin) — using it there silently no-ops. Use the native
 * plugin whenever running as the packaged app; fall back to the Web API only
 * for browser/PWA testing (`npm run dev` / `vite preview`).
 */
export const isNative = Capacitor.isNativePlatform();

/**
 * Payload carried on a scheduled notification so a tap can route to the
 * right in-app panel. Read from `ActionPerformed.notification.extra` by the
 * listener registered in App.tsx — no pub-sub router needed, App.tsx already
 * owns every "open X full-screen panel" boolean.
 */
export type NotificationExtra =
  | { kind: "night-reminder" }
  | { kind: "recurring-due"; recurringId: number };

/**
 * Channel ids are versioned because **an Android notification channel is
 * immutable once created**. Its importance and sound are fixed at creation and
 * `createChannel` on an existing id silently does nothing — so a channel that
 * was created silent can never be repaired, only replaced. Bump the suffix to
 * force fresh settings onto devices that already have the old one.
 *
 * This is exactly why reminders were silent: the plugin's own "default" channel
 * only gets a sound if one is configured as a bundled resource, which it wasn't,
 * and nothing could fix that channel after the fact.
 */
const CHANNEL_VERSION = "v2";
const channelId = (sound: SoundId) => `reminders-${sound}-${CHANNEL_VERSION}`;

let channelsReady: Promise<void> | null = null;

/**
 * Create one channel per built-in tone, at IMPORTANCE_HIGH (5) so reminders
 * make a sound and show a heads-up banner rather than landing silently in the
 * shade. Idempotent and safe to call on every launch.
 */
export function ensureChannels(): Promise<void> {
  if (!isNative) return Promise.resolve();
  if (channelsReady) return channelsReady;
  channelsReady = (async () => {
    for (const s of BUILT_IN_SOUNDS) {
      try {
        await LocalNotifications.createChannel({
          id: channelId(s.id),
          name: `Reminders (${s.label})`,
          description: "Habit, task and note reminders",
          importance: 5,
          sound: soundResource(s.id),
          vibration: true,
          visibility: 1,
        });
      } catch (err) {
        console.error("channel create failed", s.id, err);
      }
    }
  })();
  return channelsReady;
}

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

/**
 * Which tone reminders use. Read once per call rather than cached, so changing
 * it in settings takes effect on the next notification without a restart.
 */
let reminderSound: SoundId = DEFAULT_REMINDER_SOUND;

export function setReminderSound(sound: SoundId): void {
  reminderSound = sound;
}

/** Fire a notification right now (used by the in-app 15s reminder/alarm tick). */
export async function showLocalNotification(
  title: string,
  body: string,
  extra?: NotificationExtra,
): Promise<void> {
  if ((await notificationPermission()) !== "granted") return;
  try {
    if (isNative) {
      await ensureChannels();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 2_000_000_000),
            title,
            body,
            channelId: channelId(reminderSound),
            extra,
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
  extra?: NotificationExtra,
): Promise<void> {
  if (!isNative) return;
  await ensureChannels();
  const [hour, minute] = time.split(":").map(Number);
  await LocalNotifications.cancel({ notifications: [{ id }] });
  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        // Without a channel carrying a sound, this arrives silently.
        channelId: channelId(reminderSound),
        schedule: { on: { hour, minute }, allowWhileIdle: true },
        extra,
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

/** Fixed id for the singleton nightly reminder — well clear of the row-id
 *  ranges above. */
export const NIGHT_REMINDER_NOTIF_ID = 900_001;

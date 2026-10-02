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
 * What happened the last time channels were created.
 *
 * This used to be thrown away into console.error, which on a phone is nowhere
 * at all. It matters because a notification posted to a channel that does not
 * exist is **dropped by Android without a trace** — no error, no entry in the
 * shade. If channel creation fails, every reminder silently stops working and
 * nothing anywhere says so. Keeping the result lets the app answer the only
 * question that matters when a reminder does not arrive: did it ever get set
 * up, and is the OS actually holding a schedule for it.
 */
const channelResults: { id: string; ok: boolean; error?: string }[] = [];

/**
 * Create one channel per built-in tone, at IMPORTANCE_HIGH (5) so reminders
 * make a sound and show a heads-up banner rather than landing silently in the
 * shade. Idempotent and safe to call on every launch.
 */
export function ensureChannels(): Promise<void> {
  if (!isNative) return Promise.resolve();
  if (channelsReady) return channelsReady;
  channelsReady = (async () => {
    channelResults.length = 0;
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
        channelResults.push({ id: channelId(s.id), ok: true });
      } catch (err) {
        console.error("channel create failed", s.id, err);
        channelResults.push({
          id: channelId(s.id),
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
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

/**
 * Put an alarm on the OS schedule.
 *
 * Alarms had **no native schedule at all**. Habits, tasks, notes and the
 * nightly reminder each got one; alarms were left to the in-app 15-second
 * poll, which only runs while the app is open. So an alarm set for 6am did
 * nothing whatsoever unless the app happened to be in the foreground at 6am —
 * which, for an alarm, is the one situation that never applies. It was the
 * only feature in the app whose entire job required the app to be closed.
 *
 * Android schedules repeats per weekday, so a multi-day alarm becomes several
 * notifications sharing one id block. Every slot is cancelled before writing,
 * so unticking a day really removes it.
 *
 * Note what this is NOT: a notification is not the full-screen mission-locked
 * ring. If the app is open the in-app alarm still takes over. This is the
 * floor — the thing that wakes you when the app is closed — not a replacement
 * for that.
 */
export async function scheduleAlarm(alarm: {
  id: number;
  label: string;
  time: string;
  days: number[];
  enabled: boolean;
  builtInSound?: SoundId;
  soundId?: number;
}): Promise<void> {
  if (!isNative) return;
  await ensureChannels();
  await cancelAlarm(alarm.id);
  if (!alarm.enabled) return;

  const [hour, minute] = alarm.time.split(":").map(Number);
  // An uploaded clip cannot be a channel sound — a channel can only play a
  // bundled raw resource — so a custom tone falls back to the chosen built-in
  // for the OS notification. The in-app ring still uses the real clip.
  const channel = channelId(alarm.builtInSound ?? reminderSound);
  // Empty days means every day, which Android expresses as a plain daily
  // repeat rather than seven weekly ones.
  const slots =
    alarm.days.length === 0
      ? [{ slot: 7, on: { hour, minute } }]
      : alarm.days.map((d) => ({
          slot: d,
          // Capacitor weekdays are 1=Sunday..7=Saturday; ours are 0=Sunday.
          on: { weekday: d + 1, hour, minute },
        }));

  await LocalNotifications.schedule({
    notifications: slots.map(({ slot, on }) => ({
      id: alarmNotifId(alarm.id, slot),
      title: alarm.label || "Alarm",
      body: `${alarm.time} — open to dismiss`,
      channelId: channel,
      schedule: { on, allowWhileIdle: true },
    })),
  });
}

/** Clear every weekday slot an alarm might occupy. */
export async function cancelAlarm(alarmId: number): Promise<void> {
  if (!isNative) return;
  await LocalNotifications.cancel({
    notifications: Array.from({ length: 8 }, (_, slot) => ({
      id: alarmNotifId(alarmId, slot),
    })),
  });
}

export async function cancelReminder(id: number): Promise<void> {
  if (!isNative) return;
  await LocalNotifications.cancel({ notifications: [{ id }] });
}

export interface ReminderDiagnostics {
  native: boolean;
  permission: "granted" | "denied" | "default";
  channels: { id: string; ok: boolean; error?: string }[];
  /** What the OS says it is actually holding. The ground truth. */
  pending: { id: number; title: string; at: string }[];
  pendingError?: string;
}

/**
 * Report what the OS actually has, rather than what the app believes.
 *
 * A reminder that does not arrive has several possible causes that look
 * identical from the outside: permission never granted, the channel missing
 * so Android drops the post, or nothing scheduled in the first place. Every
 * one of them is silent. This reads each back so the failure can be named
 * instead of guessed at.
 */
export async function reminderDiagnostics(): Promise<ReminderDiagnostics> {
  const base = {
    native: isNative,
    permission: await notificationPermission(),
    channels: [...channelResults],
  };
  if (!isNative) return { ...base, pending: [] };

  await ensureChannels();
  try {
    const { notifications } = await LocalNotifications.getPending();
    return {
      ...base,
      channels: [...channelResults],
      pending: notifications.map((n) => {
        const on = n.schedule?.on;
        return {
          id: n.id,
          title: n.title ?? "(no title)",
          at: on
            ? `${String(on.hour ?? 0).padStart(2, "0")}:${String(
                on.minute ?? 0,
              ).padStart(2, "0")} daily`
            : "once",
        };
      }),
    };
  } catch (err) {
    return {
      ...base,
      channels: [...channelResults],
      pending: [],
      pendingError: err instanceof Error ? err.message : String(err),
    };
  }
}

// Stable, collision-free notification ids per record type + row id.
export const habitNotifId = (habitId: number) => 100_000 + habitId;
export const taskNotifId = (taskId: number) => 200_000 + taskId;
export const noteNotifId = (noteId: number) => 300_000 + noteId;
/** Alarms need one id per weekday slot (0-6, plus 7 for a plain daily repeat),
 *  so each alarm reserves a block of eight rather than a single id. */
export const alarmNotifId = (alarmId: number, slot: number) =>
  400_000 + alarmId * 8 + slot;

/** Fixed id for the singleton nightly reminder — well clear of the row-id
 *  ranges above. */
export const NIGHT_REMINDER_NOTIF_ID = 900_001;

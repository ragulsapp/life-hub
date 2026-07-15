/** Best-effort local notifications. Reliable only while the app/SW is alive. */

export function notificationsSupported(): boolean {
  return "Notification" in window;
}

export function notificationPermission(): NotificationPermission {
  return notificationsSupported() ? Notification.permission : "denied";
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export async function showLocalNotification(
  title: string,
  body: string,
): Promise<void> {
  if (notificationPermission() !== "granted") return;
  try {
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

import { requestNotificationPermission } from "./notify";
import { toast } from "./toast";

/**
 * Apply a reminder change to the OS — AFTER the user's change is saved.
 *
 * Every reminder toggle and delete used to call Android first and write to
 * the database second. When the OS call threw, the write never happened: a
 * reminder switch silently stayed off, and a note or habit could not be
 * deleted at all, with nothing on screen to say why. The permission prompt's
 * answer was also discarded, so a reminder could read "on" while Android was
 * blocking every notification the app sent.
 *
 * Callers now save first and hand the OS work to this function, which cannot
 * throw. The database is the source of truth: a schedule that fails here is
 * retried by the launch resync, and the user is told rather than left to find
 * out at the time the reminder should have gone off.
 */
export async function syncReminder(
  update: () => Promise<void>,
  { enabling }: { enabling: boolean },
): Promise<void> {
  if (enabling) {
    // Inside its own guard: the permission check can throw too (no
    // Notification API in this environment, a plugin error), and this
    // function's whole contract is that it never fails the caller's change.
    try {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        toast(
          "Notifications are off for Life Mentor, so this reminder can't appear. Turn them on in your phone's Settings → Apps.",
          "error",
        );
      }
    } catch (err) {
      console.error("notification permission check failed", err);
    }
  }
  try {
    await update();
  } catch (err) {
    console.error("reminder OS update failed", err);
    toast(
      "Saved, but your phone didn't accept the reminder. It will retry next time the app opens.",
      "error",
    );
  }
}

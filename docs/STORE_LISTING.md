# Play Store listing — draft for the owner

**Status:** draft, written 2026-11-14. Nothing here has been submitted. Every
factual claim below was checked against the code on that date; re-check before
submitting if the app has changed since.

---

## Before you can submit at all — blockers

These are not polish. Play will reject or block the app without them.

1. **Release signing.** The APK CI builds is a *debug* build, signed with
   `android/app/debug.keystore` — a key committed to a public repository. Play
   needs a release-signed **AAB** (Android App Bundle) with a private upload
   key that is never committed. Use Play App Signing; keep the upload key out of
   git (a CI secret).
2. **`USE_EXACT_ALARM` is a restricted permission.** Play only allows it for
   apps whose *core* function is an alarm clock or calendar, and asks you to
   declare it. Alarms are a core tab here, so it is defensible — but expect the
   declaration form and possible review questions. If it is refused, the
   fallback is `SCHEDULE_EXACT_ALARM` alone, which the user must grant in system
   settings.
3. **Remove the unused INTERNET permission.** Measured 2026-11-14: the app makes
   **no network requests** — no `fetch`, no XHR, no remote URLs, no analytics or
   crash SDK. INTERNET is declared only because Capacitor adds it by default. It
   contradicts the listing's core promise and a privacy-minded user will see it
   on the permission list. Capacitor serves the app from local assets, which
   does not need INTERNET — but **test the build on a phone before shipping
   that change**; it has not been tried.
4. **Privacy policy URL.** Play requires one even for an app that collects
   nothing. It can be one short page saying exactly what is below under Data
   Safety. Host it anywhere public (the GitHub Pages site works).
5. **Version.** `versionCode 1` / `versionName "1.0"` in
   `android/app/build.gradle`. Every Play upload needs a higher `versionCode`.

---

## Store text

Counted by script against Play's limits (name 30, short description 80, full 4000); the full description is 1,367 characters.

**App name** (27/30)

> Life Mentor: Habits & Money

**Short description** (71/80)

> Habits, money, alarms and health in one app. Nothing leaves your phone.

**Full description**

> One app for your day — habits, money, alarms, notes and health — that keeps
> all of it on your phone.
>
> **No account. No cloud. No ads. Nothing uploaded.**
> Your spending, your health numbers and your notes are stored only on this
> device. There is no sign-up and nothing is sent anywhere.
>
> **What it does**
> • Today: one screen that shows what to do now — habits due, tasks, and a
>   balance score across health, wealth, knowledge and productivity.
> • Habits: daily or custom schedules, streaks, reminders that arrive with the
>   app closed.
> • Money: expenses and income, budgets, monthly reports, debts, recurring
>   payments with a reminder on the due day, and a "safe to spend today" figure.
> • Alarms: with a wake-up mission (maths or memory) when you open the alarm.
> • Notes, goals, water, sleep, weight and fasting.
>
> **Your data stays yours**
> Back up everything to a single file whenever you like, and send it wherever
> you choose — Drive, email, or another phone. Restore brings back every
> habit, transaction and note exactly as it was.
>
> **Honest about alarms**
> When the app is closed, an alarm arrives as a notification. Tap it within an
> hour and the wake-up mission starts. A notification on its own can't make you
> solve the puzzle — only the open app can. If you need an alarm that forces you
> out of bed with the app closed, a dedicated alarm app will do that better.

The alarm paragraph is deliberate. It is the one place this app is weaker than
its category leader, and saying so in the listing costs fewer stars than users
finding out at 6am.

---

## Data Safety form — answers, with the evidence

Checked against the code on 2026-11-14.

| Question | Answer | Evidence |
| --- | --- | --- |
| Does the app collect user data? | **No** | No network code anywhere in `src/`; no analytics, crash or ads SDK in `package.json`. All data is in IndexedDB on the device. |
| Does the app share user data with third parties? | **No** | As above. |
| Is data encrypted in transit? | Not applicable — nothing is transmitted. | |
| Can users request deletion? | Yes — delete anything in the app, or uninstall to remove everything. | |

**The share-sheet backup.** Export writes a file and opens Android's share
sheet; the user picks where it goes. Play's definitions treat a transfer the
user initiates, expecting it to be shared, as not "sharing" by the developer —
but read the current wording in Play Console when you fill the form, because
that guidance changes.

**If payment is added** (see `PRICING_PROPOSAL.md`), Google Play Billing talks to
Google about the *purchase*. That is not life data, but it is no longer "the app
contacts nothing", and the listing and policy wording must change with it.

---

## Permissions — what each one is for

| Permission | Why |
| --- | --- |
| `POST_NOTIFICATIONS` | Habit, task, note, alarm, fasting and payment reminders. |
| `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM` | Reminders and alarms at the exact minute, with the app closed. |
| `VIBRATE` | Alarm vibration. |
| `WAKE_LOCK` | Keeps the screen on while an alarm rings. |
| `INTERNET` | **Not used — remove** (blocker 3). |

---

## Screenshots — what they must show

An empty app sells nothing (PROGRESS.md, "What would stop me buying" #4). Use a
seeded profile with a few weeks of real-looking data, and capture:

1. **Today** — the orb at a mid score, mission with some items ticked.
2. **Money overview** — a month with real spending and the breakdown donut.
3. **Habits** — a few habits with streaks.
4. **Backup** — Settings showing "Last backup: today", to make the
   no-cloud story visible rather than a worry.
5. **Alarms** — with the honest banner visible.

Not yet possible from here: these need the phone, or a seeded browser profile
captured by hand.

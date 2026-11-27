# v1 — Play Store before New Year

**Written 2026-11-27.** Owner's AutoFlow sales come first; this runs on spare time.

## What v1 is

The app as it is today: habits, money, alarms, notes, goals, health — offline,
no account. **Scope is frozen.** The "second brain" basics v1 promises already
exist: Brain dump on Today (quick capture → a note), notes with tags and
pins, and search across titles, bodies and tags. Nothing new is built for v1
unless it removes a failure below.

Deferred on purpose: AI/mic mode (v2, opt-in, paid — breaks the offline
promise otherwise), friend challenges (v3, **never with real money** —
India's 2025 online-gaming law and Play's real-money rules), meals/shopping,
iOS.

## Inversion — how v1 fails, and what stops it

Ranked by how badly each would hurt. "Owner" = needs Ragul's phone or accounts.

| # | How it fails | Guard | State |
|---|---|---|---|
| 1 | **Reminders don't arrive** → 1★ "useless habit app" | Exact-alarm status + 1-minute test in Settings; OEM battery guidance once the brand is known | ⏳ owner's phone result |
| 2 | **Miss the date** — Play needs 12 testers × 14 days for a new personal account | Closed test must start by **~Dec 5** | ⏳ owner: Play Console + testers |
| 3 | **Play rejects it** — signing, policy, Data Safety mismatch | Release signing ✅, privacy policy ✅, versionCode ✅, exact-alarm declaration (alarm tab is core), Data Safety answers in STORE_LISTING.md | ⏳ secrets script, INTERNET removal (phone test) |
| 4 | **A claim in the app is false** → trust gone, possible policy strike | Every "never leaves" line checked against what Android actually does (see Android backup below) | ✅ 2026-11-27 |
| 5 | **User loses everything** — new phone, uninstall, debug→Play move | Backup nudge; restore proven exact; Android's own phone backup left ON | ✅ / owner moves via backup→restore |
| 6 | **First minute confuses or discourages** | Founder walkthrough on a fresh install (2 bugs found + fixed) | ✅ repeat on the phone |
| 7 | **Slow or janky on a cheap phone** | Test on the owner's phone; reduced-motion already honoured | ⏳ owner |
| 8 | **Scope creep eats December** | This file. New ideas go to v2 | ✅ |

## Android backup — why it stays on

`android:allowBackup="true"` lets Android include the app's data in the
phone's own Google backup (the user's account, encrypted). We never receive
it. Turning it off would make the promise "nothing ever leaves" literally
true — but then a lost or replaced phone loses everything unless the user
exported by hand, which is the worse failure (#5). So it stays on, and the
wording says "we never receive it" instead of "it never leaves the phone".

## Owner checklist (in order)

1. Install the latest APK → Settings → Check reminder delivery → report "Exact alarms" + whether "Test in 1 minute" arrived + phone brand.
2. Run the secrets script (docs/RELEASE_SIGNING.md) and back up `~/.life-mentor-signing`.
3. Play Console account (one-time fee) → closed test → 12 testers by ~Dec 5.

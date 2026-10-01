# Life Mentor — UI/UX overhaul: plan and progress

**Last updated:** 2026-10-02
**Repo:** `ragulsapp/life-hub` · **Path:** `C:\Users\Ragulkumar\OneDrive\Desktop\claude-projects\life-hub`
**Branch:** `main` · **Tree is clean as of this file.** Last commit: `9cd56d1`

This file is the handoff. A session picking this up cold should read all of it
before touching code — especially **Working rules** and **Environment gotchas**,
which contain things that have already cost hours to rediscover.

---

## Why this work exists

The owner's verdict: *"the whole app like noob coder buileded"* and later
*"this look like new app builder built it with local tools"*. The backend was
never the problem. Five root causes were identified by reading every screen:

1. **The app was organised around its database, not the user's day.** Every tab
   was a table and every tab opened with a form to insert a row. A person
   opening the app wants to know what to do now; they were shown an empty input.
   *This was the loudest signal, and it is fixed (Phase 2).*
2. **No typographic hierarchy.** Every card wore the same `ALL-CAPS TRACKED`
   micro-label, and sizes were sixteen ad-hoc values. *Fixed (Phase 3).*
3. **Seven tabs** — past the point where people navigate by memory, and uneven
   (Alarms is one feature; Health is a domain). *Fixed (Phase 1).*
4. **Zero states were literal zeros** — `0`, `—`, `0%`, `₹0` on a fresh install.
   *Partly fixed (Phase 2 shipped `EmptyState`); the numeric grids remain.*
5. **The light theme was washed out.** Measured at 2.76:1 — below AA.
   *Fixed (Phase 3).*

---

## Phases

### ✅ Phase 1 — Navigation (commit `2dca1ed`)

Seven tabs → four: **Today · Your plan · Money · You**.

The rule the app now follows: *a tab is a PLACE you go, a segmented control
moves between views of one subject, anything you visit occasionally is a screen
you push.*

- Habits + Goals share "Your plan" — same thing at two timescales.
- Health + Notes share "You".
- Alarms is **pushed from Today**, not a tab. You set an alarm once and live
  with it for months.
- The tab owns its title and sub-nav (`src/views/TabViews.tsx`); the four folded
  views no longer declare their own `<h1>`. Exactly one heading per screen.
- Search maps its logical destination onto tab + section, so it still lands on
  an exact view (`goTo()` in `src/App.tsx`).
- `Segmented` gained `semantics` ("tabs" | "radio") — a view switcher and a form
  choice look identical and are announced very differently.

### ✅ Phase 2 — Creation moves into a sheet (commit `2273932`)

One `+` per tab, contextual: Today → quick capture; Your plan → habit or goal
(follows the section); Money → transaction; You → note on Notes, **nothing on
Health** (it logs in place, there is nothing to "add").

- `src/components/Sheet.tsx` — bottom sheet, caps at 85vh, locks the page behind
  it, takes focus, closes on Escape / backdrop / ✕ / successful save.
- Forms take an optional `onSaved` so they still work rendered inline.
- `src/components/EmptyState.tsx` — designed zero states replacing
  "No habits yet — add one above." (which stopped being true).
- Dropped "MRR (recurring income)" — SaaS jargon in a personal finance app.

### ✅ Phase 3 — Type scale and colour (commit `9cd56d1`)

- Six type roles in `@theme`: `display`, `title`, `heading`, `body`, `label`,
  `caption`. 36 ad-hoc sizes removed. Survivors: the number and eyebrow drawn
  inside the orb, tuned to the sphere.
- 39 of 42 all-caps labels gone. The two survivors are the rule: **the single
  word at the centre of a data graphic** (orb `BALANCE`, donut `SPENT`).
- Card titles → sentence case.
- **Contrast fixed at the idiom.** `text-slate-400 dark:text-slate-500` gives
  light mode the *lighter* value and dark mode the *darker* one — it failed in
  both directions. Flipped in 23 places, added in 174 more.
  Light **2.76 → 4.93**, dark **3.45 → 6.16**.
- Verified: **0 contrast failures across 208 elements in each theme**
  (disabled controls excluded — WCAG exempts them).

---

### ⬜ Phase 4 — Home becomes a product, not a dashboard  ← **DO THIS NEXT**

Today is eight stacked cards of equal weight: mission, goal, recommendation,
quote, pillars, reminders, week, achievements, plus a backup nudge. Nothing
tells you where to look.

Goal: **answer one question immediately, let the rest earn its place by
scrolling.**

Concrete steps:

1. **Decide the one thing.** "Today's mission" is the answer to *what do I do
   now*. It should sit directly under the orb, above everything else.
2. **Demote the backup nudge.** It is an amber alert banner — system-interrupt
   styling for a routine reminder — and it currently out-shouts the mission.
   Make it a quiet row, or move it to You. It should never be the loudest thing
   on a screen.
3. **The quote has no job.** Either cut it or fold it into the coach line.
4. **Collapse the middle.** "Start here" (recommendation), "Today's goal" and
   "Four pillars" are three cards saying overlapping things. Consider: goal and
   recommendation merge into the mission card's header; pillars move to You.
5. **The orb earns its space only if it encodes something.** It currently shows
   a balance score. If it stays this size, the number must be legible and
   explained; otherwise shrink it and give the room to the mission.
6. Achievements and Your week are retrospective — they belong at the bottom, or
   on You.

Files: `src/modules/dashboard/DashboardView.tsx` (the composition),
`BackupNudge.tsx`, `WeeklyReviewCard.tsx`, `PillarBar.tsx`, `TodayAgenda.tsx`.

### ⬜ Phase 5 — Density and progressive disclosure

One habit card currently holds **ten controls**: name, schedule, streak, best,
30-day rate, done-circle, pin, delete, week strip, heatmap toggle, reminder
bell, time field.

It should show **name, today's action, streak**. Everything else goes behind a
tap — expand in place, or push a habit detail screen.

Files: `src/modules/habits/HabitsView.tsx` (the `HabitRow` component),
`HabitHistoryRow.tsx`.

Same treatment, lower priority: the alarm card and the Health tab, which opens
with a "Set up your body basics" form that belongs in onboarding.

### ⬜ Phase 6 — Motion that communicates

Today motion is decorative fade-and-slide. Wanted: shared-element transitions
between list and detail, spring curves instead of linear durations, real press
states, haptics on the native build.

**Do not start Phase 6 in an unattended run** — it cannot be verified in the
browser pane (see below) and needs on-device judgement.

---

## Working rules

These come from the owner and from what has gone wrong already.

- **Prove the root cause with data before changing anything.** Measure; do not
  infer from a screenshot. Several "obvious" findings this week were
  measurement bugs, and one real bug (nav buttons at 39px) was invisible by eye.
- **One change at a time**, each verified, each its own commit.
- **Fix the cause, not the instance.** Every bug reported so far existed in
  3–8 places because a shared primitive was missing. Before writing a control,
  check `src/components/` — `Icons`, `IconButton`, `Chip`, `Sheet`,
  `EmptyState`, `DateTimeField`, `Button`, `inputStyles`, `Card`.
- **Report honestly.** If something is unverified, say so.
- Commit messages explain *why*, and state what was measured.
- End commit messages with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

### Definition of done for a phase

1. `npx tsc --noEmit -p tsconfig.app.json` clean
2. `npm run build` succeeds
3. `npx vitest run` — **258/258 passing** (current baseline)
4. Verified in the browser pane at **375px and 320px**: no interactive element
   under 44px, no horizontal overflow, 0 contrast failures in both themes
5. No `TEMP-VERIFY` left anywhere: `grep -rn 'TEMP-VERIFY' src` → empty
6. Commit and push

---

## Environment gotchas (hard-won — read before verifying)

**The browser pane has no `requestAnimationFrame` compositing.** All Framer
Motion is frozen. `AnimatePresence mode="wait"` in `App.tsx` never completes its
exit, so **clicking a bottom-nav tab changes state but never swaps the view.**

Workaround — the cheap one, one rebuild for all tabs:

1. `cp src/App.tsx <scratchpad>/App.bak`
2. Replace the whole `<AnimatePresence mode="wait">…</AnimatePresence>` block
   with its inner children, marked `{/* TEMP-VERIFY */}`, and change the
   framer-motion import to `import { motion } from "framer-motion";`
3. `npm run build`, verify all four tabs by clicking nav via JS
4. Restore from the backup copy and `grep -rn 'TEMP-VERIFY' src` before
   committing

**The service worker serves a stale bundle after a rebuild.** Before every
verification reload:

```js
for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
for (const k of await caches.keys()) await caches.delete(k);
location.replace('/?v=' + Date.now());
```

**`window.innerWidth` is 0 while the pane is hidden**, which makes every width
measurement meaningless (heights stay valid). Call `resize_window` first.

**Tailwind v4 emits `oklab()` / `oklch()` colours.** Reading those numbers as
RGB reports dark text on white as 1.26:1. Any contrast sampler must resolve
colours through a canvas — paint over `#fff` and over `#000`, then solve for
alpha. There is a working implementation in the session transcript; rebuild it
rather than trusting a naive `match(/[\d.]+/g)`.

**Theme switching:** drive the app's own setting (`appSettings.darkMode` in
IndexedDB) and reload. Toggling `.dark` on `<html>` by hand gets reverted by
`useDarkMode`, and reading styles before the effect settles gives wrong answers.

**`backdrop-filter`:** write ONLY the standard property. Adding the `-webkit-`
twin makes Lightning CSS drop the standard one, and Chrome has removed the
alias — every frosted surface silently renders unblurred.

**Dark variant is class-based:** `@custom-variant dark (&:where(.dark, .dark *))`.

**Preview:** `preview_start {name: "life-hub-preview"}` (port 4173, serves
`dist`, so **rebuild before reloading**).

---

## What is NOT in scope

- **Emoji in stored data stay.** Habit icons the user picks and achievement
  badges in `achievementRules.ts` are data, not chrome. Changing them is a Dexie
  migration, not a style edit.
- **No auth, no payments, no multi-user.** The app is single-user and fully
  offline, and its core promise is that life data never leaves the device. Do
  not add any network call.
- The AI assistant plan is a separate track, blocked on the owner's decision
  (own API key vs proxy).

---

## Open item for the owner

**The iPhone still needs one forced update.** The install predates the
update-delivery fix and cannot pull itself forward: delete the home-screen icon
and re-add from Safari once. After that updates arrive on their own. Until then,
everything above is browser-verified only — not confirmed on device.

PWA: https://ragulsapp.github.io/life-hub/ (deploys from `main` via
`.github/workflows/pages.yml`).

---

## If you are an unattended scheduled run

Do **Phase 4** only. Then stop and write your results back into this file.

- Work in small commits, pushing each.
- Meet the full definition of done above before each commit.
- Do **not** start Phase 6.
- Do **not** touch the database schema, the alarm scheduler, or anything under
  `src/lib/` that handles notifications — those are load-bearing and were fixed
  recently.
- If a judgement call is genuinely ambiguous (e.g. whether to cut the quote),
  pick the option that removes the most without losing information, note the
  choice in this file, and move on. Do not block.

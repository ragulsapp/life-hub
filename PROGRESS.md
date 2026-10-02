# Life Mentor — UI/UX overhaul: plan and progress

**Last updated:** 2026-10-02
**Repo:** `ragulsapp/life-hub` · **Path:** `C:\Users\Ragulkumar\OneDrive\Desktop\claude-projects\life-hub`
**Branch:** `main` · **Tree is clean as of this file.** Last commit: `e1c2795` + Phase 5

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
- ~~Alarms is pushed from Today, not a tab.~~ **Reversed on 2026-10-02
  (`e21063f`) by the owner's call, and he was right.** The reasoning was correct
  about frequency and wrong about importance: the wake-up mission is the most
  distinctive thing the app does, and burying it made the headline feature the
  hardest thing to reach. **Five tabs now: Today / Your plan / Money / Alarms /
  You.** Alarms also picked up the Phase 2 treatment it missed — form behind
  `+`, real `EmptyState`.
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

### ✅ Phase 4 — Home becomes a product (commit `e1c2795`)

Today was fourteen blocks of equal weight. It is now seven, with a hierarchy:
**orb → mission → money → schedule → analysis.**

What changed, and why:

- **Three cards became one.** "Today's goal" (the outcome you chose), "Start
  here" (the outcome we suggest) and "Today's mission" (the checklist) were
  three boxes holding three halves of one thought. Goal is now a line at the
  top of the mission card, the recommendation a line at the bottom, and it is
  hidden once the mission is complete.
- **The pinned-habit tiles are gone.** They showed the *same habits* already
  listed in Today's mission a few hundred pixels above — two controls for one
  action on one screen. Pinning now means "first in today's mission", which
  keeps the feature meaningful; its labels were updated to say so.
- **The quote is cut.** It had no job, and the coach line under the orb already
  speaks for the app.
- **The backup nudge is demoted and quietened.** Amber-alert styling made a
  routine reminder the loudest thing on the home screen. It stays visible —
  it is a real risk with no cloud — but as a quiet row near the bottom. Alert
  colour is now reserved for things that are actually wrong.
- **The orb is viewport-relative:** `min(280px, 30vh)`.

**The measurement that forced the orb change.** On a 375×667 phone (iPhone SE,
still common) the fixed 280px orb took **42%** of the screen and **zero** mission
rows were visible above the nav — you had to scroll to see a single thing you
were meant to do. Now 30% and **2 rows + the goal line** are visible. On 375×812
it went 280→244px with **4 rows** visible. The canvas still renders at 280 and is
downsampled, so it is slightly sharper, not blurrier.

Verified: 0 contrast failures and nothing under 44px in **both themes** at 375px,
no horizontal overflow, 258/258 tests.

**Deviation from the original plan, recorded deliberately:** the plan said move
"Four pillars" to You. It stayed on Today, demoted below the schedule instead.
Tapping a pillar focuses the orb, and that coupling is what makes it worth
tapping — detached from the orb it is just four numbers.

**Not done, deliberately:** "Brain dump" overlaps the `+` quick-capture Note.
Consolidating them is right but it would move a textarea into a sheet, and the
draft-persistence that fixed the owner's reported "notes auto-delete" bug lives
on that textarea. Worth doing in Phase 5 with care, not as a drive-by.

### ✅ Phase 5 — Density and progressive disclosure

The habit card carried **nine controls and four statistics**: schedule, streak,
best, 30-day rate, a done circle, pin, delete, a seven-day strip, a heatmap
toggle, a reminder toggle and a time field. Four habits made a wall of chrome
with no way to see the list.

Collapsed it now shows **icon, name, streak, and the done circle** — on any
given morning the only questions are "which habit" and "did I do it".
Everything else is one tap away.

- **86px collapsed, 316px expanded** — 3.7x less per habit, nothing removed.
  With two habits the whole screen now carries 6 controls instead of ~20.
- **A real duplication is gone**: tapping the habit name toggled done *exactly
  as the circle beside it did*. The row body opens the card now and the circle
  marks it done, which is what gave the disclosure somewhere to live.
- **Delete moved inside.** It used to sit one thumb-width from the done circle
  you tap every morning.
- Pin reads as what it now does ("Show first today" / "First in today's
  mission") rather than the old "Pin to Dashboard", which stopped being true in
  Phase 4.

Verified at 375px in both themes: 0 contrast failures, nothing under 44px, no
horizontal overflow, 258/258 tests.

**Still open for a later pass** (unchanged from Phase 4): "Brain dump" on Today
overlaps the `+` quick-capture Note. Consolidating is right, but the draft
persistence on that textarea is what fixed the reported "notes auto-delete"
bug, so it must be done with a test that switches tabs and confirms the text
survives — not as a drive-by.

Same treatment is still worth applying to the alarm card and to Health, which
opens with a "Set up your body basics" form that belongs in onboarding.

### ⬜ Phase 6 — Motion that communicates  ← **NEXT, but not for an unattended run**

Today motion is decorative fade-and-slide. Wanted: shared-element transitions
between list and detail, spring curves instead of linear durations, real press
states, haptics on the native build.

**Do not start Phase 6 in an unattended run** — it cannot be verified in the
browser pane (see below) and needs on-device judgement.

---

## The ₹99 question — would a buyer pay for this?

Researched 2026-10-02. Treat figures as approximate and worth re-checking.

### Honest answer first

**At ₹99 the price is not the problem. The shape is.** Paid-up-front is close
to unsellable on Play Store India — the region runs on freemium volume, and the
PPP-adjusted price for this market sits 40–60% below a US rate. A ₹99 paywall
in front of install blocks the one thing a new app needs most: installs.

**Free to install, ₹99 one-time to unlock, no subscription, no ads.** That keeps
the honest story and removes the barrier.

### What the market actually looks like

| Who | Model | Why they win |
| --- | --- | --- |
| **Alarmy** | Free + ads; ~$59.99/yr | 120M downloads, 8M MAU, 13 years, 9 dismiss missions. Owns "it WILL wake you". |
| **Loop Habit Tracker** | Completely free, open source, no ads, no account | The best free Android habit tracker. Also the strongest privacy story in the category. |
| **HabitNow** | Freemium; **backup is behind premium** | Most Play ratings of any dedicated habit tracker. Has widgets. |
| **Daylio** | Freemium, ads on Android | 462k+ reviews. Mood journal; habits fall out of activity tags. |

### The uncomfortable part

**Every single module here is weaker than its category leader.** Loop is better
at habits. Alarmy is better at alarms. A dedicated expense app is better at
money. Google Keep is better at notes. Nobody buys the fourth-best habit
tracker.

So the product cannot be sold as "habits + money + alarms". It has to be sold as
something none of them are.

### The three things that are genuinely ours

1. **One app, no account, no cloud, no ads.** Loop has this for habits alone.
   Nobody has it across money + health + habits + alarms. And "my spending never
   leaves this phone" carries far more weight than "my habit ticks never leave
   this phone". This is already true of the architecture — it is a claim we can
   make without building anything.
2. **Cross-domain, which nobody does.** Wake-up → today's mission → habits →
   money → health feeding one balance number and one daily recommendation. The
   correlation lines in `WeeklyReviewCard` ("based on N days of your own logs")
   are the seed of the only feature here that a competitor structurally cannot
   copy without becoming an all-in-one app themselves.
3. **Pay once, against Alarmy's ~₹5,000/yr.** A clean, honest story in a market
   tired of subscriptions.

**The bet, stated plainly:** that one coherent app beats four good separate ones
for someone who wants a single place. That is a real bet, not a certainty, and
it only pays if the integration produces insight the user could not get by
installing four free apps.

### What would stop me buying — in priority order

1. **No widgets.** Habit and money apps live on the home screen. HabitNow has
   them; we do not. Biggest functional gap.
2. **"What if I lose my phone?"** Offline with no cloud makes backup the
   number-one objection, and it gets sharper the more finance history is in
   there. Export exists but is a manual nudge. Needs: automatic scheduled local
   backup, an obvious restore path, and a user-initiated export to their own
   Drive. *(Note the competitive irony: HabitNow puts backup behind premium. Ours
   being free and local is a selling point, if it is visible.)*
3. **No way to try it** before paying.
4. **Store screenshots of an empty app.** They must show populated, real-looking
   data.
5. **Alarm reliability.** Alarmy's entire brand is that it will get you up. Our
   wake-up *mission* needs the app running. Say so plainly in the listing —
   under-promise here rather than earn one-star reviews.
6. **Looks like a side project.** This is what phases 1–5 address, and it is
   the precondition for all of the above mattering.

### Phase 7 — ship-readiness (after Phase 5; not for an unattended run)

Derived engineering work, roughly in order of impact:

1. **Home-screen widgets** — today's mission, habit ticks, safe-to-spend.
2. **Backup that reassures** — automatic local backup on a schedule, a visible
   "last backed up" state, one-tap restore, user-initiated export to their own
   Drive. No server, ever.
3. **Free / paid split** — decide the line. A defensible one: everything core
   free; ₹99 unlocks the cross-domain layer (weekly review, correlations,
   balance history, reports) — i.e. charge for the thing nobody else has, not
   for basic functionality.
4. **Store listing** — screenshots with real data; lead with "no account, no
   cloud, no ads, pay once"; Play Data Safety form filled honestly (it is a
   genuine advantage here).
5. **Honest alarm copy** — state the mission's limitation rather than hide it.
6. **Import** from Loop / HabitNow so switching is not a cold start.

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

**There is nothing left here that is safe to do unattended.** Phases 1-5 are
shipped. Phase 6 (motion) cannot be verified in the browser pane — Framer
Motion is frozen there — and needs on-device judgement. Phase 7
(widgets, backup, pricing, store listing) is product work for the owner.

If you were scheduled anyway: do not invent work. Read this file, confirm the
tree is clean and `npx vitest run` still passes 258/258, report that, and stop.

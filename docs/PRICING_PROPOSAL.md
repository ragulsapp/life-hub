# Free vs ₹99 — a proposal for the owner to decide

**Status:** proposal, written 2026-11-14. Nothing here is built. This is a
product decision, not an engineering one — the reasoning is laid out so it can
be argued with.

Builds on the market read in `PROGRESS.md` ("The ₹99 question"), which is the
evidence for most of what follows.

---

## The recommendation in one line

**Free to install. Everything that keeps your data safe and your day running is
free. ₹99, once, unlocks the layer that connects the domains — the part no
competitor has.**

---

## Why this shape

From the market read:

- **Paid up front is close to unsellable on Play India.** A ₹99 wall before
  install blocks the one thing a new app needs most: installs.
- **Every single module is weaker than its category leader.** Loop is better at
  habits, Alarmy at alarms. Charging for "habits" means charging for the
  fourth-best habit tracker.
- **What only this app has** is that habits, money, sleep and health live in one
  place, so it can notice things across them. That is what's worth paying for —
  and it is the thing a separate habit app *structurally cannot* copy.

So the line falls between **the modules** (free — they have to compete with free
apps) and **what the modules produce together** (paid — nobody else can offer
it).

---

## Where the line falls

### Free, always

| Feature | Why it must be free |
| --- | --- |
| Habits, tasks, notes, goals | The core loop. Competitors (Loop) give these away. |
| Money: transactions, budgets, debts, recurring | Same. |
| Alarms, reminders, fasting | Same. |
| Today screen, the orb, the four pillars | The first impression; it is how someone tries the app before paying. |
| **Backup and restore** | Non-negotiable. With no cloud, backup is the only thing between the user and losing everything. Putting safety behind a paywall is wrong on its own terms — and HabitNow does exactly that, which makes ours being free a selling point. |

### ₹99, once

| Feature | What exists today |
| --- | --- |
| **Weekly review** — one strength, one challenge, one action | Built: `WeeklyReviewCard`, `weeklyReview()` in `src/lib/insights.ts`. |
| **Patterns across domains** — e.g. habits and sleep | Built, early: `findCorrelations()`, guarded by `MIN_SAMPLE_DAYS = 5` so it never claims a pattern from a few days. |
| *Long-range history?* — undecided, see decision 2 below; my lean is **free** | Partly built: 12-month spending history and Reports exist. |

**Honest gap:** the paid layer is thin today. The correlation engine is the seed
of the only feature a competitor cannot copy, but it is not yet strong enough to
be the reason someone pays. **Building it out is the real work** before a price
means anything — a paywall in front of a weak feature earns refunds, not revenue.

---

## What it would take to build

- **Google Play Billing** — a one-time in-app product, not a subscription.
  Purchases are cached by Play, so after the first check the unlock works
  offline.
- **This changes the privacy story, and it must be said.** Billing talks to
  Google about the purchase. That is not life data — no habit, transaction or
  note goes anywhere — but "the app contacts nothing" stops being literally true.
  The listing and privacy policy have to say "your data never leaves your phone;
  purchases go through Google Play", not imply zero network traffic.
- **The unlock must never gate data.** Someone who stops paying, or whose
  purchase cannot be verified offline, must never lose access to what they
  logged — only to the insight layer.
- **Refunds.** Play's standard window applies; nothing to build, but the unlock
  should simply lock again if a purchase is refunded.

---

## Decisions only you can make

1. Is ₹99 right, or is the honest move to stay fully free until the insight
   layer is strong enough to charge for?
2. Is long-range history paid, or does charging for "see your own past data"
   feel like holding the user's data hostage? (My lean: keep it free; charge
   only for what the app *computes*, never for what the user *entered*.)
3. When does the correlation engine count as good enough to sell?

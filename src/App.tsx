import { useEffect, useState } from "react";
import type { SVGProps } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { LocalNotifications } from "@capacitor/local-notifications";
import { db, ensureSeeded } from "./db/db";
import { OnboardingWizard } from "./modules/onboarding/OnboardingWizard";
import { useDarkMode } from "./lib/theme";
import { SchedulerProvider } from "./lib/scheduler";
import { installAudioUnlock } from "./lib/alarmSound";
import { isNative, type NotificationExtra } from "./lib/notify";
import { localDateStr } from "./lib/dates";
import { Toaster } from "./components/Toaster";
import { SettingsPanel } from "./modules/settings/SettingsPanel";
import { PlanTomorrowPanel } from "./modules/alarms/PlanTomorrowPanel";
import { ConfirmRecurringSheet } from "./modules/finance/ConfirmRecurringSheet";
import { MorningBrief } from "./modules/dashboard/MorningBrief";
import { SearchPanel } from "./modules/search/SearchPanel";
import { SettingsUiContext } from "./lib/settingsUi";
import {
  HomeIcon,
  HabitsIcon,
  FinanceIcon,
  YouIcon,
} from "./components/NavIcons";
import { FinanceView } from "./modules/finance/FinanceView";
import { AlarmOverlay } from "./modules/alarms/AlarmOverlay";
import {
  AlarmsScreen,
  PlanView,
  TodayView,
  YouView,
  type HabitsSection,
  type YouSection,
} from "./views/TabViews";

type Tab = "today" | "habits" | "money" | "you";

const TABS: {
  id: Tab;
  label: string;
  Icon: (props: SVGProps<SVGSVGElement> & { active?: boolean }) => React.ReactElement;
}[] = [
  { id: "today", label: "Today", Icon: HomeIcon },
  { id: "habits", label: "Your plan", Icon: HabitsIcon },
  { id: "money", label: "Money", Icon: FinanceIcon },
  { id: "you", label: "You", Icon: YouIcon },
];

function App() {
  const [tab, setTab] = useState<Tab>("today");
  // Sub-sections live here rather than inside each tab so that search can
  // land on an exact view, not just the tab that contains it.
  const [habitsSection, setHabitsSection] = useState<HabitsSection>("habits");
  const [youSection, setYouSection] = useState<YouSection>("health");
  const [alarmsOpen, setAlarmsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [planTomorrowOpen, setPlanTomorrowOpen] = useState(false);
  const [confirmRecurringId, setConfirmRecurringId] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  useDarkMode(); // applies the .dark class to <html> as a side effect
  const settings = useLiveQuery(() => db.appSettings.get(1));

  useEffect(() => {
    ensureSeeded();
    // Ask the browser never to evict IndexedDB under storage pressure (H2).
    navigator.storage?.persist?.().catch(() => {});
    // First user gesture unlocks audio so scheduled alarms can ring (H1).
    installAudioUnlock();
  }, []);

  // Routes a notification tap to the right in-app panel. Registered
  // unconditionally on every launch (not gated behind onboarding/settings
  // loading below) — Capacitor retains a tap that happened before a listener
  // was attached and replays it once one is, so a cold launch by tap is not
  // a race regardless of exactly when this effect runs.
  useEffect(() => {
    if (!isNative) return;
    const handle = LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (event) => {
        const extra = event.notification.extra as NotificationExtra | undefined;
        if (extra?.kind === "night-reminder") setPlanTomorrowOpen(true);
        else if (extra?.kind === "recurring-due")
          setConfirmRecurringId(extra.recurringId);
      },
    );
    return () => {
      handle.then((h) => h.remove());
    };
  }, []);

  /** Search returns a logical destination; this maps it onto tab + section. */
  const goTo = (dest: "notes" | "goals" | "habits" | "finance") => {
    if (dest === "finance") return setTab("money");
    if (dest === "notes") {
      setYouSection("notes");
      return setTab("you");
    }
    setHabitsSection(dest === "goals" ? "goals" : "habits");
    setTab("habits");
  };

  // Wait for settings to load before deciding — otherwise the wizard flashes
  // on every launch for existing users.
  if (settings === undefined) return null;
  if (!settings?.onboardingComplete) return <OnboardingWizard />;

  // Re-derives from `settings` on every render, so writing today's date in
  // MorningBrief's own dismiss handler is enough to close it reactively —
  // no separate boolean state needed here.
  const showMorningBrief = settings.morningBriefShownDate !== localDateStr();

  return (
    <SchedulerProvider>
      <SettingsUiContext.Provider
        value={{ open: () => setSettingsOpen(true), openSearch: () => setSearchOpen(true) }}
      >
      <div className="mx-auto flex min-h-svh max-w-md flex-col">
        {/* Keeps `top-0`: offsetting by the inset would break the sticky
            scrollport and stop the glass blur bleeding under the status bar,
            which is the effect we want. The inset is padding, not offset. */}
        <header
          className="glass sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 pb-3 dark:border-slate-700/50 dark:bg-slate-900/70"
          style={{ paddingTop: "calc(var(--sat) + 0.75rem)" }}
        >
          {/* Deliberately a pure wordmark. The controls that used to live
              here were 24-32px tall — under Android's 48dp minimum — and sat
              under the status bar. They now live in Settings, reachable from
              the Dashboard, which fixes reachability structurally rather than
              relying on the inset being reported correctly. */}
          <span className="bg-gradient-to-r from-cyan-500 to-violet-500 bg-clip-text font-extrabold tracking-tight text-transparent">
            Life Mentor
          </span>
        </header>

        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: "calc(var(--sab) + 4.5rem)" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {tab === "today" && (
                <TodayView onOpenAlarms={() => setAlarmsOpen(true)} />
              )}
              {tab === "habits" && (
                <PlanView
                  section={habitsSection}
                  onSection={setHabitsSection}
                />
              )}
              {tab === "money" && <FinanceView />}
              {tab === "you" && (
                <YouView section={youSection} onSection={setYouSection} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Floating pill rather than a full-width bar — it reads as an object
            on top of the page instead of chrome bolted to the bottom.
            z-20: this had no z-index at all while the header had z-10, a
            latent paint-order bug. The inset keeps it off the gesture bar;
            it is margin here, not padding, because the pill's own rounded
            edge has to sit above the bar rather than extend under it.

            Labels are dropped: seven of them at ~46px each forced 10px text
            that was unreadable anyway, and the icon plus the active glow-dot
            already say where you are. */}
        <nav
          className="glass fixed bottom-0 left-1/2 z-20 flex max-w-md -translate-x-1/2 items-center justify-around rounded-full border border-slate-200/70 bg-white/85 px-2 py-1.5 shadow-e3 dark:border-white/10 dark:bg-slate-800/80 dark:shadow-e3-dark"
          style={{
            marginBottom: "calc(var(--sab) + 0.75rem)",
            // Four 44px targets need 176px, so the pill can float clear of
            // the screen edge again. It could not when there were seven:
            // those needed 308px, more than this inset leaves at 320px wide,
            // and because the buttons are flex children they silently shrank
            // to 39px rather than overflowing. flex-shrink-0 below makes that
            // failure impossible whatever the count.
            width: "calc(100% - 2.25rem)",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-label={t.label}
              aria-current={tab === t.id ? "page" : undefined}
              // h-11 is not decoration: dropping the labels shrank the hit
              // area to 30px, under Android's 48dp minimum. The icon stays
              // 22px; the button around it carries the target.
              className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
            >
              <t.Icon
                active={tab === t.id}
                className={`h-[22px] w-[22px] transition-colors ${
                  tab === t.id
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              />
              {tab === t.id && (
                <motion.span
                  layoutId="nav-dot"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute bottom-1.5 h-1 w-1 rounded-full bg-cyan-500 shadow-[0_0_9px_var(--color-cyan-500)] dark:bg-cyan-300 dark:shadow-[0_0_9px_var(--color-cyan-300)]"
                />
              )}
            </button>
          ))}
        </nav>

        {alarmsOpen && <AlarmsScreen onClose={() => setAlarmsOpen(false)} />}
        <AlarmOverlay />
        <Toaster />
        {settingsOpen && (
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        )}
        {planTomorrowOpen && (
          <PlanTomorrowPanel onClose={() => setPlanTomorrowOpen(false)} />
        )}
        {confirmRecurringId !== null && (
          <ConfirmRecurringSheet
            recurringId={confirmRecurringId}
            onClose={() => setConfirmRecurringId(null)}
          />
        )}
        {showMorningBrief && <MorningBrief onDismiss={() => {}} />}
        {searchOpen && (
          <SearchPanel
            onClose={() => setSearchOpen(false)}
            onNavigate={goTo}
          />
        )}
      </div>
      </SettingsUiContext.Provider>
    </SchedulerProvider>
  );
}

export default App;

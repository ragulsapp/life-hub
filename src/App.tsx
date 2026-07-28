import { useEffect, useState } from "react";
import type { SVGProps } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db, ensureSeeded } from "./db/db";
import { OnboardingWizard } from "./modules/onboarding/OnboardingWizard";
import { useDarkMode } from "./lib/theme";
import { SchedulerProvider } from "./lib/scheduler";
import { installAudioUnlock } from "./lib/alarmSound";
import { DarkModeToggle } from "./components/DarkModeToggle";
import { BackupBar } from "./components/BackupBar";
import { Toaster } from "./components/Toaster";
import {
  HomeIcon,
  HabitsIcon,
  HealthIcon,
  FinanceIcon,
  NotesIcon,
  GoalsIcon,
  AlarmIcon,
} from "./components/NavIcons";
import { DashboardView } from "./modules/dashboard/DashboardView";
import { HabitsView } from "./modules/habits/HabitsView";
import { HealthView } from "./modules/health/HealthView";
import { FinanceView } from "./modules/finance/FinanceView";
import { NotesView } from "./modules/notes/NotesView";
import { GoalsView } from "./modules/goals/GoalsView";
import { AlarmsView } from "./modules/alarms/AlarmsView";
import { AlarmOverlay } from "./modules/alarms/AlarmOverlay";

type Tab =
  | "dashboard"
  | "habits"
  | "health"
  | "finance"
  | "notes"
  | "goals"
  | "alarms";

const TABS: {
  id: Tab;
  label: string;
  Icon: (props: SVGProps<SVGSVGElement> & { active?: boolean }) => React.ReactElement;
}[] = [
  { id: "dashboard", label: "Home", Icon: HomeIcon },
  { id: "habits", label: "Habits", Icon: HabitsIcon },
  { id: "health", label: "Health", Icon: HealthIcon },
  { id: "finance", label: "Finance", Icon: FinanceIcon },
  { id: "notes", label: "Notes", Icon: NotesIcon },
  { id: "goals", label: "Goals", Icon: GoalsIcon },
  { id: "alarms", label: "Alarms", Icon: AlarmIcon },
];

const VIEWS: Record<Tab, () => React.ReactElement> = {
  dashboard: DashboardView,
  habits: HabitsView,
  health: HealthView,
  finance: FinanceView,
  notes: NotesView,
  goals: GoalsView,
  alarms: AlarmsView,
};

function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  useDarkMode(); // applies the .dark class to <html> as a side effect
  const settings = useLiveQuery(() => db.appSettings.get(1));

  useEffect(() => {
    ensureSeeded();
    // Ask the browser never to evict IndexedDB under storage pressure (H2).
    navigator.storage?.persist?.().catch(() => {});
    // First user gesture unlocks audio so scheduled alarms can ring (H1).
    installAudioUnlock();
  }, []);

  const ActiveView = VIEWS[tab];

  // Wait for settings to load before deciding — otherwise the wizard flashes
  // on every launch for existing users.
  if (settings === undefined) return null;
  if (!settings?.onboardingComplete) return <OnboardingWizard />;

  return (
    <SchedulerProvider>
      <div className="mx-auto flex min-h-svh max-w-md flex-col">
        <header className="glass sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-700/50 dark:bg-slate-900/70">
          <span className="bg-gradient-to-r from-cyan-500 to-violet-500 bg-clip-text font-extrabold tracking-tight text-transparent">
            LifeOS
          </span>
          <div className="flex items-center gap-1">
            <BackupBar />
            <DarkModeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <ActiveView />
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="glass fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 justify-around border-t border-slate-200/70 bg-white/80 py-2 dark:border-slate-700/50 dark:bg-slate-900/80">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="relative flex flex-col items-center px-1.5 py-1 text-[10px]"
            >
              {tab === t.id && (
                <motion.div
                  layoutId="nav-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-cyan-500/10 dark:bg-cyan-400/10"
                />
              )}
              <t.Icon
                active={tab === t.id}
                className={`relative h-[22px] w-[22px] transition-all ${
                  tab === t.id
                    ? "scale-110 text-cyan-500 dark:text-cyan-400"
                    : "scale-100 text-slate-400 dark:text-slate-500"
                }`}
              />
              <span
                className={`relative font-medium transition-colors ${
                  tab === t.id
                    ? "text-cyan-500 dark:text-cyan-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {t.label}
              </span>
            </button>
          ))}
        </nav>

        <AlarmOverlay />
        <Toaster />
      </div>
    </SchedulerProvider>
  );
}

export default App;

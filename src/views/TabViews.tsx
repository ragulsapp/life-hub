import { motion } from "framer-motion";
import { Segmented } from "../components/Chip";
import { CloseButton } from "../components/IconButton";
import { DashboardView } from "../modules/dashboard/DashboardView";
import { HabitsView } from "../modules/habits/HabitsView";
import { GoalsView } from "../modules/goals/GoalsView";
import { HealthView } from "../modules/health/HealthView";
import { NotesView } from "../modules/notes/NotesView";
import { AlarmsView } from "../modules/alarms/AlarmsView";

/**
 * The four places the app has.
 *
 * It used to have seven, which is past the point where people navigate by
 * memory rather than by hunting — and they were uneven, with Alarms (one
 * feature) sitting beside Health (a whole domain). The rule now is: a tab
 * is a PLACE you go, a segmented control moves between views of the same
 * subject, and anything you visit occasionally is a screen you push.
 *
 * Alarms is the clearest example of the last kind. You set an alarm once
 * and then live with it for months, so it does not deserve a permanent
 * seat; it is reached from Today, where the thing it affects actually is.
 */

export type HabitsSection = "habits" | "goals";
export type YouSection = "health" | "notes";

const HABITS_SECTIONS: { id: HabitsSection; label: string }[] = [
  { id: "habits", label: "Habits" },
  { id: "goals", label: "Goals" },
];

const YOU_SECTIONS: { id: YouSection; label: string }[] = [
  { id: "health", label: "Health" },
  { id: "notes", label: "Notes" },
];

/** Title plus sub-navigation, owned by the tab rather than by each view. */
function TabHeader<T extends string>({
  title,
  sections,
  value,
  onChange,
}: {
  title: string;
  sections: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 pt-4">
      <h1 className="text-title text-slate-900 dark:text-white">
        {title}
      </h1>
      <Segmented options={sections} value={value} onChange={onChange} />
    </div>
  );
}

export function TodayView({ onOpenAlarms }: { onOpenAlarms: () => void }) {
  return <DashboardView onOpenAlarms={onOpenAlarms} />;
}

/**
 * Habits and Goals share a tab because they are the same thing at two
 * timescales — what you are trying to become, and what you do today to get
 * there. Splitting them across the bar made that relationship invisible.
 */
export function PlanView({
  section,
  onSection,
}: {
  section: HabitsSection;
  onSection: (s: HabitsSection) => void;
}) {
  return (
    <div>
      <TabHeader
        title="Your plan"
        sections={HABITS_SECTIONS}
        value={section}
        onChange={onSection}
      />
      {section === "habits" ? <HabitsView /> : <GoalsView />}
    </div>
  );
}

export function YouView({
  section,
  onSection,
}: {
  section: YouSection;
  onSection: (s: YouSection) => void;
}) {
  return (
    <div>
      <TabHeader
        title="You"
        sections={YOU_SECTIONS}
        value={section}
        onChange={onSection}
      />
      {section === "health" ? <HealthView /> : <NotesView />}
    </div>
  );
}

/** Alarms as a pushed screen rather than a tab. */
export function AlarmsScreen({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-40 overflow-y-auto bg-slate-50 dark:bg-slate-900"
    >
      <div
        className="mx-auto max-w-md"
        style={{ paddingTop: "calc(var(--sat) + 0.5rem)" }}
      >
        <div className="flex items-center justify-end px-4">
          <CloseButton onClose={onClose} label="Close alarms" />
        </div>
        <AlarmsView />
      </div>
    </motion.div>
  );
}

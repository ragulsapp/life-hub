import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { Card } from "../../components/Card";
import { AreaChart } from "../../components/AreaChart";
import { localDateStr } from "../../lib/dates";
import {
  GENERIC_WATER_TARGET_ML,
  ageFromBirthYear,
  profileIsUsable,
  sleepTargetHours,
  waterTargetMl,
} from "../../lib/bodyMetrics";
import { dailyValues, latestValue, valueOn } from "../../lib/healthMetrics";
import { BodyBasics } from "./BodyBasics";
import { BodyProfileForm } from "./BodyProfileForm";
import { HealthEntryForm } from "./HealthEntryForm";
import { WaterTracker } from "./WaterTracker";
import { PracticesShelf } from "./PracticesShelf";
import { FastingTimer } from "./FastingTimer";
import { FastingHistory } from "./FastingHistory";
import { MetricGoals } from "./MetricGoals";
import { setFastingEnabled } from "./healthActions";

/** "2026-07-31" -> "31 Jul", for the trend chart axes. */
const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
};

/**
 * Ordered around the four questions people actually open a health screen with:
 * "Am I okay?" → "What should I do today?" → "Am I improving?" → "What else
 * could I do?". Practices are opt-in; nothing is switched on for the user.
 */
export function HealthView() {
  const metrics = useLiveQuery(() => db.healthMetrics.toArray(), []) ?? [];
  const settings = useLiveQuery(() => db.appSettings.get(1), []);
  const profile = settings?.bodyProfile;
  const fastingEnabled = !!settings?.fastingEnabled;
  const [editingProfile, setEditingProfile] = useState(false);

  const today = localDateStr();
  const weight = latestValue(metrics, "weight");
  const age = profile?.birthYear
    ? ageFromBirthYear(profile.birthYear, profile.birthMonth)
    : null;

  const personalWater = weight ? waterTargetMl(weight) : null;
  const waterTarget =
    profile?.waterTargetMlOverride ?? personalWater ?? GENERIC_WATER_TARGET_ML;
  const sleepTarget = age ? sleepTargetHours(age) : { min: 7, max: 9 };
  const sleptLastNight = valueOn(metrics, "sleep-hours", today);

  const weightSeries = dailyValues(metrics, "weight");
  const sleepSeries = dailyValues(metrics, "sleep-hours");
  const waterSeries = dailyValues(metrics, "water-ml");
  const energySeries = dailyValues(metrics, "energy-level");

  const hasProfile = profileIsUsable(profile);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Health
      </h1>

      {/* --- Your Body: "am I okay?" --- */}
      {hasProfile && !editingProfile ? (
        <Card title="Your Body">
          <BodyBasics profile={profile!} metrics={metrics} />
          <button
            onClick={() => setEditingProfile(true)}
            className="mt-3 text-xs font-semibold text-cyan-500 dark:text-cyan-300 hover:underline"
          >
            Edit your details
          </button>
        </Card>
      ) : (
        <Card title={hasProfile ? "Your details" : "Set up your body basics"}>
          {!hasProfile && (
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              Add your height and birth year and the app can work out targets
              that actually fit you — instead of showing generic numbers.
            </p>
          )}
          <BodyProfileForm
            profile={profile}
            onDone={() => setEditingProfile(false)}
          />
          {editingProfile && (
            <button
              onClick={() => setEditingProfile(false)}
              className="mt-3 text-xs font-semibold text-slate-400 hover:underline"
            >
              Cancel
            </button>
          )}
        </Card>
      )}

      {/* --- Today: "what should I do?" --- */}
      <Card title="Water Today" delay={0.02}>
        <WaterTracker
          metrics={metrics}
          targetMl={waterTarget}
          targetIsGeneric={!personalWater && !profile?.waterTargetMlOverride}
        />
      </Card>

      <Card title="Sleep" delay={0.03}>
        {sleptLastNight ? (
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {sleptLastNight} h last night
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {sleptLastNight >= sleepTarget.min
                ? `Within your ${sleepTarget.min}–${sleepTarget.max} h range.`
                : `Your range is ${sleepTarget.min}–${sleepTarget.max} h — an earlier night would help.`}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {age
              ? `For your age, ${sleepTarget.min}–${sleepTarget.max} hours is the usual guidance. Log last night below.`
              : "Log last night's sleep below to track it."}
          </p>
        )}
      </Card>

      <Card title="Log Today" delay={0.05}>
        <HealthEntryForm metrics={metrics} />
      </Card>

      {/* --- Trends: "am I improving?" --- */}
      <Card title="Weight Trend" delay={0.07}>
        <AreaChart
          values={weightSeries.map((d) => d.value)}
          labels={weightSeries.map((d) => shortDate(d.date))}
          color="#38bdf8"
          unit="kg"
        />
        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Latest:{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {weight ?? "—"} kg
          </span>
        </div>
      </Card>

      {waterSeries.length > 1 && (
        <Card title="Water Trend" delay={0.08}>
          <AreaChart
            values={waterSeries.map((d) => Math.round(d.value))}
            labels={waterSeries.map((d) => shortDate(d.date))}
            color="#22d3ee"
            unit="ml"
          />
        </Card>
      )}

      {sleepSeries.length > 1 && (
        <Card title="Sleep Trend" delay={0.09}>
          <AreaChart
            values={sleepSeries.map((d) => d.value)}
            labels={sleepSeries.map((d) => shortDate(d.date))}
            color="#f472b6"
            unit="h"
          />
        </Card>
      )}

      <Card title="Energy Trend" delay={0.1}>
        <AreaChart
          values={energySeries.map((d) => d.value)}
          labels={energySeries.map((d) => shortDate(d.date))}
          color="#a78bfa"
        />
        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Latest:{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {energySeries.at(-1)?.value ?? "—"} / 10
          </span>
        </div>
      </Card>

      <Card title="Targets" delay={0.12}>
        <MetricGoals metrics={metrics} />
      </Card>

      {/* --- Practices: "what else could I do?" --- */}
      <Card title="Practices" delay={0.14}>
        <PracticesShelf />
      </Card>

      {/* --- Fasting: opt-in only. Off by default for everyone. --- */}
      <Card title="Fasting" delay={0.16}>
        {fastingEnabled ? (
          <div className="flex flex-col gap-4">
            <FastingTimer />
            <div className="border-t border-slate-200/70 pt-4 dark:border-slate-600/40">
              <FastingHistory />
            </div>
            <button
              onClick={() => setFastingEnabled(false)}
              className="self-start text-xs font-semibold text-slate-400 hover:underline"
            >
              Turn off fasting tracking
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Some people keep fasts — for observance, or for their own
              reasons. If that's you, you can track them here. It's off unless
              you turn it on.
            </p>
            <button
              onClick={() => setFastingEnabled(true)}
              className="self-start rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Track my fasts
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

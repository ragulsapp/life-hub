import { useEffect, useState } from "react";
import type { BodyProfile } from "../../db/db";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";
import { toast } from "../../lib/toast";
import { ACTIVITY_LABELS, type ActivityLevel } from "../../lib/bodyMetrics";
import { saveBodyProfile } from "./healthActions";

const SEX_OPTIONS: { value: NonNullable<BodyProfile["sex"]>; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "unspecified", label: "Prefer not to say" },
];

/** Shared with OnboardingWizard's own body-basics step, so both stay in sync. */
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ACTIVITY_ORDER: ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very-active",
];

function Pills<T extends string>({
  options,
  value,
  onChange,
  labelFor,
}: {
  options: readonly T[];
  value: T | undefined;
  onChange: (v: T) => void;
  labelFor: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          // min-h-11 = 44px: these are touch targets, not desktop chips.
          className={`flex min-h-11 items-center rounded-full px-4 text-xs font-medium transition-colors ${
            value === o
              ? "bg-cyan-500 text-white"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
          }`}
        >
          {labelFor(o)}
        </button>
      ))}
    </div>
  );
}

export function BodyProfileForm({
  profile,
  onDone,
}: {
  profile?: BodyProfile;
  onDone?: () => void;
}) {
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState(""); // "" = not given
  const [heightCm, setHeightCm] = useState("");
  const [sex, setSex] = useState<BodyProfile["sex"]>("unspecified");
  const [activity, setActivity] = useState<ActivityLevel>("sedentary");
  const [reference, setReference] =
    useState<NonNullable<BodyProfile["bmiReference"]>>("standard");

  // Seed once the live-queried profile arrives (it's undefined on first render).
  useEffect(() => {
    setBirthYear(profile?.birthYear ? String(profile.birthYear) : "");
    setBirthMonth(profile?.birthMonth ? String(profile.birthMonth) : "");
    setHeightCm(profile?.heightCm ? String(profile.heightCm) : "");
    setSex(profile?.sex ?? "unspecified");
    setActivity(profile?.activityLevel ?? "sedentary");
    setReference(profile?.bmiReference ?? "standard");
  }, [profile]);

  const save = async () => {
    const by = parseInt(birthYear, 10);
    const bm = birthMonth ? parseInt(birthMonth, 10) : NaN;
    const h = parseFloat(heightCm);
    const thisYear = new Date().getFullYear();
    if (birthYear && (!Number.isFinite(by) || by < 1900 || by > thisYear)) {
      toast("Enter a real birth year.", "error");
      return;
    }
    if (heightCm && (!Number.isFinite(h) || h < 50 || h > 260)) {
      toast("Enter a height in centimetres.", "error");
      return;
    }
    await saveBodyProfile({
      birthYear: Number.isFinite(by) ? by : undefined,
      // A month with no year would be meaningless — only save it alongside one.
      birthMonth: Number.isFinite(by) && Number.isFinite(bm) ? bm : undefined,
      heightCm: Number.isFinite(h) ? h : undefined,
      sex,
      activityLevel: activity,
      bmiReference: reference,
    });
    toast("Saved.");
    onDone?.();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Birth year
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            placeholder="1998"
            className={inputClass}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Height (cm)
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            placeholder="170"
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Birth month — optional
        </span>
        <select
          value={birthMonth}
          onChange={(e) => setBirthMonth(e.target.value)}
          className={inputClass}
        >
          <option value="">Not given — age may be off by a year</option>
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">
          Still no full birthdate — just enough to get your age right.
        </span>
      </label>

      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Sex — only affects the energy estimate
        </div>
        <Pills
          options={SEX_OPTIONS.map((s) => s.value)}
          value={sex}
          onChange={setSex}
          labelFor={(v) => SEX_OPTIONS.find((s) => s.value === v)!.label}
        />
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Typical activity
        </div>
        <Pills
          options={ACTIVITY_ORDER}
          value={activity}
          onChange={setActivity}
          labelFor={(v) => ACTIVITY_LABELS[v]}
        />
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Healthy-range reference
        </div>
        <Pills
          options={["standard", "asia-pacific"] as const}
          value={reference}
          onChange={setReference}
          labelFor={(v) =>
            v === "standard" ? "Standard (WHO)" : "Asia-Pacific"
          }
        />
        <p className="mt-1.5 text-xs text-slate-400">
          Asia-Pacific uses the lower WHO/ICMR cutoffs. Pick whichever your
          doctor uses — it only changes the range shown, nothing else.
        </p>
      </div>

      <Button onClick={save} className="w-full">
        Save
      </Button>

      <p className="text-xs text-slate-400">
        These are general reference figures, not medical advice. For anything
        that matters — including pregnancy or a medical condition — talk to a
        professional. Stays on this device.
      </p>
    </div>
  );
}

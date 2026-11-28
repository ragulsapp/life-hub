import { useEffect, useState } from "react";
import { Mic } from "lucide-react";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/inputStyles";
import {
  AlertIcon,
  CheckSquareIcon,
  ClockIcon,
  NoteIcon,
  WalletIcon,
  XIcon,
} from "../../components/Icons";
import { parseVoiceCommand, type VoiceAction } from "../../lib/voice/parseCommand";
import { applyVoiceActions } from "../../lib/voice/applyActions";
import { listenOnce, voiceAvailable } from "../../lib/voice/listen";
import { toast } from "../../lib/toast";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const diff = Math.round(
    (date.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86400000,
  );
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `${DAY[date.getDay()]} ${d} ${date.toLocaleString("en-IN", { month: "short" })}`;
}

function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function describe(a: VoiceAction): { Icon: (p: { size?: number }) => React.ReactElement; text: string } {
  switch (a.type) {
    case "alarm":
      return { Icon: ClockIcon, text: `Alarm ${dayLabel(a.date)} at ${clock(a.time)}` };
    case "task":
      return { Icon: CheckSquareIcon, text: a.dueDate ? `${a.title} · ${dayLabel(a.dueDate)}` : a.title };
    case "expense":
      return { Icon: WalletIcon, text: `₹${a.amount.toLocaleString("en-IN")} · ${a.category}` };
    case "note":
      return { Icon: NoteIcon, text: a.text };
    default:
      return { Icon: AlertIcon, text: `Didn't catch: “${a.text}”` };
  }
}

/**
 * Say (or type) one sentence → see what the app understood → confirm.
 * Nothing is created until "Add" is pressed, and each line can be dropped
 * first. Lines it didn't understand are shown, never acted on.
 */
export function VoiceCapture({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [proposed, setProposed] = useState<VoiceAction[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    let alive = true;
    voiceAvailable().then((ok) => alive && setCanListen(ok));
    return () => {
      alive = false;
    };
  }, []);

  const understand = (sentence = text) => {
    setProposed(parseVoiceCommand(sentence));
  };

  const listen = async () => {
    setListening(true);
    try {
      const heard = await listenOnce();
      if (!heard) {
        toast("Didn't hear anything. Try again a little closer.", "error");
        return;
      }
      setText(heard);
      understand(heard);
    } catch (err) {
      console.error(err);
      toast(err instanceof Error && /permission/i.test(err.message)
        ? "Turn on the microphone for Life Mentor in your phone's Settings → Apps."
        : "Couldn't listen just now. You can type it instead.", "error");
    } finally {
      setListening(false);
    }
  };

  const actionable = (proposed ?? []).filter((a) => a.type !== "unknown");

  const confirm = async () => {
    setSaving(true);
    try {
      const { created } = await applyVoiceActions(actionable);
      toast(created === 1 ? "Added 1 item." : `Added ${created} items.`);
      setText("");
      setProposed(null);
      onDone();
    } catch (err) {
      console.error(err);
      // Actions are saved one by one, so some may already be in. Say so.
      toast("Couldn't add everything. Check your lists before trying again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-2 border-b border-slate-200/70 pb-4 dark:border-white/5">
      <label className="text-caption font-semibold text-slate-500 dark:text-slate-400" htmlFor="voice-text">
        Say it in one line
      </label>
      <div className="flex gap-2">
        <input
          id="voice-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setProposed(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && text.trim() && understand()}
          placeholder="naliku 8 manikku alarm, bank ku call pannanum…"
          className={inputClass}
        />
        {canListen && (
          <button
            type="button"
            onClick={listen}
            disabled={listening}
            aria-label="Speak"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-600 text-white disabled:opacity-50"
          >
            <Mic size={20} />
          </button>
        )}
        <Button onClick={() => understand()} disabled={!text.trim()}>
          Go
        </Button>
      </div>
      {canListen && (
        <p className="text-caption text-slate-500 dark:text-slate-400">
          Your phone's speech service turns voice into text and may go online to
          do it. Life Mentor only gets the text.
        </p>
      )}

      {proposed && (
        <div className="flex flex-col gap-1.5" aria-live="polite">
          {proposed.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Nothing to add.</p>
          )}
          {proposed.map((a, i) => {
            const { Icon, text: line } = describe(a);
            const unknown = a.type === "unknown";
            return (
              <div
                key={i}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                  unknown
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-700/50 dark:text-slate-100"
                }`}
              >
                <Icon size={16} />
                <span className="flex-1">{line}</span>
                <button
                  type="button"
                  aria-label={`Remove: ${line}`}
                  onClick={() => setProposed(proposed.filter((_, j) => j !== i))}
                  className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-slate-400 hover:text-slate-600"
                >
                  <XIcon size={16} />
                </button>
              </div>
            );
          })}
          {actionable.length > 0 && (
            <Button onClick={confirm} disabled={saving}>
              {actionable.length === 1 ? "Add 1 item" : `Add ${actionable.length} items`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

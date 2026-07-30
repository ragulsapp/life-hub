import { Component, type ReactNode } from "react";
import { exportBackup } from "../lib/backup";

interface State {
  error: Error | null;
}

/**
 * Last line of defense: a render crash must never strand the user without
 * a path to their data — export stays reachable from the crash screen.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Render crash:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-4xl">😵</div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Something broke
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your data is safe on this device. Export a backup, then reload.
        </p>
        <pre className="max-w-full overflow-x-auto rounded-xl bg-slate-100 p-3 text-left text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {this.state.error.message}
        </pre>
        <div className="flex gap-3">
          <button
            onClick={() => exportBackup().catch(console.error)}
            className="rounded-2xl bg-cyan-500 px-5 py-2.5 font-semibold text-white"
          >
            Export data
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-2xl bg-slate-200 px-5 py-2.5 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

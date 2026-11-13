import { Component, type ReactNode } from "react";
import { exportBackup, exportOutcomeMessage } from "../lib/backup";
import { AlertIcon } from "./Icons";

interface State {
  error: Error | null;
  /** What the last export attempt actually did, shown inline. */
  exportStatus?: string;
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
        <AlertIcon size={40} className="text-amber-500" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Something broke
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your data is safe on this device. Export a backup, then reload.
        </p>
        <pre className="max-w-full overflow-x-auto rounded-xl bg-slate-100 p-3 text-left text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {this.state.error.message}
        </pre>
        {/* The outcome is shown here, not in a toast: the toast host lives
            inside the app that just crashed. This button used to report
            nothing at all — a failed or dismissed export looked exactly
            like a successful one, on the screen that tells the user to
            export and then reload. */}
        {this.state.exportStatus && (
          <p role="status" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {this.state.exportStatus}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={async () => {
              try {
                const result = await exportBackup();
                this.setState({ exportStatus: exportOutcomeMessage(result) });
              } catch (err) {
                console.error(err);
                this.setState({
                  exportStatus: `Export failed: ${
                    err instanceof Error ? err.message : String(err)
                  }`,
                });
              }
            }}
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
